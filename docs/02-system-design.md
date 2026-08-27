# Multi-Tenant Project Management SaaS

## System Design Document

**Document:** 02-system-design.md
**Version:** 1.0
**Status:** Draft
**Project Type:** Multi-Tenant SaaS / Project Management Platform

---

## 1. Overview

The Multi-Tenant Project Management SaaS is a full-stack collaborative platform that allows multiple organizations to manage projects, teams, tasks, comments, files, notifications, and activity logs through a single application.

The system is designed around the following principles:

* Multi-tenant data isolation
* Secure authentication
* Role-based authorization
* Modular backend architecture
* RESTful APIs
* Real-time collaboration
* Asynchronous background processing
* Redis-based caching
* MongoDB-based persistence
* Horizontal scalability
* Containerized deployment

The architecture follows a **modular monolith** approach for the initial version.

This provides clear separation between modules without introducing the operational complexity of microservices.

---

## 2. Design Goals

The system should provide:

1. Strong tenant isolation.
2. Secure authentication and authorization.
3. Clear separation of business logic.
4. Efficient database access.
5. Real-time collaboration.
6. Reliable asynchronous processing.
7. Scalable API architecture.
8. Consistent error handling.
9. Easy testing and maintenance.
10. Simple deployment and future scalability.

---

## 3. Architecture Style

The initial implementation will use a:

> **Modular Monolith Architecture**

The backend runs as one deployable application but is internally divided into independent business modules.

```text id="1h9y6v"
                    Backend Application
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
       Auth Module    Organization      Project Module
                          Module
          │                │                │
          └────────────────┼────────────────┘
                           │
                      Shared Services
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
           MongoDB       Redis        Queue
```

This architecture provides:

* Simpler development
* Easier debugging
* Shared code and types
* Lower infrastructure complexity
* Clear module boundaries
* Easier future migration to microservices

---

## 4. High-Level System Architecture

```text id="8h7p1c"
                         ┌─────────────────────┐
                         │      Browser        │
                         │   React + TS        │
                         └──────────┬──────────┘
                                    │
                          HTTPS / WebSocket
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Reverse Proxy    │
                         │   / Load Balancer   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Node.js + Express │
                         │      REST API       │
                         └──────────┬──────────┘
                                    │
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
             ▼                      ▼                      ▼
       ┌───────────┐          ┌───────────┐          ┌───────────┐
       │  MongoDB  │          │   Redis   │          │ Socket.IO │
       │           │          │           │          │           │
       └───────────┘          └─────┬─────┘          └───────────┘
                                    │
                                    ▼
                              ┌───────────┐
                              │  BullMQ   │
                              │   Queue   │
                              └─────┬─────┘
                                    │
                                    ▼
                              ┌───────────┐
                              │  Workers  │
                              └───────────┘
```

---

## 5. Client Architecture

The frontend will be implemented using React and TypeScript.

Main responsibilities:

* Render UI
* Manage client-side state
* Communicate with REST APIs
* Maintain authentication state
* Establish WebSocket connections
* Display real-time updates
* Handle loading/error states
* Perform client-side validation
* Provide responsive UI

The frontend must not be responsible for enforcing authorization.

Authorization must always be enforced by the backend.

---

## 6. Frontend Structure

Recommended structure:

```text id="e6td7s"
client/
│
├── src/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── forms/
│   │   ├── modals/
│   │   └── common/
│   │
│   ├── pages/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── organizations/
│   │   ├── projects/
│   │   └── settings/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── organizations/
│   │   ├── projects/
│   │   ├── tasks/
│   │   ├── comments/
│   │   └── notifications/
│   │
│   ├── hooks/
│   ├── services/
│   ├── store/
│   ├── routes/
│   ├── sockets/
│   ├── types/
│   ├── utils/
│   └── main.tsx
```

Feature-based organization keeps related frontend functionality together.

---

## 7. Backend Architecture

The backend will follow a layered modular architecture.

```text id="ihq5f6"
Request
   │
   ▼
Route
   │
   ▼
Middleware
   │
   ├── Authentication
   ├── Validation
   └── Authorization
   │
   ▼
Controller
   │
   ▼
Service
   │
   ▼
Repository / Model
   │
   ▼
MongoDB
```

---

## 8. Backend Layers

## 8.1 Routes

Routes define HTTP endpoints.

Example:

```text id="c9sz3p"
POST /api/v1/projects
GET  /api/v1/projects
GET  /api/v1/projects/:id
PATCH /api/v1/projects/:id
DELETE /api/v1/projects/:id
```

Routes should remain thin and delegate processing to controllers.

---

## 9. Middleware Layer

Middleware handles cross-cutting concerns.

Examples:

```text id="m1e7ga"
Authentication
Authorization
Request validation
Rate limiting
Logging
Error handling
CORS
Security headers
```

Example request pipeline:

```text id="v48yzz"
Request
  ↓
CORS
  ↓
Rate Limiter
  ↓
Authentication
  ↓
Validation
  ↓
Authorization
  ↓
Controller
```

---

## 10. Controller Layer

Controllers handle HTTP-specific responsibilities.

They should:

* Read request data
* Call services
* Return responses
* Pass errors to centralized error middleware

Controllers should not contain complex business logic.

Example:

```text id="x1k0h6"
Controller
    ↓
projectService.createProject()
    ↓
Response
```

---

## 11. Service Layer

The service layer contains business logic.

Examples:

```text id="ml8p6x"
auth.service.ts
organization.service.ts
project.service.ts
task.service.ts
invitation.service.ts
notification.service.ts
```

Example:

```text id="q4bd6q"
createTask()
    │
    ├── Verify organization membership
    ├── Verify project access
    ├── Validate assignee
    ├── Create task
    ├── Create activity
    ├── Queue notification
    └── Emit socket event
```

---

## 12. Repository / Data Access Layer

Database-specific operations should be separated where beneficial.

Example:

```text id="u2es7k"
taskRepository.findById()
taskRepository.findByProject()
taskRepository.create()
taskRepository.update()
```

This prevents controllers from directly implementing database queries.

---

## 13. Core Modules

The backend will contain the following modules:

```text id="mm5kff"
auth
users
organizations
memberships
invitations
projects
tasks
comments
attachments
notifications
activities
analytics
```

Infrastructure modules:

```text id="4lkn6e"
database
redis
queues
workers
sockets
logging
```

---

## 14. Request Lifecycle

A typical authenticated request:

```text id="o2w9a0"
Client
  │
  │ GET /api/v1/projects
  ▼
Express Router
  │
  ▼
Rate Limiter
  │
  ▼
Auth Middleware
  │
  ├── Validate Access Token
  └── Identify User
  │
  ▼
Organization Context
  │
  ├── Verify Membership
  └── Determine Role
  │
  ▼
Controller
  │
  ▼
Project Service
  │
  ▼
Project Repository
  │
  ▼
MongoDB
  │
  ▼
Response
```

---

## 15. Authentication Architecture

Authentication uses:

* Access token
* Refresh token
* Secure cookie/session mechanism

Conceptual flow:

```text id="f2y4u8"
              Login
                │
                ▼
        Verify Credentials
                │
                ▼
       ┌────────┴────────┐
       ▼                 ▼
Access Token       Refresh Token
(short-lived)      (long-lived)
       │                 │
       ▼                 ▼
   API Requests      Secure Storage
```

Access tokens should have a relatively short lifetime.

Refresh tokens should be securely stored and revocable.

Detailed authentication design will be covered in:

```text
05-authentication-authorization.md
```

---

## 16. Organization Context

Every authenticated organization-scoped request must establish an organization context.

Example:

```text id="w4twx6"
User
 │
 ▼
Authentication
 │
 ▼
Organization Membership
 │
 ▼
Current Organization
 │
 ▼
Authorization
 │
 ▼
Resource Query
```

The backend must verify that the user belongs to the requested organization.

The organization ID should not be trusted merely because it was supplied by the frontend.

---

## 17. Multi-Tenant Data Architecture

The system uses:

> **Shared application + shared database + logical tenant isolation**

Example:

```text id="5rrq57"
MongoDB
│
├── users
├── organizations
├── memberships
├── projects
├── tasks
├── comments
├── notifications
└── activities
```

Tenant-owned collections contain:

```text
organizationId
```

Example:

```js id="b3v6t6"
{
  _id: "...",
  title: "Implement authentication",
  organizationId: "org_123",
  projectId: "project_456"
}
```

Detailed tenant isolation will be documented in:

```text
06-multi-tenancy.md
```

---

## 18. Project and Task Architecture

The hierarchy is:

```text id="ql4m8e"
Organization
     │
     ├── Project
     │     │
     │     ├── Task
     │     │    ├── Comments
     │     │    └── Attachments
     │     │
     │     └── Members
     │
     └── Members
```

A task belongs to:

* One organization
* One project
* One creator
* Zero or one primary assignee

---

## 19. Real-Time Architecture

Socket.IO will be used for real-time collaboration.

Clients connect using authenticated sessions.

After connection:

```text id="3m38g6"
Socket Connection
       │
       ▼
Authenticate Socket
       │
       ▼
Join Organization Room
       │
       ▼
Join Project Room
```

Example room structure:

```text id="sn1u8w"
organization:org_123
project:project_456
```

When a task changes:

```text id="r5z7jo"
User A
  │
  ▼
PATCH /tasks/123
  │
  ▼
MongoDB
  │
  ▼
Socket.IO
  │
  ▼
project:project_456
  │
  ├── User B
  ├── User C
  └── User D
```

Only authorized users should receive the event.

---

## 20. Event Architecture

Example events:

```text id="njtx1c"
task.created
task.updated
task.deleted

comment.created
comment.updated
comment.deleted

notification.created

project.updated

member.joined
member.removed
```

Event payloads should contain only the information required by clients.

Sensitive server-side information should never be broadcast.

---

## 21. Redis Architecture

Redis has three major responsibilities.

## 21.1 Cache

```text id="1h7az1"
API
 │
 ▼
Redis
 │
 ├── HIT → Return
 │
 └── MISS
       ↓
    MongoDB
       ↓
    Redis
       ↓
    Return
```

---

## 21.2 Rate Limiting

Redis stores counters such as:

```text
rate-limit:user:123
rate-limit:ip:192.168.x.x
```

with an expiration window.

---

## 21.3 Queue Backend

BullMQ uses Redis for job storage and coordination.

```text id="8a2oz5"
API
 │
 ▼
BullMQ
 │
 ▼
Redis
 │
 ▼
Worker
```

---

## 22. Background Job Architecture

Workers handle operations that don't need to block HTTP requests.

Example:

```text id="f0h5fs"
                    API
                     │
                     ▼
                Create Event
                     │
                     ▼
                  BullMQ
                     │
             ┌───────┼────────┐
             ▼       ▼        ▼
          Email   Reminder  Notification
             │       │        │
             └───────┼────────┘
                     ▼
                  Worker
```

Jobs should support:

* Retry attempts
* Exponential/backoff delays where appropriate
* Failed job handling
* Idempotent processing

---

## 23. Notification Architecture

Notification generation can be asynchronous.

Example:

```text id="q1a3r8"
Task Assigned
      │
      ▼
Task Service
      │
      ├── Save Task
      │
      ├── Activity Log
      │
      ├── Socket Event
      │
      └── Notification Job
                    │
                    ▼
                  Worker
                    │
                    ▼
             Notification DB
```

The user can then receive:

```text
🔔 You were assigned a new task.
```

---

## 24. File Upload Architecture

Files should not pass through MongoDB.

Recommended flow:

```text id="lqv2zi"
Browser
  │
  ▼
Backend
  │
  ├── Authentication
  ├── Authorization
  ├── File validation
  │
  ▼
Cloudinary / Object Storage
  │
  ▼
File URL + Metadata
  │
  ▼
MongoDB
```

MongoDB stores metadata rather than file binary data.

---

## 25. Caching Strategy

Caching should be applied only to appropriate resources.

Potential cache:

```text id="9q0grk"
Organization Details
Project Summary
Dashboard Statistics
Frequently Accessed Metadata
```

Example:

```text id="cxyrha"
Cache Key:

org:org_123:dashboard
```

When project/task data changes, relevant cache entries must be invalidated.

Example:

```text id="5y40sr"
Task Updated
   ↓
Invalidate project dashboard cache
   ↓
Update MongoDB
   ↓
Return response
```

---

## 26. Database Architecture

MongoDB will be the primary persistence layer.

Main collections:

```text id="9m3g7x"
users
organizations
memberships
invitations
projects
tasks
comments
attachments
notifications
activities
```

Relationships will primarily use references.

Example:

```text id="h3e8yp"
Organization
    │
    ├── _id
    │
    └────── organizationId ──── Project
                                  │
                                  └── projectId ──── Task
```

Detailed schema design will be documented in:

```text
03-database-design.md
```

---

## 27. Database Query Strategy

The application should avoid unbounded queries.

Bad:

```js id="n7s9ib"
Task.find({
  organizationId
});
```

when thousands of tasks may exist.

Better:

```js id="1l93op"
Task.find({
  organizationId,
  projectId,
  status
})
.skip(skip)
.limit(limit)
```

Queries should use appropriate indexes.

---

## 28. Pagination Strategy

For normal administrative/task lists, page-based pagination may be used:

```text id="v5n4df"
GET /tasks?page=1&limit=20
```

For very large or frequently changing datasets, cursor-based pagination may be introduced.

Example:

```text id="7at2ag"
GET /tasks?cursor=<lastTaskId>&limit=20
```

The strategy should be selected according to the resource.

---

## 29. API Response Architecture

All APIs should follow a predictable response format.

Success:

```json id="x3c2is"
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Project"
  }
}
```

Paginated response:

```json id="w2c1tg"
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Error:

```json id="c9r3ws"
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action."
  }
}
```

---

## 30. Error Handling Architecture

Errors should flow through a centralized mechanism.

```text id="wz5q0g"
Controller
    │
    ▼
Service
    │
    ▼
Error
    │
    ▼
Global Error Middleware
    │
    ├── Validation Error
    ├── Authentication Error
    ├── Authorization Error
    ├── Not Found
    ├── Conflict
    └── Internal Error
    │
    ▼
Standard JSON Response
```

Internal errors should be logged but sensitive implementation details should not be returned to clients.

---

## 31. Security Architecture

Security is applied at multiple layers.

```text id="e5h9k4"
                    Client
                      │
                      ▼
                 HTTPS/TLS
                      │
                      ▼
               Reverse Proxy
                      │
                      ▼
                Rate Limiting
                      │
                      ▼
              Authentication
                      │
                      ▼
              Authorization
                      │
                      ▼
             Tenant Isolation
                      │
                      ▼
              Input Validation
                      │
                      ▼
                  Database
```

Additional protections include:

* Secure cookies
* Security headers
* CORS restrictions
* Password hashing
* File validation
* Token expiration
* Request size limits
* Audit logging

Detailed security requirements will be documented in:

```text
07-security.md
```

---

## 32. Scalability Strategy

The initial architecture should support horizontal scaling.

```text id="1k0d1w"
                 Load Balancer
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       API #1       API #2      API #3
          │           │           │
          └───────────┼───────────┘
                      │
             ┌────────┴────────┐
             ▼                 ▼
          MongoDB            Redis
                                │
                                ▼
                           BullMQ Workers
```

Because application state should not depend on a single server's local memory, multiple API instances can operate simultaneously.

---

## 33. Socket Scaling

When multiple backend instances handle WebSocket connections, Socket.IO requires a shared coordination mechanism.

Redis can be introduced as the Socket.IO adapter.

Conceptually:

```text id="0b7y3u"
Client A
   │
   ▼
API Server 1
   │
   ▼
Redis Pub/Sub
   │
   ▼
API Server 2
   │
   ▼
Client B
```

This allows events to reach clients connected to different backend instances.

This is an advanced scalability feature and can be introduced after the single-server implementation works.

---

## 34. Background Worker Scaling

Workers can also be horizontally scaled.

```text id="c6a3ju"
              BullMQ
                 │
      ┌──────────┼──────────┐
      ▼          ▼          ▼
 Worker 1     Worker 2    Worker 3
```

The queue coordinates jobs so that workers can process them independently.

---

## 35. Observability Architecture

The application should expose:

```text id="l7h4c2"
GET /health
```

Health checks should verify critical dependencies.

```text id="z4d0yq"
Application
   │
   ├── MongoDB ✓
   ├── Redis ✓
   └── Queue ✓
```

Logging should capture:

* Request ID
* HTTP method
* Endpoint
* Status code
* Response time
* User ID where appropriate
* Organization ID where appropriate
* Error information

Secrets and authentication credentials must never be logged.

---

## 36. Deployment Architecture

Production deployment:

```text id="8e7a1m"
                    Internet
                       │
                       ▼
                 Load Balancer
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
        Frontend CDN          Backend API
                                  │
                 ┌────────────────┼────────────────┐
                 ▼                ▼                ▼
              MongoDB           Redis           Workers
                 │                                 │
                 │                                 ▼
                 │                              BullMQ
                 │
                 ▼
             Backups
```

Object storage:

```text
Cloudinary / S3
```

is used for uploaded files.

---

## 37. Environment Configuration

Configuration should be separated by environment.

```text id="l8c6jy"
.env.development
.env.test
.env.production
```

Example:

```text id="2wx9fo"
NODE_ENV
PORT
MONGODB_URI
REDIS_URL

ACCESS_TOKEN_SECRET
REFRESH_TOKEN_SECRET

CLOUDINARY_URL

EMAIL_HOST
EMAIL_USER
EMAIL_PASSWORD
```

Production secrets should be managed through the deployment platform's secret management system.

---

## 38. Recommended Deployment Topology

For the first production version:

```text id="r7vlzq"
Frontend
   │
   ▼
Vercel / CDN

Backend
   │
   ▼
Container Platform

Worker
   │
   ▼
Container Platform

MongoDB
   │
   ▼
Managed MongoDB

Redis
   │
   ▼
Managed Redis

Files
   │
   ▼
Cloudinary / S3
```

The exact cloud provider can be selected later.

---

## 39. Technology Responsibility Matrix

| Technology      | Responsibility                      |
| --------------- | ----------------------------------- |
| React           | User interface                      |
| TypeScript      | Type safety                         |
| Node.js         | Runtime                             |
| Express         | HTTP API                            |
| MongoDB         | Persistent data                     |
| Mongoose        | MongoDB modeling                    |
| Redis           | Cache, rate limiting, queue backend |
| BullMQ          | Background jobs                     |
| Socket.IO       | Real-time communication             |
| Cloudinary/S3   | File storage                        |
| Docker          | Containerization                    |
| GitHub Actions  | CI/CD                               |
| Swagger/OpenAPI | API documentation                   |

---

## 40. Important Architectural Decisions

## Decision 1 — Modular Monolith

**Chosen:** Yes

**Reason:**

The project needs clear module boundaries without the operational complexity of microservices.

---

## Decision 2 — MongoDB

**Chosen:** Yes

**Reason:**

The application contains flexible documents such as tasks, comments, activity metadata and notification payloads. MongoDB also provides strong indexing and aggregation capabilities.

---

## Decision 3 — Shared Database Multi-Tenancy

**Chosen:** Yes

**Reason:**

It is simpler and cost-effective for the initial SaaS implementation.

Strict application-level tenant isolation will be enforced.

---

## Decision 4 — Redis

**Chosen:** Yes

**Reason:**

Redis provides:

* Caching
* Rate limiting
* Queue infrastructure
* Future distributed coordination

---

## Decision 5 — BullMQ

**Chosen:** Yes

**Reason:**

Long-running/non-critical operations should not block API requests.

---

## Decision 6 — Socket.IO

**Chosen:** Yes

**Reason:**

The platform requires real-time task, comment and notification updates.

---

## 41. Future Migration to Microservices

The modular architecture should make future extraction possible.

Potential future services:

```text id="9at5n6"
Auth Service
Organization Service
Project Service
Task Service
Notification Service
File Service
Analytics Service
```

Current:

```text
          Modular Monolith
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
      Auth    Projects   Tasks
```

Future:

```text
Auth Service
      │
Organization Service
      │
Project Service
      │
Task Service
      │
Notification Service
```

Microservices should only be introduced when there is a real operational need.

---

## 42. Key System Design Challenges

The project intentionally focuses on several engineering challenges.

### Challenge 1 — Tenant Isolation

Prevent one organization's users from accessing another organization's data.

### Challenge 2 — Authorization

Implement resource-level and role-level permissions.

### Challenge 3 — Real-Time Collaboration

Synchronize changes across multiple connected clients.

### Challenge 4 — Background Processing

Process emails, notifications and reminders asynchronously.

### Challenge 5 — Caching

Improve performance without returning stale or unauthorized data.

### Challenge 6 — Database Optimization

Design indexes according to actual query patterns.

### Challenge 7 — Horizontal Scaling

Allow multiple backend and worker instances.

### Challenge 8 — Failure Handling

Handle database, Redis, queue and external service failures gracefully.

---

## 43. System Design Summary

The final architecture can be summarized as:

```text id="m4d7d4"
                         USERS
                           │
                           ▼
                    React Frontend
                           │
                     HTTPS / WS
                           │
                           ▼
                  ┌────────────────┐
                  │  Node/Express  │
                  │ Modular API    │
                  └───────┬────────┘
                          │
             ┌────────────┼────────────┐
             │            │            │
             ▼            ▼            ▼
        Authentication  RBAC      Tenant Context
             │            │            │
             └────────────┼────────────┘
                          ▼
                    Business Logic
                          │
             ┌────────────┼─────────────┐
             │            │             │
             ▼            ▼             ▼
          MongoDB       Redis       Socket.IO
             │            │             │
             │            ▼             │
             │         BullMQ           │
             │            │             │
             │            ▼             │
             │         Workers          │
             │                          │
             └────────────┬─────────────┘
                          ▼
                    External Services
                          │
                ┌─────────┼─────────┐
                ▼         ▼         ▼
             Email     Storage    Monitoring
```

The system is intentionally designed as a **modular, secure and scalable monolith** that can later evolve into a distributed architecture if required.

The next document, **03-database-design.md**, will translate this architecture into concrete MongoDB collections, schemas, relationships, indexes, constraints, and query patterns.
