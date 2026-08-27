# Multi-Tenant Project Management SaaS

## 09 — Deployment & Infrastructure

**Document:** `09-deployment.md`  
**Version:** 1.0  
**Status:** Draft  
**Deployment Strategy:** Containerized / Cloud Deployment  
**Architecture:** MERN + Redis + Background Workers + Object Storage

---

## 1. Overview

This document defines the deployment architecture and operational strategy for the Multi-Tenant Project Management SaaS.

The deployment architecture is designed to provide:

- Reliable application hosting
- Secure database access
- Horizontal scalability
- Environment separation
- Automated deployments
- Secure secret management
- Background job processing
- Real-time communication
- Monitoring and logging
- Backup and recovery

The production system consists of:

```text
React Frontend
       │
       ▼
CDN / Static Hosting
       │
       ▼
Node.js + Express API
       │
 ┌─────┼──────────────┐
 │     │              │
 ▼     ▼              ▼
MongoDB Redis      Object Storage
 │     │              │
 │     ▼              │
 │  Background        │
 │     Worker         │
 │                    │
 └────────┬───────────┘
          ▼
       Monitoring
```

## 2. Deployment Goals

The deployment architecture should provide:

High availability
Secure communication
Environment isolation
Easy deployment
Easy rollback
Database reliability
Horizontal scalability
Secure file storage
Background job processing
Application monitoring

## 3. Deployment Environments

The application uses three major environments:

Development
     │
     ▼
Staging
     │
     ▼
Production

## 4. Development Environment

The development environment runs locally.

Typical services:

Frontend
    ↓
React + Vite

Backend
    ↓
Node.js + Express

Database
    ↓
MongoDB

Cache
    ↓
Redis

Worker
    ↓
BullMQ Worker

Example:

localhost:5173
    → Frontend

localhost:5000
    → Backend API

localhost:27017
    → MongoDB

localhost:6379
    → Redis

## 5. Staging Environment

Staging should closely resemble production.

Architecture:

Staging Frontend
       │
       ▼
Staging API
       │
 ┌─────┼─────┐
 ▼     ▼     ▼
Mongo Redis Storage

Staging is used for:

Integration testing
E2E testing
Deployment testing
QA
Release validation
Production-like testing

Staging must use separate credentials and databases.

## 6. Production Environment

Production serves real users.

Architecture:

                       Internet
                           │
                           ▼
                    DNS / CDN / TLS
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
        React Frontend             API Server
        Static Hosting             Load Balancer
                                        │
                         ┌──────────────┼──────────────┐
                         │              │              │
                         ▼              ▼              ▼
                     API #1          API #2        API #N
                         │              │              │
                         └──────────────┼──────────────┘
                                        │
                         ┌──────────────┼──────────────┐
                         │              │              │
                         ▼              ▼              ▼
                     MongoDB          Redis       Object Storage
                         │              │
                         │              ▼
                         │        Background Worker
                         │
                         ▼
                     Backups

## 7. Recommended Production Components

The exact cloud provider can be changed.

Recommended components:

Frontend:
Vercel / Cloudflare Pages / AWS S3 + CloudFront

Backend:
AWS / Render / Railway / Fly.io / DigitalOcean

Database:
MongoDB Atlas

Redis:
Upstash Redis / Redis Cloud / Managed Redis

File Storage:
Cloudinary / AWS S3

Background Jobs:
BullMQ + Redis

DNS:
Cloudflare / Route 53

Monitoring:
Sentry + Cloud Monitoring

CI/CD:
GitHub Actions

The architecture should remain provider-independent where possible.

## 8. Domain Architecture

A production setup can use:

app.example.com
    ↓
React Frontend

api.example.com
    ↓
Node.js API

ws.example.com
    ↓
WebSocket endpoint

Alternatively:

example.com
    ↓
Frontend

example.com/api
    ↓
Backend

The exact routing strategy depends on the hosting architecture.

## 9. DNS

DNS maps domain names to production services.

Example:

app.example.com
      ↓
Frontend Hosting

api.example.com
      ↓
API Load Balancer

DNS should be configured with:

Appropriate records
TLS certificates
Low-risk TTL strategy
Domain verification

## 10. HTTPS

All production traffic must use HTTPS.

`http://example.com`
       ↓
301/308 Redirect
       ↓
`https://example.com`

HTTPS should be used for:

Frontend
API
WebSockets
File access
Admin endpoints

## 11. TLS Certificates

TLS certificates can be managed by:

Cloudflare
AWS Certificate Manager
Let's Encrypt
Hosting provider

Certificates should be automatically renewed where possible.

## 12. Frontend Deployment

The React frontend is built into static assets.

Build process:

React Source
     ↓
npm run build
     ↓
Vite Build
     ↓
dist/
     ↓
CDN / Static Hosting

Typical output:

dist/
├── index.html
├── assets/
│   ├── index-xxxx.js
│   ├── index-xxxx.css
│   └── ...
└── ...

## 13. Frontend Environment Variables

Example:

VITE_API_URL=https://api.example.com
VITE_WS_URL=wss://api.example.com

Important:

Frontend environment variables must never contain private secrets.

Anything prefixed with VITE_ can potentially be exposed to the browser.

## 14. Backend Deployment

The backend is deployed as a Node.js application.

Build flow:

Source Code
    ↓
Install Dependencies
    ↓
Run Tests
    ↓
Build TypeScript
    ↓
Start Node.js

Example:

npm ci
npm run build
npm start

For development:

npm run dev

## 15. Backend Process

Production backend should run as a managed service.

Example:

Node.js Process
      │
      ├── Express
      ├── REST API
      └── Socket.IO

The process should restart automatically if it crashes.

Container orchestration or managed hosting can provide this behavior.

## 16. Containerization

Docker can be used to package the backend.

Example:

FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]

The exact Node.js version should match the project's supported runtime.

## 17. Docker Image

Build:

docker build -t project-manager-api .

Run:

docker run -p 5000:5000 project-manager-api

The production image should not contain:

.env
.git
node_modules from local machine
test artifacts
development secrets

## 18. Multi-Stage Docker Build

A production Docker image can use multi-stage builds.

Example:

FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/server.js"]

Benefits:

Smaller image
Fewer unnecessary dependencies
Better security
Faster deployment

## 19. Container Health Check

The backend should expose a health endpoint.

Example:

GET /health

Response:

{
  "status": "ok"
}

A more detailed internal health check can verify:

API
MongoDB
Redis
Queue

## 20. Readiness vs Liveness

Two different health checks can be used.

Liveness

Answers:

Is the process alive?

GET /health/live
Readiness

Answers:

Is the application ready to receive traffic?

GET /health/ready

Readiness may verify:

MongoDB connection
Redis connection
Required services

## 21. Load Balancing

Multiple API instances can run behind a load balancer.

                 Load Balancer
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       API #1        API #2        API #3

Benefits:

Higher availability
Horizontal scaling
Better traffic distribution
Rolling deployments

## 22. Stateless API

The API should remain as stateless as practical.

Do not store important session state only inside one Node.js process.

Instead use:

MongoDB
Redis

for shared state where required.

This allows:

API #1
API #2
API #3

to serve the same user.

## 23. Socket.IO Scaling

When multiple API instances handle WebSockets:

Client A
   ↓
API #1

Client B
   ↓
API #2

Events may need to be synchronized.

A Redis adapter can be used:

API #1 ─────┐
            │
API #2 ─────┼── Redis Pub/Sub
            │
API #3 ─────┘

This allows events to propagate between instances.

## 24. MongoDB Atlas

MongoDB Atlas is recommended for production database hosting.

Production database architecture:

Node.js API
     │
     ▼
MongoDB Atlas
     │
     ├── Replication
     ├── Backups
     ├── Monitoring
     └── Encryption

The exact cluster size should depend on application traffic.

## 25. MongoDB Network Security

The database should not be publicly open.

Use:

IP allowlisting
Private networking where available
Strong credentials
TLS
Database users with limited permissions

Architecture:

Internet
   X
   │
MongoDB

Backend
   │
   ▼
MongoDB

Only trusted application infrastructure should connect to the database.

## 26. MongoDB Connection Pooling

The Node.js application should use connection pooling.

Example:

mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 20,
  minPoolSize: 5
});

The exact values should be tuned according to workload.

When horizontally scaling:

API #1 → Connection Pool
API #2 → Connection Pool
API #3 → Connection Pool

Database connection limits must be considered.

## 27. Database Indexes

Production indexes should support common queries.

Examples:

{
  organizationId: 1,
  projectId: 1
}
{
  organizationId: 1,
  status: 1
}
{
  organizationId: 1,
  createdAt: -1
}

Indexes should be created based on actual query patterns.

## 28. Redis Deployment

Redis is used for:

Caching
Rate limiting
Sessions where applicable
Background jobs
WebSocket coordination

Architecture:

API
 │
 ├── Cache
 ├── Rate Limit
 ├── BullMQ
 └── Socket.IO Adapter
        │
        ▼
      Redis

## 29. Redis Persistence

Redis persistence requirements depend on the data.

For:

Cache

data loss may be acceptable.

For:

Queue Jobs

stronger persistence requirements may be needed.

The Redis configuration should match the importance of stored data.

## 30. Background Worker Deployment

BullMQ workers should run separately from the API process.

Architecture:

API
 │
 ▼
Redis Queue
 │
 ▼
Worker
 │
 ├── Notifications
 ├── Emails
 ├── Cleanup
 ├── Analytics
 └── Other Jobs

Example:

npm run worker

## 31. Worker Scaling

If job volume increases:

Redis
  │
  ├── Worker #1
  ├── Worker #2
  └── Worker #3

Workers can process jobs concurrently.

Concurrency must be configured carefully to avoid overloading:

MongoDB
Redis
External APIs
Email providers

## 32. Object Storage

Attachments should be stored outside the Node.js server filesystem.

Recommended options:

Cloudinary
AWS S3
Cloudflare R2

Architecture:

Client
  ↓
API
  ↓
Authorization
  ↓
Object Storage

The application server should not permanently store user uploads on its local disk.

## 33. File Upload Architecture

Recommended flow:

User
 ↓
Upload Request
 ↓
Authenticate
 ↓
Tenant Verification
 ↓
File Validation
 ↓
Object Storage
 ↓
Store Metadata in MongoDB

MongoDB stores:

fileId
organizationId
projectId
taskId
uploadedBy
storageKey
fileName
mimeType
size
createdAt

## 34. CDN

A CDN can be used for:

React static assets
Public assets
Optimized images
Cacheable content

Architecture:

User
  ↓
CDN Edge
  ↓
Cached Asset

Dynamic API requests should normally bypass static asset caching rules.

## 35. API Caching

Some read-heavy endpoints can use Redis caching.

Example:

GET /organizations/:id/dashboard

Flow:

Request
  ↓
Redis Cache
  │
  ├── HIT → Return Data
  │
  └── MISS
        ↓
      MongoDB
        ↓
      Redis
        ↓
      Response

Cache keys must include tenant context.

Example:

org:123:dashboard

## 36. Cache Invalidation

When data changes:

Task Updated
    ↓
Invalidate:
org:123:dashboard
org:123:project:456

Avoid stale tenant-specific data.

## 37. Environment Configuration

Configuration should be separated by environment.

.env.development
.env.test
.env.staging
.env.production

Production secrets should preferably be injected through the deployment platform's secret management system instead of storing a production .env file in the repository.

## 38. Production Environment Variables

Example:

NODE_ENV=production

PORT=5000

MONGODB_URI=`<secret>`

REDIS_URL=`<secret>`

ACCESS_TOKEN_SECRET=`<secret>`

REFRESH_TOKEN_SECRET=`<secret>`

CLIENT_URL=https://app.example.com

CLOUDINARY_CLOUD_NAME=<value>
CLOUDINARY_API_KEY=`<secret>`
CLOUDINARY_API_SECRET=`<secret>`

MAX_FILE_SIZE=10485760

## 39. Secret Management

Secrets should be stored using:

Cloud Secret Manager
Environment Secrets
Deployment Platform Secrets

Examples:

AWS Secrets Manager
Google Secret Manager
Azure Key Vault
GitHub Actions Secrets
Hosting Provider Secrets

Never commit secrets to Git.

## 40. CI/CD Architecture

The recommended deployment pipeline is:

Developer
   │
   ▼
Git Push
   │
   ▼
GitHub
   │
   ▼
GitHub Actions
   │
   ├── Lint
   ├── Type Check
   ├── Unit Tests
   ├── Integration Tests
   ├── Security Checks
   └── Build
          │
          ▼
       Staging
          │
          ▼
      E2E Tests
          │
          ▼
       Approval
          │
          ▼
      Production

## 41. CI Pipeline

Every pull request should run:

Install
   ↓
Lint
   ↓
Type Check
   ↓
Unit Tests
   ↓
Integration Tests
   ↓
Security Checks
   ↓
Build

A pull request should not be merged if required checks fail.

## 42. CD Pipeline

After merging into the production branch:

Git Merge
    ↓
Build
    ↓
Test
    ↓
Create Artifact / Docker Image
    ↓
Deploy
    ↓
Health Check
    ↓
Smoke Test
    ↓
Deployment Complete

## 43. Docker Image Registry

If Docker is used, images can be stored in:

GitHub Container Registry
AWS ECR
Google Artifact Registry
Docker Hub

Example:

ghcr.io/company/project-manager-api:1.0.0

Tags should be immutable where practical.

## 44. Versioning

Production deployments should use identifiable versions.

Example:

v1.0.0
v1.1.0
v1.1.1

or Git commit SHA:

a83f91d

This makes rollback easier.

## 45. Deployment Strategy

The preferred strategy is:

Rolling Deployment

Example:

Current:

API #1 ── Running
API #2 ── Running
API #3 ── Running

Deployment:

API #1 ── Updating
API #2 ── Running
API #3 ── Running

Then:

API #1 ── Running New Version
API #2 ── Updating
API #3 ── Running

Finally:

API #1 ── New
API #2 ── New
API #3 ── New

This minimizes downtime.

## 46. Blue-Green Deployment

For larger deployments, blue-green deployment can be used.

             Load Balancer
                  │
          ┌───────┴───────┐
          ▼               ▼
       BLUE             GREEN
      Current           New

After validation:

Traffic
  ↓
GREEN

Benefits:

Fast rollback
Reduced deployment risk

## 47. Database Migration Strategy

Database schema changes must be handled carefully.

Example:

Version 1
    ↓
Migration
    ↓
Version 2

For MongoDB, migrations may include:

Add field
Create index
Backfill data
Rename field
Remove obsolete field

## 48. Backward-Compatible Migrations

Prefer:

Expand
  ↓
Deploy
  ↓
Migrate Data
  ↓
Switch Application
  ↓
Contract

Example:

Old field: fullName

New field: firstName + lastName

Do not immediately remove fullName if old application instances may still depend on it.

## 49. Database Backup

Production database backups should be enabled.

Backup strategy:

Automatic Backup
      +
Periodic Snapshot
      +
Retention Policy

Example:

Daily
Weekly
Monthly

The exact schedule depends on business requirements.

## 50. Backup Verification

A backup is not useful unless it can be restored.

Regularly test:

Backup
  ↓
Restore
  ↓
Validate Data
  ↓
Application Connection

Restore testing should be performed in an isolated environment.

## 51. Recovery Point Objective

RPO defines:

How much data loss is acceptable?

Example:

RPO = 1 hour

This means the system should aim to lose no more than approximately one hour of data in a disaster.

The actual target depends on infrastructure and business requirements.

## 52. Recovery Time Objective

RTO defines:

How quickly should the service be restored?

Example:

RTO = 2 hours

This means the application should aim to recover within approximately two hours after a major failure.

## 53. Disaster Recovery

Disaster recovery process:

Incident
   ↓
Detect
   ↓
Assess
   ↓
Restore Infrastructure
   ↓
Restore Database
   ↓
Restore Configuration
   ↓
Verify Services
   ↓
Run Smoke Tests
   ↓
Resume Traffic

## 54. Logging

Production logs should include:

Request ID
Timestamp
HTTP method
Endpoint
Status code
Response time
User ID
Organization ID
Error information

Example:

{
  "requestId": "req_123",
  "method": "PATCH",
  "endpoint": "/api/v1/tasks/123",
  "status": 200,
  "userId": "user_123",
  "organizationId": "org_123",
  "duration": 120
}

## 55. Log Levels

Recommended levels:

ERROR
WARN
INFO
DEBUG

Production should generally use:

INFO
WARN
ERROR

Debug logging should be controlled through configuration.

## 56. Error Monitoring

An error-monitoring service such as Sentry can track:

Unhandled exceptions
API errors
Frontend errors
Performance issues
Release regressions

Example:

React Error
   ↓
Sentry

Node.js Exception
   ↓
Sentry

## 57. Application Metrics

Important metrics:

Request count
Error rate
Response latency
CPU usage
Memory usage
Database connections
Redis usage
Queue depth
Worker failures
WebSocket connections

## 58. Health Monitoring

Monitor:

API health
MongoDB connectivity
Redis connectivity
Worker health
Queue health
Storage availability

Example:

API
 ├── Healthy
MongoDB
 ├── Healthy
Redis
 ├── Healthy
Worker
 ├── Healthy

## 59. Alerting

Alerts should be configured for important failures.

Examples:

High 5xx error rate
High latency
Database unavailable
Redis unavailable
Queue backlog
Worker failures
High CPU
High memory
Disk/storage issues
Certificate expiration

## 60. Graceful Shutdown

The Node.js application should gracefully handle shutdown signals.

Example:

process.on("SIGTERM", async () => {

  server.close();

  await mongoose.connection.close();

  await redis.quit();

  process.exit(0);
});

This allows:

Existing requests to finish
Database connections to close
Redis connections to close
Workers to stop safely

## 61. Zero-Downtime Deployment

During deployment:

Old Instance
    ↓
Continue Serving
    ↓
New Instance Starts
    ↓
Health Check
    ↓
Traffic Shift
    ↓
Old Instance Stops

This avoids unnecessary downtime.

## 62. Graceful Worker Shutdown

Workers should stop accepting new jobs during deployment.

Flow:

SIGTERM
   ↓
Stop New Jobs
   ↓
Finish Current Job
   ↓
Close Redis
   ↓
Exit

This reduces duplicate or partially processed jobs.

## 63. Health Check Example

app.get("/health/live", (req, res) => {
  res.status(200).json({
    status: "ok"
  });
});

Readiness:

app.get("/health/ready", async (req, res) => {

  const mongoReady =
    mongoose.connection.readyState === 1;

  if (!mongoReady) {
    return res.status(503).json({
      status: "not_ready"
    });
  }

  res.json({
    status: "ready"
  });
});

The production implementation should also consider Redis and other critical dependencies.

## 64. Production Security Checklist

□ HTTPS enabled
□ Secure cookies enabled
□ CORS restricted
□ Security headers configured
□ Database private
□ Redis private
□ Secrets protected
□ Rate limiting enabled
□ File upload restrictions enabled
□ Tenant isolation enabled
□ Monitoring enabled
□ Backups enabled
□ Dependency scanning enabled

## 65. Production Performance Checklist

□ Database indexes created
□ Connection pooling configured
□ Redis caching configured where useful
□ CDN configured
□ Compression enabled
□ Static assets optimized
□ Images optimized
□ API pagination implemented
□ Background jobs separated
□ Slow queries monitored

## 66. Production Database Checklist

□ Production database created
□ Strong database credentials
□ Network restrictions
□ TLS enabled
□ Backups enabled
□ Restore procedure tested
□ Indexes verified
□ Monitoring enabled
□ Connection pool configured

## 67. Production Deployment Checklist

Before deployment:

□ Tests passing
□ Build passing
□ Environment variables configured
□ Database migration reviewed
□ Docker image built
□ Security checks passed
□ Backup verified
□ Deployment version tagged

During deployment:

□ Deploy application
□ Check health endpoint
□ Check logs
□ Check database connection
□ Check Redis
□ Check workers
□ Run smoke tests

After deployment:

□ Monitor errors
□ Monitor latency
□ Monitor CPU/memory
□ Verify critical user flows
□ Confirm WebSockets
□ Confirm background jobs

## 68. Rollback Strategy

If a deployment introduces a critical problem:

Detect Problem
      ↓
Stop Deployment
      ↓
Identify Previous Version
      ↓
Rollback Application
      ↓
Verify Health
      ↓
Run Smoke Tests
      ↓
Monitor

Example:

Current:
v1.4.0

Problem:
v1.4.0

Rollback:
v1.3.2

## 69. Database Rollback Considerations

Application rollback is not always enough.

If a database migration has changed data:

Application
   ↓
v2
   ↓
Database Migration

rolling the application back to v1 may not work.

Therefore:

Database migrations must be designed to be backward compatible whenever possible.

Destructive migrations should require extra review.

## 70. Deployment Failure Handling

If deployment fails:

Build Failure
    ↓
Do Not Deploy

If health check fails:

Deployment
    ↓
Health Check
    ↓
FAIL
    ↓
Rollback

If smoke test fails:

Deployment
    ↓
Smoke Test
    ↓
FAIL
    ↓
Investigate / Rollback

## 71. Git Branching Strategy

Recommended:

main
 │
 ├── feature/authentication
 ├── feature/projects
 ├── feature/tasks
 ├── feature/notifications
 └── fix/task-security

Workflow:

Feature Branch
      ↓
Pull Request
      ↓
CI Tests
      ↓
Code Review
      ↓
Merge
      ↓
Staging
      ↓
Production

## 72. Pull Request Requirements

Every pull request should include:

Description
Changes
Testing Performed
Security Considerations
Database Changes
Environment Changes
Screenshots if UI changes

Example:

Feature:
Task Assignment

Testing:
- Unit tests
- API tests
- Cross-tenant tests
- E2E test

Database:
No migration

Security:
Assignee must belong to same organization

## 73. Release Versioning

Use semantic versioning:

MAJOR.MINOR.PATCH

Example:

1.0.0
1.1.0
1.1.1
2.0.0

Meaning:

MAJOR
Breaking changes

MINOR
New backward-compatible features

PATCH
Bug fixes

## 74. Release Notes

Each production release should document:

Version
Date
Features
Bug Fixes
Security Changes
Database Changes
Breaking Changes
Known Issues

Example:

Version: 1.2.0

Features:
- Task comments
- File attachments

Security:
- Improved tenant validation

Bug Fixes:
- Fixed task pagination

## 75. Deployment Architecture Diagram

                           INTERNET
                              │
                              ▼
                       DNS / CLOUDFLARE
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
          React Frontend              API Load Balancer
          CDN / Static Host                  │
                                             │
                           ┌─────────────────┼─────────────────┐
                           │                 │                 │
                           ▼                 ▼                 ▼
                        API #1             API #2             API #3
                           │                 │                 │
                           └─────────────────┼─────────────────┘
                                             │
                    ┌────────────────────────┼──────────────────────┐
                    │                        │                      │
                    ▼                        ▼                      ▼
                MongoDB                   Redis                Object Storage
                Atlas                     │                    S3/Cloudinary
                    │                      │
                    │              ┌───────┴────────┐
                    │              ▼                ▼
                    │          BullMQ Queue     Socket Adapter
                    │              │
                    │              ▼
                    │           Worker
                    │
                    ▼
                 Backups

                         Monitoring
                             │
                ┌────────────┼────────────┐
                ▼            ▼            ▼
             Logs         Metrics       Errors

## 76. Complete CI/CD Architecture

                    Developer
                        │
                        ▼
                    Git Push
                        │
                        ▼
                     GitHub
                        │
                        ▼
                  GitHub Actions
                        │
             ┌──────────┼──────────┐
             │          │          │
             ▼          ▼          ▼
           Lint       Tests      Security
             │          │          │
             └──────────┼──────────┘
                        │
                        ▼
                      Build
                        │
                        ▼
                    Docker Image
                        │
                        ▼
                     Staging
                        │
                        ▼
                    E2E Tests
                        │
                        ▼
                     Approval
                        │
                        ▼
                   Production
                        │
                        ▼
                  Health Checks
                        │
                        ▼
                  Smoke Tests
                        │
                        ▼
                   Monitoring

## 77. Recommended Project Deployment Structure

project-manager-saas/
│
├── client/
│   └── React Application
│
├── server/
│   └── Express API
│
├── worker/
│   └── BullMQ Workers
│
├── shared/
│   └── Shared Types / Utilities
│
├── docker/
│   ├── Dockerfile.api
│   └── Dockerfile.worker
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── docs/
│   ├── 01-requirements.md
│   ├── 02-system-design.md
│   ├── 03-database-design.md
│   ├── 04-api-documentation.md
│   ├── 05-authentication-authorization.md
│   ├── 06-multi-tenancy.md
│   ├── 07-security.md
│   ├── 08-testing.md
│   └── 09-deployment.md
│
└── README.md

## 78. Production Deployment Sequence

The complete deployment sequence is:

1. Developer creates feature
          ↓
2. Feature branch
          ↓
3. Pull Request
          ↓
4. Automated CI
          ↓
5. Code Review
          ↓
6. Merge to develop/main
          ↓
7. Build Application
          ↓
8. Run Tests
          ↓
9. Build Docker Image
          ↓
10. Push Image to Registry
          ↓
11. Deploy to Staging
          ↓
12. Run E2E Tests
          ↓
13. Validate Application
          ↓
14. Deploy to Production
          ↓
15. Health Check
          ↓
16. Smoke Tests
          ↓
17. Monitor

## 79. Production Observability

The production system should provide three major observability areas:

             Observability
                  │
        ┌─────────┼─────────┐
        │         │         │
        ▼         ▼         ▼
       Logs     Metrics    Traces
Logs

What happened?

Metrics

How much / how often?

Traces

Where did the request spend time?

## 80. Important Production Metrics

Track:

API:
- Requests/sec
- Error rate
- P95 latency
- P99 latency

Database:
- Query latency
- Connections
- CPU
- Storage

Redis:
- Memory
- Commands/sec
- Connections

Workers:
- Queue depth
- Processing time
- Failed jobs
- Retry count

WebSockets:
- Active connections
- Connection failures
- Event throughput

## 81. Scalability Strategy

The application can scale horizontally.

Initial:

1 API
1 Worker
1 Redis
1 MongoDB Cluster

Growing:

3 API Instances
2 Workers
Managed Redis
MongoDB Cluster
CDN

Large scale:

Multiple API Instances
Multiple Worker Pools
Redis Cluster
MongoDB Scaling
CDN
Dedicated Monitoring

## 82. Horizontal Scaling

API scaling:

Traffic
  ↓
Load Balancer
  ├── API #1
  ├── API #2
  ├── API #3
  └── API #4

Because the API is designed to be stateless, additional instances can be added without changing application logic.

## 83. Worker Scaling

Worker scaling depends on queue volume.

                 Redis Queue
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
   Worker #1     Worker #2     Worker #3

Different queues may be created for:

notifications
emails
analytics
cleanup

## 84. Tenant-Aware Scalability

Multi-tenancy should remain consistent when scaling.

Example:

API #1
 └── Organization A

API #2
 └── Organization B

API #3
 └── Organization C

But this assignment is not permanent.

Any API instance must be able to serve any organization:

Organization A
      ↓
API #1 / API #2 / API #3

Tenant isolation comes from authorization and tenant-scoped queries, not from routing a tenant to a specific server.

## 85. Cost Optimization

For an early-stage SaaS:

Frontend:
Free/low-cost CDN

Backend:
Small managed container

Database:
Small MongoDB Atlas cluster

Redis:
Small managed Redis instance

Storage:
Cloudinary/S3/R2

Monitoring:
Free/low-cost tier

Scale infrastructure only when actual usage requires it.

## 86. Security During Deployment

Deployment credentials should be separate from application credentials.

Example:

GitHub Actions
     ↓
Deployment Secret
     ↓
Cloud Provider

Production database credentials should not be exposed to CI unless absolutely required.

## 87. Deployment Secrets

GitHub Actions may use:

DEPLOY_TOKEN
CLOUD_ACCESS_KEY
CLOUD_SECRET
REGISTRY_TOKEN

These should be stored as encrypted repository/environment secrets.

Never write:

password: mypassword

inside workflow files.

## 88. Production Access Control

Only authorized team members should have production access.

Roles can include:

Developer
Reviewer
DevOps
Administrator

Production database access should be more restricted than application access.

## 89. Infrastructure as Code

For larger deployments, infrastructure can be managed through:

Terraform
Pulumi
AWS CDK
CloudFormation

Benefits:

Reproducibility
Version control
Easier disaster recovery
Consistent environments

For a portfolio project, this can be added as an advanced feature.

## 90. Optional Kubernetes Deployment

Kubernetes is not required for the initial version.

If the system grows significantly:

Kubernetes Cluster
      │
      ├── API Pods
      ├── Worker Pods
      ├── Ingress
      └── Autoscaling

Kubernetes should only be introduced when the operational complexity is justified.

## 91. Deployment Testing

Before production deployment:

Unit Tests
    ↓
Integration Tests
    ↓
Security Tests
    ↓
Build
    ↓
Staging Deployment
    ↓
E2E Tests
    ↓
Smoke Tests
    ↓
Production

## 92. Post-Deployment Verification

Immediately after deployment:

□ Frontend loads
□ Login works
□ Registration works
□ API responds
□ MongoDB connected
□ Redis connected
□ Worker running
□ WebSocket connection works
□ Project creation works
□ Task creation works
□ File upload works
□ Notifications work
□ Tenant isolation works

## 93. Rollback Checklist

If something goes wrong:

□ Identify failed release
□ Stop rollout
□ Check logs
□ Check database changes
□ Roll back application
□ Verify health
□ Run smoke tests
□ Check background workers
□ Check WebSockets
□ Monitor error rate
□ Document incident

## 94. Deployment Documentation

Every production deployment should record:

Version
Deployment Date
Commit SHA
Changes
Database Migrations
Environment Changes
Known Issues
Rollback Version
Deployment Status

Example:

Version: v1.3.0

Commit:
8a93d12

Changes:
- Added task attachments
- Added notifications

Database:
Added attachment indexes

Rollback:
v1.2.1

Status:
Successful

## 95. Final Deployment Checklist

Application
□ Production build successful
□ Environment configured
□ Health endpoint available
□ Graceful shutdown implemented
□ Logging enabled
Database
□ MongoDB production cluster configured
□ Network access restricted
□ Indexes created
□ Backups enabled
□ Restore process tested
Redis
□ Redis configured
□ Authentication enabled
□ Private access
□ Queue configured
□ Cache configured
Storage
□ Object storage configured
□ File size limits
□ File type validation
□ Private storage
□ Signed URLs
Security
□ HTTPS
□ CORS
□ Helmet/security headers
□ Rate limiting
□ Secrets protected
□ Tenant isolation
□ RBAC
CI/CD
□ CI pipeline
□ Automated tests
□ Security checks
□ Production build
□ Staging deployment
□ E2E tests
□ Production deployment
Monitoring
□ Error monitoring
□ Logs
□ Metrics
□ Health checks
□ Alerts
□ Database monitoring
□ Queue monitoring

## 96. Final Production Architecture

                              USERS
                                │
                                ▼
                         DNS / CDN / TLS
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
                 ▼                             ▼
           React Frontend                Load Balancer
           Static Hosting                      │
                                               ▼
                                  ┌────────────┼────────────┐
                                  │            │            │
                                  ▼            ▼            ▼
                               API #1       API #2       API #3
                                  │            │            │
                                  └────────────┼────────────┘
                                               │
                         ┌─────────────────────┼─────────────────────┐
                         │                     │                     │
                         ▼                     ▼                     ▼
                    MongoDB Atlas          Redis              Object Storage
                         │                     │                     │
                         │              ┌──────┴──────┐              │
                         │              │             │              │
                         │              ▼             ▼              │
                         │          BullMQ        Socket.IO          │
                         │           Queue          Adapter           │
                         │              │             │              │
                         │              ▼             │              │
                         │           Workers          │              │
                         │              │             │              │
                         └──────────────┼─────────────┼──────────────┘
                                        │             │
                                        ▼             ▼
                                    Monitoring     Logging
                                        │
                                        ▼
                                     Alerts

## 97. Final Deployment Flow

Developer
    │
    ▼
GitHub
    │
    ▼
CI
    │
    ├── Lint
    ├── Type Check
    ├── Unit Tests
    ├── Integration Tests
    ├── Security Tests
    └── Build
           │
           ▼
        Staging
           │
           ▼
       E2E Tests
           │
           ▼
       Production
           │
           ├── API
           ├── Worker
           ├── MongoDB
           ├── Redis
           └── Storage
                  │
                  ▼
             Monitoring
                  │
                  ▼
               Alerts

## 98. Final Deployment Principles

The project follows these principles:

Never deploy untested code to production.

Never store production secrets in Git.

Never expose MongoDB or Redis directly to the public internet.

Always use HTTPS in production.

Always maintain database backups.

Always test backup restoration.

Keep the API stateless where possible.

Use managed infrastructure where it reduces unnecessary operational complexity.

Use rolling or blue-green deployments to minimize downtime.

Monitor the application after every deployment.

Always maintain a rollback path.

## 99. Final System Deployment Summary

The Multi-Tenant Project Management SaaS is designed to move from a simple development environment to a scalable production architecture.

The initial deployment can be:

React
  ↓
Managed Static Hosting

Node.js
  ↓
Managed Container

MongoDB
  ↓
MongoDB Atlas

Redis
  ↓
Managed Redis

Files
  ↓
Cloudinary / S3

Workers
  ↓
Managed Worker Process

As the application grows, it can evolve toward:

CDN
 ↓
Load Balancer
 ↓
Multiple API Instances
 ↓
Managed MongoDB Cluster
 ↓
Redis
 ↓
Multiple Worker Instances
 ↓
Object Storage
 ↓
Monitoring + Alerting

This architecture provides a practical balance between:

Security
+
Reliability
+
Scalability
+
Maintainability
+
Cost Efficiency

while keeping the application suitable for an early-stage SaaS product and demonstrating production-level engineering practices.
