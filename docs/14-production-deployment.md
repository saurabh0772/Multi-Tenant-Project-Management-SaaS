# Phase 14 — Production Deployment, Observability & DevOps Infrastructure Guide

This document outlines the production deployment topology, containerization, observability metrics, security controls, backup procedures, and operational hardening for the Multi-Tenant Project Management SaaS monorepo.

---

## 1. Production Architecture Topology

```
                         [ HTTPS Client Browser ]
                                     │
                                     ▼
                    [ Reverse Proxy / Nginx / Load Balancer ]
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           │ (REST API / WebSockets)                           │ (Static SPA Assets)
           ▼                                                   ▼
┌──────────────────────┐                           ┌──────────────────────┐
│  API Container (xN)  │                           │  Client Container    │
│  Node 20 / Express   │                           │  Nginx / Vite Build  │
└──────────┬───────────┘                           └──────────────────────┘
           │
           ├─────────────────────────┐
           ▼                         ▼
┌────────────────────┐    ┌────────────────────┐
│   MongoDB Cluster  │    │  Redis Instance    │
│  (State / Models)  │    │ (Cache/BullMQ/Pub) │
└────────────────────┘    └──────────┬─────────┘
                                     │
                                     ▼
                          ┌────────────────────┐
                          │ Worker Process (xN)│
                          │ BullMQ Consumers   │
                          └────────────────────┘
```

---

## 2. Environment Variables & Configuration

Environment variables are strictly validated using Zod (`server/src/config/env.ts`).

| Variable Name | Type | Default | Production Requirement |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | `enum` | `development` | Set to `production` |
| `PORT` | `number` | `5000` | Target HTTP server port |
| `MONGODB_URI` | `string` | `mongodb://localhost...` | Valid MongoDB connection string |
| `REDIS_URL` | `string` | `redis://localhost:6379` | Valid Redis URL |
| `CLIENT_URL` | `string` | `http://localhost:5173` | Allowed CORS frontend origin |
| `ACCESS_TOKEN_SECRET` | `string` | Development fallback | Secret key **>= 32 characters** |
| `ACCESS_TOKEN_EXPIRES_IN` | `string` | `15m` | JWT access token TTL |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | `number` | `7` | Refresh token duration in days |
| `LOG_LEVEL` | `enum` | `info` | Logging verbosity (`info`, `warn`, `error`) |
| `METRICS_ENABLED` | `boolean` | `true` | Enables `/metrics` endpoint |
| `METRICS_USER` | `string` | Optional | Basic auth username for `/metrics` |
| `METRICS_PASS` | `string` | Optional | Basic auth password for `/metrics` |
| `TRUST_PROXY` | `boolean\|number` | `false` | Enable when running behind reverse proxies |
| `STORAGE_DRIVER` | `enum` | `local` | Attachment storage provider (`local`) |

> [!CAUTION]
> Production secrets MUST NOT be hardcoded or committed to git repository. Copy `.env.example` to `.env` on target environments.

---

## 3. Docker Containerization

### API Container (`server/Dockerfile`)
- Multi-stage build using `node:20-alpine`.
- Executes compiled JavaScript `node server/dist/server.js`.
- Runs under non-root `node` user permissions.
- Configured with `HEALTHCHECK` against `http://localhost:5000/health`.

### Worker Container
- Uses the same backend image, executing `node server/dist/worker.js`.
- Runs independently without spawning HTTP Express servers.

### Frontend Client Container (`client/Dockerfile`)
- Multi-stage build compiling Vite TypeScript assets into `dist/`.
- Serves static assets using lightweight Nginx alpine.
- Includes `nginx.conf` SPA fallback (`try_files $uri $uri/ /index.html`) so React Router routes work seamlessly on refresh.

---

## 4. Docker Compose Orchestration

### Development Compose (`docker-compose.yml`)
Run local development stack with hot-reloading and persistent volumes:
```bash
docker compose up --build
```
Includes services for `mongodb`, `redis`, `api`, `worker`, and `client`.

### Production Compose (`docker-compose.prod.yml`)
Deploy production environment with named persistent volumes:
- `mongo-prod-data`: MongoDB database storage
- `redis-prod-data`: Redis append-only file persistence
- `uploads-prod-data`: Attachment uploads persistent directory

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 5. Attachment Storage & Multi-Instance Scaling

Phase 14 abstracts attachment storage behind `StorageService` and `LocalStorageProvider`.

> [!IMPORTANT]
> **Multi-Instance Scaling Limitation**:
> Local storage (`server/uploads`) persists files to local disk. When deploying multiple API instances across different server hosts, a shared network filesystem (e.g. NFS / EFS) or an S3-compatible cloud storage provider must be configured so all instances can access uploaded files.

---

## 6. Observability & Application Metrics

The `/metrics` endpoint exposes Prometheus-compatible metrics or structured JSON:

```bash
# Prometheus text format (default)
curl -u admin:change_me_in_production http://localhost:5000/metrics

# JSON format
curl -u admin:change_me_in_production http://localhost:5000/metrics?format=json
```

### Metrics Collected:
- `http_requests_total`: Total HTTP request count
- `http_requests_2xx_total`, `http_requests_4xx_total`, `http_requests_5xx_total`: HTTP status code distribution
- `http_request_duration_ms_total`: Total request duration in milliseconds
- `http_slow_requests_total`: Slow requests exceeding threshold (500ms)
- `rate_limit_rejections_total`: Rate limit breaches (HTTP 429)
- `search_requests_total`, `search_cache_hits_total`, `search_cache_misses_total`
- `notification_jobs_processed_total`, `notification_jobs_failed_total`, `notification_jobs_retried_total`
- `socket_connections_total`, `socket_disconnections_total`

> [!NOTE]
> Metrics are maintained in-memory. Instance restarts will reset counter state. Use external Prometheus/Grafana scraping for persistent metric archiving.

---

## 7. Health vs Readiness Checks

- `GET /health` (**Liveness**): Fast process liveness check returning 200 OK. Requires zero external database or Redis connectivity.
- `GET /ready` (**Readiness**): Verifies MongoDB connection state (`readyState === 1`) and Redis connection ping (`PONG`). Returns 200 OK when ready or 503 Service Unavailable when a critical dependency is down.

---

## 8. Database Backup & Restore Automation

### Database Backup
Automated timestamped backup script (`scripts/backup-db.sh`):
```bash
./scripts/backup-db.sh
```
Creates compressed archive in `./backups/mongodb_backup_YYYYMMDD_HHMMSS.gz`.

### Database Restore
Restore script (`scripts/restore-db.sh`):
```bash
./scripts/restore-db.sh ./backups/mongodb_backup_20260827_100000.gz
```
Requires explicit user confirmation prompt (`CONFIRM`) before executing destructive restore.

---

## 9. Graceful Shutdown & Reliability

Both API (`server.ts`) and Worker (`worker.ts`) processes handle `SIGTERM` and `SIGINT` signals with idempotent shutdown logic:
1. Rejects duplicate shutdown signals (`isShuttingDown = true`).
2. Stops accepting incoming HTTP/WebSocket connections.
3. Allows in-flight requests and background queue jobs to complete.
4. Closes Socket.IO gateway and BullMQ queue resources.
5. Closes Redis and MongoDB database connections.
6. Unrefs a 10-second force-exit safety timer to prevent process hangs.

---

## 10. Known Operational Limitations & Scope Boundaries

- **In-Memory Metrics**: Metrics are ephemeral to the Node.js process lifecycle.
- **Local Storage Multi-Host Limitation**: Attachment files stored on disk require shared storage across multi-instance API deployments.
- **Scope Confirmation**: Phase 14 intentionally omits external services (S3, Kafka, Elasticsearch, Algolia, WebRTC, mobile apps, or AI search).
