# API Reference

## Base URL

```
Development: http://localhost:3600/api/v2
Production:  https://your-domain.com/api/v2
```

## Authentication

All API routes require authentication via NextAuth.js session cookie.

## Change Requests

### List Change Requests

```http
GET /api/v2/changes
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `state` | string | Filter by state |
| `riskLevel` | string | Filter by risk level |
| `category` | string | Filter by category |
| `assignmentGroup` | string | Filter by team |
| `limit` | number | Page size (default: 50) |
| `offset` | number | Pagination offset |

**Response:**
```json
{
  "changes": [
    {
      "number": "CHG0000001",
      "title": "Payment Gateway Migration",
      "state": "in_progress",
      "riskLevel": "high",
      "impactLevel": "1",
      "priority": "1",
      "category": "infrastructure",
      "type": "normal",
      "workflowKey": "standard",
      "requestedBy": "admin@example.com",
      "assignedTo": "dev@example.com",
      "assignmentGroup": "Payments",
      "computedRiskScore": 75,
      "mlRiskScore": 72,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T12:00:00Z"
    }
  ],
  "total": 24,
  "limit": 50,
  "offset": 0
}
```

### Create Change Request

```http
POST /api/v2/changes
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Database Migration",
  "workflowKey": "standard",
  "category": "database",
  "type": "normal",
  "riskLevel": "moderate",
  "impactLevel": "2",
  "urgency": "2",
  "priority": "2",
  "implementationPlan": "1. Backup database\n2. Run migration\n3. Verify",
  "backoutPlan": "1. Restore from backup",
  "testPlan": "1. Run integration tests",
  "riskAndImpactAnalysis": "Low risk with proper backups",
  "justification": "Required for new feature",
  "assignmentGroup": "Database",
  "plannedStart": "2024-01-20T02:00:00Z",
  "plannedEnd": "2024-01-20T04:00:00Z"
}
```

**Response:**
```json
{
  "number": "CHG0000025",
  "title": "Database Migration",
  "state": "draft",
  ...
}
```

### Get Change Request

```http
GET /api/v2/changes/:number
```

**Response:**
```json
{
  "number": "CHG0000001",
  "title": "Payment Gateway Migration",
  "state": "in_progress",
  "approvalSteps": [
    {
      "id": "step-1",
      "name": "Technical Review",
      "ordering": 1,
      "policy": "all",
      "status": "approved",
      "approvals": [
        {
          "approverEmail": "tech-lead@example.com",
          "decision": "approved",
          "comment": "LGTM",
          "decidedAt": "2024-01-16T10:00:00Z"
        }
      ]
    }
  ],
  "comments": [
    {
      "id": "comment-1",
      "authorEmail": "admin@example.com",
      "body": "Ready for review",
      "createdAt": "2024-01-15T11:00:00Z"
    }
  ],
  ...
}
```

### Update Change Request

```http
PATCH /api/v2/changes/:number
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "implementationPlan": "Updated plan..."
}
```

### Delete Change Request

```http
DELETE /api/v2/changes/:number
```

**Authorization:** Admin only

**Allowed States:**
- `draft` - CRs not yet submitted
- `awaiting_approval` - CRs pending approval
- Imported CRs (any state)

**Response:**
```json
{
  "deleted": "CHG0000025"
}
```

**Error Response (invalid state):**
```json
{
  "error": "Cannot delete CR in 'in_progress' state. Only draft, awaiting_approval, or imported CRs can be deleted."
}
```

## Workflow Transitions

### Get Available Transitions

```http
GET /api/v2/changes/:number/transitions
```

**Response:**
```json
{
  "currentState": "approved",
  "transitions": [
    {
      "event": "schedule",
      "toState": "scheduled",
      "guards": ["hasPlannedWindow"],
      "guardStatus": {
        "hasPlannedWindow": {
          "passed": true
        }
      }
    },
    {
      "event": "cancel",
      "toState": "canceled",
      "guards": [],
      "guardStatus": {}
    }
  ]
}
```

### Fire Transition

```http
POST /api/v2/changes/:number/transitions
Content-Type: application/json
```

**Request Body:**
```json
{
  "event": "schedule",
  "reason": "Approved for weekend deployment"
}
```

**Response:**
```json
{
  "success": true,
  "previousState": "approved",
  "newState": "scheduled",
  "change": { ... }
}
```

**Error Response (guard failed):**
```json
{
  "error": "Transition blocked",
  "failedGuards": ["hasPlannedWindow"],
  "message": "Please set Planned Start and Planned End dates before scheduling"
}
```

## Approvals

### List Approval Steps

```http
GET /api/v2/changes/:number/approvals
```

**Response:**
```json
{
  "steps": [
    {
      "id": "step-1",
      "name": "Technical Review",
      "ordering": 1,
      "policy": "all",
      "status": "pending",
      "approvals": [
        {
          "approverEmail": "tech-lead@example.com",
          "decision": "pending"
        }
      ]
    }
  ],
  "overallStatus": "pending"
}
```

### Add Approval Step

```http
POST /api/v2/changes/:number/approvals
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Security Review",
  "ordering": 2,
  "policy": "all",
  "approvers": ["security@example.com", "compliance@example.com"]
}
```

### Submit Approval Decision

```http
POST /api/v2/changes/:number/approvals/:stepId
Content-Type: application/json
```

**Request Body:**
```json
{
  "decision": "approved",
  "comment": "Looks good, approved for deployment"
}
```

**Decision values:** `approved`, `rejected`, `delegated`

## Comments

### List Comments

```http
GET /api/v2/changes/:number/comments
```

### Add Comment

```http
POST /api/v2/changes/:number/comments
Content-Type: application/json
```

**Request Body:**
```json
{
  "body": "Please review the updated backout plan",
  "visibility": "public"
}
```

**Visibility values:** `public`, `internal`

## Analysis

### Run Analysis

```http
GET /api/v2/changes/:number/analyze
```

**Response:**
```json
{
  "impact": {
    "overallScore": 65,
    "dimensions": {
      "outage": 70,
      "performance": 50,
      "functionality": 60,
      "security": 80,
      "dataIntegrity": 55
    },
    "blastRadius": "medium",
    "rollbackComplexity": "low",
    "rationale": [
      "High outage risk due to payment system dependency",
      "Multiple services affected"
    ]
  },
  "mlRisk": {
    "score": 72,
    "tier": "high",
    "confidence": 0.85,
    "successProbability": 0.78,
    "recommendation": "review-recommended",
    "explanation": "Elevated risk due to infrastructure scope and high priority",
    "topFactors": [
      { "feature": "riskLevel", "contribution": 0.25 },
      { "feature": "affectedServices", "contribution": 0.20 }
    ]
  }
}
```

## Templates

### List Templates

```http
GET /api/v2/templates
```

**Response:**
```json
{
  "templates": [
    {
      "id": "tpl-db-migration",
      "name": "Database Migration",
      "description": "Template for database schema changes",
      "category": "database",
      "workflowKey": "standard",
      "riskLevel": "moderate"
    }
  ]
}
```

### Create Template

```http
POST /api/v2/templates
Content-Type: application/json
```

## Analytics

### Get Dashboard Metrics

```http
GET /api/v2/analytics?days=30
```

**Response:**
```json
{
  "summary": {
    "totalChanges": 24,
    "pendingApproval": 5,
    "inProgress": 3,
    "completedThisWeek": 8,
    "avgRiskScore": 45,
    "highRiskCount": 3
  },
  "byState": {
    "draft": 2,
    "submitted": 3,
    "awaiting_approval": 5,
    "approved": 2,
    "scheduled": 4,
    "in_progress": 3,
    "implemented": 2,
    "closed": 3
  },
  "byRisk": {
    "low": 8,
    "moderate": 10,
    "high": 5,
    "very_high": 1
  },
  "trend": [
    { "date": "2024-01-15", "count": 3, "avgRisk": 42 },
    { "date": "2024-01-16", "count": 5, "avgRisk": 48 }
  ]
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

**Common Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `TRANSITION_BLOCKED` | 400 | Workflow guard failed |
| `INTERNAL_ERROR` | 500 | Server error |
