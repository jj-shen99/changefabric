-- PostgreSQL initialization script for Change Request Management AI
-- This script runs when the database container is first created

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- Create indexes for common queries (Prisma will create tables)
-- These are additional performance indexes

-- Note: Run these after Prisma migration
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_change_requests_state ON "ChangeRequest"(state);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_change_requests_risk ON "ChangeRequest"("riskLevel");
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_change_requests_org ON "ChangeRequest"("orgId");
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_change_requests_created ON "ChangeRequest"("createdAt" DESC);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_org ON "User"("orgId");
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON "User"(email);

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE change_management TO changemgmt;
