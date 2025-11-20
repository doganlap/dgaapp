-- ================================================================
-- Migration 035: Migrate Unified CSV Data to Main Tables
-- ================================================================
-- This migration transfers data from unified CSV tables to main database tables
-- Run after: node scripts/consolidate-csv-data.js

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- STEP 1: Migrate Regulators Data
-- ================================================================

INSERT INTO regulatory_authorities_enhanced (
    id,
    code,
    name,
    name_ar,
    description,
    description_ar,
    type,
    jurisdiction,
    country,
    website,
    status,
    created_at,
    updated_at
)
SELECT 
    uuid_generate_v4(),
    ur.code,
    ur.name_en,
    ur.name_ar,
    ur.description_en,
    ur.description_ar,
    CASE 
        WHEN ur.is_saudi THEN 'national'
        ELSE 'international'
    END,
    ur.jurisdiction_en,
    CASE 
        WHEN ur.is_saudi THEN 'Saudi Arabia'
        ELSE 'International'
    END,
    ur.website,
    ur.status,
    ur.created_at,
    ur.updated_at
FROM unified_regulators ur
WHERE NOT EXISTS (
    SELECT 1 FROM regulatory_authorities_enhanced rae 
    WHERE rae.code = ur.code
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    name_ar = EXCLUDED.name_ar,
    description = EXCLUDED.description,
    description_ar = EXCLUDED.description_ar,
    website = EXCLUDED.website,
    updated_at = CURRENT_TIMESTAMP;

-- ================================================================
-- STEP 2: Migrate Frameworks Data
-- ================================================================

INSERT INTO regulatory_frameworks_enhanced (
    id,
    code,
    name,
    name_ar,
    description,
    description_ar,
    authority_id,
    type,
    category,
    status,
    version,
    effective_date,
    documentation_url,
    created_at,
    updated_at
)
SELECT 
    uuid_generate_v4(),
    uf.code,
    uf.title_en,
    uf.title_ar,
    uf.description_en,
    uf.description_ar,
    rae.id,
    CASE 
        WHEN uf.category = 'national_law' THEN 'law'
        WHEN uf.category = 'sector_specific' THEN 'regulation'
        ELSE 'standard'
    END,
    uf.category,
    uf.status,
    uf.version,
    uf.effective_date,
    uf.official_ref,
    uf.created_at,
    uf.updated_at
FROM unified_frameworks uf
LEFT JOIN regulatory_authorities_enhanced rae ON rae.code = uf.regulator_code
WHERE NOT EXISTS (
    SELECT 1 FROM regulatory_frameworks_enhanced rfe 
    WHERE rfe.code = uf.code
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    name_ar = EXCLUDED.name_ar,
    description = EXCLUDED.description,
    description_ar = EXCLUDED.description_ar,
    version = EXCLUDED.version,
    effective_date = EXCLUDED.effective_date,
    documentation_url = EXCLUDED.documentation_url,
    updated_at = CURRENT_TIMESTAMP;

-- ================================================================
-- STEP 3: Migrate Controls Data
-- ================================================================

INSERT INTO regulatory_controls_enhanced (
    id,
    control_id,
    framework_id,
    title,
    title_ar,
    description,
    description_ar,
    category,
    subcategory,
    control_type,
    control_nature,
    risk_level,
    priority,
    implementation_guidance,
    evidence_requirements,
    status,
    created_at,
    updated_at
)
SELECT 
    uuid_generate_v4(),
    uc.control_number,
    rfe.id,
    uc.title_en,
    uc.title_ar,
    uc.requirement_en,
    uc.requirement_ar,
    uc.domain,
    CASE 
        WHEN uc.control_type IS NOT NULL THEN uc.control_type
        ELSE 'operational'
    END,
    CASE 
        WHEN uc.control_type = 'preventive' THEN 'preventive'
        WHEN uc.control_type = 'detective' THEN 'detective'
        WHEN uc.control_type = 'corrective' THEN 'corrective'
        ELSE 'preventive'
    END,
    'operational',
    CASE 
        WHEN uc.criticality = 'High' THEN 'high'
        WHEN uc.criticality = 'Medium' THEN 'medium'
        WHEN uc.criticality = 'Low' THEN 'low'
        ELSE 'medium'
    END,
    CASE 
        WHEN uc.criticality = 'High' THEN 1
        WHEN uc.criticality = 'Medium' THEN 2
        WHEN uc.criticality = 'Low' THEN 3
        ELSE 2
    END,
    COALESCE(uc.implementation_guidance_en, uc.implementation_guidance_ar),
    CASE 
        WHEN uc.evidence_requirements IS NOT NULL THEN ARRAY[uc.evidence_requirements]
        WHEN uc.evidence_hint_en IS NOT NULL THEN ARRAY[uc.evidence_hint_en]
        WHEN uc.evidence_hint_ar IS NOT NULL THEN ARRAY[uc.evidence_hint_ar]
        ELSE ARRAY[]::TEXT[]
    END,
    uc.status,
    uc.created_at,
    uc.updated_at
FROM unified_controls uc
LEFT JOIN regulatory_frameworks_enhanced rfe ON rfe.code = uc.framework_code
WHERE rfe.id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM regulatory_controls_enhanced rce 
    WHERE rce.control_id = uc.control_number 
    AND rce.framework_id = rfe.id
);

-- ================================================================
-- STEP 4: Update Framework Control Counts
-- ================================================================

UPDATE regulatory_frameworks_enhanced 
SET total_controls = (
    SELECT COUNT(*) 
    FROM regulatory_controls_enhanced rce 
    WHERE rce.framework_id = regulatory_frameworks_enhanced.id
)
WHERE EXISTS (
    SELECT 1 FROM regulatory_controls_enhanced rce 
    WHERE rce.framework_id = regulatory_frameworks_enhanced.id
);

-- ================================================================
-- STEP 5: Create Control Mappings Table
-- ================================================================

CREATE TABLE IF NOT EXISTS control_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_control_id UUID REFERENCES regulatory_controls_enhanced(id),
    target_framework VARCHAR(50),
    target_control_id VARCHAR(100),
    mapping_type VARCHAR(50) DEFAULT 'equivalent',
    confidence_level VARCHAR(20) DEFAULT 'high',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert ISO 27001 mappings
INSERT INTO control_mappings (source_control_id, target_framework, target_control_id, mapping_type)
SELECT 
    rce.id,
    'ISO27001',
    uc.mapping_iso27001,
    'equivalent'
FROM regulatory_controls_enhanced rce
JOIN regulatory_frameworks_enhanced rfe ON rfe.id = rce.framework_id
JOIN unified_controls uc ON uc.control_number = rce.control_id AND uc.framework_code = rfe.code
WHERE uc.mapping_iso27001 IS NOT NULL 
AND uc.mapping_iso27001 != '';

-- Insert NIST mappings
INSERT INTO control_mappings (source_control_id, target_framework, target_control_id, mapping_type)
SELECT 
    rce.id,
    'NIST',
    uc.mapping_nist,
    'equivalent'
FROM regulatory_controls_enhanced rce
JOIN regulatory_frameworks_enhanced rfe ON rfe.id = rce.framework_id
JOIN unified_controls uc ON uc.control_number = rce.control_id AND uc.framework_code = rfe.code
WHERE uc.mapping_nist IS NOT NULL 
AND uc.mapping_nist != '';

-- ================================================================
-- STEP 6: Create Indexes for Performance
-- ================================================================

-- Indexes for regulatory_authorities_enhanced
CREATE INDEX IF NOT EXISTS idx_regulatory_authorities_code ON regulatory_authorities_enhanced(code);
CREATE INDEX IF NOT EXISTS idx_regulatory_authorities_country ON regulatory_authorities_enhanced(country);
CREATE INDEX IF NOT EXISTS idx_regulatory_authorities_status ON regulatory_authorities_enhanced(status);

-- Indexes for regulatory_frameworks_enhanced
CREATE INDEX IF NOT EXISTS idx_regulatory_frameworks_code ON regulatory_frameworks_enhanced(code);
CREATE INDEX IF NOT EXISTS idx_regulatory_frameworks_authority ON regulatory_frameworks_enhanced(authority_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_frameworks_category ON regulatory_frameworks_enhanced(category);
CREATE INDEX IF NOT EXISTS idx_regulatory_frameworks_status ON regulatory_frameworks_enhanced(status);

-- Indexes for regulatory_controls_enhanced
CREATE INDEX IF NOT EXISTS idx_regulatory_controls_framework ON regulatory_controls_enhanced(framework_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_controls_control_id ON regulatory_controls_enhanced(control_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_controls_category ON regulatory_controls_enhanced(category);
CREATE INDEX IF NOT EXISTS idx_regulatory_controls_risk_level ON regulatory_controls_enhanced(risk_level);
CREATE INDEX IF NOT EXISTS idx_regulatory_controls_status ON regulatory_controls_enhanced(status);

-- Indexes for control_mappings
CREATE INDEX IF NOT EXISTS idx_control_mappings_source ON control_mappings(source_control_id);
CREATE INDEX IF NOT EXISTS idx_control_mappings_target ON control_mappings(target_framework, target_control_id);

-- ================================================================
-- STEP 7: Create Summary Views
-- ================================================================

-- Framework Summary View
CREATE OR REPLACE VIEW framework_summary AS
SELECT 
    rfe.code,
    rfe.name,
    rfe.name_ar,
    rae.name as regulator_name,
    rae.name_ar as regulator_name_ar,
    rfe.category,
    rfe.status,
    rfe.version,
    rfe.effective_date,
    COUNT(rce.id) as total_controls,
    COUNT(CASE WHEN rce.risk_level = 'high' THEN 1 END) as high_risk_controls,
    COUNT(CASE WHEN rce.risk_level = 'medium' THEN 1 END) as medium_risk_controls,
    COUNT(CASE WHEN rce.risk_level = 'low' THEN 1 END) as low_risk_controls
FROM regulatory_frameworks_enhanced rfe
LEFT JOIN regulatory_authorities_enhanced rae ON rae.id = rfe.authority_id
LEFT JOIN regulatory_controls_enhanced rce ON rce.framework_id = rfe.id
GROUP BY rfe.id, rfe.code, rfe.name, rfe.name_ar, rae.name, rae.name_ar, 
         rfe.category, rfe.status, rfe.version, rfe.effective_date;

-- Control Summary View
CREATE OR REPLACE VIEW control_summary AS
SELECT 
    rce.control_id,
    rce.title,
    rce.title_ar,
    rfe.code as framework_code,
    rfe.name as framework_name,
    rae.name as regulator_name,
    rce.category,
    rce.control_type,
    rce.risk_level,
    rce.priority,
    rce.status,
    array_length(rce.evidence_requirements, 1) as evidence_count,
    COUNT(cm.id) as mapping_count
FROM regulatory_controls_enhanced rce
LEFT JOIN regulatory_frameworks_enhanced rfe ON rfe.id = rce.framework_id
LEFT JOIN regulatory_authorities_enhanced rae ON rae.id = rfe.authority_id
LEFT JOIN control_mappings cm ON cm.source_control_id = rce.id
GROUP BY rce.id, rce.control_id, rce.title, rce.title_ar, rfe.code, rfe.name, 
         rae.name, rce.category, rce.control_type, rce.risk_level, rce.priority, 
         rce.status, rce.evidence_requirements;

-- ================================================================
-- STEP 8: Generate Migration Summary
-- ================================================================

DO $$
DECLARE
    regulator_count INTEGER;
    framework_count INTEGER;
    control_count INTEGER;
    mapping_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO regulator_count FROM regulatory_authorities_enhanced;
    SELECT COUNT(*) INTO framework_count FROM regulatory_frameworks_enhanced;
    SELECT COUNT(*) INTO control_count FROM regulatory_controls_enhanced;
    SELECT COUNT(*) INTO mapping_count FROM control_mappings;
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'CSV DATA MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'MIGRATION SUMMARY:';
    RAISE NOTICE '  ✅ Regulatory Authorities: %', regulator_count;
    RAISE NOTICE '  ✅ Regulatory Frameworks: %', framework_count;
    RAISE NOTICE '  ✅ Regulatory Controls: %', control_count;
    RAISE NOTICE '  ✅ Control Mappings: %', mapping_count;
    RAISE NOTICE '';
    RAISE NOTICE 'TABLES POPULATED:';
    RAISE NOTICE '  • regulatory_authorities_enhanced';
    RAISE NOTICE '  • regulatory_frameworks_enhanced';
    RAISE NOTICE '  • regulatory_controls_enhanced';
    RAISE NOTICE '  • control_mappings';
    RAISE NOTICE '';
    RAISE NOTICE 'VIEWS CREATED:';
    RAISE NOTICE '  • framework_summary';
    RAISE NOTICE '  • control_summary';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Ready for compliance assessments and reporting!';
    RAISE NOTICE '';
END $$;

-- Record migration completion
INSERT INTO schema_migrations (migration_name, executed_at) 
VALUES ('035_migrate_unified_csv_data', NOW())
ON CONFLICT (migration_name) DO UPDATE SET executed_at = NOW();

-- Migration completed successfully
SELECT 'Migration 035: CSV data migration completed successfully' as status;