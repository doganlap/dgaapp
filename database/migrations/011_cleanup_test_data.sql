-- Migration: Cleanup Test Data and Turkey Defaults
-- Description: Remove all test/demo/sample organizations and update Turkey entries
-- Date: 2025
-- Author: System Cleanup

BEGIN;

-- Step 1: Delete test/demo/sample organizations
DELETE FROM organizations 
WHERE 
    name LIKE '%Sample%' OR 
    name LIKE '%Test%' OR 
    name LIKE '%Demo%' OR
    name LIKE '%Example%' OR
    name = 'Sample Organization' OR
    name = 'Test Organization' OR
    name = 'Demo Organization';

-- Step 2: Update Turkey entries to NULL (let users set their own country)
UPDATE organizations 
SET country = NULL 
WHERE country = 'Turkey';

-- Step 3: Remove the DEFAULT constraint from country column if it exists
ALTER TABLE organizations 
ALTER COLUMN country DROP DEFAULT;

-- Step 4: Add comment to country column
COMMENT ON COLUMN organizations.country IS 'Organization country - must be set by user, no default value';

-- Step 5: Log the cleanup
DO $$
BEGIN
    RAISE NOTICE 'Test data cleanup completed successfully';
    RAISE NOTICE 'Removed test organizations and updated Turkey entries to NULL';
    RAISE NOTICE 'Country column default removed - users must set country explicitly';
END $$;

COMMIT;

-- Verification queries (run these after migration)
-- SELECT COUNT(*) as remaining_test_orgs FROM organizations WHERE name LIKE '%Sample%' OR name LIKE '%Test%' OR name LIKE '%Demo%';
-- SELECT COUNT(*) as turkey_orgs FROM organizations WHERE country = 'Turkey';
-- SELECT COUNT(*) as total_orgs FROM organizations;