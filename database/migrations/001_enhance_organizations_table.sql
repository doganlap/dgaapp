-- Enhancement Migration for Organizations Table
-- Adds comprehensive fields from the specification while preserving existing data

-- Step 1: Create sector enum
DO $$ BEGIN
  CREATE TYPE sector_enum AS ENUM (
    'banking','healthcare','government','technology','energy','retail','telecom','education'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Step 2: Add new columns to existing organizations table
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS name_arabic VARCHAR(255),
  ADD COLUMN IF NOT EXISTS commercial_registration VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sector sector_enum,
  ADD COLUMN IF NOT EXISTS sub_sector VARCHAR(120),
  ADD COLUMN IF NOT EXISTS city VARCHAR(120),
  ADD COLUMN IF NOT EXISTS size VARCHAR(40), -- Small/Medium/Large/Enterprise
  ADD COLUMN IF NOT EXISTS employee_count INTEGER,
  ADD COLUMN IF NOT EXISTS annual_revenue NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Step 3: Add unique constraint for commercial registration
ALTER TABLE organizations 
  ADD CONSTRAINT organizations_commercial_registration_unique 
  UNIQUE (commercial_registration);

-- Step 4: Update existing records - map 'industry' to 'sector' where possible
UPDATE organizations SET 
  sector = CASE 
    WHEN LOWER(industry) LIKE '%bank%' THEN 'banking'::sector_enum
    WHEN LOWER(industry) LIKE '%health%' OR LOWER(industry) LIKE '%medical%' THEN 'healthcare'::sector_enum
    WHEN LOWER(industry) LIKE '%government%' OR LOWER(industry) LIKE '%public%' THEN 'government'::sector_enum
    WHEN LOWER(industry) LIKE '%tech%' OR LOWER(industry) LIKE '%software%' OR LOWER(industry) LIKE '%it%' THEN 'technology'::sector_enum
    WHEN LOWER(industry) LIKE '%energy%' OR LOWER(industry) LIKE '%oil%' OR LOWER(industry) LIKE '%gas%' THEN 'energy'::sector_enum
    WHEN LOWER(industry) LIKE '%retail%' OR LOWER(industry) LIKE '%shop%' OR LOWER(industry) LIKE '%store%' THEN 'retail'::sector_enum
    WHEN LOWER(industry) LIKE '%telecom%' OR LOWER(industry) LIKE '%communication%' THEN 'telecom'::sector_enum
    WHEN LOWER(industry) LIKE '%education%' OR LOWER(industry) LIKE '%school%' OR LOWER(industry) LIKE '%university%' THEN 'education'::sector_enum
    ELSE 'government'::sector_enum -- Default for KSA government entities
  END
WHERE sector IS NULL AND industry IS NOT NULL;

-- Set government as default for records without industry
UPDATE organizations SET sector = 'government'::sector_enum WHERE sector IS NULL;

-- Step 5: Make sector NOT NULL now that we have data
ALTER TABLE organizations ALTER COLUMN sector SET NOT NULL;

-- Step 6: Create enhanced indexes for performance
-- Standard text search index (without trigram extension)
CREATE INDEX IF NOT EXISTS ix_org_name_search ON organizations (name);
CREATE INDEX IF NOT EXISTS ix_org_name_arabic_search ON organizations (name_arabic);
CREATE INDEX IF NOT EXISTS ix_org_sector_city ON organizations (sector, city);
CREATE INDEX IF NOT EXISTS ix_org_owner ON organizations (owner_id);
CREATE INDEX IF NOT EXISTS ix_org_parent ON organizations (parent_org_id);
CREATE INDEX IF NOT EXISTS ix_org_active ON organizations (is_active);
CREATE INDEX IF NOT EXISTS ix_org_created_at ON organizations (created_at);
CREATE INDEX IF NOT EXISTS ix_org_commercial_reg ON organizations (commercial_registration);

-- Step 7: Create enhanced trigger for updated_at
CREATE OR REPLACE FUNCTION set_updated_at() 
RETURNS trigger AS $$
BEGIN 
  NEW.updated_at = NOW(); 
  RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS trg_org_updated_at ON organizations;
CREATE TRIGGER trg_org_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Step 8: Add sample data for testing (optional - remove in production)
-- Update some existing organizations with enhanced data
UPDATE organizations 
SET 
  name_arabic = 'وزارة الصحة',
  sector = 'healthcare'::sector_enum,
  city = 'Riyadh',
  size = 'Large',
  employee_count = 50000,
  country = 'Saudi Arabia'
WHERE name ILIKE '%health%' OR name ILIKE '%ministry%';

UPDATE organizations 
SET 
  sector = 'government'::sector_enum,
  city = 'Riyadh', 
  country = 'Saudi Arabia',
  size = 'Enterprise'
WHERE sector = 'government'::sector_enum AND city IS NULL;

-- Verification query to check the migration
-- SELECT 
--   id, name, name_arabic, sector, city, size, employee_count, 
--   created_at, updated_at 
-- FROM organizations 
-- ORDER BY created_at DESC;