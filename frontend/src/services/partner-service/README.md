# Partner Service

Multi-partner ecosystem service for managing partner relationships and cross-tenant collaborations.

## Features

- Partner relationship management
- Cross-tenant collaboration
- Partner types: vendor, client, auditor, regulator, strategic partner
- Controlled resource sharing
- Partner invitations and approvals

## API Endpoints

### Partners
- `GET /api/partners` - List partners
- `POST /api/partners/invite` - Invite new partner
- `GET /api/partners/:id` - Get partner details
- `PUT /api/partners/:id` - Update partner
- `DELETE /api/partners/:id` - Remove partner

### Collaborations
- `GET /api/collaborations` - List collaborations
- `POST /api/collaborations` - Create collaboration
- `GET /api/collaborations/:id` - Get collaboration details
- `PUT /api/collaborations/:id` - Update collaboration
- `DELETE /api/collaborations/:id` - End collaboration

### Cross-Tenant Access
- `GET /api/partners/:partnerId/assessments` - Access partner assessments
- `GET /api/partners/:partnerId/documents` - Access partner documents
- `POST /api/partners/:partnerId/share-resource` - Share resource with partner

## Database Schema

```sql
CREATE TABLE partners (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    partner_tenant_id UUID REFERENCES tenants(id),
    partner_type VARCHAR(50),
    status VARCHAR(20),
    partnership_level VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE partner_collaborations (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    partner_id UUID NOT NULL REFERENCES partners(id),
    collaboration_type VARCHAR(50),
    shared_resources JSONB,
    access_level VARCHAR(20),
    expires_at TIMESTAMP
);
```

## Environment Variables

```env
PORT=3003
DB_HOST=postgres
DB_PORT=5432
DB_NAME=grc_ecosystem
SERVICE_TOKEN=your-service-token
AUTH_SERVICE_URL=http://auth-service:3001
NOTIFICATION_SERVICE_URL=http://notification-service:3004
```

## Health Checks

- `GET /healthz` - Liveness probe
- `GET /readyz` - Readiness probe

## Permissions

- `partner-service:partners:read`
- `partner-service:partners:write`
- `partner-service:partners:invite`
- `partner-service:collaborations:read`
- `partner-service:collaborations:write`
- `partner-service:collaborations:share`

