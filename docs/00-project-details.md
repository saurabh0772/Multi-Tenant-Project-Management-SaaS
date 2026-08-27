# Multi-Tenant Project Management SaaS — Project Documentation

## 1. Project Overview

**Project Name:** Multi-Tenant Project Management SaaS

**Project Type:** Full-Stack SaaS / Collaboration Platform

**Primary Goal:**
Build a production-style project management platform where multiple organizations can independently manage their teams, projects, tasks, discussions, files, notifications, and activity while sharing the same application infrastructure.

The key engineering challenge is multi-tenancy: data belonging to one organization must never be accessible to another organization unless explicitly authorized.

### High-Level Flow

```
User
 │
 ▼
Authentication
 │
 ▼
Organization
 │
 ├── Members
 │
 ├── Projects
 │     │
 │     ├── Tasks
 │     ├── Comments
 │     ├── Attachments
 │     └── Activity
 │
 ├── Notifications
 │
 └── Settings
```

## 2. Problem Statement

Existing project management tools can be complex, expensive, or unnecessarily feature-heavy for small teams.

The objective is to build a simplified but technically robust SaaS platform where:

- Users can create accounts.
- Users can belong to multiple organizations.
- Organizations can invite members.
- Organizations can create multiple projects.
- Projects contain tasks and discussions.
- Members can collaborate in real time.
- Different users have different permissions.
- Background jobs handle asynchronous operations.
- Frequently accessed data can be cached.
- Organization data remains isolated.

The project should demonstrate real-world backend engineering concepts rather than only CRUD operations.

## 3. Main Objectives

### Functional Objectives

- Implement secure user authentication.
- Implement role-based authorization.
- Support multiple organizations.
- Implement organization-level data isolation.
- Implement project and task management.
- Implement real-time collaboration.
- Implement notifications.
- Implement file attachments.
- Implement activity tracking.
- Implement background jobs.
- Implement caching.
- Implement search, filtering and pagination.

### Technical Objectives

- Build RESTful APIs.
- Design scalable MongoDB schemas.
- Use proper database indexes.
- Implement Redis caching.
- Implement asynchronous processing using BullMQ.
- Implement WebSocket communication.
- Implement centralized error handling.
- Implement request validation.
- Implement rate limiting.
- Containerize the application.
- Implement CI/CD.
- Deploy the application.

## 4. Target Users

The application will have three major categories of users.

### 4.1 Organization Owner

The person who creates the organization.

**Responsibilities:**

- Manage organization
- Manage members
- Manage roles
- Create/delete projects
- Configure organization settings

### 4.2 Manager/Admin

Responsible for managing projects and teams.

**Permissions may include:**

- Create projects
- Manage tasks
- Assign members
- View analytics
- Manage project settings
- Invite members

### 4.3 Member

Regular organization user.

**Can:**

- View assigned projects
- Create/update permitted tasks
- Comment
- Upload files
- Receive notifications

## 5. Multi-Tenancy Architecture

This is the most important part of the project.

The application follows a shared database / shared application with logical tenant isolation approach.

```
                 Application
                     │
          ┌──────────┴──────────┐
          │                     │
     Organization A        Organization B
          │                     │
     ┌────┴────┐           ┌────┴────┐
     │ Projects│           │ Projects│
     │ Tasks   │           │ Tasks   │
     │ Members │           │ Members │
     └─────────┘           └─────────┘
```

Documents contain an organizationId.

Example:

```
{
  _id: "...",
  title: "Implement Authentication",
  organizationId: "org_123",
  projectId: "project_456",
  assignedTo: "user_789"
}
```

Every organization-scoped query must include the authenticated organization.

```
Task.find({
  organizationId: req.user.organizationId
});
```

### Security Principle

Never trust:

req.body.organizationId

from the client.

The server should determine the organization from authenticated context.

```
JWT
 ↓
User Identity
 ↓
Organization Membership
 ↓
Authorization
 ↓
Organization-scoped Query
```

## 6. Technology Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query / Redux Toolkit
- Socket.IO Client

### Backend

- Node.js
- Express.js
- TypeScript
- REST APIs
- Socket.IO

### Database

- MongoDB
- Mongoose

### Infrastructure

- Redis
- BullMQ
- Docker

### Authentication

- Access Token
- Refresh Token
- HTTP-only cookies where appropriate

### File Storage

- Cloudinary or S3-compatible storage

### Email

- Resend / SMTP provider

### Testing

- Vitest/Jest
- Supertest

### Documentation

- Swagger / OpenAPI

### CI/CD

- GitHub Actions

## 7. High-Level Architecture

```
                         ┌──────────────────┐
                         │      React       │
                         │   TypeScript     │
                         └────────┬─────────┘
                                  │
                           REST / WebSocket
                                  │
                         ┌────────▼─────────┐
                         │     Express      │
                         │      API         │
                         └────────┬─────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
     ┌─────────┐             ┌─────────┐            ┌──────────┐
     │ MongoDB │             │  Redis  │            │ Socket.IO│
     └─────────┘             └────┬────┘            └──────────┘
                                   │
                                BullMQ
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
                 Emails       Notifications    Analytics
```

## 8. Core Modules

The backend will be divided into the following modules:

- Authentication
- Authorization
- Users
- Organizations
- Organization Members
- Invitations
- Projects
- Tasks
- Comments
- Attachments
- Notifications
- Activity Logs
- Search
- Analytics
- Background Jobs

## 9. Authentication System

Authentication should support:

### Registration

POST /api/v1/auth/register

User provides:

```
{
  "name": "Saurabh",
  "email": "user@example.com",
  "password": "password"
}
```

Password must be hashed using a secure password hashing algorithm such as bcrypt/Argon2.

### Login

POST /api/v1/auth/login

Flow:

```
Email + Password
       ↓
Validate user
       ↓
Compare password hash
       ↓
Generate tokens
       ↓
Return authentication response
```

## 10. Access Token + Refresh Token

Use short-lived access tokens.

Example:

Access Token
Expiration: 15 minutes

Refresh token:

Refresh Token
Expiration: 7–30 days

Flow:

```
Login
 │
 ├── Access Token
 │
 └── Refresh Token
        │
        ▼
   HTTP-only Cookie
```

When the access token expires:

```
Client
 ↓
401
 ↓
Refresh Token
 ↓
New Access Token
 ↓
Retry Request
```

## 11. Authorization

Authentication answers:

Who are you?

Authorization answers:

What are you allowed to do?

Example roles:

- OWNER
- ADMIN
- MANAGER
- MEMBER

Permissions should be checked on the server.

Example:

DELETE /projects/:id

```
        ↓
Authentication
        ↓
Organization membership
        ↓
Role check
        ↓
Permission check
        ↓
Delete project
```

## 12. Organization Module

Organizations are the primary tenants.

Organization schema

```
{
  name,
  slug,
  ownerId,
  logo,
  settings,
  createdAt,
  updatedAt
}
```

Example:

```
Acme Technologies
       │
       ├── Owner
       ├── Admin
       ├── Manager
       └── Members
```

## 13. Organization Membership

Don't directly put only organizationId inside the user document.

Create a membership relationship.

```
User
 │
 ├── Organization A → OWNER
 ├── Organization B → MEMBER
 └── Organization C → ADMIN
```

Membership schema:

```
{
  userId,
  organizationId,
  role,
  joinedAt
}
```

This allows a user to belong to multiple organizations with different roles.

## 14. Invitation System

Organization administrators can invite users.

```
Admin
 ↓
Enter email
 ↓
Create invitation
 ↓
Generate secure token
 ↓
Store invitation
 ↓
Queue email
 ↓
Send invitation
```

Example:

POST /api/v1/organizations/:id/invitations

Invitation:

```
{
  email,
  organizationId,
  role,
  tokenHash,
  expiresAt,
  status
}
```

Statuses:

- PENDING
- ACCEPTED
- EXPIRED
- REVOKED

## 15. Project Module

An organization can have multiple projects.

```
Organization
     │
     ├── Website Redesign
     ├── Mobile App
     └── Backend Migration
```

Project schema:

```
{
  name,
  description,
  organizationId,
  ownerId,
  status,
  startDate,
  dueDate,
  createdAt,
  updatedAt
}
```

Possible project statuses:

- PLANNING
- ACTIVE
- ON_HOLD
- COMPLETED
- ARCHIVED

## 16. Task Management

Tasks are the primary work units.

Task schema:

```
{
  title,
  description,
  organizationId,
  projectId,
  createdBy,
  assignedTo,
  status,
  priority,
  labels,
  dueDate,
  position,
  createdAt,
  updatedAt
}
```

### Task Status

- TODO
- IN_PROGRESS
- IN_REVIEW
- DONE

### Priority

- LOW
- MEDIUM
- HIGH
- URGENT

## 17. Kanban Board

Example:

```
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│    TODO    │ │ IN PROGRESS│ │ IN REVIEW  │ │    DONE    │
├────────────┤ ├────────────┤ ├────────────┤ ├────────────┤
│ Task A     │ │ Task C     │ │ Task E     │ │ Task G     │
│ Task B     │ │ Task D     │ │ Task F     │ │ Task H     │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```

Tasks should support drag-and-drop ordering.

The position field can be used to maintain ordering.

## 18. Comments

Users can comment on tasks.

```
Task
 │
 ├── Comment 1
 ├── Comment 2
 └── Comment 3
```

Example API:

POST /api/v1/tasks/:taskId/comments
GET  /api/v1/tasks/:taskId/comments

Comments should also respect organization and project authorization.

## 19. Attachments

Users can upload files to tasks/comments.

Flow:

```
User
 ↓
Upload file
 ↓
Validate file
 ↓
Cloudinary/S3
 ↓
Store URL + metadata
 ↓
MongoDB
```

Attachment document:

```
{
  taskId,
  uploadedBy,
  organizationId,
  fileName,
  fileUrl,
  fileType,
  fileSize,
  createdAt
}
```

## 20. Real-Time Collaboration

Use Socket.IO.

Events may include:

- task:created
- task:updated
- task:deleted
- comment:created
- project:updated
- notification:new
- user:online
- user:offline

Example:

```
User A updates task
       ↓
API
       ↓
MongoDB
       ↓
Socket.IO
       ↓
Project Room
       ↓
User B + User C
```

The frontend updates without requiring a refresh.

## 21. Redis

Redis can be used for several purposes.

### Caching

GET /projects/:id

```
       ↓
Check Redis
   /        HIT       MISS
  ↓          ↓
Return    MongoDB
             ↓
           Redis
             ↓
           Return
```

### Rate limiting

Redis can track:

```
IP / User
   ↓
Request count
   ↓
Time window
```

### Session/temporary data

Redis can also support temporary values such as:

- OTPs
- password reset tokens
- temporary locks
- short-lived caches

## 22. Background Jobs

Use:

BullMQ + Redis

Don't perform expensive operations directly inside the HTTP request.

Example:

```
User invited
     ↓
Create invitation
     ↓
Add email job
     ↓
Return response
     ↓
BullMQ Worker
     ↓
Send email
```

Other jobs:

- Send invitation email
- Send notifications
- Deadline reminders
- Daily summaries
- Cleanup expired invitations
- Generate reports

## 23. Notification System

Notifications can be generated for:

- Task assignment
- Task mention
- Comment
- Project invitation
- Due date approaching
- Task status change

Example:

```
{
  recipientId,
  organizationId,
  type,
  title,
  message,
  entityType,
  entityId,
  readAt,
  createdAt
}
```

## 24. Activity Log

Every important organization action can be recorded.

Example:

Saurabh created project "Backend Migration"

Rahul assigned task "Implement Redis"

Aman changed task status:
IN_PROGRESS → DONE

Activity schema:

```
{
  organizationId,
  userId,
  action,
  entityType,
  entityId,
  metadata,
  createdAt
}
```

This is useful for auditing.

## 25. Search, Filtering & Pagination

Projects/tasks should support:

- Search
- Filter by status
- Filter by priority
- Filter by assignee
- Filter by project
- Sort by createdAt
- Sort by dueDate
- Pagination

Example:

GET /api/v1/tasks?
projectId=123
&status=IN_PROGRESS
&priority=HIGH
&page=1
&limit=20

## 26. MongoDB Indexing

Indexes should be designed around real query patterns.

For example:

```
{
  organizationId: 1,
  projectId: 1,
  status: 1
}
```

Possible indexes:

- organizations.slug
- members.userId + organizationId
- projects.organizationId
- tasks.organizationId + projectId
- tasks.organizationId + assignedTo
- tasks.organizationId + status
- notifications.recipientId + readAt

Use:

.explain("executionStats")

to verify whether queries are actually benefiting from indexes.

## 27. API Structure

Use API versioning:

/api/v1

Example:

- /api/v1/auth
- /api/v1/users
- /api/v1/organizations
- /api/v1/projects
- /api/v1/tasks
- /api/v1/comments
- /api/v1/notifications

## 28. Example API Endpoints

### Authentication

POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
GET    /api/v1/auth/me

### Organizations

POST   /api/v1/organizations
GET    /api/v1/organizations
GET    /api/v1/organizations/:id
PATCH  /api/v1/organizations/:id
DELETE /api/v1/organizations/:id

### Members

GET    /api/v1/organizations/:id/members
PATCH  /api/v1/organizations/:id/members/:memberId
DELETE /api/v1/organizations/:id/members/:memberId

### Invitations

POST   /api/v1/organizations/:id/invitations
GET    /api/v1/invitations
POST   /api/v1/invitations/:token/accept
DELETE /api/v1/invitations/:id

### Projects

POST   /api/v1/projects
GET    /api/v1/projects
GET    /api/v1/projects/:id
PATCH  /api/v1/projects/:id
DELETE /api/v1/projects/:id

### Tasks

POST   /api/v1/projects/:projectId/tasks
GET    /api/v1/projects/:projectId/tasks
GET    /api/v1/tasks/:id
PATCH  /api/v1/tasks/:id
DELETE /api/v1/tasks/:id

### Comments

POST   /api/v1/tasks/:taskId/comments
GET    /api/v1/tasks/:taskId/comments
DELETE /api/v1/comments/:id

## 29. Backend Folder Structure

I recommend a feature/module-based architecture instead of putting everything into controllers/, models/, etc.

```
server/
│
├── src/
│   │
│   ├── config/
│   │   ├── db.ts
│   │   ├── redis.ts
│   │   └── env.ts
│   │
│   ├── modules/
│   │   │
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.validation.ts
│   │   │   └── auth.types.ts
│   │   │
│   │   ├── users/
│   │   ├── organizations/
│   │   ├── memberships/
│   │   ├── invitations/
│   │   ├── projects/
│   │   ├── tasks/
│   │   ├── comments/
│   │   ├── attachments/
│   │   ├── notifications/
│   │   └── activities/
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── authorization.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   └── validate.middleware.ts
│   │
│   ├── jobs/
│   │   ├── email.worker.ts
│   │   ├── notification.worker.ts
│   │   └── reminder.worker.ts
│   │
│   ├── sockets/
│   │   └── socket.ts
│   │
│   ├── utils/
│   ├── app.ts
│   └── server.ts
│
├── tests/
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

## 30. Error Handling

Use centralized error handling.

```
Controller
    ↓
Service
    ↓
Repository/Model
    ↓
Error
    ↓
Global Error Middleware
    ↓
Standard JSON Response
```

Example:

```
{
  "success": false,
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project not found"
  }
}
```

Avoid exposing:

- MongoDB stack traces
- Internal paths
- Database credentials
- Sensitive information

## 31. Request Validation

Validate incoming requests before business logic.

For example:

POST /projects

name
description
dueDate

Validation should check:

- Required fields
- String length
- Valid IDs
- Valid dates
- Allowed enum values

You can use:

Zod or Joi.

## 32. Security Requirements

Implement:

- Password hashing
- HTTP-only cookies
- Secure token handling
- CORS configuration
- Helmet
- Rate limiting
- Input validation
- MongoDB injection protection
- Authorization checks
- File type validation
- File size limits
- Secure password reset
- Token expiration
- Environment variables

Most importantly:

Never trust the frontend for authorization.

The frontend can hide buttons, but the backend must enforce permissions.

## 33. Testing Strategy

### Unit Tests

Test:

- Auth service
- Permission logic
- Task service
- Organization service
- Invitation service

### Integration Tests

Test:

- Register → Login → Create organization
- Create project → Create task
- Invite member → Accept invitation

### API Tests

Use Supertest to test:

- 200
- 201
- 400
- 401
- 403
- 404
- 409
- 429
- 500

## 34. Docker

Development environment:

- React
- Node
- MongoDB
- Redis

Docker Compose can run:

- frontend
- backend
- mongodb
- redis
- worker

Example architecture:

```
docker-compose
      │
      ├── frontend
      ├── backend
      ├── worker
      ├── mongodb
      └── redis
```

## 35. CI/CD

GitHub Actions pipeline:

```
Push
 ↓
Install dependencies
 ↓
Lint
 ↓
Type check
 ↓
Run tests
 ↓
Build
 ↓
Docker build
 ↓
Deploy
```

Pull requests should automatically run:

- ESLint
- TypeScript
- Tests
- Build

## 36. Observability

For a production-style project, add:

### Logging

Log:

- Request
- Response status
- Execution time
- Errors
- Important business events

Don't log passwords or tokens.

### Health Check

GET /health

Response:

```
{
  "status": "ok",
  "database": "connected",
  "redis": "connected"
}
```

## 37. Dashboard

Organization dashboard can display:

- Total Projects
- Active Projects
- Completed Projects

- Total Tasks
- Completed Tasks
- Overdue Tasks

- Tasks by Priority
- Tasks by Status

- Team Productivity
- Project Progress

MongoDB aggregation pipelines can power these analytics.

## 38. Important Edge Cases

This is where you should spend time because these become great interview questions.

### Organization

- User leaves organization.
- Owner tries to leave.
- Organization is deleted.
- User belongs to multiple organizations.

### Authorization

- Member tries to delete project.
- User modifies another organization's project ID.
- User accesses a task from another organization.

### Tasks

- Assigned user leaves organization.
- Project is archived.
- Task is deleted while comments exist.

### Invitations

- Invitation expires.
- Same email invited twice.
- Invitation revoked.
- User accepts invitation after already joining.

### Real-time

- User loses connection.
- Socket reconnects.
- User opens multiple tabs.

### Background jobs

- Email fails.
- Job retries.
- Job runs twice.
- Worker crashes.

## 39. Advanced Features

Don't build these initially.

Add them after the core system works.

### Advanced Search

Use MongoDB text indexes or optionally Elasticsearch/OpenSearch.

### Audit Logs

Track sensitive operations:

- WHO
- WHAT
- WHEN
- WHERE

### Webhooks

Allow external applications to subscribe to:

- task.created
- task.updated
- project.created
- member.joined

### API Keys

Allow organizations to create API keys.

```
Organization
     ↓
API Key
     ↓
External Application
     ↓
Your API
```

### Public API

Document it with OpenAPI/Swagger.

## 40. Development Roadmap

Don't try to build everything simultaneously.

### Phase 1 — Foundation

- [ ] Initialize monorepo/project
- [ ] TypeScript
- [ ] Express
- [ ] MongoDB
- [ ] Environment configuration
- [ ] Error handling
- [ ] Logging

### Phase 2 — Authentication

- [ ] Registration
- [ ] Login
- [ ] Password hashing
- [ ] Access token
- [ ] Refresh token
- [ ] Logout
- [ ] Password reset
- [ ] Email verification

### Phase 3 — Multi-Tenancy

- [ ] Organization
- [ ] Membership
- [ ] Roles
- [ ] Permissions
- [ ] Organization switching
- [ ] Tenant isolation

### Phase 4 — Project Management

- [ ] Projects
- [ ] Tasks
- [ ] Subtasks
- [ ] Labels
- [ ] Comments
- [ ] Attachments
- [ ] Kanban board

### Phase 5 — Real-Time

- [ ] Socket.IO
- [ ] Project rooms
- [ ] Task updates
- [ ] Comments
- [ ] Presence
- [ ] Notifications

### Phase 6 — Infrastructure

- [ ] Redis
- [ ] Caching
- [ ] Rate limiting
- [ ] BullMQ
- [ ] Email worker
- [ ] Notification worker

### Phase 7 — Optimization

- [ ] MongoDB indexes
- [ ] Query optimization
- [ ] explain("executionStats")
- [ ] Pagination
- [ ] Aggregations

### Phase 8 — Production

- [ ] Docker
- [ ] Testing
- [ ] Swagger
- [ ] GitHub Actions
- [ ] Deployment
- [ ] Health checks
- [ ] Monitoring

## 41. MVP vs Advanced Version

Don't spend months building the MVP.

### MVP

```
Authentication
       ↓
Organizations
       ↓
Members/Roles
       ↓
Projects
       ↓
Tasks
       ↓
Comments
```

Once this is stable:

### Advanced

```
              ┌── Redis
              │
              ├── BullMQ
              │
              ├── Socket.IO
              │
              ├── File Storage
              │
              ├── Notifications
              │
              ├── Analytics
              │
              ├── Docker
              │
              └── CI/CD
```

## 42. What Makes This Resume-Worthy

The project isn't impressive because it has a Kanban board.

It's impressive because you can demonstrate:

```
                    MULTI-TENANCY
                         │
                         ▼
                       RBAC
                         │
                         ▼
                    REST APIs
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       MongoDB         Redis        Socket.IO
          │              │              │
          ▼              ▼              ▼
      Indexing        Caching       Real-time
          │              │
          └───────┬──────┘
                  ▼
                BullMQ
                  │
                  ▼
            Background Jobs
                  │
                  ▼
              Docker/CI-CD
```

That gives you actual SDE interview material.

## 43. Interview Questions This Project Should Prepare You For

By the end, you should be able to confidently answer:

### Architecture

- Why did you choose a modular architecture?
- Why MongoDB?
- Why not PostgreSQL?
- How would you scale this system?

### Multi-tenancy

- How do you isolate tenant data?
- What prevents cross-tenant access?
- What happens if a user belongs to multiple organizations?
- Shared DB vs separate DB?
- How would you migrate to database-per-tenant?

### Authentication

- Access token vs refresh token?
- Why HTTP-only cookies?
- How do you revoke refresh tokens?
- What happens when a token expires?

### Redis

- Why Redis?
- What are you caching?
- Cache invalidation strategy?
- What happens if Redis goes down?

### Queues

- Why BullMQ?
- Why not process email inside the API request?
- How do retries work?
- What happens if a job executes twice?

### MongoDB

- What indexes did you create?
- Why compound indexes?
- How did you verify index usage?
- What does IXSCAN mean?
- How did you optimize slow queries?

### WebSockets

- Why Socket.IO?
- How do rooms work?
- How do you authenticate sockets?
- What happens when a client disconnects?

### Security

- How do you prevent IDOR?
- How do you implement RBAC?
- How do you prevent brute-force attacks?
- How do you validate uploaded files?

### Scaling

- What happens with 100,000 concurrent users?
- How would you scale Socket.IO?
- How would you scale workers?
- How would you handle multiple backend instances?
