# DOCUMENT SERVICE - DEPRECATED ⚠️

**Status:** DEPRECATED as of 2025-01-12
**Reason:** Fully consolidated into `grc-api`

## Migration Complete

All document-service functionality has been migrated to:
- **Location:** `apps/services/grc-api/routes/documents.js`
- **Port:** 3006 (grc-api)
- **Endpoint:** `/api/documents` (same as before)

## What Was Consolidated

✅ All 10 document routes migrated:
- POST /documents/upload
- GET /documents
- GET /documents/:id
- GET /documents/:id/download
- PUT /documents/:id
- DELETE /documents/:id
- POST /documents/bulk-upload
- GET /documents/search
- GET /documents/types
- POST /documents/:id/share

✅ All supporting services migrated:
- documentProcessor
- avScanner
- secureStorage
- ocrService
- versionControl

## Configuration Updated

✅ BFF (Backend for Frontend) updated:
- Evidence routes now proxy to `grc-api` instead of `document-service`
- Service registry updated
- Health checks updated

## Next Steps

1. **Verify** grc-api document routes are functioning
2. **Update** any direct references to document-service:3002
3. **Remove** document-service from Docker Compose (after 30-day grace period)
4. **Delete** this microservice directory (after verification)

## Rollback Plan (if needed)

If issues are discovered:
1. Restore document-service from git
2. Update BFF to route to document-service again
3. Restart document-service on port 3002

## Timeline

- **Jan 12, 2025:** Service deprecated, BFF updated
- **Feb 12, 2025:** Grace period ends
- **Feb 15, 2025:** Service removed from Docker Compose
- **Mar 1, 2025:** Directory deletion scheduled

## Contact

For questions or issues, contact the GRC Platform team.
