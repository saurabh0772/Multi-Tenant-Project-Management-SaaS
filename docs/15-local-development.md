# Local Development Setup & Operations Walkthrough — Multi-Tenant Project Management SaaS

This is the definitive guide for cloning, installing, configuring, running, testing, troubleshooting, and operating the Multi-Tenant Project Management SaaS application locally.

---

## 1. System Prerequisites

Before running the application, ensure your environment meets the following software requirements:

| Component | Minimum Required Version | Recommended Version | Verification Command |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v20.0.0+` | `v20.12.0+` | `node --version` |
| **npm** | `v10.0.0+` | `v10.5.0+` | `npm --version` |
| **MongoDB** | `v6.0+` | `v7.0+` | `mongod --version` |
| **Redis** | `v6.2+` | `v7.2+` | `redis-cli ping` (Expected: `PONG`) |
| **Git** | `v2.30+` | Latest | `git --version` |
| **Docker** | `v24.0+` (Optional) | Latest | `docker --version` |

---

## 2. Local Architecture & Component Layout

```
                                [ Web Browser ]
                                       │
                    ┌──────────────────┴──────────────────┐
                    │ HTTP REST (Port 5000)               │ WebSockets (Port 5000)
                    ▼                                     ▼
        ┌───────────────────────┐             ┌───────────────────────┐
        │  Vite React Client    │             │  Express API Server   │
        │  (Port 5173)          │             │  (Port 5000)          │
        └───────────────────────┘             └───────────┬───────────┘
                                                          │
                               ┌──────────────────────────┼──────────────────────────┐
                               ▼                          ▼                          ▼
                     ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
                     │ MongoDB Cluster  │       │  Redis Cache &   │       │  BullMQ Queue    │
                     │ (Port 27017)     │       │  Pub/Sub (6379)  │       │  Worker Process  │
                     └──────────────────┘       └──────────────────┘       └──────────────────┘
```

### Process Requirements:

1. **MongoDB**: **REQUIRED**. Primary database storing users, sessions, memberships, organizations, projects, tasks, comments, attachments, activities, and notifications.
2. **Redis**: **REQUIRED**. Provides session token blacklist, rate limiting buckets, search cache, Socket.IO adapter, and BullMQ background notification queues.
3. **Express API Server**: **REQUIRED**. Node.js backend executing business logic, REST APIs, Socket.IO events, and metrics collection on port **5000**.
4. **BullMQ Worker Process**: **REQUIRED**. Standalone background process consuming BullMQ queues and dispatching notifications asynchronously.
5. **Vite React Client**: **REQUIRED**. Single Page Application (SPA) frontend running on port **5173**.

---

## 3. Environment Variables Reference

The application uses Zod to validate all environment variables on boot (`server/src/config/env.ts`).

### Server Environment Variables (`server/.env` or root `.env`):

| Variable | Type | Required | Default / Example | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | `enum` | Yes | `development` | Environment mode (`development`, `test`, `production`) |
| `PORT` | `number` | Yes | `5000` | Port for Express API server |
| `MONGODB_URI` | `string` | Yes | `mongodb://localhost:27017/project_manager_dev` | Primary MongoDB database connection URI |
| `MONGODB_TEST_URI` | `string` | Yes | `mongodb://localhost:27017/project_manager_test` | Isolated database connection URI for Vitest |
| `REDIS_URL` | `string` | Yes | `redis://localhost:6379` | Connection URL for Redis server |
| `CLIENT_URL` | `string` | Yes | `http://localhost:5173` | Allowed CORS origin for client SPA |
| `ACCESS_TOKEN_SECRET` | `string` | Yes | `development_access_token_secret_min_32_chars_long` | JWT signing secret (**Must be >= 32 characters**) |
| `ACCESS_TOKEN_EXPIRES_IN` | `string` | Yes | `15m` | Lifetime of access tokens |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | `number` | Yes | `7` | Refresh token duration in days |
| `LOG_LEVEL` | `enum` | Yes | `info` | Pino log level (`fatal`, `error`, `warn`, `info`, `debug`) |
| `SEARCH_CACHE_TTL` | `number` | No | `60` | Search result Redis cache TTL in seconds |
| `RATE_LIMIT_WINDOW_MS` | `number` | No | `60000` | Rate limiter window in milliseconds (1 min) |
| `RATE_LIMIT_MAX` | `number` | No | `100` | Maximum requests per IP/user per rate limit window |
| `SLOW_REQUEST_THRESHOLD_MS` | `number` | No | `500` | Threshold in ms for slow request log warnings |
| `TRUST_PROXY` | `boolean\|string` | No | `false` | Enable Express trust proxy when behind load balancer |
| `STORAGE_DRIVER` | `enum` | No | `local` | Attachment storage driver (`local`) |
| `METRICS_ENABLED` | `boolean` | No | `true` | Enable `/metrics` endpoint collection |
| `METRICS_USER` | `string` | No | `admin` | Optional Basic Auth username for `/metrics` |
| `METRICS_PASS` | `string` | No | `change_me_in_production` | Optional Basic Auth password for `/metrics` |

### Client Environment Variables (`client/.env`):

| Variable | Type | Required | Default / Example | Description |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_API_URL` | `string` | No | `/api/v1` | Public REST API base URL path |
| `VITE_SOCKET_URL` | `string` | No | `http://localhost:5000` | Public WebSockets gateway URL |

> [!CAUTION]
> Never place private keys or secrets inside `VITE_*` variables. All `VITE_*` variables are baked into browser JavaScript bundles.

---

## 4. First-Time Native Setup Guide (Step-by-Step)

### Step 1: Clone Repository & Install Dependencies
From the root workspace directory, install all workspace packages (`shared`, `server`, `client`):
```bash
# 1. Clone repository
git clone git@github.com:saurabh0772/Multi-Tenant-Project-Management-SaaS.git
cd "Multi-Tenant Project Management SaaS"

# 2. Install workspace dependencies
npm install
```

### Step 2: Configure Environment Templates
Copy `.env.example` templates to `.env` files:
```bash
cp .env.example .env
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### Step 3: Start MongoDB Database Service
Ensure MongoDB is running locally on port `27017`:
```bash
# macOS (Homebrew)
brew services start mongodb-community@7.0

# Linux (systemd)
sudo systemctl start mongod

# Docker (Alternative)
docker run -d --name mongodb -p 27017:27017 mongo:7.0
```

### Step 4: Start Redis Service
Ensure Redis is running locally on port `6379`:
```bash
# macOS (Homebrew)
brew services start redis

# Linux (systemd)
sudo systemctl start redis-server

# Verify connection
redis-cli ping   # Output: PONG

# Docker (Alternative)
docker run -d --name redis -p 6379:6379 redis:7.2-alpine
```

### Step 5: Start Express API Server
In Terminal 1:
```bash
npm run dev:server
```
*Output confirmation*: `🚀 Server listening on port 5000 in development mode`

### Step 6: Start BullMQ Background Worker
In Terminal 2:
```bash
npm run worker --workspace=server
```
*Output confirmation*: `🚀 Background Worker process is running...`

### Step 7: Start Vite React Frontend
In Terminal 3:
```bash
npm run dev:client
```
*Output confirmation*: `VITE v5.2.8 ready in 250 ms. Local: http://localhost:5173/`

---

## 5. Recommended Terminal Layout

For smooth local development, keep 5 terminal tabs active:

| Terminal Tab | Process | Command | Expected State |
| :--- | :--- | :--- | :--- |
| **Tab 1** | MongoDB Database | `mongod` or `docker compose up -d mongodb` | Port 27017 active |
| **Tab 2** | Redis Server | `redis-server` or `docker compose up -d redis` | Port 6379 active |
| **Tab 3** | Backend API Server | `npm run dev:server` | Port 5000 active |
| **Tab 4** | Background Worker | `npm run worker --workspace=server` | Subscribed to BullMQ |
| **Tab 5** | Frontend Client | `npm run dev:client` | Port 5173 active |

---

## 6. End-to-End QA & Feature Verification Walkthrough

Follow this step-by-step workflow in your browser to verify full stack functionality:

1. **Verify Health Endpoints**:
   - Open `http://localhost:5000/health` -> Expect `{ "status": "ok", "service": "api" }`.
   - Open `http://localhost:5000/ready` -> Expect `{ "status": "ready", "checks": { "mongodb": "ok", "redis": "ok" } }`.
   - Open `http://localhost:5000/metrics` -> Expect Prometheus metrics.

2. **User Registration & Authentication**:
   - Open `http://localhost:5173/register` and create User A (`alice@example.com`).
   - Log in (`http://localhost:5173/login`). Verify JWT access token and refresh cookie are set.

3. **Organization & Membership Setup**:
   - Create an organization (e.g. `Acme Corp`). You become the `OWNER`.
   - Navigate to **Members** and invite User B (`bob@example.com`) as `ADMIN` or `MEMBER`.

4. **Project & Kanban Task Management**:
   - Navigate to **Projects** and create a project (e.g. `Website Redesign`).
   - Open project Kanban board. Create tasks (`Task 101`), move tasks across columns (**To Do** -> **In Progress** -> **Done**). Assign task to User B.

5. **Comments & File Attachments**:
   - Open `Task 101` modal. Post a comment.
   - Upload an attachment (e.g. PDF/PNG). Verify download link and file storage inside `server/uploads/`.

6. **Real-Time WebSockets & Notifications**:
   - Open a second browser window (Incognito) as User B.
   - When User A assigns a task or posts a comment, verify User B receives instant real-time notification toast & header unread counter update via Socket.IO.

7. **Analytics Dashboard**:
   - Navigate to **Analytics** (`http://localhost:5173/analytics`).
   - Verify task status breakdown charts, project health metrics, and member workload summary.

8. **Global Tenant Search**:
   - Press `Cmd+K` or `Ctrl+K` to open Search Command Palette.
   - Type search query (e.g. `Website`). Verify grouped results for Projects, Tasks, Comments, and Members.
   - Switch active organization -> Verify search query automatically resets and isolates new tenant data.

---

## 7. Option B — Docker Compose Local Setup

If you prefer containerized local development, use Docker Compose:

```bash
# 1. Validate Docker Compose configuration
docker compose config

# 2. Build and start containers in background
docker compose up --build -d

# 3. View container logs
docker compose logs -f api worker

# 4. Stop all containers
docker compose down
```

### Docker Services Breakdown:
- `saas_mongodb`: Port `27017`
- `saas_redis`: Port `6379`
- `saas_api`: Port `5000`
- `saas_worker`: Standalone BullMQ Worker process
- `saas_client`: Nginx SPA frontend serving on port `8080`

---

## 8. Database Backup & Restore Procedures

### Automated Backup
Run the timestamped database backup script:
```bash
./scripts/backup-db.sh
```
*Archive saved to*: `./backups/mongodb_backup_YYYYMMDD_HHMMSS.gz`

### Database Restore
Restore data from an existing backup archive:
```bash
./scripts/restore-db.sh ./backups/mongodb_backup_YYYYMMDD_HHMMSS.gz
```
*Safety Prompt*: Requires typing `CONFIRM` before executing `mongorestore --drop`.

---

## 9. Testing & Quality Verification Suite

Run all verification commands from the root directory:

```bash
# 1. Strict TypeScript Typecheck across all packages
npm run typecheck

# 2. ESLint Quality Rules Check across all packages
npm run lint

# 3. Vitest Test Suite Execution across Server & Client
npm run test

# 4. Monorepo Production Build (shared -> server -> client)
npm run build
```

---

## 10. Common Command Reference Table

| Goal / Action | Command | Workspace |
| :--- | :--- | :--- |
| Install Monorepo Dependencies | `npm install` | Root |
| Start Dev Server & Client | `npm run dev` | Root |
| Start API Server Only | `npm run dev:server` | Root |
| Start Client Only | `npm run dev:client` | Root |
| Start BullMQ Background Worker | `npm run worker` | `server` |
| Execute Unit & Integration Tests | `npm run test` | Root |
| Run TypeScript Typecheck | `npm run typecheck` | Root |
| Run Linter | `npm run lint` | Root |
| Compile Production Bundle | `npm run build` | Root |
| Seed Initial Database Data | `npm run db:seed` | `server` |

---

## 11. Troubleshooting Guide

### Issue 1: `MONGODB_URI connection refused (connect ECONNREFUSED 127.0.0.1:27017)`
- **Cause**: MongoDB server process is not running.
- **Solution**: Start MongoDB service (`brew services start mongodb-community` or `sudo systemctl start mongod` or `docker compose up -d mongodb`).

### Issue 2: `Redis connection error (connect ECONNREFUSED 127.0.0.1:6379)`
- **Cause**: Redis server is offline.
- **Solution**: Start Redis service (`redis-server` or `docker compose up -d redis`). Verify with `redis-cli ping`.

### Issue 3: `Port 5000 or 5173 already in use (EADDRINUSE)`
- **Cause**: A background process is already occupying port 5000 or 5173.
- **Solution**: Find and kill process occupying port:
  ```bash
  lsof -i :5000
  kill -9 <PID>
  ```

### Issue 4: `CORS Error / Network Error when logging in from Client`
- **Cause**: `CLIENT_URL` in `server/.env` does not match the frontend URL (`http://localhost:5173`).
- **Solution**: Set `CLIENT_URL=http://localhost:5173` in `server/.env` and restart backend server.

### Issue 5: `Socket.IO connection failed / Unauthorized`
- **Cause**: Expired JWT access token or missing `withCredentials` in Socket.IO handshake.
- **Solution**: Refresh application tab to trigger automatic token refresh before establishing WebSockets connection.

---

## 12. Complete Phase 01–14 Feature QA Checklist

Use this checklist during manual testing to confirm feature completeness:

- [x] **Phase 01**: Foundation, Monorepo layout, Express app, Pino logger, health route
- [x] **Phase 02**: MongoDB schemas (User, Organization, Membership, Project, Task, Comment, Attachment, Activity, Notification)
- [x] **Phase 03**: User Auth, Argon2 hashing, JWT access/refresh rotation, cookie sessions
- [x] **Phase 04**: Multi-tenancy isolation (`organizationId`), RBAC permissions matrix
- [x] **Phase 05**: Organization CRUD, member invitations, token hashing, ownership transfer
- [x] **Phase 06**: Project management, slug generation, soft deletes, project status
- [x] **Phase 07**: Task management, Kanban column moves, priority, assignment
- [x] **Phase 08**: Comments, attachment file storage (`StorageService`), activity feeds
- [x] **Phase 09**: BullMQ background worker, Redis notification queues, retry policies
- [x] **Phase 10**: Socket.IO gateway, organization/project rooms, real-time presence
- [x] **Phase 11**: Global search, Redis caching (`saas:cache:search:...`), relevance ranking
- [x] **Phase 12**: React SPA integration, TanStack Query, Zustand stores, Analytics Dashboard
- [x] **Phase 13**: Request IDs, rate limiting, regex sanitization, health vs readiness checks
- [x] **Phase 14**: Dockerization, Metrics (`/metrics`), Graceful shutdown, CI/CD pipeline, ErrorBoundary
