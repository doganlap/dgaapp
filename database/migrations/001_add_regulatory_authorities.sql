
-- Migration: Add Regulatory Authorities Support
-- Description: Creates tables for KSA regulatory authorities and enhanced compliance framework support
-- Version: 001
-- Date: 2025-09-23

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create regulatory_authorities table
CREATE TABLE IF NOT EXISTS regulatory_authorities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reg_id VARCHAR(50) UNIQUE NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    acronym VARCHAR(20),
    sector VARCHAR(200),
    jurisdiction_en TEXT,
    jurisdiction_ar TEXT,
    legal_basis TEXT,
    official_site VARCHAR(500),
    authority_type VARCHAR(20) DEFAULT 'domestic' CHECK (authority_type IN ('domestic', 'international')),
    is_active BOOLEAN DEFAULT true,
    organization_id UUID REFERENCES organizations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- 2. Create regulatory_requirements table
CREATE TABLE IF NOT EXISTS regulatory_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id VARCHAR(100) NOT NULL,
    framework_id UUID REFERENCES compliance_frameworks(id),
    authority_id UUID REFERENCES regulatory_authorities(id),
    title_en VARCHAR(500) NOT NULL,
    title_ar VARCHAR(500),
    description_en TEXT,
    description_ar TEXT,
    category VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    compliance_level VARCHAR(50),
    assessment_method VARCHAR(100),
    implementation_guidance TEXT,
    is_mandatory BOOLEAN DEFAULT true,
    effective_date DATE,
    review_frequency VARCHAR(50),
    organization_id UUID REFERENCES organizations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    UNIQUE(requirement_id, organization_id)
);

-- 3. Create requirement_framework_mapping table
CREATE TABLE IF NOT EXISTS requirement_framework_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id UUID REFERENCES regulatory_requirements(id) ON DELETE CASCADE,
    framework_id UUID REFERENCES compliance_frameworks(id) ON DELETE CASCADE,
    authority_id UUID REFERENCES regulatory_authorities(id) ON DELETE CASCADE,
    mapping_type VARCHAR(50) DEFAULT 'direct' CHECK (mapping_type IN ('direct', 'indirect', 'related', 'derived')),
    impact_level VARCHAR(20) DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
    implementation_priority INTEGER DEFAULT 5 CHECK (implementation_priority BETWEEN 1 AND 10),
    notes TEXT,
    organization_id UUID REFERENCES organizations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    UNIQUE(requirement_id, framework_id, organization_id)
);

-- 4. Create translations table for bilingual support
CREATE TABLE IF NOT EXISTS translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('authority', 'framework', 'requirement', 'control', 'assessment')),
    entity_id UUID NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    language_code VARCHAR(5) NOT NULL CHECK (language_code IN ('en', 'ar')),
    translation TEXT NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    UNIQUE(entity_type, entity_id, field_name, language_code, organization_id)
);

-- 5. Enhance existing compliance_frameworks table
ALTER TABLE compliance_frameworks 
ADD COLUMN IF NOT EXISTS regulatory_authority_id UUID REFERENCES regulatory_authorities(id),
ADD COLUMN IF NOT EXISTS framework_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS sector_applicability TEXT[],
ADD COLUMN IF NOT EXISTS implementation_level VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_international BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS effective_date DATE,
ADD COLUMN IF NOT EXISTS review_cycle VARCHAR(50);

-- 6. Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_regulatory_authorities_reg_id ON regulatory_authorities(reg_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_authorities_sector ON regulatory_authorities(sector);
CREATE INDEX IF NOT EXISTS idx_regulatory_authorities_type ON regulatory_authorities(authority_type);
CREATE INDEX IF NOT EXISTS idx_regulatory_authorities_org ON regulatory_authorities(organization_id);

CREATE INDEX IF NOT EXISTS idx_regulatory_requirements_req_id ON regulatory_requirements(requirement_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_requirements_framework ON regulatory_requirements(framework_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_requirements_authority ON regulatory_requirements(authority_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_requirements_category ON regulatory_requirements(category);
CREATE INDEX IF NOT EXISTS idx_regulatory_requirements_priority ON regulatory_requirements(priority);
CREATE INDEX IF NOT EXISTS idx_regulatory_requirements_org ON regulatory_requirements(organization_id);

CREATE INDEX IF NOT EXISTS idx_requirement_framework_mapping_req ON requirement_framework_mapping(requirement_id);
CREATE INDEX IF NOT EXISTS idx_requirement_framework_mapping_framework ON requirement_framework_mapping(framework_id);
CREATE INDEX IF NOT EXISTS idx_requirement_framework_mapping_authority ON requirement_framework_mapping(authority_id);
CREATE INDEX IF NOT EXISTS idx_requirement_framework_mapping_org ON requirement_framework_mapping(organization_id);

CREATE INDEX IF NOT EXISTS idx_translations_entity ON translations(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language_code);
CREATE INDEX IF NOT EXISTS idx_translations_org ON translations(organization_id);

CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_authority ON compliance_frameworks(regulatory_authority_id);
CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_code ON compliance_frameworks(framework_code);

-- 7. Create audit triggers for new tables
CREATE TRIGGER audit_regulatory_authorities
    AFTER INSERT OR UPDATE OR DELETE ON regulatory_authorities
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_regulatory_requirements
    AFTER INSERT OR UPDATE OR DELETE ON regulatory_requirements
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_requirement_framework_mapping
    AFTER INSERT OR UPDATE OR DELETE ON requirement_framework_mapping
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_translations
    AFTER INSERT OR UPDATE OR DELETE ON translations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- 8. Enable Row Level Security (RLS) for multi-tenancy
ALTER TABLE regulatory_authorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulatory_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_framework_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies
CREATE POLICY regulatory_authorities_org_policy ON regulatory_authorities
    USING (organization_id = current_setting('app.current_organization_id')::UUID);

CREATE POLICY regulatory_requirements_org_policy ON regulatory_requirements
    USING (organization_id = current_setting('app.current_organization_id')::UUID);

CREATE POLICY requirement_framework_mapping_org_policy ON requirement_framework_mapping
    USING (organization_id = current_setting('app.current_organization_id')::UUID);

CREATE POLICY translations_org_policy ON translations
    USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- 10. Create views for common queries (simplified - removed references to potentially missing columns)
CREATE OR REPLACE VIEW v_regulatory_overview AS
SELECT 
    ra.id,
    ra.reg_id,
    ra.name_en,
    ra.name_ar,
    ra.acronym,
    ra.sector,
    ra.authority_type,
    COUNT(DISTINCT rr.id) as requirements_count,
    ra.organization_id
FROM regulatory_authorities ra
LEFT JOIN regulatory_requirements rr ON ra.id = rr.authority_id
WHERE ra.is_active = true
GROUP BY ra.id, ra.reg_id, ra.name_en, ra.name_ar, ra.acronym, ra.sector, ra.authority_type, ra.organization_id;

-- 11. Create functions for common operations
CREATE OR REPLACE FUNCTION get_authority_requirements(authority_uuid UUID)
RETURNS TABLE (
    requirement_id UUID,
    requirement_code VARCHAR(100),
    title_en VARCHAR(500),
    title_ar VARCHAR(500),
    priority VARCHAR(20),
    is_mandatory BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rr.id,
        rr.requirement_id,
        rr.title_en,
        rr.title_ar,
        rr.priority,
        rr.is_mandatory
    FROM regulatory_requirements rr
    WHERE rr.authority_id = authority_uuid
    AND rr.organization_id = current_setting('app.current_organization_id')::UUID
    ORDER BY rr.priority DESC, rr.title_en;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_cross_framework_requirements(framework1_uuid UUID, framework2_uuid UUID)
RETURNS TABLE (
    requirement_id UUID,
    requirement_code VARCHAR(100),
    title_en VARCHAR(500),
    mapping_type VARCHAR(50),
    impact_level VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rr.id,
        rr.requirement_id,
        rr.title_en,
        rfm1.mapping_type,
        rfm1.impact_level
    FROM regulatory_requirements rr
    JOIN requirement_framework_mapping rfm1 ON rr.id = rfm1.requirement_id
    JOIN requirement_framework_mapping rfm2 ON rr.id = rfm2.requirement_id
    WHERE rfm1.framework_id = framework1_uuid
    AND rfm2.framework_id = framework2_uuid
    AND rfm1.framework_id != rfm2.framework_id
    AND rr.organization_id = current_setting('app.current_organization_id')::UUID
    ORDER BY rfm1.impact_level DESC, rr.title_en;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Insert default data for testing
INSERT INTO regulatory_authorities (reg_id, name_en, name_ar, acronym, sector, authority_type, organization_id) 
VALUES 
    ('KSA-REG-001', 'Saudi Central Bank', 'البنك المركزي السعودي', 'SAMA', 'Banking & Finance', 'domestic', 
     (SELECT id FROM organizations LIMIT 1))
ON CONFLICT (reg_id) DO NOTHING;

-- 13. Grant permissions (removed - role 'authenticated' doesn't exist in standard PostgreSQL)
-- Permissions will be managed at application level

-- Migration completed successfully
SELECT 'Migration 001_add_regulatory_authorities completed successfully' as status;