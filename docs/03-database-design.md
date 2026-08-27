# Multi-Tenant Project Management SaaS

## Database Design Document

**Document:** 03-database-design.md
**Version:** 1.0
**Status:** Draft
**Database:** MongoDB
**ODM:** Mongoose

---

## 1. Database Overview

The application uses **MongoDB** as its primary database.

The database follows a **shared database / shared collection multi-tenancy model** with logical tenant isolation.

The main tenant is an **Organization**.

Organization-owned resources contain an `organizationId` field that identifies the tenant to which the resource belongs.

```text
Organization
     │
     ├── Memberships
     │
     ├── Projects
     │      │
     │      └── Tasks
     │             ├── Comments
     │             └── Attachments
     │
     ├── Invitations
     ├── Notifications
     └── Activities
```

---

## 2. Database Design Principles

The database design follows these principles:

1. Every tenant-owned resource contains `organizationId`.
2. Queries must be tenant-scoped.
3. References are used where relationships are meaningful.
4. Large or frequently changing data is not unnecessarily embedded.
5. Indexes are created according to actual query patterns.
6. Sensitive information is never stored in plaintext.
7. Timestamps are stored on important entities.
8. Soft deletion is used where audit/history requirements make it useful.
9. Database constraints are supplemented with application-level validation.
10. MongoDB transactions are used for operations requiring atomic updates across multiple documents.

---

## 3. Collections

The initial database contains the following collections:

```text
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

Optional future collections:

```text
refreshTokens
passwordResetTokens
sessions
webhooks
apiKeys
subscriptions
```

---

## 4. Entity Relationship Overview

MongoDB is document-oriented, but the logical relationships are:

```text
                         ┌──────────────┐
                         │     User     │
                         └──────┬───────┘
                                │
                       ┌────────▼────────┐
                       │   Membership    │
                       └────────┬────────┘
                                │
                                ▼
                       ┌────────────────┐
                       │ Organization   │
                       └───────┬────────┘
                               │
               ┌───────────────┼────────────────┐
               │               │                │
               ▼               ▼                ▼
          Projects        Invitations      Notifications
               │
               ▼
             Tasks
               │
          ┌────┴────┐
          ▼         ▼
      Comments   Attachments

Organization
     │
     ▼
Activities
```

---

## 5. Users Collection

Collection:

```text
users
```

The user represents a person using the platform.

## Schema

```js
{
  _id: ObjectId,

  name: String,

  email: String,

  passwordHash: String,

  avatarUrl: String | null,

  emailVerified: Boolean,

  status: String,

  lastLoginAt: Date | null,

  createdAt: Date,

  updatedAt: Date
}
```

### Status

```text
ACTIVE
SUSPENDED
DELETED
```

---

## Example

```json
{
  "_id": "66c001",
  "name": "Saurabh Kumar",
  "email": "saurabh@example.com",
  "passwordHash": "$argon2id$...",
  "avatarUrl": null,
  "emailVerified": true,
  "status": "ACTIVE",
  "lastLoginAt": "2026-08-26T08:00:00Z",
  "createdAt": "2026-08-01T10:00:00Z",
  "updatedAt": "2026-08-26T08:00:00Z"
}
```

The plaintext password must never be stored.

---

## 6. Users Indexes

Primary indexes:

```js
{
  email: 1
}
```

The email index should be unique.

```js
{
  email: 1
}
```

with:

```text
unique: true
```

Recommended normalization:

```text
User@Example.com
        ↓
user@example.com
```

This prevents duplicate accounts caused by email casing differences.

---

## 7. Organizations Collection

Collection:

```text
organizations
```

An organization represents a tenant.

## Schema

```js
{
  _id: ObjectId,

  name: String,

  slug: String,

  ownerId: ObjectId,

  logoUrl: String | null,

  settings: {
    timezone: String,
    dateFormat: String
  },

  status: String,

  createdAt: Date,

  updatedAt: Date
}
```

---

## 8. Organization Status

```text
ACTIVE
SUSPENDED
DELETED
```

---

## 9. Organization Example

```json
{
  "_id": "org001",
  "name": "Acme Technologies",
  "slug": "acme-technologies",
  "ownerId": "user001",
  "logoUrl": null,
  "settings": {
    "timezone": "Asia/Kolkata",
    "dateFormat": "DD/MM/YYYY"
  },
  "status": "ACTIVE",
  "createdAt": "2026-08-01T10:00:00Z",
  "updatedAt": "2026-08-01T10:00:00Z"
}
```

---

## 10. Organization Indexes

Recommended:

```js
{
  slug: 1
}
```

with:

```text
unique: true
```

Owner lookup:

```js
{
  ownerId: 1
}
```

Status may also be indexed if frequently used in administrative queries.

---

## 11. Memberships Collection

Collection:

```text
memberships
```

Membership represents the relationship between a user and an organization.

This is intentionally kept separate from the user document.

A user can belong to many organizations.

```text
User
 │
 ├── Organization A → OWNER
 ├── Organization B → MEMBER
 └── Organization C → MANAGER
```

---

## 12. Membership Schema

```js
{
  _id: ObjectId,

  userId: ObjectId,

  organizationId: ObjectId,

  role: String,

  status: String,

  joinedAt: Date,

  createdAt: Date,

  updatedAt: Date
}
```

---

## 13. Membership Roles

```text
OWNER
ADMIN
MANAGER
MEMBER
```

---

## 14. Membership Status

```text
ACTIVE
SUSPENDED
REMOVED
```

---

## 15. Membership Example

```json
{
  "_id": "membership001",
  "userId": "user001",
  "organizationId": "org001",
  "role": "OWNER",
  "status": "ACTIVE",
  "joinedAt": "2026-08-01T10:00:00Z"
}
```

---

## 16. Membership Indexes

This is one of the most important indexes in the application.

```js
{
  userId: 1,
  organizationId: 1
}
```

This compound index should be unique.

It prevents duplicate membership records:

```text
Same User + Same Organization
```

from appearing more than once.

Another useful index:

```js
{
  organizationId: 1,
  role: 1
}
```

This helps organization-level member/role queries.

---

## 17. Invitations Collection

Collection:

```text
invitations
```

Used for organization member invitations.

## Schema

```js
{
  _id: ObjectId,

  email: String,

  organizationId: ObjectId,

  invitedBy: ObjectId,

  role: String,

  tokenHash: String,

  status: String,

  expiresAt: Date,

  acceptedAt: Date | null,

  createdAt: Date,

  updatedAt: Date
}
```

---

## 18. Invitation Status

```text
PENDING
ACCEPTED
EXPIRED
REVOKED
```

---

## 19. Invitation Security

The raw invitation token should not be stored.

Instead:

```text
Raw Token
   ↓
Hash
   ↓
Database
```

When the user accepts:

```text
Provided Token
      ↓
Hash
      ↓
Compare with stored hash
```

This limits damage if the database is compromised.

---

## 20. Invitation Indexes

Useful indexes:

```js
{
  organizationId: 1,
  email: 1
}
```

and:

```js
{
  tokenHash: 1
}
```

and:

```js
{
  expiresAt: 1
}
```

The `expiresAt` field can potentially use a TTL index if the application's lifecycle requirements allow expired invitation documents to be automatically removed.

---

## 21. Projects Collection

Collection:

```text
projects
```

Projects belong to an organization.

## Schema

```js
{
  _id: ObjectId,

  organizationId: ObjectId,

  name: String,

  slug: String,

  description: String,

  ownerId: ObjectId,

  status: String,

  startDate: Date | null,

  dueDate: Date | null,

  createdBy: ObjectId,

  createdAt: Date,

  updatedAt: Date,

  archivedAt: Date | null
}
```

---

## 22. Project Status

```text
PLANNING
ACTIVE
ON_HOLD
COMPLETED
ARCHIVED
```

---

## 23. Project Example

```json
{
  "_id": "project001",
  "organizationId": "org001",
  "name": "Backend Migration",
  "slug": "backend-migration",
  "description": "Migrate legacy services.",
  "ownerId": "user001",
  "status": "ACTIVE",
  "startDate": "2026-08-01T00:00:00Z",
  "dueDate": "2026-09-30T00:00:00Z",
  "createdBy": "user001",
  "createdAt": "2026-08-01T10:00:00Z",
  "updatedAt": "2026-08-10T12:00:00Z",
  "archivedAt": null
}
```

---

## 24. Project Indexes

Primary query:

```text
Get projects for organization
```

Index:

```js
{
  organizationId: 1,
  status: 1
}
```

For project lookup:

```js
{
  organizationId: 1,
  _id: 1
}
```

For searching by slug:

```js
{
  organizationId: 1,
  slug: 1
}
```

Potentially unique:

```text
organizationId + slug
```

This allows different organizations to have projects with the same slug.

---

## 25. Tasks Collection

Collection:

```text
tasks
```

Tasks are the primary work items inside projects.

## Schema

```js
{
  _id: ObjectId,

  organizationId: ObjectId,

  projectId: ObjectId,

  title: String,

  description: String,

  createdBy: ObjectId,

  assignedTo: ObjectId | null,

  status: String,

  priority: String,

  labels: [
    String
  ],

  dueDate: Date | null,

  position: Number,

  createdAt: Date,

  updatedAt: Date,

  completedAt: Date | null,

  deletedAt: Date | null
}
```

---

## 26. Task Status

```text
TODO
IN_PROGRESS
IN_REVIEW
DONE
```

---

## 27. Task Priority

```text
LOW
MEDIUM
HIGH
URGENT
```

---

## 28. Task Example

```json
{
  "_id": "task001",
  "organizationId": "org001",
  "projectId": "project001",
  "title": "Implement Redis caching",
  "description": "Cache frequently accessed project data.",
  "createdBy": "user001",
  "assignedTo": "user002",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "labels": [
    "backend",
    "performance"
  ],
  "dueDate": "2026-09-05T00:00:00Z",
  "position": 1000,
  "createdAt": "2026-08-20T10:00:00Z",
  "updatedAt": "2026-08-25T10:00:00Z",
  "completedAt": null,
  "deletedAt": null
}
```

---

## 29. Task Indexes

Tasks are queried heavily, so indexes are important.

### Project + status

```js
{
  organizationId: 1,
  projectId: 1,
  status: 1
}
```

Useful for Kanban boards.

### Assignee

```js
{
  organizationId: 1,
  assignedTo: 1,
  status: 1
}
```

Useful for:

```text
"My Tasks"
```

### Due dates

```js
{
  organizationId: 1,
  dueDate: 1
}
```

Useful for overdue/deadline queries.

### Priority

```js
{
  organizationId: 1,
  priority: 1
}
```

Additional compound indexes should be added based on actual query patterns rather than indexing every field.

---

## 30. Task Ordering

Kanban ordering can use a numeric `position`.

Example:

```text
Task A → 1000
Task B → 2000
Task C → 3000
```

Moving a task between A and B:

```text
New Position ≈ 1500
```

This avoids updating the position of every task after each drag operation.

For large boards, fractional/rank-based ordering can be used.

---

## 31. Comments Collection

Collection:

```text
comments
```

Comments are kept in their own collection rather than embedded inside tasks.

This prevents task documents from growing indefinitely.

## Schema

```js
{
  _id: ObjectId,

  organizationId: ObjectId,

  taskId: ObjectId,

  authorId: ObjectId,

  content: String,

  mentions: [
    ObjectId
  ],

  editedAt: Date | null,

  deletedAt: Date | null,

  createdAt: Date,

  updatedAt: Date
}
```

---

## 32. Comment Indexes

Main query:

```text
Get comments for task
```

Index:

```js
{
  organizationId: 1,
  taskId: 1,
  createdAt: 1
}
```

This supports chronological comment retrieval.

---

## 33. Attachments Collection

Collection:

```text
attachments
```

Files should be stored in external object storage.

MongoDB stores metadata only.

## Schema

```js
{
  _id: ObjectId,

  organizationId: ObjectId,

  taskId: ObjectId | null,

  commentId: ObjectId | null,

  uploadedBy: ObjectId,

  fileName: String,

  fileUrl: String,

  storageKey: String,

  mimeType: String,

  fileSize: Number,

  createdAt: Date
}
```

---

## 34. Attachment Example

```json
{
  "_id": "attachment001",
  "organizationId": "org001",
  "taskId": "task001",
  "commentId": null,
  "uploadedBy": "user001",
  "fileName": "architecture.pdf",
  "fileUrl": "https://storage.example.com/...",
  "storageKey": "org001/tasks/task001/architecture.pdf",
  "mimeType": "application/pdf",
  "fileSize": 284000,
  "createdAt": "2026-08-25T10:00:00Z"
}
```

---

## 35. Notifications Collection

Collection:

```text
notifications
```

## Schema

```js
{
  _id: ObjectId,

  organizationId: ObjectId,

  recipientId: ObjectId,

  type: String,

  title: String,

  message: String,

  entityType: String,

  entityId: ObjectId | null,

  readAt: Date | null,

  createdAt: Date
}
```

---

## 36. Notification Types

```text
TASK_ASSIGNED
TASK_MENTIONED
COMMENT_ADDED
PROJECT_INVITATION
TASK_DUE_SOON
PROJECT_UPDATED
MEMBER_JOINED
```

---

## 37. Notification Indexes

Main notification query:

```text
Get user's notifications
```

Index:

```js
{
  organizationId: 1,
  recipientId: 1,
  createdAt: -1
}
```

Unread notifications:

```js
{
  recipientId: 1,
  readAt: 1,
  createdAt: -1
}
```

This supports unread counts and notification lists.

---

## 38. Activities Collection

Collection:

```text
activities
```

This collection provides an audit-style record of important actions.

## Schema

```js
{
  _id: ObjectId,

  organizationId: ObjectId,

  actorId: ObjectId,

  action: String,

  entityType: String,

  entityId: ObjectId,

  metadata: Object,

  createdAt: Date
}
```

---

## 39. Activity Example

```json
{
  "_id": "activity001",
  "organizationId": "org001",
  "actorId": "user001",
  "action": "TASK_STATUS_CHANGED",
  "entityType": "TASK",
  "entityId": "task001",
  "metadata": {
    "oldStatus": "IN_PROGRESS",
    "newStatus": "DONE"
  },
  "createdAt": "2026-08-25T15:30:00Z"
}
```

---

## 40. Activity Indexes

Organization activity feed:

```js
{
  organizationId: 1,
  createdAt: -1
}
```

Resource activity:

```js
{
  organizationId: 1,
  entityType: 1,
  entityId: 1,
  createdAt: -1
}
```

---

## 41. Database Relationships

Although MongoDB is non-relational, the application maintains logical relationships.

```text
users
  │
  │ 1:N
  ▼
memberships
  │
  │ N:1
  ▼
organizations
  │
  ├───────────────┐
  │               │
  ▼               ▼
projects       invitations
  │
  │ 1:N
  ▼
tasks
  │
  ├──────────────┐
  │              │
  ▼              ▼
comments      attachments
```

Notifications and activities connect users to organization resources.

---

## 42. Referencing vs Embedding

The application will use both approaches selectively.

## Referencing

Use references for large or independently queried entities:

```text
User
Organization
Project
Task
Comment
Notification
Activity
```

Example:

```js
{
  taskId: ObjectId("...")
}
```

## Embedding

Use embedding for small tightly coupled data.

Example:

```js
settings: {
  timezone: "Asia/Kolkata",
  dateFormat: "DD/MM/YYYY"
}
```

This avoids unnecessary queries.

---

## 43. Why Comments Are Not Embedded

Avoid:

```js
{
  _id: taskId,
  comments: [
    {},
    {},
    {},
    ...
  ]
}
```

A highly active task could accumulate thousands of comments.

This would create:

* Large documents
* Expensive updates
* Document size risk
* Poor pagination

Instead:

```text
tasks
comments
```

remain separate.

---

## 44. Why Attachments Are Not Embedded

Binary file content should never be stored directly inside task documents.

Instead:

```text
File
 ↓
Cloudinary / S3
 ↓
URL + Metadata
 ↓
MongoDB
```

This keeps database documents small.

---

## 45. Tenant Isolation at Database Level

Every organization-owned collection should include:

```text
organizationId
```

Examples:

```text
projects.organizationId
tasks.organizationId
comments.organizationId
attachments.organizationId
notifications.organizationId
activities.organizationId
```

Queries must always be tenant-aware.

Bad:

```js
Task.findById(taskId);
```

Better:

```js
Task.findOne({
  _id: taskId,
  organizationId
});
```

The second approach prevents a user from retrieving another organization's resource merely by knowing its ID.

---

## 46. Compound Index Design

A key principle:

> Indexes should match real query patterns.

Example query:

```js
Task.find({
  organizationId,
  projectId,
  status
})
.sort({
  createdAt: -1
});
```

Potential index:

```js
{
  organizationId: 1,
  projectId: 1,
  status: 1,
  createdAt: -1
}
```

However, indexes should be verified against real workloads before adding large numbers of compound indexes.

---

## 47. Query Optimization

MongoDB queries should be analyzed using:

```js
.explain("executionStats")
```

Important metrics include:

```text
executionTimeMillis
nReturned
totalKeysExamined
totalDocsExamined
```

Desired behavior for indexed queries:

```text
COLLSCAN
   ↓
IXSCAN
   ↓
Lower documents examined
   ↓
Lower execution time
```

The project should include benchmarks before and after optimization.

---

## 48. Transactions

MongoDB transactions should be used when multiple related writes must succeed or fail together.

Example:

```text
Accept Organization Invitation
       │
       ├── Create Membership
       │
       └── Mark Invitation Accepted
```

Both operations should succeed together.

Transaction:

```text
BEGIN
  ↓
Create membership
  ↓
Update invitation
  ↓
COMMIT
```

If one operation fails:

```text
ROLLBACK
```

---

## 49. Soft Deletion

Resources that require historical/audit preservation may use soft deletion.

Example:

```js
{
  deletedAt: Date
}
```

Instead of immediately removing the record.

Queries normally filter:

```js
{
  deletedAt: null
}
```

Soft deletion is particularly useful for:

* Tasks
* Comments
* Users
* Organizations

Permanent deletion can be handled separately by authorized administrative processes.

---

## 50. Data Integrity Rules

The application should enforce:

### User

* Email must be unique.
* Email should be normalized.
* Password hash must exist.

### Organization

* Slug must be unique.
* Owner must exist.

### Membership

* User + organization must be unique.
* Role must be valid.

### Project

* Organization must exist.
* Owner must belong to organization.

### Task

* Project must belong to same organization.
* Assignee must belong to organization.
* Task cannot belong to a deleted project.

### Comment

* Author must have task access.
* Task must belong to same organization.

### Attachment

* Uploader must have access.
* Resource must belong to same organization.

---

## 51. Cross-Tenant Consistency Validation

When creating or updating a resource, related entities must belong to the same organization.

Example:

```text
Task
 │
 ├── organizationId = Org A
 │
 └── projectId = Project belonging to Org B
```

This must be rejected.

Correct validation:

```text
Task.organizationId
       ==
Project.organizationId
```

Similarly:

```text
Task.assignedTo
       ↓
Membership
       ↓
Same organization
```

---

## 52. Data Lifecycle

Typical task lifecycle:

```text
Created
  ↓
Updated
  ↓
Assigned
  ↓
In Progress
  ↓
In Review
  ↓
Done
  ↓
Archived/Deleted
```

Associated comments and activity logs may remain available for auditing even after task archival.

---

## 53. Database Backup Strategy

Production database backups should be handled through the managed MongoDB provider or deployment infrastructure.

Recommended strategy:

* Automated backups
* Point-in-time recovery where available
* Periodic restore testing
* Backup retention policy

Backups should never be stored using the same credentials as the application database connection.

---

## 54. Database Performance Strategy

Performance will be improved using:

```text
Indexes
Pagination
Projection
Aggregation
Redis caching
Query optimization
Connection pooling
```

Avoid:

```text
Unbounded queries
Large embedded arrays
Returning unnecessary fields
Repeated database queries
N+1 query patterns
```

---

## 55. Example Query Patterns

### Get organization projects

```js
Project.find({
  organizationId,
  status: { $ne: "ARCHIVED" }
})
.limit(20);
```

### Get project tasks

```js
Task.find({
  organizationId,
  projectId,
  deletedAt: null
})
.sort({ position: 1 });
```

### Get user's tasks

```js
Task.find({
  organizationId,
  assignedTo: userId,
  deletedAt: null
});
```

### Get unread notifications

```js
Notification.find({
  organizationId,
  recipientId: userId,
  readAt: null
})
.sort({ createdAt: -1 });
```

---

## 56. Suggested Mongoose Model Structure

Each module should own its schema/model.

```text
modules/
│
├── users/
│   └── user.model.ts
│
├── organizations/
│   └── organization.model.ts
│
├── memberships/
│   └── membership.model.ts
│
├── invitations/
│   └── invitation.model.ts
│
├── projects/
│   └── project.model.ts
│
├── tasks/
│   └── task.model.ts
│
├── comments/
│   └── comment.model.ts
│
├── attachments/
│   └── attachment.model.ts
│
├── notifications/
│   └── notification.model.ts
│
└── activities/
    └── activity.model.ts
```

---

## 57. Database Collection Summary

| Collection      | Purpose                          | Tenant Scoped |
| --------------- | -------------------------------- | ------------- |
| `users`         | User accounts                    | No            |
| `organizations` | SaaS tenants                     | Root tenant   |
| `memberships`   | User ↔ organization relationship | Yes           |
| `invitations`   | Organization invitations         | Yes           |
| `projects`      | Projects                         | Yes           |
| `tasks`         | Work items                       | Yes           |
| `comments`      | Task discussions                 | Yes           |
| `attachments`   | File metadata                    | Yes           |
| `notifications` | User notifications               | Yes           |
| `activities`    | Audit/activity records           | Yes           |

---

## 58. Core Index Summary

Recommended initial indexes:

```text
users
├── email UNIQUE

organizations
├── slug UNIQUE
└── ownerId

memberships
├── userId + organizationId UNIQUE
└── organizationId + role

invitations
├── organizationId + email
├── tokenHash
└── expiresAt

projects
├── organizationId + status
├── organizationId + slug
└── organizationId + _id

tasks
├── organizationId + projectId + status
├── organizationId + assignedTo + status
├── organizationId + dueDate
└── organizationId + priority

comments
└── organizationId + taskId + createdAt

attachments
└── organizationId + taskId

notifications
├── organizationId + recipientId + createdAt
└── recipientId + readAt + createdAt

activities
├── organizationId + createdAt
└── organizationId + entityType + entityId + createdAt
```

These indexes should be validated against actual query patterns and workload benchmarks before production.

---

## 59. Final Database Architecture

```text
                         MongoDB
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
      Users           Organizations        Memberships
                            │
                ┌───────────┼───────────┐
                │           │           │
                ▼           ▼           ▼
            Projects    Invitations   Activities
                │
                ▼
              Tasks
                │
          ┌─────┴─────┐
          ▼           ▼
      Comments    Attachments

Organization
     │
     └──────────────► Notifications
```

The central database rule is:

> **Every organization-owned resource must be traceable to exactly one organization, and every access query must verify that the authenticated user is authorized within that organization.**

This design provides the foundation for the remaining documents, particularly the API, authentication/authorization, and multi-tenancy specifications.
