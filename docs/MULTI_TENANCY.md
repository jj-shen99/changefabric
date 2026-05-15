# Multi-Tenancy & Organizations

This document describes the multi-tenancy features of the Change Management system, including organization management and the super admin role.

## Overview

The system supports multiple organizations (tenants) with data isolation. Each organization has its own:
- Users
- Change Requests
- Assignment Groups
- Services
- CR Type Approvers

## Organization Model

### Organization Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Internal unique identifier |
| `orgId` | String | Human-readable organization identifier (e.g., "demo", "acme-corp") |
| `name` | String | Display name of the organization |
| `description` | String | Optional description |
| `isActive` | Boolean | Whether the organization is active |

### OrgId Format

Organization IDs must follow these rules:
- Lowercase letters only (a-z)
- Numbers (0-9)
- Hyphens (-)
- No spaces or special characters

**Valid examples:** `demo`, `acme-corp`, `org123`, `my-org-2024`

**Invalid examples:** `Demo`, `ACME`, `org_123`, `my org`, `org@123`

## User Roles

### Super Admin

The super admin is a special role with global access across all organizations.

**Characteristics:**
- `isSuperAdmin: true` in session
- `orgId: "*"` (wildcard for all organizations)
- Can view and manage all organizations
- Can view and manage all users across all organizations
- Cannot access operational pages (changes, impact, my-tasks)

**Default super admin credentials:**
- Email: `superadmin@example.com`
- Password: `superadmin123!`

### Organization Admin

Regular admins are scoped to their organization.

**Characteristics:**
- `isSuperAdmin: false` in session
- `orgId: "<specific-org>"` (e.g., "demo")
- Can only view/manage data within their organization
- Full access to operational pages

## Data Isolation

### How It Works

1. **Users** are assigned to an organization via `orgId` field
2. **API routes** filter data based on the user's `orgId`
3. **Super admin** bypasses org filtering (sees all data)
4. **Regular users** only see data from their organization

### Affected Resources

| Resource | Isolation | Super Admin Access |
|----------|-----------|-------------------|
| Users | By orgId | All users |
| Change Requests | By orgId | All CRs |
| Assignment Groups | By orgId | All groups |
| Services | By orgId | All services |
| CR Type Approvers | By orgId | All approvers |

## Registration

### Required Fields

When registering a new user, the following fields are required:
- **Name** - Full name
- **Email** - Valid email address
- **Organization ID** - Must be a valid, existing organization
- **Password** - At least 8 characters with a number

### Organization Validation

During registration:
1. The `orgId` is validated for format (lowercase alphanumeric with hyphens)
2. The organization must exist in the system
3. New users are assigned the `requester` role by default

## API Endpoints

### Organization Management (Super Admin Only)

```
GET    /api/admin/organizations      - List all organizations
POST   /api/admin/organizations      - Create new organization
PUT    /api/admin/organizations      - Update organization
DELETE /api/admin/organizations?id=  - Delete organization (cannot delete "demo")
```

### User Management

```
GET    /api/admin/users              - List users (filtered by org for non-super-admin)
DELETE /api/admin/users?id=          - Delete user (org check enforced)
```

### User Roles

```
GET    /api/admin/users/roles?userId=  - Get user roles
POST   /api/admin/users/roles          - Assign role to user
DELETE /api/admin/users/roles          - Remove role from user
PUT    /api/admin/users/roles          - Replace all user roles
```

## UI Visibility

### Super Admin Navigation

Super admin sees:
- ✅ Dashboard
- ✅ Analytics
- ✅ Reports
- ✅ Account
- ✅ User Management
- ✅ Organizations

Super admin does NOT see:
- ❌ Changes
- ❌ Impact Analysis
- ❌ My Tasks
- ❌ Assignment Groups
- ❌ Services
- ❌ CR Type Approvers
- ❌ Settings

### Organization Display

When super admin views data, the `orgId` is displayed:
- **Users table** - Org column shows organization ID
- **Services table** - Org column shows organization ID
- **Groups table** - Org badge next to group name

## Database Schema

### User Table

```sql
User {
  id        String   @id
  email     String   @unique
  name      String
  orgId     String   @default("demo")
  ...
}
```

### Organization Table

```sql
Organization {
  id          String   @id
  orgId       String   @unique
  name        String
  description String?
  isActive    Boolean  @default(true)
  ...
}
```

### Unique Constraints

Resources with org-scoped uniqueness:
- `Group.name_orgId` - Group name unique within org
- `Service.name_orgId` - Service name unique within org

## Session Context

The session includes organization information:

```typescript
interface SessionContext {
  email: string;
  roles: string[];
  perms: Permissions;
  isAdmin: boolean;
  isSuperAdmin: boolean;  // true for super admin
  orgId: string;          // "*" for super admin, specific org for others
  primaryRole: string;
}
```

## Best Practices

1. **Always check `isSuperAdmin`** before filtering by `orgId`
2. **Use `orgId` in unique constraints** for org-scoped resources
3. **Include `orgId` in API responses** for super admin visibility
4. **Validate `orgId` format** on registration and org creation
5. **Never delete the "demo" organization** - it's the default

## Testing

Run multi-tenant tests:

```bash
npm test -- --testPathPatterns="multi-tenant"
```

Test coverage includes:
- Organization model validation
- User organization assignment
- Data isolation by organization
- Super admin access patterns
- Registration with organization
- Unique constraints with orgId
