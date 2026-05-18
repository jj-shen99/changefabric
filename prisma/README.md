# Prisma Database Configuration

This directory contains the Prisma ORM configuration, schema, and seed data for the Change Management Platform.

## Files

| File | Description |
|------|-------------|
| `schema.prisma` | Database schema definition with all models |
| `seed.ts` | Database seeding script for initial data |
| `dev.db` | SQLite development database (auto-generated) |
| `README.md` | This documentation file |

## Database Providers

The application supports two database providers:

### SQLite (Development)

Default for local development. Zero configuration required.

```env
DATABASE_PROVIDER="sqlite"
DATABASE_URL="file:./prisma/dev.db"
```

### PostgreSQL (Production)

Recommended for production deployments.

```env
DATABASE_PROVIDER="postgresql"
DATABASE_URL="postgresql://user:password@localhost:5432/change_management?schema=public"
```

**Note:** To switch providers, you must:
1. Update `DATABASE_URL` in `.env`
2. Change `provider = "sqlite"` to `provider = "postgresql"` in `schema.prisma`
3. Run `npx prisma db push` to apply the schema

## Schema Overview

### Core Models

| Model | Description |
|-------|-------------|
| `Organization` | Multi-tenant organization with ITSM sync settings |
| `User` | User accounts with authentication |
| `Role` | Role definitions with granular permissions |
| `UserRole` | Many-to-many user-role assignments |
| `ChangeRequest` | Main change request entity |
| `Release` | Release groupings for change requests |

### Workflow & Approvals

| Model | Description |
|-------|-------------|
| `WorkflowDefinition` | State machine definitions (JSON) |
| `WorkflowTransitionLog` | Audit log of state transitions |
| `ApprovalStep` | Multi-person approval gates |
| `Approval` | Individual approval decisions |

### Supporting Models

| Model | Description |
|-------|-------------|
| `Validation` | Test/validation results |
| `Comment` | CR discussion comments |
| `Attachment` | File attachments |
| `AuditEvent` | System audit log |
| `Notification` | User notifications |
| `DashboardMetric` | Cached dashboard metrics |

### Configuration Models

| Model | Description |
|-------|-------------|
| `ChangeRequestTemplate` | Reusable CR templates |
| `Group` | User groups for approvals |
| `CRTypeApprover` | Default approvers by CR type |
| `Service` | Service catalog |
| `IntegrationSetting` | Encrypted integration credentials |
| `SavedAnalysis` | Saved analysis results |
| `SystemSetting` | Key-value system settings |

## Commands

### Generate Prisma Client

After schema changes, regenerate the client:

```bash
npx prisma generate
```

### Apply Schema Changes

Push schema to database (development):

```bash
npx prisma db push
```

Create a migration (production):

```bash
npx prisma migrate dev --name description_of_change
```

### Seed Database

Populate with initial data:

```bash
npx prisma db seed
```

### Open Prisma Studio

Visual database browser:

```bash
npx prisma studio
```

### Reset Database

Drop all data and re-seed:

```bash
npx prisma migrate reset
```

## Schema Conventions

### Field Naming

- **IDs**: UUID strings (`@id @default(uuid())`)
- **Timestamps**: `createdAt`, `updatedAt` with `@default(now())` and `@updatedAt`
- **Foreign Keys**: Suffixed with `Id` (e.g., `orgId`, `userId`)
- **JSON Fields**: Stored as strings with `@default("{}")` or `@default("[]")`

### Indexes

All frequently queried fields have indexes:

```prisma
@@index([orgId])
@@index([state])
@@index([createdAt])
```

### Multi-Tenancy

All tenant-scoped models include:

```prisma
orgId String @default("demo")
@@index([orgId])
```

### Soft Deletes

Active/inactive pattern used instead of hard deletes:

```prisma
isActive Boolean @default(true)
```

## Relationships

### User → Roles (Many-to-Many)

```
User ←→ UserRole ←→ Role
```

### ChangeRequest → Approvals

```
ChangeRequest → ApprovalStep → Approval
```

### ChangeRequest → Release

```
Release ← ChangeRequest (many-to-one)
```

## Migration Strategy

### Development

Use `db push` for rapid iteration:

```bash
npx prisma db push
```

### Production

Use migrations for version control:

```bash
# Create migration
npx prisma migrate dev --name add_new_field

# Apply in production
npx prisma migrate deploy
```

## Backup & Restore

### SQLite

```bash
# Backup
cp prisma/dev.db prisma/dev.db.backup

# Restore
cp prisma/dev.db.backup prisma/dev.db
```

### PostgreSQL

```bash
# Backup
pg_dump -U user -d change_management > backup.sql

# Restore
psql -U user -d change_management < backup.sql
```

## Troubleshooting

### "Table does not exist"

Regenerate client and push schema:

```bash
npx prisma generate
npx prisma db push
```

### "Migration failed"

Reset and re-migrate (development only):

```bash
npx prisma migrate reset
```

### "Client out of sync"

Regenerate after schema changes:

```bash
npx prisma generate
```

### Type Errors in IDE

Restart TypeScript server after generating:

```
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

## Security Notes

- **Passwords**: Stored as bcrypt hashes in `User.hashedPassword`
- **Integration Credentials**: Encrypted with AES-256-GCM in `IntegrationSetting`
- **ITSM Credentials**: Encrypted in `Organization.snowPassword`
- **Reset Tokens**: Hashed and time-limited in `User.resetToken`

## Performance Tips

1. **Use indexes** for all WHERE clause fields
2. **Select only needed fields** to reduce payload
3. **Use pagination** for list queries
4. **Cache dashboard metrics** in `DashboardMetric`
5. **Batch operations** with `createMany`/`updateMany`
