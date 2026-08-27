# Multi-Tenant Project Management SaaS

## Software Requirements Specification

**Document:** 01-requirements.md
**Version:** 1.0
**Status:** Draft
**Project Type:** Multi-Tenant SaaS / Project Management Platform

---

## 1. Introduction

### 1.1 Purpose

The purpose of this document is to define the functional and non-functional requirements for the Multi-Tenant Project Management SaaS.

The system will allow multiple organizations to use a shared project management platform while maintaining strict logical isolation between their data.

Users will be able to create or join organizations, collaborate with team members, create projects, manage tasks, communicate through comments, upload attachments, receive notifications, and monitor project progress.

The system is designed as a production-oriented full-stack application with a strong focus on:

* Multi-tenancy
* Authentication and authorization
* Role-based access control
* RESTful API design
* Real-time collaboration
* Background processing
* Caching
* Database optimization
* Security
* Scalability
* Testing
* Deployment

---

## 2. Scope

### 2.1 In Scope

The initial system will include:

* User registration and login
* Access and refresh token authentication
* Password reset
* Email verification
* User profile management
* Organization creation
* Multiple organizations per user
* Organization membership
* Role-based access control
* Organization invitations
* Project management
* Task management
* Kanban board
* Task assignment
* Task priorities and statuses
* Labels
* Comments
* File attachments
* Notifications
* Activity logs
* Real-time updates
* Redis caching
* Background jobs
* Search and filtering
* Pagination
* MongoDB indexing
* Analytics dashboard
* API documentation
* Automated testing
* Docker-based deployment
* CI/CD

### 2.2 Out of Scope

The following features are not part of the initial release:

* Native mobile applications
* Video conferencing
* Voice calling
* Full accounting functionality
* Advanced enterprise billing
* Complex AI-based project management
* Microservices architecture
* Kubernetes orchestration

These may be considered future enhancements.

---

## 3. Product Vision

The platform aims to provide a collaborative workspace where teams can efficiently organize projects and tasks while demonstrating the architecture and engineering practices required by production SaaS applications.

The system should be:

* Secure
* Reliable
* Scalable
* Maintainable
* Responsive
* Observable
* Easy to extend

---

## 4. User Roles

The system will initially support four organization-level roles.

## 4.1 Owner

The organization owner has the highest level of organization permissions.

Capabilities:

* Manage organization
* Update organization settings
* Invite members
* Remove members
* Change member roles
* Create projects
* Delete projects
* Manage all organization resources
* Transfer organization ownership
* Delete organization

---

## 4.2 Admin

Admins can manage most organization resources but cannot perform owner-only operations.

Capabilities:

* Invite members
* Remove members where permitted
* Manage projects
* Manage tasks
* Manage organization resources
* View organization analytics

---

## 4.3 Manager

Managers primarily manage projects and tasks.

Capabilities:

* Create projects
* Update projects
* Create tasks
* Assign tasks
* Update task status
* Manage project members
* View project analytics
* Comment on tasks

---

## 4.4 Member

Members are regular organization users.

Capabilities:

* View accessible projects
* View tasks
* Update assigned tasks
* Create comments
* Upload permitted attachments
* Receive notifications

---

## 5. Functional Requirements

## FR-01 — User Registration

The system shall allow a new user to create an account.

Required information:

* Name
* Email
* Password

The system shall:

1. Validate the submitted data.
2. Check whether the email already exists.
3. Hash the password.
4. Create the user.
5. Initiate email verification where enabled.
6. Return an appropriate response.

---

## FR-02 — User Login

The system shall allow registered users to authenticate using email and password.

Upon successful authentication:

* A short-lived access token shall be generated.
* A long-lived refresh token shall be generated.
* The refresh token shall be securely stored.
* The user shall receive an authenticated session.

Invalid credentials shall return an appropriate authentication error.

---

## FR-03 — Token Refresh

The system shall provide a refresh mechanism when an access token expires.

The refresh flow shall:

1. Validate the refresh token.
2. Verify its expiration.
3. Verify that the associated user/session is valid.
4. Generate a new access token.
5. Rotate the refresh token when applicable.

---

## FR-04 — Logout

The system shall allow users to log out.

Logout shall invalidate the applicable refresh-token/session record so that it cannot be reused.

---

## FR-05 — Password Reset

The system shall provide password-reset functionality.

Flow:

```text
User requests reset
        ↓
Generate secure reset token
        ↓
Store hashed token + expiry
        ↓
Send reset email
        ↓
User opens reset link
        ↓
Validate token
        ↓
Set new password
        ↓
Invalidate reset token
```

Reset tokens shall expire after a limited period.

---

## 6. User Profile Requirements

Users shall be able to:

* View their profile
* Update their name
* Update their profile image
* Change their password
* View organizations they belong to

Users shall not be able to modify system-managed identifiers such as their user ID.

---

## 7. Organization Requirements

## FR-06 — Create Organization

Authenticated users shall be able to create an organization.

Required information:

* Organization name

The creator shall automatically become the organization owner.

Example:

```text
User
 ↓
Create Organization
 ↓
Acme Technologies
 ↓
User becomes OWNER
```

---

## FR-07 — Organization Switching

Users belonging to multiple organizations shall be able to switch their active organization.

Example:

```text
Saurabh
│
├── Acme Technologies
│     └── ADMIN
│
├── Startup XYZ
│     └── MEMBER
│
└── Personal Workspace
      └── OWNER
```

Changing the active organization shall affect the resources displayed and accessed by the user.

---

## 8. Organization Membership Requirements

The system shall maintain organization membership independently from the core user record.

A membership shall contain:

* User ID
* Organization ID
* Role
* Membership status
* Joined timestamp

A user may belong to multiple organizations with different roles.

Example:

```text
User A
│
├── Organization A → OWNER
├── Organization B → MEMBER
└── Organization C → MANAGER
```

---

## 9. Invitation Requirements

Authorized users shall be able to invite new members.

An invitation shall contain:

* Email address
* Organization
* Assigned role
* Secure invitation token
* Expiration time
* Invitation status

Invitation states:

```text
PENDING
ACCEPTED
EXPIRED
REVOKED
```

The invitation token shall be:

* Securely generated
* Time limited
* Stored securely
* Invalidated after acceptance

---

## 10. Project Requirements

## FR-08 — Create Project

Authorized organization members shall be able to create projects.

A project shall contain:

* Name
* Description
* Organization
* Owner
* Status
* Start date
* Due date
* Created timestamp
* Updated timestamp

Project statuses:

```text
PLANNING
ACTIVE
ON_HOLD
COMPLETED
ARCHIVED
```

---

## FR-09 — Project Management

Authorized users shall be able to:

* View projects
* Update projects
* Archive projects
* Delete projects according to permissions
* View project members
* View project tasks

---

## 11. Task Requirements

## FR-10 — Task Creation

Authorized users shall be able to create tasks inside projects.

A task shall support:

* Title
* Description
* Project
* Organization
* Creator
* Assignee
* Status
* Priority
* Labels
* Due date
* Position/order
* Created timestamp
* Updated timestamp

---

## FR-11 — Task Status

Tasks shall support the following statuses:

```text
TODO
IN_PROGRESS
IN_REVIEW
DONE
```

Users with appropriate permissions shall be able to change task status.

---

## FR-12 — Task Priority

Tasks shall support:

```text
LOW
MEDIUM
HIGH
URGENT
```

---

## FR-13 — Task Assignment

Authorized users shall be able to assign tasks to organization members who have access to the relevant project.

The system shall prevent assignment to unauthorized users.

---

## 12. Kanban Requirements

The application shall provide a Kanban-style task board.

Example:

```text
┌────────────┐ ┌─────────────┐ ┌────────────┐ ┌────────────┐
│    TODO    │ │ IN PROGRESS │ │ IN REVIEW  │ │    DONE    │
├────────────┤ ├─────────────┤ ├────────────┤ ├────────────┤
│ Task A     │ │ Task C       │ │ Task E     │ │ Task G     │
│ Task B     │ │ Task D       │ │ Task F     │ │ Task H     │
└────────────┘ └─────────────┘ └────────────┘ └────────────┘
```

Users shall be able to move tasks between permitted statuses.

Task ordering shall be maintained using a position/order field.

---

## 13. Comment Requirements

Users with access to a task shall be able to:

* Add comments
* View comments
* Delete their own comments where permitted
* Edit their own comments where permitted

Comments shall be associated with:

* Task
* Project
* Organization
* Author

---

## 14. Attachment Requirements

Users shall be able to attach files to supported resources.

The system shall:

* Validate file type
* Validate file size
* Upload files to external object storage
* Store file metadata
* Associate attachments with the correct organization/resource

Stored metadata shall include:

* File name
* File URL
* File type
* File size
* Uploaded by
* Organization
* Associated resource
* Upload timestamp

---

## 15. Notification Requirements

The system shall generate notifications for important events.

Examples:

```text
Task assigned to user
Task mentioned user
Comment added
Organization invitation
Task approaching deadline
Project update
```

Users shall be able to:

* View notifications
* Mark notifications as read
* Mark notifications as unread where supported
* View unread notification count

---

## 16. Real-Time Requirements

The application shall support real-time updates for collaboration-related events.

Real-time events may include:

```text
task.created
task.updated
task.deleted

comment.created

notification.created

user.online
user.offline
```

When a user updates a task, other authorized users viewing the same project should receive the update without requiring a page refresh.

---

## 17. Activity Log Requirements

The system shall maintain an audit-style activity history for important organization actions.

Examples:

```text
Saurabh created project "Backend Migration"

Rahul created task "Implement Redis"

Aman changed task status
IN_PROGRESS → DONE
```

Activity records shall contain:

* Actor
* Organization
* Action
* Resource type
* Resource ID
* Metadata
* Timestamp

---

## 18. Search and Filtering Requirements

The system shall provide search and filtering functionality.

Tasks shall support filtering by:

* Status
* Priority
* Assignee
* Project
* Label
* Due date

The system shall support:

* Pagination
* Sorting
* Search
* Configurable page size

Example:

```text
GET /api/v1/tasks
    ?projectId=123
    &status=IN_PROGRESS
    &priority=HIGH
    &page=1
    &limit=20
```

---

## 19. Analytics Requirements

The organization dashboard shall provide project and task statistics.

Metrics may include:

```text
Total Projects
Active Projects
Completed Projects

Total Tasks
Completed Tasks
Overdue Tasks

Tasks by Status
Tasks by Priority
Tasks by Member

Project Completion Rate
```

Analytics shall be generated using appropriate MongoDB queries and aggregation pipelines.

---

## 20. Background Processing Requirements

The system shall support asynchronous processing through a job queue.

Background jobs shall include:

* Invitation emails
* Notification delivery
* Deadline reminders
* Daily summaries
* Cleanup of expired invitations
* Other non-critical asynchronous operations

Example:

```text
API Request
    ↓
Create Invitation
    ↓
Queue Email Job
    ↓
Return HTTP Response
    ↓
Worker Processes Job
    ↓
Send Email
```

Background jobs should support:

* Retry
* Failure handling
* Delayed execution
* Job status tracking where required

---

## 21. Caching Requirements

Redis shall be used for selected high-frequency operations.

Potential cache targets:

* Organization information
* Project metadata
* Frequently accessed dashboards
* Permission-related data where safe
* Rate-limit counters

The system shall define appropriate cache expiration and invalidation rules.

---

## 22. Rate Limiting Requirements

Sensitive endpoints shall be protected using rate limiting.

Examples:

```text
Login
Registration
Password Reset
Invitation Creation
Public API endpoints
```

The system shall return an appropriate response when the configured request limit is exceeded.

---

## 23. API Requirements

The backend shall expose RESTful APIs.

All APIs shall follow a versioned structure:

```text
/api/v1/...
```

API responses should follow a consistent format.

### Success

```json
{
  "success": true,
  "data": {}
}
```

### Error

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

## 24. Security Requirements

The application shall:

* Hash passwords securely
* Protect authentication tokens
* Use secure HTTP-only cookies where applicable
* Validate request data
* Implement authorization checks
* Prevent cross-tenant access
* Apply rate limiting
* Configure CORS correctly
* Use security headers
* Validate uploaded files
* Protect sensitive endpoints
* Avoid exposing internal errors
* Store secrets in environment variables

---

## 25. Non-Functional Requirements

## NFR-01 — Performance

The API should provide low-latency responses for normal operations.

Performance-sensitive operations should use:

* Database indexes
* Pagination
* Redis caching
* Efficient queries
* Proper aggregation pipelines

---

## NFR-02 — Scalability

The architecture should allow horizontal scaling of backend instances.

The system should be designed so that:

```text
1 Backend Instance
        ↓
Multiple Backend Instances
```

can be introduced without major architectural changes.

Redis and externalized background workers should help support this model.

---

## NFR-03 — Reliability

The application should handle:

* Database failures
* Redis failures
* Background job failures
* Network failures
* Invalid requests
* Expired authentication
* External service failures

Graceful error handling should be implemented.

---

## NFR-04 — Maintainability

The codebase should follow:

* TypeScript
* Modular architecture
* Separation of concerns
* Reusable services
* Centralized error handling
* Consistent naming conventions
* Environment-based configuration

---

## NFR-05 — Security

Security shall be considered at every layer:

```text
Frontend
   ↓
API
   ↓
Authentication
   ↓
Authorization
   ↓
Tenant Isolation
   ↓
Database
```

---

## NFR-06 — Availability

The application should minimize downtime through:

* Health checks
* Proper error handling
* Automated deployment
* Restart policies
* Monitoring
* Database backups where supported

---

## NFR-07 — Observability

The application should provide:

* Structured logs
* Error logs
* API request timing
* Health endpoint
* Worker logs
* Database/Redis connectivity checks

---

## 26. Data Isolation Requirements

This is a critical requirement.

Every organization-owned resource must be associated with an `organizationId`.

Example:

```text
Organization
    │
    ├── Project
    │     └── organizationId
    │
    ├── Task
    │     └── organizationId
    │
    ├── Comment
    │     └── organizationId
    │
    ├── Notification
    │     └── organizationId
    │
    └── Activity
          └── organizationId
```

The backend shall never rely solely on client-provided organization IDs.

All organization-scoped queries shall verify:

1. User authentication
2. Organization membership
3. Required permission
4. Resource ownership/association
5. Organization ID consistency

---

## 27. Audit Requirements

Important actions should be recorded.

Examples:

```text
Organization created
Member invited
Member removed
Role changed
Project created
Project deleted
Task created
Task assigned
Task status changed
```

Audit records shall be immutable from the normal user interface.

---

## 28. Browser/Application Requirements

The frontend shall provide:

* Responsive UI
* Desktop support
* Tablet support
* Modern browser support
* Loading states
* Error states
* Empty states
* Optimistic UI where appropriate
* Real-time updates

---

## 29. Deployment Requirements

The system shall be deployable using containerized services.

Minimum production components:

```text
Frontend
Backend API
Worker
MongoDB
Redis
Object Storage
```

The application shall use environment variables for:

```text
Database credentials
JWT secrets
Redis credentials
Storage credentials
Email credentials
Payment/API credentials
```

No production secrets shall be committed to source control.

---

## 30. Future Enhancements

Potential future features include:

* Subscription billing
* Organization plans
* Usage limits
* Advanced analytics
* Custom roles
* Webhooks
* Public API
* API keys
* SSO
* OAuth providers
* Advanced search
* Calendar integration
* GitHub integration
* Slack integration
* AI task assistance
* Automated project reports

These features are intentionally excluded from the initial implementation to keep the project focused.

---

## 31. MVP Definition

The first working version should contain:

```text
Authentication
        ↓
Organization
        ↓
Membership + RBAC
        ↓
Projects
        ↓
Tasks
        ↓
Kanban
        ↓
Comments
```

After the MVP is stable, add:

```text
Real-Time
    ↓
Redis
    ↓
BullMQ
    ↓
Notifications
    ↓
Attachments
    ↓
Analytics
    ↓
Testing
    ↓
Docker
    ↓
CI/CD
```

---

## 32. Success Criteria

The project will be considered successful when:

* Users can securely register and authenticate.
* Users can belong to multiple organizations.
* Organization data is strictly isolated.
* RBAC works correctly.
* Organizations can manage projects.
* Projects can manage tasks.
* Tasks support assignment, status and priority.
* Users can collaborate through comments.
* Real-time updates work correctly.
* Background jobs execute reliably.
* Redis caching works for selected resources.
* MongoDB queries are appropriately indexed.
* APIs are documented.
* Automated tests cover critical workflows.
* The application can be deployed using Docker.
* CI/CD successfully builds and tests the project.
* Security controls prevent common unauthorized access scenarios.

---

## 33. Final Product Definition

The final product is a **production-oriented multi-tenant project management SaaS** that demonstrates full-stack and backend engineering capabilities.

The system combines:

```text
                    ┌──────────────────┐
                    │   React Client   │
                    └────────┬─────────┘
                             │
                       REST + WebSocket
                             │
                    ┌────────▼─────────┐
                    │   Node/Express   │
                    └────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
      MongoDB              Redis             Socket.IO
          │                  │
          │                  ▼
          │                BullMQ
          │                  │
          │                  ▼
          │           Background Workers
          │
          ▼
     Data Isolation

                 +
        Authentication
                 +
              RBAC
                 +
           Multi-Tenancy
                 +
          Real-Time Events
                 +
        Security & Testing
                 +
          Docker + CI/CD
```

The primary engineering objective is not simply to create a project management UI, but to demonstrate the ability to **design, implement, secure, optimize, test, and deploy a multi-tenant production-style SaaS system**.
