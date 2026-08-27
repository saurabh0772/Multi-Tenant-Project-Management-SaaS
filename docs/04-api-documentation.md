# Multi-Tenant Project Management SaaS

## API Documentation

**Document:** 04-api-documentation.md
**Version:** 1.0
**Status:** Draft
**API Style:** REST
**Base URL:** `/api/v1`

---

## 1. API Overview

The backend exposes a versioned REST API consumed by the React frontend.

All APIs follow the general structure:

```text
/api/v1/<resource>
```

Example:

```text
/api/v1/projects
/api/v1/tasks
/api/v1/organizations
```

The API is responsible for:

* Authentication
* Authorization
* Organization/tenant isolation
* Business logic
* Data validation
* Database operations
* Real-time event triggering
* Background job creation
* File upload coordination

---

## 2. Base URL

Development:

```text
http://localhost:5000/api/v1
```

Production:

```text
https://api.yourdomain.com/api/v1
```

The production domain will be configured during deployment.

---

## 3. HTTP Methods

| Method   | Purpose                         |
| -------- | ------------------------------- |
| `GET`    | Retrieve resource               |
| `POST`   | Create resource                 |
| `PATCH`  | Partially update resource       |
| `PUT`    | Replace resource where required |
| `DELETE` | Delete/archive resource         |

---

## 4. Authentication

Protected endpoints require authentication.

The API uses a short-lived access token and a long-lived refresh token.

Example:

```http
Authorization: Bearer <access_token>
```

The refresh token should be handled through a secure HTTP-only mechanism.

Authentication details are documented separately in:

```text
05-authentication-authorization.md
```

---

## 5. Standard Response Format

## Success Response

```json
{
  "success": true,
  "data": {}
}
```

---

## Error Response

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Project not found"
  }
}
```

---

## 6. HTTP Status Codes

The API uses standard HTTP status codes.

| Status | Meaning                                  |
| ------ | ---------------------------------------- |
| `200`  | Successful request                       |
| `201`  | Resource created                         |
| `204`  | Successful request with no response body |
| `400`  | Invalid request                          |
| `401`  | Authentication required/invalid          |
| `403`  | Insufficient permissions                 |
| `404`  | Resource not found                       |
| `409`  | Conflict                                 |
| `422`  | Validation failure                       |
| `429`  | Rate limit exceeded                      |
| `500`  | Internal server error                    |
| `503`  | Service unavailable                      |

---

## 7. Pagination

List endpoints support pagination.

Example:

```http
GET /api/v1/tasks?page=1&limit=20
```

Response:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "totalPages": 6
  }
}
```

The backend should enforce a maximum page size.

Example:

```text
Default: 20
Maximum: 100
```

---

## 8. Filtering

Resources can be filtered using query parameters.

Example:

```http
GET /api/v1/tasks?status=IN_PROGRESS&priority=HIGH
```

Multiple filters may be combined.

---

## 9. Sorting

Example:

```http
GET /api/v1/tasks?sortBy=createdAt&sortOrder=desc
```

Supported fields should be explicitly whitelisted.

The API must not directly use arbitrary client-provided fields in MongoDB sorting.

---

## 10. Search

Example:

```http
GET /api/v1/tasks?search=redis
```

Search behavior depends on the resource and available database indexes.

---

## 11. Authentication APIs

## 11.1 Register

```http
POST /api/v1/auth/register
```

### Request

```json
{
  "name": "Saurabh Kumar",
  "email": "saurabh@example.com",
  "password": "StrongPassword123!"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "name": "Saurabh Kumar",
      "email": "saurabh@example.com"
    }
  }
}
```

---

## 12. Login

```http
POST /api/v1/auth/login
```

### Request

```json
{
  "email": "saurabh@example.com",
  "password": "StrongPassword123!"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "name": "Saurabh Kumar",
      "email": "saurabh@example.com"
    }
  }
}
```

Authentication credentials/tokens should be delivered through the configured secure mechanism.

---

## 13. Refresh Token

```http
POST /api/v1/auth/refresh
```

The refresh token is supplied through the secure refresh-token mechanism.

### Response

```json
{
  "success": true,
  "data": {
    "message": "Access token refreshed"
  }
}
```

---

## 14. Logout

```http
POST /api/v1/auth/logout
```

### Response

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

The server should invalidate/revoke the refresh session.

---

## 15. Get Current User

```http
GET /api/v1/auth/me
```

### Response

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "name": "Saurabh Kumar",
      "email": "saurabh@example.com",
      "avatarUrl": null,
      "emailVerified": true
    }
  }
}
```

---

## 16. Forgot Password

```http
POST /api/v1/auth/forgot-password
```

### Request

```json
{
  "email": "saurabh@example.com"
}
```

The API should return a generic response to avoid revealing whether an email exists.

### Response

```json
{
  "success": true,
  "data": {
    "message": "If the account exists, a password reset link will be sent."
  }
}
```

---

## 17. Reset Password

```http
POST /api/v1/auth/reset-password
```

### Request

```json
{
  "token": "<reset_token>",
  "password": "NewStrongPassword123!"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "message": "Password reset successfully"
  }
}
```

---

## 18. Email Verification

```http
POST /api/v1/auth/verify-email
```

### Request

```json
{
  "token": "<verification_token>"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully"
  }
}
```

---

## 19. User APIs

## Get Profile

```http
GET /api/v1/users/me
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "name": "Saurabh Kumar",
    "email": "saurabh@example.com",
    "avatarUrl": null
  }
}
```

---

## 20. Update Profile

```http
PATCH /api/v1/users/me
```

### Request

```json
{
  "name": "Saurabh Kumar"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "name": "Saurabh Kumar"
  }
}
```

---

## 21. Organization APIs

## Create Organization

```http
POST /api/v1/organizations
```

### Request

```json
{
  "name": "Acme Technologies"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "org_123",
      "name": "Acme Technologies",
      "slug": "acme-technologies",
      "role": "OWNER"
    }
  }
}
```

The creator automatically becomes the `OWNER`.

---

## 22. Get User Organizations

```http
GET /api/v1/organizations
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "org_123",
      "name": "Acme Technologies",
      "role": "OWNER"
    },
    {
      "id": "org_456",
      "name": "Startup XYZ",
      "role": "MEMBER"
    }
  ]
}
```

---

## 23. Get Organization

```http
GET /api/v1/organizations/:organizationId
```

### Example

```http
GET /api/v1/organizations/org_123
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "org_123",
    "name": "Acme Technologies",
    "slug": "acme-technologies",
    "role": "OWNER"
  }
}
```

The backend must verify organization membership.

---

## 24. Update Organization

```http
PATCH /api/v1/organizations/:organizationId
```

### Request

```json
{
  "name": "Acme Technologies Pvt Ltd"
}
```

### Authorization

```text
OWNER
ADMIN
```

depending on the configured permission matrix.

---

## 25. Delete Organization

```http
DELETE /api/v1/organizations/:organizationId
```

### Authorization

```text
OWNER
```

This operation may use soft deletion initially.

### Response

```json
{
  "success": true,
  "data": {
    "message": "Organization deleted successfully"
  }
}
```

---

## 26. Membership APIs

## Get Members

```http
GET /api/v1/organizations/:organizationId/members
```

### Query Parameters

```text
?page=1
&limit=20
&role=MEMBER
&search=saurabh
```

---

## 27. Get Specific Member

```http
GET /api/v1/organizations/:organizationId/members/:memberId
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "membership_123",
    "user": {
      "id": "user_123",
      "name": "Saurabh Kumar",
      "email": "saurabh@example.com"
    },
    "role": "MEMBER",
    "status": "ACTIVE"
  }
}
```

---

## 28. Update Member Role

```http
PATCH /api/v1/organizations/:organizationId/members/:memberId
```

### Request

```json
{
  "role": "MANAGER"
}
```

### Authorization

Only authorized organization administrators can change roles.

The server must prevent invalid transitions such as unauthorized modification of the organization owner.

---

## 29. Remove Member

```http
DELETE /api/v1/organizations/:organizationId/members/:memberId
```

### Response

```json
{
  "success": true,
  "data": {
    "message": "Member removed successfully"
  }
}
```

---

## 30. Invitation APIs

## Send Invitation

```http
POST /api/v1/organizations/:organizationId/invitations
```

### Request

```json
{
  "email": "rahul@example.com",
  "role": "MEMBER"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "message": "Invitation created successfully"
  }
}
```

The email should be sent asynchronously through BullMQ.

---

## 31. Get Invitations

```http
GET /api/v1/organizations/:organizationId/invitations
```

### Query

```text
?page=1
&limit=20
&status=PENDING
```

---

## 32. Accept Invitation

```http
POST /api/v1/invitations/:token/accept
```

### Response

```json
{
  "success": true,
  "data": {
    "message": "Invitation accepted successfully",
    "organizationId": "org_123"
  }
}
```

The operation should verify:

* Token
* Token expiration
* Invitation status
* User identity
* Existing membership

Membership creation and invitation update should be handled atomically where required.

---

## 33. Revoke Invitation

```http
DELETE /api/v1/organizations/:organizationId/invitations/:invitationId
```

### Authorization

```text
OWNER
ADMIN
```

### Response

```json
{
  "success": true,
  "data": {
    "message": "Invitation revoked successfully"
  }
}
```

---

## 34. Project APIs

## Create Project

```http
POST /api/v1/organizations/:organizationId/projects
```

### Request

```json
{
  "name": "Backend Migration",
  "description": "Migrate legacy backend services",
  "startDate": "2026-08-26",
  "dueDate": "2026-09-30"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "project": {
      "id": "project_123",
      "name": "Backend Migration",
      "status": "PLANNING",
      "organizationId": "org_123"
    }
  }
}
```

---

## 35. Get Projects

```http
GET /api/v1/organizations/:organizationId/projects
```

### Query Parameters

```text
?page=1
&limit=20
&status=ACTIVE
&search=backend
&sortBy=createdAt
&sortOrder=desc
```

---

## 36. Get Project

```http
GET /api/v1/projects/:projectId
```

The server must verify the project's organization against the authenticated user's organization membership.

---

## 37. Update Project

```http
PATCH /api/v1/projects/:projectId
```

### Request

```json
{
  "name": "Backend Migration v2",
  "status": "ACTIVE"
}
```

---

## 38. Archive Project

```http
POST /api/v1/projects/:projectId/archive
```

### Response

```json
{
  "success": true,
  "data": {
    "message": "Project archived successfully"
  }
}
```

Archiving is preferred over immediate deletion for important project data.

---

## 39. Delete Project

```http
DELETE /api/v1/projects/:projectId
```

Authorization depends on the project's permission policy.

The implementation should consider soft deletion where audit/history requirements apply.

---

## 40. Task APIs

## Create Task

```http
POST /api/v1/projects/:projectId/tasks
```

### Request

```json
{
  "title": "Implement Redis caching",
  "description": "Cache frequently accessed project data",
  "assignedTo": "user_456",
  "status": "TODO",
  "priority": "HIGH",
  "labels": [
    "backend",
    "performance"
  ],
  "dueDate": "2026-09-05"
}
```

The server must verify that:

* Project exists
* Project belongs to the organization
* Creator has permission
* Assignee belongs to the same organization
* Assignee has access to the project where project-level membership is enforced

---

## 41. Get Project Tasks

```http
GET /api/v1/projects/:projectId/tasks
```

### Query Parameters

```text
?page=1
&limit=50
&status=IN_PROGRESS
&priority=HIGH
&assignedTo=user_123
&sortBy=position
&sortOrder=asc
```

---

## 42. Get Task

```http
GET /api/v1/tasks/:taskId
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "task_123",
    "title": "Implement Redis caching",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "assignedTo": {
      "id": "user_456",
      "name": "Rahul"
    }
  }
}
```

---

## 43. Update Task

```http
PATCH /api/v1/tasks/:taskId
```

### Request

```json
{
  "status": "DONE"
}
```

The service should:

1. Validate permissions.
2. Update the task.
3. Create an activity record.
4. Invalidate relevant caches.
5. Emit a Socket.IO event.
6. Queue notifications where required.

---

## 44. Move Task

For Kanban operations:

```http
PATCH /api/v1/tasks/:taskId/position
```

### Request

```json
{
  "status": "IN_PROGRESS",
  "position": 1500
}
```

The server updates the task's status and ordering position.

---

## 45. Assign Task

```http
PATCH /api/v1/tasks/:taskId/assignee
```

### Request

```json
{
  "assignedTo": "user_456"
}
```

The assigned user must belong to the same organization.

---

## 46. Delete Task

```http
DELETE /api/v1/tasks/:taskId
```

Depending on the configured data-retention policy, this may perform a soft delete.

---

## 47. Comment APIs

## Create Comment

```http
POST /api/v1/tasks/:taskId/comments
```

### Request

```json
{
  "content": "I have completed the Redis implementation."
}
```

### Response

```json
{
  "success": true,
  "data": {
    "comment": {
      "id": "comment_123",
      "content": "I have completed the Redis implementation.",
      "authorId": "user_123",
      "createdAt": "2026-08-26T10:00:00Z"
    }
  }
}
```

---

## 48. Get Comments

```http
GET /api/v1/tasks/:taskId/comments
```

### Query

```text
?page=1
&limit=20
&sortOrder=asc
```

---

## 49. Update Comment

```http
PATCH /api/v1/comments/:commentId
```

### Request

```json
{
  "content": "Updated comment text."
}
```

Users should generally only be able to edit their own comments unless an administrator permission explicitly allows moderation.

---

## 50. Delete Comment

```http
DELETE /api/v1/comments/:commentId
```

The application may soft-delete comments.

---

## 51. Attachment APIs

## Upload Attachment

```http
POST /api/v1/tasks/:taskId/attachments
```

Content type:

```text
multipart/form-data
```

Form field:

```text
file
```

The backend validates:

* File size
* MIME type
* Extension
* User permissions
* Organization ownership

---

## 52. Get Attachments

```http
GET /api/v1/tasks/:taskId/attachments
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "attachment_123",
      "fileName": "architecture.pdf",
      "fileUrl": "https://storage.example.com/...",
      "mimeType": "application/pdf",
      "fileSize": 284000
    }
  ]
}
```

---

## 53. Delete Attachment

```http
DELETE /api/v1/attachments/:attachmentId
```

The server should verify authorization before deleting both the metadata and, where applicable, the external file.

---

## 54. Notification APIs

## Get Notifications

```http
GET /api/v1/notifications
```

### Query

```text
?page=1
&limit=20
&unread=true
```

---

## 55. Mark Notification as Read

```http
PATCH /api/v1/notifications/:notificationId/read
```

### Response

```json
{
  "success": true,
  "data": {
    "message": "Notification marked as read"
  }
}
```

---

## 56. Mark All Notifications as Read

```http
PATCH /api/v1/notifications/read-all
```

### Response

```json
{
  "success": true,
  "data": {
    "message": "All notifications marked as read"
  }
}
```

---

## 57. Activity APIs

## Get Organization Activity

```http
GET /api/v1/organizations/:organizationId/activities
```

### Query

```text
?page=1
&limit=50
&entityType=TASK
&action=TASK_STATUS_CHANGED
```

---

## 58. Get Project Activity

```http
GET /api/v1/projects/:projectId/activities
```

The endpoint returns activity related to the specified project.

---

## 59. Analytics APIs

## Organization Dashboard

```http
GET /api/v1/organizations/:organizationId/analytics/overview
```

### Response

```json
{
  "success": true,
  "data": {
    "projects": {
      "total": 20,
      "active": 12,
      "completed": 5
    },
    "tasks": {
      "total": 420,
      "completed": 280,
      "overdue": 17
    }
  }
}
```

---

## 60. Task Analytics

```http
GET /api/v1/organizations/:organizationId/analytics/tasks
```

Possible response:

```json
{
  "success": true,
  "data": {
    "byStatus": {
      "TODO": 40,
      "IN_PROGRESS": 25,
      "IN_REVIEW": 12,
      "DONE": 80
    },
    "byPriority": {
      "LOW": 20,
      "MEDIUM": 40,
      "HIGH": 30,
      "URGENT": 7
    }
  }
}
```

These results can be generated using MongoDB aggregation pipelines.

---

## 61. Search API

A unified search endpoint may be introduced:

```http
GET /api/v1/search
```

### Query

```text
?q=redis
&type=tasks
&page=1
&limit=20
```

Supported resource types may include:

```text
projects
tasks
members
comments
```

---

## 62. Health Check API

```http
GET /health
```

This endpoint may be publicly accessible.

### Response

```json
{
  "status": "ok",
  "services": {
    "database": "connected",
    "redis": "connected",
    "queue": "available"
  }
}
```

The endpoint should not expose credentials or sensitive infrastructure details.

---

## 63. API Rate Limiting

Rate limiting should be stricter for sensitive endpoints.

Example policies:

```text
Login
     → Strict

Register
     → Strict

Forgot Password
     → Strict

Normal GET APIs
     → Moderate

Authenticated mutations
     → Moderate
```

When the limit is exceeded:

```http
HTTP/1.1 429 Too Many Requests
```

Response:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later."
  }
}
```

---

## 64. API Validation

All request bodies, parameters and query strings must be validated.

Example task validation:

```text
title
 ├── required
 ├── string
 └── maximum length

priority
 └── LOW | MEDIUM | HIGH | URGENT

status
 └── TODO | IN_PROGRESS | IN_REVIEW | DONE
```

Validation should occur before business logic.

---

## 65. API Authorization

Every protected resource follows:

```text
Request
   ↓
Authenticate User
   ↓
Identify Organization
   ↓
Verify Membership
   ↓
Check Role/Permission
   ↓
Verify Resource Ownership
   ↓
Perform Operation
```

For example:

```text
PATCH /api/v1/tasks/task_123
```

must not simply check:

```text
User is logged in
```

It must verify:

```text
User authenticated
        +
User belongs to task's organization
        +
User has required permission
        +
Task belongs to organization
```

---

## 66. Cross-Tenant Access Prevention

This is a critical API requirement.

Never do:

```js
Task.findById(taskId);
```

for an organization-owned resource without additional authorization checks.

Instead:

```js
Task.findOne({
  _id: taskId,
  organizationId: currentOrganizationId
});
```

If the resource does not belong to the current organization:

```http
404 Not Found
```

or an appropriate authorization response should be returned according to the API's security policy.

This prevents attackers from enumerating IDs to access another tenant's data.

---

## 67. API Idempotency

Operations that may be retried should support idempotency where necessary.

For example:

```http
POST /api/v1/organizations/:organizationId/invitations
Idempotency-Key: abc123
```

This prevents accidental duplicate operations when clients retry requests.

Idempotency is especially important for future operations involving:

* Billing
* Payments
* External integrations
* Webhooks

---

## 68. Real-Time Socket Events

REST APIs handle state changes.

Socket.IO distributes the resulting events.

Example:

```text
PATCH /api/v1/tasks/task_123
        │
        ▼
Update MongoDB
        │
        ├── Create Activity
        ├── Queue Notification
        │
        ▼
Emit:
task.updated
        │
        ▼
Project Room
```

Example event:

```json
{
  "event": "task.updated",
  "data": {
    "taskId": "task_123",
    "projectId": "project_123",
    "status": "DONE",
    "updatedBy": "user_123"
  }
}
```

---

## 69. Socket Rooms

Recommended room naming:

```text
organization:<organizationId>
project:<projectId>
```

Example:

```text
organization:org_123
project:project_456
```

Users should only be allowed to join rooms for organizations/projects they are authorized to access.

---

## 70. API Versioning

All application APIs should begin with:

```text
/api/v1
```

Example:

```text
/api/v1/projects
```

Future breaking changes can use:

```text
/api/v2/projects
```

This allows existing clients to continue using the previous API version.

---

## 71. API Documentation

The API should be documented using OpenAPI/Swagger.

Documentation should contain:

* Endpoint
* HTTP method
* Description
* Authentication requirements
* Parameters
* Request body
* Response body
* Error responses
* Authorization requirements

Example:

```text
Swagger UI
    │
    ├── Authentication
    ├── Organizations
    ├── Members
    ├── Projects
    ├── Tasks
    ├── Comments
    ├── Notifications
    └── Analytics
```

---

## 72. Complete API Route Summary

```text
/api/v1

├── /auth
│   ├── POST   /register
│   ├── POST   /login
│   ├── POST   /refresh
│   ├── POST   /logout
│   ├── POST   /forgot-password
│   ├── POST   /reset-password
│   ├── POST   /verify-email
│   └── GET    /me
│
├── /users
│   └── PATCH  /me
│
├── /organizations
│   ├── POST   /
│   ├── GET    /
│   ├── GET    /:organizationId
│   ├── PATCH  /:organizationId
│   ├── DELETE /:organizationId
│   │
│   ├── /:organizationId/members
│   │   ├── GET    /
│   │   ├── GET    /:memberId
│   │   ├── PATCH  /:memberId
│   │   └── DELETE /:memberId
│   │
│   ├── /:organizationId/invitations
│   │   ├── POST   /
│   │   ├── GET    /
│   │   └── DELETE /:invitationId
│   │
│   ├── /:organizationId/projects
│   │   ├── POST   /
│   │   └── GET    /
│   │
│   ├── /:organizationId/activities
│   │   └── GET    /
│   │
│   └── /:organizationId/analytics
│       ├── GET    /overview
│       └── GET    /tasks
│
├── /projects
│   ├── GET    /:projectId
│   ├── PATCH  /:projectId
│   ├── DELETE /:projectId
│   ├── POST   /:projectId/archive
│   ├── GET    /:projectId/activities
│   └── /:projectId/tasks
│       ├── POST   /
│       └── GET    /
│
├── /tasks
│   └── GET    /:taskId
│       PATCH  /:taskId
│       DELETE /:taskId
│
├── /comments
│   ├── PATCH  /:commentId
│   └── DELETE /:commentId
│
├── /attachments
│   └── DELETE /:attachmentId
│
├── /notifications
│   ├── GET    /
│   ├── PATCH  /:notificationId/read
│   └── PATCH  /read-all
│
├── /invitations
│   └── POST   /:token/accept
│
└── /search
    └── GET    /
```

---

## 73. API Design Principles

The API should follow these principles:

### 1. Resource-oriented URLs

Prefer:

```text
/projects
/tasks
/comments
```

over:

```text
/getAllProjects
/createTask
/deleteComment
```

### 2. HTTP methods represent actions

```text
GET     → Read
POST    → Create
PATCH   → Update
DELETE  → Delete
```

### 3. Consistent responses

All APIs should follow the same response structure.

### 4. Validate everything

Never trust client input.

### 5. Authorize every protected operation

Authentication alone is insufficient.

### 6. Tenant-scope every organization resource

Every organization-owned query must be tenant-aware.

### 7. Keep controllers thin

Business logic belongs in services.

### 8. Use background jobs for asynchronous work

Don't block API responses with email or other expensive operations.

---

## 74. Example End-to-End Request

Consider:

```http
PATCH /api/v1/tasks/task_123
```

Request:

```json
{
  "status": "DONE"
}
```

Processing:

```text
Client
  ↓
Express
  ↓
Rate Limiter
  ↓
Authentication
  ↓
Organization Context
  ↓
Authorization
  ↓
Validation
  ↓
Task Controller
  ↓
Task Service
  ↓
Verify Task + Organization
  ↓
MongoDB Update
  ↓
Create Activity
  ↓
Invalidate Redis Cache
  ↓
Queue Notification
  ↓
Emit Socket Event
  ↓
HTTP Response
```

Response:

```json
{
  "success": true,
  "data": {
    "task": {
      "id": "task_123",
      "status": "DONE"
    }
  }
}
```

This flow represents the intended architecture of the API layer.

---

## 75. API Documentation Completion Criteria

The API documentation will be considered complete when:

* All major resources have documented endpoints.
* Authentication requirements are defined.
* Authorization requirements are defined.
* Request schemas are defined.
* Response schemas are defined.
* Error responses are standardized.
* Pagination is documented.
* Filtering and sorting are documented.
* Rate limiting is documented.
* Tenant isolation requirements are documented.
* Socket events are documented.
* API versioning is established.
* Swagger/OpenAPI can represent the documented API.

---

## 76. Final API Architecture

```text
                       React Client
                            │
                            ▼
                    REST API /api/v1
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
        Authentication   Organization    Resources
                             │              │
                             ▼              ▼
                           RBAC          Projects
                             │              │
                             │            Tasks
                             │              │
                             │         Comments
                             │              │
                             ▼              ▼
                       Tenant Isolation
                             │
                             ▼
                          MongoDB
                             │
                 ┌───────────┼───────────┐
                 ▼           ▼           ▼
               Redis      BullMQ      Socket.IO
                 │           │           │
                 ▼           ▼           ▼
              Caching      Jobs       Real-time
```

The API layer acts as the primary boundary between the frontend and backend domain logic. Every organization-scoped request must pass through **authentication, membership verification, authorization, and tenant isolation** before accessing protected resources.
