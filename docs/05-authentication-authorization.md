# Multi-Tenant Project Management SaaS

## Authentication & Authorization Design

**Document:** `05-authentication-authorization.md`
**Version:** 1.0
**Status:** Draft
**Authentication Model:** Access Token + Refresh Token
**Authorization Model:** RBAC + Resource-Level Authorization

---

## 1. Overview

Authentication and authorization are core security components of the Multi-Tenant Project Management SaaS.

The system must answer two different questions:

### Authentication

> **Who are you?**

### Authorization

> **What are you allowed to do?**

The architecture separates these responsibilities:

```text
Authentication
      ↓
Identify User
      ↓
Organization Membership
      ↓
Role
      ↓
Permission
      ↓
Resource Access
```

The system uses:

* Email/password authentication
* Password hashing
* Short-lived access tokens
* Long-lived refresh tokens
* Secure token storage
* Refresh-token rotation
* Session/revocation support
* Role-based access control
* Resource-level authorization
* Organization-level tenant isolation

---

## 2. Authentication Architecture

The authentication system consists of:

```text
User
 │
 ├── Registration
 ├── Login
 ├── Email Verification
 ├── Access Token
 ├── Refresh Token
 ├── Logout
 ├── Password Reset
 └── Password Change
```

High-level flow:

```text
                  User
                   │
                   ▼
             Login/Register
                   │
                   ▼
            Verify Credentials
                   │
            ┌──────┴──────┐
            ▼             ▼
      Access Token    Refresh Token
       short-lived     long-lived
            │             │
            ▼             ▼
       API Requests    Secure Storage
```

---

## 3. Authentication vs Authorization

## Authentication

Authentication verifies the identity of the user.

Example:

```text
email + password
       ↓
Credential verification
       ↓
User identified
```

## Authorization

Authorization determines whether the authenticated user can perform an operation.

Example:

```text
User
 ↓
Organization Membership
 ↓
ADMIN
 ↓
Can manage members
```

Being authenticated does **not** automatically mean the user is authorized.

---

## 4. User Registration

Endpoint:

```http
POST /api/v1/auth/register
```

Request:

```json
{
  "name": "Saurabh Kumar",
  "email": "saurabh@example.com",
  "password": "StrongPassword123!"
}
```

Registration flow:

```text
Client
  ↓
Validate Input
  ↓
Normalize Email
  ↓
Check Existing User
  ↓
Hash Password
  ↓
Create User
  ↓
Create Verification Token
  ↓
Queue Verification Email
  ↓
Return Response
```

The password must never be stored directly.

---

## 5. Password Hashing

Passwords must be hashed using a modern password hashing algorithm such as:

* Argon2id
* bcrypt

The preferred implementation is:

> **Argon2id**

Conceptually:

```text
Password
   ↓
Argon2id
   ↓
Password Hash
   ↓
MongoDB
```

Example stored value:

```text
$argon2id$v=19$...
```

The original password cannot be recovered from the stored hash.

---

## 6. Password Requirements

The application should enforce reasonable password requirements.

Example:

```text
Minimum length: 8 characters
```

The system may additionally encourage:

* Uppercase characters
* Lowercase characters
* Numbers
* Special characters

However, password security should primarily rely on a strong password hashing algorithm rather than simplistic complexity rules.

---

## 7. Login

Endpoint:

```http
POST /api/v1/auth/login
```

Request:

```json
{
  "email": "saurabh@example.com",
  "password": "StrongPassword123!"
}
```

Flow:

```text
Login Request
      ↓
Validate Input
      ↓
Find User
      ↓
Check Account Status
      ↓
Compare Password Hash
      ↓
Create Session
      ↓
Generate Access Token
      ↓
Generate Refresh Token
      ↓
Set Secure Refresh Cookie
      ↓
Return Response
```

---

## 8. Failed Login

If credentials are invalid:

```http
401 Unauthorized
```

Response:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

The API should avoid revealing whether:

```text
Email exists
```

or:

```text
Password was incorrect
```

This prevents account enumeration.

---

## 9. Access Token

The access token is used for normal API requests.

Example:

```http
Authorization: Bearer <access_token>
```

The access token should be short-lived.

Example configuration:

```text
Access Token TTL:
15 minutes
```

The exact value should be configurable through environment variables.

---

## 10. Access Token Payload

The token should contain only the information required for authentication/context.

Example:

```json
{
  "sub": "user_123",
  "sessionId": "session_456",
  "type": "access",
  "iat": 1787731200,
  "exp": 1787732100
}
```

Where:

| Field       | Meaning              |
| ----------- | -------------------- |
| `sub`       | User ID              |
| `sessionId` | Session identifier   |
| `type`      | Token type           |
| `iat`       | Issued-at timestamp  |
| `exp`       | Expiration timestamp |

Sensitive information should not be placed inside JWT payloads.

---

## 11. Refresh Token

Access tokens are intentionally short-lived.

When an access token expires, the client can use the refresh token to obtain a new access token.

```text
Access Token
     │
     ▼
Expires
     │
     ▼
Refresh Token
     │
     ▼
New Access Token
```

Example refresh token lifetime:

```text
7 days
```

The exact duration should be configurable.

---

## 12. Why Access + Refresh Tokens?

Using only a long-lived access token creates unnecessary security risk.

Using short-lived access tokens provides:

* Reduced exposure window
* Better session control
* Easier revocation strategy

The refresh token provides:

* Persistent login
* Session continuation
* Token renewal

Architecture:

```text
Access Token
Short-lived
     │
     └── Used frequently

Refresh Token
Long-lived
     │
     └── Used only for renewal
```

---

## 13. Refresh Token Storage

The refresh token should not be exposed to JavaScript whenever possible.

Recommended approach:

> Store refresh token in a secure HTTP-only cookie.

Example cookie properties:

```text
HttpOnly
Secure
SameSite
Path
Max-Age/Expires
```

Example conceptual configuration:

```js
res.cookie("refreshToken", token, {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/api/v1/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000
});
```

The exact `SameSite` policy should match the application's frontend/backend deployment architecture.

---

## 14. Refresh Token Hashing

The raw refresh token should ideally not be stored in the database.

Instead:

```text
Refresh Token
      ↓
Hash
      ↓
Database
```

The database stores:

```text
tokenHash
```

rather than:

```text
rawRefreshToken
```

This provides additional protection if the database is compromised.

---

## 15. Session Collection

A dedicated session/refresh-token collection may be used.

Example:

```text
sessions
```

Schema:

```js
{
  _id: ObjectId,

  userId: ObjectId,

  tokenHash: String,

  userAgent: String | null,

  ipAddress: String | null,

  expiresAt: Date,

  revokedAt: Date | null,

  createdAt: Date,

  updatedAt: Date
}
```

This allows the application to support multiple devices.

Example:

```text
User
 │
 ├── Chrome Laptop
 │     └── Session A
 │
 ├── Mobile
 │     └── Session B
 │
 └── Chrome Desktop
       └── Session C
```

---

## 16. Refresh Token Rotation

Refresh tokens should be rotated.

Flow:

```text
Old Refresh Token
       ↓
Validate
       ↓
Revoke/Replace Old Session Token
       ↓
Generate New Refresh Token
       ↓
Generate New Access Token
       ↓
Return New Session
```

This reduces the usefulness of a stolen refresh token.

---

## 17. Refresh Token Reuse Detection

A stronger implementation can detect refresh-token reuse.

Example:

```text
Token A
  ↓
Used successfully
  ↓
Token A revoked
  ↓
Token B issued
```

If Token A is later used again:

```text
Token A reused
      ↓
Potential token theft
      ↓
Invalidate token family/session
      ↓
Require re-authentication
```

This is an advanced security feature and should be implemented carefully.

---

## 18. Refresh Endpoint

Endpoint:

```http
POST /api/v1/auth/refresh
```

Flow:

```text
Refresh Cookie
      ↓
Extract Token
      ↓
Hash Token
      ↓
Find Session
      ↓
Check Expiration
      ↓
Check Revocation
      ↓
Rotate Token
      ↓
Generate Access Token
      ↓
Set New Refresh Cookie
```

Response:

```json
{
  "success": true,
  "data": {
    "message": "Access token refreshed"
  }
}
```

---

## 19. Logout

Endpoint:

```http
POST /api/v1/auth/logout
```

Logout should:

1. Identify the current session.
2. Revoke the refresh session.
3. Clear the refresh cookie.
4. Optionally invalidate related server-side state.

Flow:

```text
Logout
  ↓
Revoke Session
  ↓
Clear Cookie
  ↓
Response
```

---

## 20. Logout From All Devices

The system may support:

```http
POST /api/v1/auth/logout-all
```

Flow:

```text
User
 ↓
Logout All
 ↓
Find all active sessions
 ↓
Revoke sessions
 ↓
Clear current refresh cookie
```

This is useful when the user suspects account compromise.

---

## 21. Email Verification

New accounts may require email verification.

Flow:

```text
Register
   ↓
Create User
   ↓
Generate Verification Token
   ↓
Hash Token
   ↓
Store Token
   ↓
Queue Email
   ↓
User Opens Link
   ↓
Validate Token
   ↓
Verify Email
```

User field:

```js
emailVerified: true
```

---

## 22. Email Verification Token Security

Verification tokens should:

* Be cryptographically random
* Have limited lifetime
* Be stored hashed
* Be single-use
* Be invalidated after successful verification

Example:

```text
Token TTL:
15–60 minutes
```

The exact value should be configurable.

---

## 23. Password Reset

Endpoint:

```http
POST /api/v1/auth/forgot-password
```

The server should not reveal whether an account exists.

Response:

```json
{
  "success": true,
  "data": {
    "message": "If the account exists, a password reset link will be sent."
  }
}
```

---

## 24. Password Reset Flow

```text
Forgot Password
       ↓
Generate Random Token
       ↓
Hash Token
       ↓
Store Hash + Expiration
       ↓
Queue Email
       ↓
User Opens Link
       ↓
Submit New Password
       ↓
Validate Token
       ↓
Hash New Password
       ↓
Update Password
       ↓
Invalidate Reset Token
       ↓
Revoke Existing Sessions
```

Revoking existing sessions after a password reset is recommended because an attacker may already have an active session.

---

## 25. Password Change

Authenticated users can change their password.

Endpoint:

```http
PATCH /api/v1/users/me/password
```

Request:

```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

Flow:

```text
Current Password
       ↓
Verify
       ↓
New Password
       ↓
Hash
       ↓
Update
       ↓
Revoke Other Sessions
```

---

## 26. Authentication Middleware

Every protected API request passes through authentication middleware.

Conceptual flow:

```text
Request
  ↓
Extract Access Token
  ↓
Verify Signature
  ↓
Verify Expiration
  ↓
Verify Token Type
  ↓
Identify User
  ↓
Attach User Context
  ↓
Next Middleware
```

Example request context:

```js
req.user = {
  id: "user_123",
  sessionId: "session_123"
};
```

The middleware should not automatically assume organization permissions.

---

## 27. Organization Context Middleware

Authentication identifies the user.

Organization context identifies the tenant.

Example:

```text
Authenticated User
        ↓
organizationId
        ↓
Find Membership
        ↓
Verify ACTIVE
        ↓
Attach Organization Context
```

Example:

```js
req.organization = {
  id: "org_123",
  role: "MANAGER"
};
```

---

## 28. Why Organization ID Must Not Be Trusted

A malicious client could send:

```json
{
  "organizationId": "org_victim"
}
```

If the backend blindly trusts this value, cross-tenant access becomes possible.

Therefore:

```text
Client Organization ID
        ↓
Never trusted directly
        ↓
Verify Membership
        ↓
Establish Authorized Context
```

---

## 29. Role-Based Access Control

The system uses organization-level RBAC.

Roles:

```text
OWNER
ADMIN
MANAGER
MEMBER
```

A user's role comes from the membership record.

Example:

```text
User
 │
 ▼
Membership
 │
 ├── organizationId
 ├── userId
 └── role
       ↓
    MANAGER
```

---

## 30. Permission Matrix

A basic permission matrix:

| Permission           |  Owner |  Admin |  Manager |   Member |
| -------------------- | -----: | -----: | -------: | -------: |
| View organization    |      ✅ |      ✅ |        ✅ |        ✅ |
| Update organization  |      ✅ |      ✅ |        ❌ |        ❌ |
| Delete organization  |      ✅ |      ❌ |        ❌ |        ❌ |
| Invite members       |      ✅ |      ✅ | Optional |        ❌ |
| Remove members       |      ✅ |      ✅ | Optional |        ❌ |
| Change member roles  |      ✅ |      ✅ |        ❌ |        ❌ |
| Create project       |      ✅ |      ✅ |        ✅ | Optional |
| Update project       |      ✅ |      ✅ |        ✅ | Optional |
| Delete project       |      ✅ |      ✅ | Optional |        ❌ |
| Create task          |      ✅ |      ✅ |        ✅ | Optional |
| Assign tasks         |      ✅ |      ✅ |        ✅ |        ❌ |
| Update assigned task |      ✅ |      ✅ |        ✅ |        ✅ |
| Comment              |      ✅ |      ✅ |        ✅ |        ✅ |
| View analytics       |      ✅ |      ✅ |        ✅ | Optional |
| Manage billing       | Future | Future |        ❌ |        ❌ |

The exact permission matrix should be implemented as application constants rather than duplicated throughout controllers.

---

## 31. Permission-Based Authorization

Instead of repeatedly checking roles:

```js
if (user.role === "ADMIN") {
   ...
}
```

the system should use permissions.

Example:

```text
organization:update
organization:delete
member:invite
member:remove
member:updateRole

project:create
project:update
project:delete

task:create
task:update
task:assign
task:delete
```

Role → Permission mapping:

```text
OWNER
  ↓
All organization permissions

ADMIN
  ↓
Most organization management permissions

MANAGER
  ↓
Project/task permissions

MEMBER
  ↓
Basic collaboration permissions
```

This makes the system easier to extend.

---

## 32. Authorization Middleware

Conceptual usage:

```js
authorize("project:update")
```

Flow:

```text
Request
  ↓
Authentication
  ↓
Organization Context
  ↓
Permission Check
  ↓
Controller
```

If permission is missing:

```http
403 Forbidden
```

Response:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action."
  }
}
```

---

## 33. Resource-Level Authorization

RBAC alone is not sufficient.

Example:

Two managers belong to the same organization:

```text
Manager A
Manager B
```

A manager may be allowed to update tasks but should still only access tasks belonging to their organization/project scope.

Therefore:

```text
Role Check
    +
Resource Ownership
    +
Tenant Check
```

must all succeed.

---

## 34. Task Authorization Example

Request:

```http
PATCH /api/v1/tasks/task_123
```

The backend should perform:

```text
1. Is user authenticated?
        ↓
2. Does task exist?
        ↓
3. What organization does task belong to?
        ↓
4. Does user belong to that organization?
        ↓
5. What is user's role?
        ↓
6. Does role have task:update?
        ↓
7. Is task/project accessible?
        ↓
8. Perform update
```

Only then should MongoDB update the task.

---

## 35. Cross-Tenant Authorization

Suppose:

```text
Organization A
    └── Task 123

Organization B
    └── User B
```

User B attempts:

```http
PATCH /tasks/123
```

The server should detect:

```text
Task organization = A
User organization = B
```

and reject the request.

The database query should itself be tenant-scoped:

```js
Task.findOne({
  _id: taskId,
  organizationId: organizationId
});
```

This creates defense in depth.

---

## 36. Project-Level Access

If project-level membership is introduced, the authorization flow becomes:

```text
User
 ↓
Organization Membership
 ↓
Project Membership
 ↓
Permission
 ↓
Resource
```

For example:

```text
Organization
     ↓
Project
     ↓
Project Member
     ↓
Task
```

This allows future support for restricting specific projects to specific members.

---

## 37. Owner Protection

The organization owner requires special protection.

The system should prevent unauthorized users from:

* Removing the owner
* Changing the owner's role
* Deleting the organization
* Transferring ownership

Ownership transfer should be a dedicated operation.

Example future endpoint:

```http
POST /api/v1/organizations/:organizationId/transfer-ownership
```

---

## 38. Ownership Transfer

Recommended flow:

```text
Current Owner
      ↓
Select New Owner
      ↓
Verify New User Membership
      ↓
Confirm Operation
      ↓
Database Transaction
      ↓
Old Owner → ADMIN
New Owner → OWNER
      ↓
Create Activity
```

This operation should be strongly protected.

---

## 39. Account Status Authorization

Authentication should also check account status.

Possible states:

```text
ACTIVE
SUSPENDED
DELETED
```

Example:

```text
Access Token Valid
       ↓
User = SUSPENDED
       ↓
Reject Request
```

This prevents a previously authenticated user from continuing to access the system after account suspension.

---

## 40. Email Verification Authorization

Certain actions may require verified email.

Example:

```text
User
 ↓
Authenticated
 ↓
Email not verified
 ↓
Attempt sensitive action
 ↓
403 / verification-required
```

A dedicated permission/middleware can enforce this where required.

---

## 41. Session Management

A user may have multiple active sessions.

Example:

```text
User
│
├── Laptop
│   └── Session A
│
├── Mobile
│   └── Session B
│
└── Desktop
    └── Session C
```

The system should support:

* Current session logout
* Logout from all devices
* Session revocation
* Session expiration

---

## 42. Session Revocation

A refresh session can be revoked when:

* User logs out
* Password changes
* Password resets
* Account is suspended
* Refresh-token reuse is detected
* User manually revokes a session

Example:

```js
{
  revokedAt: new Date()
}
```

The revoked session must no longer be accepted for token refresh.

---

## 43. Token Expiration

Access tokens:

```text
Short lifetime
```

Refresh tokens:

```text
Longer lifetime
```

Password reset tokens:

```text
Short lifetime
```

Email verification tokens:

```text
Short lifetime
```

All expiration values should be configurable.

Example:

```text
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
RESET_TOKEN_EXPIRES_IN=15m
VERIFY_TOKEN_EXPIRES_IN=30m
```

---

## 44. Token Types

The system should distinguish token purposes.

Example:

```text
ACCESS
REFRESH
PASSWORD_RESET
EMAIL_VERIFICATION
INVITATION
```

A token intended for one operation must never be accepted for another.

---

## 45. Cryptographically Secure Tokens

Non-JWT temporary tokens should be generated using a cryptographically secure random generator.

Avoid:

```js
Math.random()
```

Use a cryptographically secure source such as Node.js:

```js
crypto.randomBytes(...)
```

Temporary tokens should be sufficiently long and unpredictable.

---

## 46. Authentication Security Controls

The authentication system should include:

```text
Password hashing
        +
Rate limiting
        +
Secure cookies
        +
Token expiration
        +
Refresh rotation
        +
Session revocation
        +
Generic authentication errors
```

---

## 47. Login Rate Limiting

Login endpoints are particularly sensitive.

Example policy:

```text
5 failed attempts
       ↓
Temporary rate limit
```

The exact threshold should be configurable.

Rate limiting can be implemented using Redis.

Example key:

```text
auth:login:<ip>
```

More advanced implementations can combine IP and account-based controls.

---

## 48. Brute Force Protection

Protection should include:

* Rate limiting
* Exponential delays where appropriate
* Generic login errors
* Monitoring suspicious attempts

The system should avoid permanently locking accounts based only on IP-derived behavior because shared networks can cause false positives.

---

## 49. CSRF Considerations

If refresh tokens or authentication credentials are stored in cookies, CSRF protection must be considered.

Controls may include:

* `SameSite` cookies
* CSRF tokens where required
* Strict origin validation
* Appropriate CORS configuration

The exact mechanism depends on the frontend/backend deployment model.

---

## 50. CORS

The backend should only allow trusted frontend origins.

Example:

```text
Development:
http://localhost:5173

Production:
https://app.yourdomain.com
```

Avoid:

```text
Access-Control-Allow-Origin: *
```

when credentialed requests/cookies are being used.

---

## 51. Authentication Request Context

After successful authentication, the backend may establish:

```js
req.auth = {
  userId: "user_123",
  sessionId: "session_123"
};
```

After organization authorization:

```js
req.organization = {
  id: "org_123",
  role: "MANAGER"
};
```

This context is then consumed by controllers/services.

---

## 52. Recommended Middleware Pipeline

Protected organization endpoint:

```text
Request
  ↓
Helmet/Security Headers
  ↓
CORS
  ↓
Rate Limiter
  ↓
Authentication Middleware
  ↓
Organization Context Middleware
  ↓
Permission Middleware
  ↓
Validation Middleware
  ↓
Controller
  ↓
Service
  ↓
Repository
  ↓
MongoDB
```

---

## 53. Authorization Failure Types

## 401 Unauthorized

Use when the user is not authenticated.

Examples:

```text
Missing token
Invalid token
Expired access token
```

---

## 403 Forbidden

Use when the user is authenticated but lacks permission.

Example:

```text
MEMBER attempts to delete organization
```

---

## 404 Not Found

For tenant-scoped resources, returning `404` for inaccessible resources can help avoid revealing whether a resource exists in another tenant.

Example:

```text
User from Organization B
attempts to access Task belonging to Organization A
```

The application may return:

```text
404 Not Found
```

rather than confirming that the task exists.

The exact behavior should be consistent across the API.

---

## 54. Authentication Event Logging

Important authentication events should be logged.

Examples:

```text
USER_REGISTERED
USER_LOGIN
LOGIN_FAILED
TOKEN_REFRESHED
USER_LOGOUT
PASSWORD_CHANGED
PASSWORD_RESET
EMAIL_VERIFIED
SESSION_REVOKED
ACCOUNT_SUSPENDED
```

Logs should never contain:

```text
Passwords
Access tokens
Refresh tokens
Reset tokens
Verification tokens
```

---

## 55. Audit Events

Security-sensitive organization actions should also create activity records.

Examples:

```text
MEMBER_INVITED
MEMBER_REMOVED
ROLE_CHANGED
OWNERSHIP_TRANSFERRED
ORGANIZATION_SETTINGS_UPDATED
```

---

## 56. Complete Authentication Flow

```text
                         REGISTER
                            │
                            ▼
                       Create User
                            │
                            ▼
                     Hash Password
                            │
                            ▼
                    Email Verification
                            │
                            ▼
                          LOGIN
                            │
                            ▼
                   Verify Credentials
                            │
                    ┌───────┴────────┐
                    ▼                ▼
              Access Token     Refresh Token
                    │                │
                    ▼                ▼
              API Requests      Secure Cookie
                    │
                    ▼
              Token Expires
                    │
                    ▼
              Refresh Endpoint
                    │
                    ▼
              Token Rotation
                    │
                    ▼
              New Access Token
```

---

## 57. Complete Authorization Flow

```text
                    API Request
                         │
                         ▼
                  Authentication
                         │
                         ▼
                      User
                         │
                         ▼
               Organization Context
                         │
                         ▼
                   Membership
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
                  Tenant Validation
                         │
                         ▼
                  Business Operation
```

---

## 58. Example: Creating a Project

Request:

```http
POST /api/v1/organizations/org_123/projects
```

Processing:

```text
1. Verify access token
        ↓
2. Identify user
        ↓
3. Find membership
        ↓
4. Confirm membership ACTIVE
        ↓
5. Get role
        ↓
6. Check project:create permission
        ↓
7. Validate request
        ↓
8. Create project with organizationId
        ↓
9. Create activity
        ↓
10. Invalidate cache
        ↓
11. Return response
```

---

## 59. Example: Assigning a Task

Request:

```http
PATCH /api/v1/tasks/task_123/assignee
```

Request:

```json
{
  "assignedTo": "user_456"
}
```

Authorization:

```text
Authenticated?
      ↓
Same organization?
      ↓
User has task:assign?
      ↓
Assignee belongs to organization?
      ↓
Assignee has project access?
      ↓
YES → Assign
```

---

## 60. Example: Unauthorized Cross-Tenant Request

```text
Organization A
    │
    └── Task 123

Organization B
    │
    └── User B
```

User B sends:

```http
GET /api/v1/tasks/task_123
```

Backend:

```text
Authenticate User B
       ↓
Organization = B
       ↓
Query:
taskId = task_123
organizationId = B
       ↓
No matching resource
       ↓
404 Not Found
```

The attacker does not receive the actual Organization A task.

---

## 61. Authorization Design Rules

The following rules are mandatory:

### Rule 1

Never trust organization IDs from the client.

### Rule 2

Never authorize solely based on authentication.

### Rule 3

Every organization resource must be tenant-scoped.

### Rule 4

Role checks should be centralized.

### Rule 5

Resource ownership must be verified.

### Rule 6

Sensitive operations should require stronger authorization.

### Rule 7

Tokens must have explicit types and expiration.

### Rule 8

Refresh tokens must be revocable.

### Rule 9

Passwords must never be logged or stored in plaintext.

### Rule 10

Authorization must always be enforced server-side.

---

## 62. Authentication Environment Variables

Example:

```text
ACCESS_TOKEN_SECRET=<secret>
ACCESS_TOKEN_EXPIRES_IN=15m

REFRESH_TOKEN_SECRET=<secret>
REFRESH_TOKEN_EXPIRES_IN=7d

RESET_TOKEN_EXPIRES_IN=15m
EMAIL_VERIFY_TOKEN_EXPIRES_IN=30m

COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
```

Secrets must be stored securely and never committed to Git.

---

## 63. Testing Requirements

Authentication and authorization require extensive testing.

Tests should cover:

### Authentication

```text
Register
Login
Invalid password
Invalid email
Refresh token
Token expiration
Logout
Logout all
Password reset
Password change
Email verification
```

### Authorization

```text
Owner permissions
Admin permissions
Manager permissions
Member permissions
Cross-tenant access
Unauthorized project access
Unauthorized task update
Unauthorized member modification
```

---

## 64. Security Test Cases

Important security scenarios:

```text
Expired access token
Invalid JWT signature
Wrong token type
Revoked refresh token
Refresh-token reuse
Suspended account
Cross-tenant task access
Cross-tenant project update
Privilege escalation
Member attempting owner operation
Invalid invitation
Expired invitation
Reused password reset token
```

---

## 65. Authentication & Authorization Summary

The final security architecture is:

```text
                         USER
                           │
                           ▼
                    Authentication
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              Access Token   Refresh Token
                    │             │
                    ▼             ▼
               API Access      Session
                    │
                    ▼
              User Identity
                    │
                    ▼
           Organization Membership
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
             Tenant Isolation
                    │
                    ▼
               DB Operation
```

---

## 66. Final Design Principles

The authentication and authorization system follows these principles:

> **Authenticate the user.**

> **Identify the tenant.**

> **Verify membership.**

> **Check permissions.**

> **Verify resource ownership.**

> **Perform the operation only after all checks pass.**

The most important security boundary is:

```text
User
 ↓
Organization
 ↓
Resource
```

A valid user must never be able to cross that boundary without explicit authorization.

This authentication and authorization architecture provides the foundation for secure multi-tenant operation and directly supports the next document:

```text
06-multi-tenancy.md
```

which will define the tenant-isolation strategy, tenant context, organization-scoped queries, middleware architecture, cross-tenant attack prevention, and implementation patterns in detail.
