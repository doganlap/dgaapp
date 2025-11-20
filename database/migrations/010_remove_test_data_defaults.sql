-- Migration: Remove Test/Demo Data Defaults
-- Remove 'Turkey' default and make country configurable

-- Update organizations table to remove Turkey default
ALTER TABLE organizations 
ALTER COLUMN country DROP DEFAULT;

-- Update any existing 'Turkey' entries to NULL (to be configured)
UPDATE organizations 
SET country = NULL 
WHERE country = 'Turkey';

-- Add comment for clarity
COMMENT ON COLUMN organizations.country IS 'Organization country - configurable per organization, no default';

-- Create index for better performance on country filtering
CREATE INDEX IF NOT EXISTS idx_organizations_country ON organizations(country) WHERE country IS NOT NULL;

-- Add validation function to ensure country is set before activation
CREATE OR REPLACE FUNCTION validate_organization_country()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true AND NEW.country IS NULL THEN
        RAISE EXCEPTION 'Country must be set before activating organization';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate country on activation
DROP TRIGGER IF EXISTS trg_validate_organization_country ON organizations;
CREATE TRIGGER trg_validate_organization_country
    BEFORE INSERT OR UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION validate_organization_country();

-- Log migration
INSERT INTO schema_migrations (version, description, applied_at)
VALUES ('010', 'Remove test data defaults and make country configurable', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;