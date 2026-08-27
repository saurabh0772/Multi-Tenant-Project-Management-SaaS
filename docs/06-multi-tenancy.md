# Multi-Tenant Project Management SaaS

## 06 — Multi-Tenancy Design Document

**Document:** 06-multi-tenancy.md  
**Version:** 1.0  
**Status:** Draft  
**Multi-Tenancy Model:** Shared Database / Shared Collections  
**Tenant:** Organization

## 1. Overview

Multi-tenancy is the most important architectural concept in this project.

The application allows multiple independent organizations to use the same SaaS platform while ensuring that their data remains logically isolated.

For example:

                    SaaS Application
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
     Organization A   Organization B   Organization C
          │                │                │
          ▼                ▼                ▼
       Projects         Projects         Projects
       Tasks            Tasks            Tasks
       Members          Members          Members

A user belonging to Organization A must never be able to access resources belonging to Organization B unless explicitly authorized through a valid relationship.

## 2. Tenant Definition

The application defines:

Organization = Tenant

Each organization represents an independent workspace.

Example:

Organization A
└── Acme Technologies

Organization B
└── Startup XYZ

Organization C
└── Design Agency

Each organization has its own:

Members
Projects
Tasks
Comments
Attachments
Notifications
Activities
Analytics

## 3. Multi-Tenancy Architecture

The project uses:

Shared Application + Shared Database + Shared Collections + Logical Tenant Isolation

Architecture:

                         Application
                              │
                              ▼
                         MongoDB
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
    Organization A       Organization B       Organization C
        │                     │                     │
        ▼                     ▼                     ▼
    organizationId        organizationId        organizationId

All tenants share the same MongoDB database and collections.

Tenant isolation is implemented at the application/query/authorization level.

## 4. Why Shared Database?

A shared database architecture is appropriate for this project because it provides:

Lower infrastructure cost
Simpler deployment
Easier database management
Easier analytics
Efficient resource utilization
Easier development
Simpler local development

It also demonstrates an important real-world SaaS architecture.

## 5. Alternative Multi-Tenancy Models

There are three common approaches.

Model 1 — Database Per Tenant
Organization A → Database A

Organization B → Database B

Organization C → Database C
Advantages
Strong isolation
Independent backups
Easier tenant-specific migration
Disadvantages
Infrastructure complexity
More databases to maintain
Expensive at scale
More complicated migrations

## 6. Model 2 — Collection Per Tenant

Database
│
├── organizationA_projects
├── organizationB_projects
├── organizationC_projects
Advantages
Some isolation
Disadvantages
Collection explosion
Complex migrations
Difficult administration
Poor scalability

This model is not selected.

## 7. Model 3 — Shared Collections

projects
│
├── organizationId = A
├── organizationId = A
├── organizationId = B
├── organizationId = C
└── organizationId = B
Advantages
Simple
Cost effective
Easy to scale initially
Easy migrations
Efficient infrastructure
Disadvantages
Application must enforce isolation correctly
Query mistakes can cause data leakage
Requires disciplined authorization

This is the selected architecture.

## 8. Tenant Identifier

Every tenant has a unique identifier:

organizationId

Example:

{
  "_id": "task_123",
  "organizationId": "org_001",
  "projectId": "project_123",
  "title": "Implement authentication"
}

organizationId is the primary tenant boundary.

## 9. Tenant-Scoped Collections

The following collections are tenant-scoped:

memberships
invitations
projects
tasks
comments
attachments
notifications
activities

Example:

projects
└── organizationId

tasks
└── organizationId

comments
└── organizationId

attachments
└── organizationId

notifications
└── organizationId

activities
└── organizationId

## 10. Non-Tenant Collection

The users collection is not directly tenant-scoped.

A user can belong to multiple organizations.

users
│
├── User A
├── User B
└── User C

The relationship between a user and organization is stored in:

memberships

## 11. Membership as Tenant Boundary

Example:

User
 │
 ▼
Membership
 │
 ├── userId
 ├── organizationId
 ├── role
 └── status

Suppose:

User A

belongs to:

Organization X → OWNER
Organization Y → MEMBER

The user can access both organizations but with different permissions.

## 12. Multiple Organizations

The architecture supports users belonging to multiple tenants.

Example:

                    User A
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
     Org A          Org B          Org C
     OWNER          MEMBER         MANAGER

This is important for SaaS applications because users may work with:

Multiple companies
Multiple teams
Multiple clients
Personal workspace
Consulting organizations

## 13. Organization Context

Every organization-scoped request needs an organization context.

Example:

Request
   │
   ▼
Authenticate User
   │
   ▼
Determine Organization
   │
   ▼
Verify Membership
   │
   ▼
Set Organization Context
   │
   ▼
Authorization
   │
   ▼
Database Query

Example backend context:

req.organization = {
  id: "org_123",
  role: "MANAGER"
};

## 14. Never Trust Client Tenant IDs

This is a critical security rule.

A malicious client can send:

{
  "organizationId": "org_victim"
}

Therefore:

The backend must never assume that the organization ID provided by the client is authorized.

Instead:

Client Organization ID
        ↓
Find Membership
        ↓
Verify User
        ↓
Verify Organization
        ↓
Verify Membership Status
        ↓
Establish Authorized Context

## 15. Tenant Resolution Strategies

The application can resolve the current organization using:

Option A — URL
/api/v1/organizations/:organizationId/projects
Option B — Subdomain
acme.yourapp.com
Option C — Request Header
X-Organization-ID: org_123
Option D — Authenticated Current Organization

The backend can maintain the user's selected organization/session context.

For this project, the preferred approach is:

Explicit organization ID + server-side membership verification

## 16. Organization ID in URL

Example:

GET /api/v1/organizations/org_123/projects

The backend receives:

organizationId = org_123

but does not trust it.

It performs:

User
 ↓
Membership.findOne({
   userId,
   organizationId,
   status: ACTIVE
})

Only if a valid membership exists should the request continue.

## 17. Tenant Context Middleware

Recommended middleware:

tenant.middleware.ts

Conceptual flow:

async function tenantMiddleware(req, res, next) {
    const organizationId = req.params.organizationId;

    const membership = await Membership.findOne({
        userId: req.user.id,
        organizationId,
        status: "ACTIVE"
    });

    if (!membership) {
        return res.status(404).json({
            success: false,
            error: {
                code: "ORGANIZATION_NOT_FOUND"
            }
        });
    }

    req.organization = {
        id: organizationId,
        role: membership.role
    };

    next();
}

The exact implementation may use a centralized authorization service rather than placing database logic directly inside middleware.

## 18. Tenant-Aware Querying

Every tenant-owned query must contain the organization boundary.

Incorrect:

Task.find({
    projectId
});

Correct:

Task.find({
    organizationId,
    projectId
});

This is one of the most important rules in the entire backend.

## 19. Resource Lookup

Incorrect:

const task = await Task.findById(taskId);

This checks only the task ID.

Correct:

const task = await Task.findOne({
    _id: taskId,
    organizationId
});

This ensures:

Task ID
+
Organization ID

must match.

## 20. Why Object IDs Are Not Enough

MongoDB ObjectIds are difficult to guess, but they are not an authorization mechanism.

For example:

/task/66babc123

being difficult to guess does not mean it is secure.

An attacker may obtain an ID through:

Logs
API responses
Browser history
Shared links
Data exposure
Another vulnerability

Therefore:

Unpredictable IDs do not replace authorization.

## 21. Defense in Depth

Tenant isolation should be enforced at multiple layers.

                  Request
                     │
                     ▼
              Authentication
                     │
                     ▼
            Membership Check
                     │
                     ▼
           Permission Check
                     │
                     ▼
          Tenant-Scoped Query
                     │
                     ▼
             Resource Check
                     │
                     ▼
                Database

Even if one layer fails, another layer should reduce the chance of cross-tenant access.

## 22. Cross-Tenant Attack Example

Suppose:

Organization A
    └── Project A
         └── Task A
              └── taskId = 123

Attacker belongs to:

Organization B

Attacker requests:

GET /api/v1/tasks/123

Bad implementation:

Task.findById("123");

Result:

❌ Task A returned to Organization B

Correct implementation:

Task.findOne({
    _id: "123",
    organizationId: "Organization B"
});

Result:

No matching document
        ↓
404

## 23. Cross-Tenant Write Protection

The same protection applies to writes.

Bad:

Task.findByIdAndUpdate(
    taskId,
    updateData
);

Correct:

Task.findOneAndUpdate(
    {
        _id: taskId,
        organizationId
    },
    updateData,
    {
        new: true
    }
);

This prevents an attacker from modifying another tenant's data.

## 24. Cross-Tenant Delete Protection

Bad:

Task.deleteOne({
    _id: taskId
});

Correct:

Task.deleteOne({
    _id: taskId,
    organizationId
});

If soft deletion is used:

Task.updateOne(
    {
        _id: taskId,
        organizationId
    },
    {
        deletedAt: new Date()
    }
);

## 25. Cross-Tenant Relationship Validation

Tenant isolation must also apply to relationships.

Suppose:

Organization A
 └── Project A

Organization B
 └── User B

User B attempts to create:

Task
 └── projectId = Project A

The backend must reject it.

Validation:

Project.organizationId
        ==
Current organizationId

If not:

❌ Reject

## 26. Assignee Validation

A task can only be assigned to an authorized user.

Bad:

assignedTo = any user ID

Correct validation:

Assignee
   ↓
Membership
   ↓
Same Organization
   ↓
Active

Example query:

Membership.findOne({
    userId: assignedTo,
    organizationId,
    status: "ACTIVE"
});

## 27. Project Ownership Validation

When creating a project:

Current User
      ↓
Membership
      ↓
Organization
      ↓
Create Project

The project's owner must belong to that organization.

Example:

{
    organizationId,
    ownerId: req.user.id
}

## 28. Tenant-Scoped Comments

Comments must include:

organizationId
taskId
authorId

Query:

Comment.find({
    organizationId,
    taskId
});

This prevents a user from retrieving comments from another tenant's task.

## 29. Tenant-Scoped Attachments

Attachments must contain:

organizationId
taskId
uploadedBy

When downloading or deleting an attachment:

User
 ↓
Organization Membership
 ↓
Attachment organizationId
 ↓
Resource access
 ↓
Allow/Deny

The external file URL alone must not determine authorization.

## 30. Tenant-Scoped Notifications

Notifications contain:

organizationId
recipientId

Query:

Notification.find({
    organizationId,
    recipientId: userId
});

A user must never receive notifications belonging to another organization.

## 31. Tenant-Scoped Activities

Activities contain:

organizationId
actorId
entityType
entityId

Example:

{
  "organizationId": "org_123",
  "actorId": "user_456",
  "action": "TASK_CREATED"
}

This allows organization activity feeds to remain isolated.

## 32. Tenant Isolation in Analytics

Analytics queries must also be tenant-scoped.

Incorrect:

Task.aggregate([
    {
        $group: {
            _id: "$status",
            count: { $sum: 1 }
        }
    }
]);

This could aggregate tasks across all organizations.

Correct:

Task.aggregate([
    {
        $match: {
            organizationId
        }
    },
    {
        $group: {
            _id: "$status",
            count: { $sum: 1 }
        }
    }
]);

## 33. Tenant Isolation in Search

Search must also be tenant-scoped.

Incorrect:

Search all tasks for "redis"

Correct:

Search tasks where:

organizationId = currentOrganization
AND
content matches "redis"

## 34. Tenant Isolation in Caching

Redis introduces another potential data leakage risk.

Bad cache key:

project:123

Better:

org:org_123:project:123

Example:

org:org_123:dashboard
org:org_456:dashboard

Tenant information should be included in cache keys for tenant-specific data.

## 35. Cache Isolation

Suppose:

Organization A
Dashboard → cached

Cache:

dashboard

Organization B requests dashboard.

If the same key is used:

❌ Organization A data could be returned

Correct:

org:A:dashboard
org:B:dashboard

This is essential.

## 36. Tenant Isolation in Background Jobs

Background jobs must carry tenant context when required.

Bad:

queue.add("send-notification", {
    userId
});

Better:

queue.add("send-notification", {
    organizationId,
    userId,
    notificationId
});

Worker:

Job
 ↓
organizationId
 ↓
Validate Resource
 ↓
Process

This prevents jobs from accidentally operating on resources from another tenant.

## 37. Tenant Isolation in WebSockets

Socket connections must also be tenant-aware.

When a user connects:

Socket
 ↓
Authenticate
 ↓
Identify User
 ↓
Verify Organization Membership
 ↓
Join Organization Room

Room:

organization:org_123

## 38. Socket Room Protection

A malicious client must not be able to simply send:

join organization:org_victim

The server must verify:

User
 ↓
Membership
 ↓
Organization
 ↓
Authorized?

Only then:

socket.join(`organization:${organizationId}`)

## 39. Project Room Protection

The same applies to project rooms.

project:project_123

Before joining:

Project
 ↓
Organization
 ↓
User Membership
 ↓
Project Access
 ↓
Join Room

## 40. Tenant Isolation in File Storage

Files should also follow tenant-aware storage paths.

Example:

organizations/
    org_123/
        projects/
            project_456/
                tasks/
                    task_789/
                        file.pdf

This makes ownership easier to reason about.

However:

Storage paths are not authorization.

The backend must still verify access before generating/returning file access.

## 41. Signed File URLs

For private files, the backend should preferably generate short-lived signed URLs.

Flow:

User
 ↓
Request Attachment
 ↓
Authorization
 ↓
Generate Signed URL
 ↓
Return URL
 ↓
Client Downloads

The URL should expire.

## 42. Tenant-Aware Middleware Architecture

Recommended middleware:

middleware/
│
├── authenticate.ts
├── resolveTenant.ts
├── authorize.ts
├── validate.ts
└── rateLimiter.ts

Request flow:

authenticate
      ↓
resolveTenant
      ↓
authorize
      ↓
validate
      ↓
controller

## 43. Tenant Context Object

The application should maintain a consistent request context.

Example:

interface TenantContext {
    organizationId: string;
    userId: string;
    role: OrganizationRole;
}

Example:

req.tenant = {
    organizationId: "org_123",
    userId: "user_123",
    role: "MANAGER"
};

This reduces the chance of passing unrelated IDs throughout the application.

## 44. Service Layer Tenant Enforcement

Tenant isolation should not depend exclusively on middleware.

Services should also receive tenant context.

Example:

taskService.updateTask({
    taskId,
    organizationId,
    userId,
    data
});

The service then performs:

organizationId
      ↓
Task Query
      ↓
Authorization
      ↓
Update

This provides an additional security boundary.

## 45. Repository Layer

A repository can make tenant-scoped access the default.

Example:

taskRepository.findById(
    organizationId,
    taskId
);

Internally:

Task.findOne({
    _id: taskId,
    organizationId
});

This reduces the chance of accidentally writing an unscoped query.

## 46. Tenant-Aware Repository Pattern

Recommended:

interface TaskRepository {
    findById(
        organizationId: string,
        taskId: string
    );

    findByProject(
        organizationId: string,
        projectId: string
    );

    update(
        organizationId: string,
        taskId: string,
        data: object
    );
}

Notice that:

organizationId

is required for every operation.

## 47. Query Helper

A reusable query helper can reduce mistakes.

Example:

function tenantFilter(organizationId: string) {
    return {
        organizationId
    };
}

Usage:

Task.find({
    ...tenantFilter(organizationId),
    projectId
});

However, developers should avoid over-abstracting simple queries.

Clarity is more important than cleverness.

## 48. Tenant-Aware API Design

Preferred:

/api/v1/organizations/:organizationId/projects

This makes the tenant boundary explicit.

For resources that already contain an ID:

/api/v1/projects/:projectId

the backend must derive and verify the project's organization.

## 49. Tenant Context State Machine

A request moves through:

UNKNOWN
   ↓
AUTHENTICATED
   ↓
TENANT_IDENTIFIED
   ↓
MEMBER_VERIFIED
   ↓
AUTHORIZED
   ↓
RESOURCE_VERIFIED
   ↓
ALLOWED

Any failure terminates the request.

## 50. Tenant Isolation Failure Scenarios

The system must defend against:

Scenario 1

User guesses another task ID.

❌ Prevent
Scenario 2

User sends another organization ID.

❌ Prevent
Scenario 3

User assigns task to another tenant's user.

❌ Prevent
Scenario 4

User joins another organization's socket room.

❌ Prevent
Scenario 5

User accesses another tenant's cached dashboard.

❌ Prevent
Scenario 6

User accesses another tenant's attachment.

❌ Prevent
Scenario 7

Analytics aggregate across all tenants.

❌ Prevent
Scenario 8

Background worker processes another tenant's resource.

❌ Prevent

## 51. Common Multi-Tenancy Mistakes

Mistake 1 — Trusting Frontend Organization ID
const organizationId = req.body.organizationId;

without verifying membership.

Solution

Derive/verify tenant context server-side.

Mistake 2 — Missing Organization Filter
Task.findById(taskId);
Solution
Task.findOne({
    _id: taskId,
    organizationId
});
Mistake 3 — Incorrect Cache Keys
dashboard:123
Solution
org:org_123:dashboard
Mistake 4 — Global Analytics
Task.aggregate(...)

without $match.

Solution
{
    $match: {
        organizationId
    }
}
Mistake 5 — Insecure Socket Rooms

Allowing arbitrary clients to join:

organization:<id>
Solution

Verify membership before joining.

## 52. Tenant Isolation Testing

Tenant isolation must have dedicated automated tests.

Create:

Organization A
Organization B

Create:

User A → Organization A
User B → Organization B

Create:

Task A → Organization A
Task B → Organization B

Then test:

User A → Task A
✅ Allowed

User B → Task B
✅ Allowed

User A → Task B
❌ Rejected

User B → Task A
❌ Rejected

## 53. Required Security Test Matrix

Operation    Same Tenant    Different Tenant
View project    ✅    ❌
Update project    ✅    ❌
Delete project    ✅    ❌
View task    ✅    ❌
Update task    ✅    ❌
Delete task    ✅    ❌
View comments    ✅    ❌
Add comment    ✅    ❌
Download attachment    ✅    ❌
View notifications    ✅    ❌
View activities    ✅    ❌
View analytics    ✅    ❌

Permissions must additionally be checked for the same-tenant operations.

## 54. Tenant Isolation and RBAC

Tenant isolation and RBAC are separate concepts.

Example:

User A
Organization A
MEMBER

The user belongs to the correct tenant.

But:

MEMBER

may not have permission to:

delete organization

Therefore:

Tenant Isolation
        +
RBAC
        +
Resource Authorization

are all required.

## 55. Tenant Isolation and Authentication

Authentication alone is insufficient.

Authenticated User
        ≠
Authorized Tenant User

A user can be authenticated but still have no membership in a particular organization.

Correct flow:

Authentication
      ↓
Membership
      ↓
Authorization

## 56. Tenant Isolation and Database Indexes

Because most queries contain:

organizationId

it should appear early in important compound indexes.

Example:

{
    organizationId: 1,
    projectId: 1,
    status: 1
}

This supports:

Tenant
 ↓
Project
 ↓
Status

queries efficiently.

## 57. Tenant Isolation and Transactions

Transactions must preserve tenant consistency.

Example:

Accept Invitation

Transaction:

BEGIN
  ↓
Verify invitation organization
  ↓
Verify user
  ↓
Create membership for SAME organization
  ↓
Mark invitation accepted
  ↓
COMMIT

The transaction must never create a membership for a different organization than the invitation.

## 58. Tenant-Aware Activity Logging

Every important activity should contain:

organizationId
actorId
entityId
action

Example:

{
  "organizationId": "org_123",
  "actorId": "user_123",
  "action": "TASK_UPDATED",
  "entityId": "task_123"
}

This allows organization-specific audit trails.

## 59. Tenant-Aware Background Jobs

Example notification job:

{
  "type": "TASK_ASSIGNED",
  "organizationId": "org_123",
  "taskId": "task_123",
  "recipientId": "user_456"
}

Worker validates:

Task.organizationId
        ==
Job.organizationId

If not:

❌ Reject job

## 60. Tenant-Aware Analytics

Analytics should always begin with a tenant filter.

Example:

Task.aggregate([
    {
        $match: {
            organizationId,
            deletedAt: null
        }
    },
    {
        $group: {
            _id: "$status",
            count: { $sum: 1 }
        }
    }
]);

This guarantees the aggregation operates on the current tenant's data.

## 61. Tenant-Aware Search

Example:

Task.find({
    organizationId,
    $text: {
        $search: searchTerm
    }
});

The tenant filter must always be applied.

## 62. Tenant-Aware Caching Strategy

Recommended cache structure:

org:{organizationId}:project:{projectId}
org:{organizationId}:dashboard
org:{organizationId}:members
org:{organizationId}:analytics

Example:

org:65a1:dashboard
org:92b4:dashboard

Each organization receives its own cache namespace.

## 63. Cache Invalidation

When tenant data changes:

Task Updated
     ↓
Invalidate:
org:123:project:456
org:123:dashboard

Never invalidate or overwrite another organization's cache.

## 64. Tenant-Aware Logging

Logs should include tenant context where appropriate.

Example:

{
  "requestId": "req_123",
  "userId": "user_456",
  "organizationId": "org_789",
  "action": "TASK_UPDATED"
}

This makes debugging significantly easier.

However, logs must not contain:

Passwords
Access tokens
Refresh tokens
Private file contents
Sensitive secrets

## 65. Tenant Data Export

A future feature may allow an organization to export its data.

Export query:

organizationId = requested organization

Every exported resource must use the same tenant filter.

Example:

Organization
   │
   ├── Members
   ├── Projects
   ├── Tasks
   ├── Comments
   └── Activities

No other organization's data may be included.

## 66. Tenant Deletion

Deleting an organization is a sensitive operation.

Possible lifecycle:

ACTIVE
  ↓
DELETION_REQUESTED
  ↓
SOFT_DELETED
  ↓
RETENTION PERIOD
  ↓
PERMANENT DELETION

Future implementations may use asynchronous jobs for large deletion operations.

Example:

Organization Deleted
       ↓
Queue Cleanup Job
       ↓
Delete Projects
       ↓
Delete Tasks
       ↓
Delete Comments
       ↓
Delete Attachments
       ↓
Delete Notifications
       ↓
Delete Activities

## 67. Tenant Suspension

Organizations may be suspended in the future.

Example:

Organization
    ↓
SUSPENDED

Users may remain authenticated but should not be allowed to perform normal organization operations.

Middleware:

User authenticated
        ↓
Membership valid
        ↓
Organization status?
        ↓
SUSPENDED
        ↓
Reject organization request

## 68. Tenant Quotas

Future SaaS plans may define limits.

Example:

FREE
 ├── 3 members
 ├── 5 projects
 └── 500 tasks

PRO
 ├── 50 members
 ├── Unlimited projects
 └── 50,000 tasks

Quota checks should always be tenant-specific.

Example:

org:123:task-count

## 69. Tenant-Aware Rate Limiting

Rate limits can be applied per:

IP
User
Organization
Endpoint

Example:

rate-limit:org:123:api

This prevents a single tenant from consuming disproportionate resources.

## 70. Tenant Isolation Architecture

The complete request architecture:

                         REQUEST
                            │
                            ▼
                     Authentication
                            │
                            ▼
                       User Identity
                            │
                            ▼
                    Organization ID
                            │
                            ▼
                  Membership Verification
                            │
                            ▼
                         Role
                            │
                            ▼
                       Permission
                            │
                            ▼
                   Resource Ownership
                            │
                            ▼
                    Tenant-Scoped Query
                            │
                            ▼
                         MongoDB

## 71. Complete Multi-Tenant Data Flow

                         User
                          │
                          ▼
                    React Frontend
                          │
                          ▼
                       API Request
                          │
                          ▼
                   Access Token
                          │
                          ▼
                   Authentication
                          │
                          ▼
                Organization Context
                          │
                          ▼
                  Membership Lookup
                          │
                          ▼
                     RBAC Check
                          │
                          ▼
                Tenant-Scoped Service
                          │
                          ▼
               Tenant-Scoped Repository
                          │
                          ▼
                        MongoDB

## 72. Multi-Tenant Architecture Example

Suppose the platform contains:

Organization A
├── 10 Members
├── 5 Projects
└── 150 Tasks

Organization B
├── 20 Members
├── 8 Projects
└── 400 Tasks

All data can exist inside:

projects
tasks
memberships

but every document contains its tenant identifier.

Example:

tasks
│
├── Task 1 → org_A
├── Task 2 → org_A
├── Task 3 → org_B
├── Task 4 → org_B
└── Task 5 → org_A

Queries always operate within the current organization.

## 73. Multi-Tenancy Best Practices

The implementation must follow these rules:

Rule 1

Every tenant-owned resource must contain organizationId.

Rule 2

Every tenant-scoped query must filter by organizationId.

Rule 3

Never trust a client-provided organization ID.

Rule 4

Verify membership before establishing tenant context.

Rule 5

Check authorization after tenant resolution.

Rule 6

Validate relationships across the same tenant.

Rule 7

Include tenant identifiers in cache keys.

Rule 8

Include tenant context in background jobs.

Rule 9

Protect WebSocket rooms using membership checks.

Rule 10

Tenant isolation must be covered by automated tests.

## 74. Developer Checklist

Before implementing a new organization-owned resource, verify:

□ Does the schema contain organizationId?

□ Does the create operation derive organizationId
  from authorized context?

□ Does the read query contain organizationId?

□ Does the update query contain organizationId?

□ Does the delete query contain organizationId?

□ Are related resources verified to belong
  to the same organization?

□ Are authorization checks implemented?

□ Are Redis keys tenant-specific?

□ Are background jobs tenant-aware?

□ Are WebSocket events tenant-scoped?

□ Are tenant-isolation tests included?

## 75. Multi-Tenant Testing Strategy

At minimum, automated tests should create:

Tenant A
Tenant B

Users:

User A → Tenant A
User B → Tenant B

Resources:

Project A → Tenant A
Project B → Tenant B

Task A → Tenant A
Task B → Tenant B

Then test:

User A → Project A
       → ✅

User A → Task A
       → ✅

User A → Project B
       → ❌

User A → Task B
       → ❌

User B → Project A
       → ❌

User B → Task A
       → ❌

## 76. Security Regression Tests

Tenant-isolation tests should remain in the test suite permanently.

Whenever a new resource is introduced, tests should verify:

Same tenant → allowed according to permissions

Different tenant → always denied

This prevents future features from accidentally introducing data leakage.

## 77. Future Evolution

The current architecture uses:

Shared Database
Shared Collections
organizationId

If the SaaS grows significantly, it can evolve toward:

Shared Database
       ↓
Large Tenants
       ↓
Dedicated Database

or:

Tenant
   ↓
Database Sharding / Partitioning

The current application design should keep tenant-aware repository/service boundaries so that such migration remains possible.

## 78. Final Multi-Tenancy Architecture

                         SaaS Platform
                              │
                 ┌────────────┼────────────┐
                 │            │            │
                 ▼            ▼            ▼
              Tenant A     Tenant B     Tenant C
                 │            │            │
                 ▼            ▼            ▼
             Membership   Membership   Membership
                 │            │            │
                 ▼            ▼            ▼
              Projects     Projects     Projects
                 │            │            │
                 ▼            ▼            ▼
               Tasks        Tasks        Tasks
                 │            │            │
                 └────────────┼────────────┘
                              │
                         MongoDB
                              │
                       Shared Collections
                              │
                       organizationId
                              │
                    Tenant Isolation Layer
                              │
               ┌──────────────┼──────────────┐
               ▼              ▼              ▼
          Authorization     Queries        Caching
               │              │              │
               └──────────────┼──────────────┘
                              ▼
                     Secure Multi-Tenant
                          Application

## 79. Final Design Principle

The fundamental rule of this SaaS is:

A user's authentication identifies who they are; their membership identifies which tenant they can access; their role determines what they can do; and every database/resource operation must enforce the same tenant boundary.

In short:

AUTHENTICATION
      ↓
WHO IS THE USER?
      ↓
TENANT MEMBERSHIP
      ↓
WHICH ORGANIZATION?
      ↓
AUTHORIZATION
      ↓
WHAT CAN THEY DO?
      ↓
RESOURCE VALIDATION
      ↓
DOES THE RESOURCE BELONG TO THIS TENANT?
      ↓
DATABASE OPERATION

This design ensures that Organization A can never accidentally access Organization B's projects, tasks, comments, files, notifications, analytics, or other tenant-owned resources, even though all tenants share the same application and database.
