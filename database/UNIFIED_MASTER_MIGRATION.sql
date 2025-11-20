-- ================================================================
-- UNIFIED MASTER MIGRATION - CONSOLIDATE ALL DATA INTO SINGLE TABLES
-- Purpose: Merge all scattered data into one clear table per subject
-- Generated: 2025-01-27
-- ================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; 
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ================================================================
-- 1. UNIFIED REGULATORY AUTHORITIES TABLE
-- Consolidates: regulatory_authorities, regulatory_authorities_enhanced
-- ================================================================

DROP TABLE IF EXISTS unified_regulatory_authorities CASCADE;

CREATE TABLE unified_regulatory_authorities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    authority_code VARCHAR(50) UNIQUE NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description_en TEXT,
    description_ar TEXT,
    type VARCHAR(100), -- Government, Independent, Sectoral
    jurisdiction VARCHAR(100), -- National, Regional, Sectoral
    country VARCHAR(100) DEFAULT 'Saudi Arabia',
    website VARCHAR(500),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    physical_address TEXT,
    postal_address TEXT,
    parent_authority_id UUID REFERENCES unified_regulatory_authorities(id),
    hierarchy_level INTEGER DEFAULT 0,
    authority_path TEXT[], -- Path from root authority
    logo_url TEXT,
    status VARCHAR(50) DEFAULT 'active',
    established_date DATE,
    mandate_en TEXT,
    mandate_ar TEXT,
    key_responsibilities TEXT[],
    regulatory_scope TEXT[], -- What sectors/areas they regulate
    enforcement_powers TEXT[], -- What enforcement actions they can take
    reporting_requirements JSONB DEFAULT '{}',
    compliance_deadlines JSONB DEFAULT '{}',
    penalty_structure JSONB DEFAULT '{}',
    official_languages TEXT[] DEFAULT ARRAY['Arabic', 'English'],
    version INTEGER DEFAULT 1,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    search_vector tsvector,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- ================================================================
-- 2. UNIFIED FRAMEWORKS TABLE
-- Consolidates: frameworks, regulatory_frameworks_enhanced, compliance_frameworks
-- ================================================================

DROP TABLE IF EXISTS unified_frameworks CASCADE;

CREATE TABLE unified_frameworks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    framework_code VARCHAR(100) UNIQUE NOT NULL,
    name_en VARCHAR(500) NOT NULL,
    name_ar VARCHAR(500),
    description_en TEXT,
    description_ar TEXT,
    issuing_authority_id UUID REFERENCES unified_regulatory_authorities(id),
    framework_type VARCHAR(100), -- Regulation, Standard, Guideline, Best Practice
    category VARCHAR(100), -- Cybersecurity, Privacy, Healthcare, Financial
    industry_sectors TEXT[], -- Which industries it applies to
    geographical_scope VARCHAR(100), -- Saudi Arabia, International, Regional
    compliance_level VARCHAR(50), -- Mandatory, Voluntary, Recommended
    version VARCHAR(50),
    publication_date DATE,
    effective_date DATE,
    expiry_date DATE,
    review_cycle_months INTEGER,
    next_review_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    risk_rating VARCHAR(50), -- High, Medium, Low impact
    documentation_url TEXT,
    official_reference VARCHAR(255),
    isbn_or_reference VARCHAR(100),
    language VARCHAR(50) DEFAULT 'bilingual',
    
    -- Content Structure
    key_requirements TEXT[],
    total_controls_count INTEGER DEFAULT 0,
    total_requirements_count INTEGER DEFAULT 0,
    
    -- Compliance Information
    compliance_activities JSONB DEFAULT '{}',
    reporting_requirements JSONB DEFAULT '{}',
    audit_requirements JSONB DEFAULT '{}',
    penalties_fines JSONB DEFAULT '{}',
    exemptions_exceptions JSONB DEFAULT '{}',
    
    -- Relationships
    parent_framework_id UUID REFERENCES unified_frameworks(id),
    related_frameworks UUID[],
    superseded_by_id UUID REFERENCES unified_frameworks(id),
    supersedes_frameworks UUID[],
    
    -- Organization
    tags TEXT[],
    search_vector tsvector,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- ================================================================
-- 3. UNIFIED CONTROLS MASTER TABLE
-- Consolidates: All controls from CSV files and multiple control tables
-- ================================================================

DROP TABLE IF EXISTS unified_controls_master CASCADE;

CREATE TABLE unified_controls_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_id VARCHAR(100) UNIQUE NOT NULL,
    framework_id UUID REFERENCES unified_frameworks(id) NOT NULL,
    
    -- Basic Information
    control_number VARCHAR(50),
    domain VARCHAR(100),
    category VARCHAR(100),
    subcategory VARCHAR(100),
    
    -- Titles and Descriptions (Bilingual)
    title_en VARCHAR(500) NOT NULL,
    title_ar VARCHAR(500),
    description_en TEXT,
    description_ar TEXT,
    requirement_en TEXT,
    requirement_ar TEXT,
    
    -- Control Characteristics
    control_type VARCHAR(50), -- preventive, detective, corrective
    control_nature VARCHAR(50), -- technical, administrative, physical
    automation_potential VARCHAR(50), -- manual, semi-automated, fully-automated
    frequency VARCHAR(50), -- continuous, daily, weekly, monthly, annually
    maturity_level INTEGER DEFAULT 1, -- 1-5 scale
    priority INTEGER DEFAULT 3, -- 1-5 priority
    risk_level VARCHAR(50), -- high, medium, low
    
    -- Implementation Guidance
    implementation_guidance_en TEXT,
    implementation_guidance_ar TEXT,
    testing_procedures_en TEXT,
    testing_procedures_ar TEXT,
    
    -- Evidence and Compliance
    evidence_requirements TEXT[],
    responsible_roles TEXT[],
    accountable_parties TEXT[],
    related_policies TEXT[],
    
    -- Dependencies and Relationships
    parent_control_id UUID REFERENCES unified_controls_master(id),
    prerequisite_controls UUID[],
    related_controls UUID[],
    compensating_controls UUID[],
    
    -- Implementation Status
    implementation_status VARCHAR(50) DEFAULT 'not_implemented',
    implementation_date DATE,
    last_review_date DATE,
    next_review_date DATE,
    review_frequency_months INTEGER DEFAULT 12,
    
    -- Effectiveness and Maturity
    effectiveness_rating INTEGER, -- 1-5
    maturity_rating INTEGER, -- 1-5
    compliance_status VARCHAR(50), -- compliant, partially_compliant, non_compliant
    gaps_identified TEXT[],
    remediation_plan JSONB DEFAULT '{}',
    
    -- Technical Implementation
    automation_status VARCHAR(50), -- manual, scripted, integrated
    integration_systems TEXT[],
    monitoring_metrics JSONB DEFAULT '{}',
    kpi_targets JSONB DEFAULT '{}',
    
    -- Cross-Framework Mappings
    mapping_iso27001 VARCHAR(100),
    mapping_nist_csf VARCHAR(100),
    mapping_pci_dss VARCHAR(100),
    mapping_cobit VARCHAR(100),
    mapping_itil VARCHAR(100),
    
    -- Metadata and Search
    tags TEXT[],
    keywords TEXT[],
    search_vector tsvector,
    source_file VARCHAR(255),
    import_batch VARCHAR(100),
    last_verified_date DATE,
    verification_status VARCHAR(50) DEFAULT 'pending',
    
    -- Standard Fields
    version INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- ================================================================
-- 4. UNIFIED REQUIREMENTS TABLE
-- Consolidates: All requirement data from various sources
-- ================================================================

DROP TABLE IF EXISTS unified_requirements CASCADE;

CREATE TABLE unified_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id VARCHAR(100) UNIQUE NOT NULL,
    framework_id UUID REFERENCES unified_frameworks(id) NOT NULL,
    control_id UUID REFERENCES unified_controls_master(id),
    
    -- Requirement Details
    requirement_number VARCHAR(50),
    section VARCHAR(100),
    subsection VARCHAR(100),
    
    -- Content (Bilingual)
    title_en VARCHAR(500) NOT NULL,
    title_ar VARCHAR(500),
    description_en TEXT NOT NULL,
    description_ar TEXT,
    detailed_requirement_en TEXT,
    detailed_requirement_ar TEXT,
    
    -- Requirement Characteristics
    requirement_type VARCHAR(50), -- functional, non-functional, constraint
    criticality VARCHAR(50), -- critical, important, recommended
    compliance_level VARCHAR(50), -- mandatory, conditional, optional
    verification_method VARCHAR(50), -- audit, test, review, demonstration
    
    -- Implementation
    implementation_guidance_en TEXT,
    implementation_guidance_ar TEXT,
    success_criteria TEXT[],
    acceptance_criteria TEXT[],
    test_procedures TEXT[],
    
    -- Compliance Information
    compliance_deadline DATE,
    grace_period_days INTEGER DEFAULT 0,
    penalty_non_compliance TEXT,
    exemption_conditions TEXT[],
    
    -- Relationships
    prerequisite_requirements UUID[],
    dependent_requirements UUID[],
    related_requirements UUID[],
    conflicts_with UUID[], -- Requirements that conflict
    
    -- Applicability
    applicable_sectors TEXT[],
    applicable_organization_types TEXT[],
    applicable_organization_sizes TEXT[], -- SME, Large, Enterprise
    geographical_scope TEXT[] DEFAULT ARRAY['Saudi Arabia'],
    
    -- Status and Tracking
    implementation_status VARCHAR(50) DEFAULT 'not_started',
    compliance_status VARCHAR(50) DEFAULT 'unknown',
    last_assessed_date DATE,
    next_assessment_date DATE,
    assessment_frequency_months INTEGER DEFAULT 12,
    
    -- Evidence and Documentation
    evidence_required TEXT[],
    documentation_required TEXT[],
    approval_required BOOLEAN DEFAULT false,
    approver_roles TEXT[],
    
    -- Cross-References
    legal_references TEXT[],
    standard_references TEXT[],
    best_practice_references TEXT[],
    
    -- Metadata
    tags TEXT[],
    keywords TEXT[],
    search_vector tsvector,
    source_document VARCHAR(255),
    page_reference VARCHAR(50),
    
    -- Standard Fields
    version INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- ================================================================
-- 5. UNIFIED EVIDENCE MASTER TABLE
-- Consolidates: All evidence templates and requirements
-- ================================================================

DROP TABLE IF EXISTS unified_evidence_master CASCADE;

CREATE TABLE unified_evidence_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id VARCHAR(100) UNIQUE NOT NULL,
    
    -- Associated Objects
    control_id UUID REFERENCES unified_controls_master(id),
    requirement_id UUID REFERENCES unified_requirements(id),
    framework_id UUID REFERENCES unified_frameworks(id),
    
    -- Evidence Details
    evidence_type VARCHAR(100) NOT NULL, -- document, screenshot, log, certificate, report
    evidence_category VARCHAR(100), -- policy, procedure, configuration, audit_log
    
    -- Titles and Descriptions (Bilingual)
    title_en VARCHAR(500) NOT NULL,
    title_ar VARCHAR(500),
    description_en TEXT,
    description_ar TEXT,
    
    -- Collection Information
    collection_method VARCHAR(100), -- manual, automated, semi-automated
    collection_procedure_en TEXT,
    collection_procedure_ar TEXT,
    collection_frequency VARCHAR(50), -- continuous, daily, weekly, monthly, quarterly, annually
    collection_timing VARCHAR(100), -- real-time, scheduled, on-demand, event-triggered
    
    -- Technical Requirements
    file_format VARCHAR(50), -- pdf, docx, xlsx, png, log, csv, json
    file_size_limit_mb INTEGER,
    quality_requirements TEXT[],
    technical_specifications JSONB DEFAULT '{}',
    
    -- Validation and Acceptance
    validation_criteria TEXT[],
    acceptance_criteria TEXT[],
    rejection_criteria TEXT[],
    review_process_en TEXT,
    review_process_ar TEXT,
    
    -- Responsible Parties
    collector_roles TEXT[], -- Who collects the evidence
    reviewer_roles TEXT[], -- Who reviews the evidence
    approver_roles TEXT[], -- Who approves the evidence
    custodian_roles TEXT[], -- Who maintains the evidence
    
    -- Retention and Lifecycle
    retention_period_months INTEGER DEFAULT 60, -- 5 years default
    archive_after_months INTEGER DEFAULT 36, -- 3 years active
    destruction_method VARCHAR(100), -- secure_delete, physical_destruction, certified_destruction
    legal_hold_flag BOOLEAN DEFAULT false,
    
    -- Quality and Reliability
    authenticity_requirements TEXT[],
    integrity_requirements TEXT[],
    confidentiality_level VARCHAR(50), -- public, internal, confidential, restricted
    reliability_rating INTEGER DEFAULT 3, -- 1-5 scale
    
    -- Dependencies and Relationships
    prerequisite_evidence UUID[],
    related_evidence UUID[],
    supporting_evidence UUID[],
    alternative_evidence UUID[], -- Alternative forms of evidence
    
    -- Compliance and Audit
    audit_trail_required BOOLEAN DEFAULT true,
    chain_of_custody_required BOOLEAN DEFAULT false,
    digital_signature_required BOOLEAN DEFAULT false,
    witness_required BOOLEAN DEFAULT false,
    notarization_required BOOLEAN DEFAULT false,
    
    -- Cost and Effort
    collection_effort_hours DECIMAL(10,2),
    estimated_cost DECIMAL(15,2),
    automation_potential VARCHAR(50), -- none, partial, full
    
    -- Status and Tracking
    template_status VARCHAR(50) DEFAULT 'active',
    last_updated_date DATE,
    next_review_date DATE,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2), -- Percentage of successful collections
    
    -- Metadata
    tags TEXT[],
    keywords TEXT[],
    search_vector tsvector,
    template_version INTEGER DEFAULT 1,
    source_template VARCHAR(255),
    
    -- Standard Fields
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- ================================================================
-- 6. UNIFIED SECTORS TABLE
-- Consolidates: All sector and industry data
-- ================================================================

DROP TABLE IF EXISTS unified_sectors CASCADE;

CREATE TABLE unified_sectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sector_code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Sector Information (Bilingual)
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description_en TEXT,
    description_ar TEXT,
    
    -- Classification
    sector_type VARCHAR(100), -- Economic, Critical Infrastructure, Government, Private
    industry_category VARCHAR(100), -- Healthcare, Finance, Energy, Manufacturing, etc.
    economic_significance VARCHAR(50), -- Critical, Important, Standard
    national_priority VARCHAR(50), -- Vision2030, Strategic, Standard
    
    -- Hierarchical Structure
    parent_sector_id UUID REFERENCES unified_sectors(id),
    sector_level INTEGER DEFAULT 1, -- 1=Primary, 2=Secondary, 3=Tertiary
    sector_path TEXT[], -- Path from root sector
    child_sectors_count INTEGER DEFAULT 0,
    
    -- Regulatory Landscape
    primary_regulator_id UUID REFERENCES unified_regulatory_authorities(id),
    secondary_regulators UUID[], -- Array of regulator IDs
    applicable_frameworks UUID[], -- Array of framework IDs
    sector_specific_regulations TEXT[],
    
    -- Compliance Requirements
    mandatory_frameworks UUID[],
    recommended_frameworks UUID[],
    optional_frameworks UUID[],
    compliance_deadlines JSONB DEFAULT '{}',
    reporting_requirements JSONB DEFAULT '{}',
    
    -- Business Characteristics
    typical_organization_sizes TEXT[], -- SME, Large, Enterprise, Government
    common_business_models TEXT[],
    technology_maturity VARCHAR(50), -- Low, Medium, High, Advanced
    digitalization_level VARCHAR(50), -- Basic, Intermediate, Advanced, Digital-Native
    
    -- Risk Profile
    cybersecurity_risk_level VARCHAR(50), -- Low, Medium, High, Critical
    privacy_risk_level VARCHAR(50),
    operational_risk_level VARCHAR(50),
    regulatory_risk_level VARCHAR(50),
    threat_landscape TEXT[],
    
    -- Economic Data
    gdp_contribution_percentage DECIMAL(5,2),
    employment_percentage DECIMAL(5,2),
    number_of_organizations INTEGER,
    average_organization_size INTEGER,
    
    -- Vision 2030 Alignment
    vision2030_program VARCHAR(100), -- Which Vision 2030 program
    strategic_importance VARCHAR(50), -- Critical, High, Medium, Low
    transformation_goals TEXT[],
    digitalization_targets JSONB DEFAULT '{}',
    
    -- International Standards
    iso_sector_code VARCHAR(50),
    naics_code VARCHAR(50),
    isic_code VARCHAR(50),
    regional_classifications JSONB DEFAULT '{}',
    
    -- Metadata and Organization
    tags TEXT[],
    keywords TEXT[],
    search_vector tsvector,
    data_sources TEXT[],
    last_survey_date DATE,
    next_review_date DATE,
    
    -- Standard Fields
    status VARCHAR(50) DEFAULT 'active',
    version INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- ================================================================
-- 7. UNIFIED MAPPINGS TABLE
-- Consolidates: All cross-framework, sector-regulator, and other mappings
-- ================================================================

DROP TABLE IF EXISTS unified_mappings CASCADE;

CREATE TABLE unified_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mapping_id VARCHAR(100) UNIQUE NOT NULL,
    
    -- Mapping Type and Category
    mapping_type VARCHAR(100) NOT NULL, -- framework_to_framework, control_to_control, sector_to_regulator, requirement_to_control
    mapping_category VARCHAR(100), -- equivalence, similarity, dependency, conflict, enhancement
    
    -- Source and Target Objects
    source_type VARCHAR(100) NOT NULL, -- framework, control, requirement, sector, regulator
    source_id UUID NOT NULL,
    source_identifier VARCHAR(200),
    target_type VARCHAR(100) NOT NULL,
    target_id UUID NOT NULL,  
    target_identifier VARCHAR(200),
    
    -- Mapping Details
    relationship_strength VARCHAR(50), -- exact, strong, moderate, weak, informational
    confidence_level INTEGER DEFAULT 3, -- 1-5 scale
    mapping_direction VARCHAR(50), -- bidirectional, unidirectional, source_to_target, target_to_source
    
    -- Descriptions (Bilingual)
    mapping_description_en TEXT,
    mapping_description_ar TEXT,
    rationale_en TEXT,
    rationale_ar TEXT,
    
    -- Quantitative Analysis
    similarity_score DECIMAL(5,2), -- 0-100 percentage
    coverage_percentage DECIMAL(5,2), -- How much of source is covered by target
    gap_percentage DECIMAL(5,2), -- How much of source is NOT covered
    
    -- Implementation Guidance
    implementation_notes_en TEXT,
    implementation_notes_ar TEXT,
    transformation_steps TEXT[],
    effort_estimate_hours DECIMAL(10,2),
    
    -- Validation and Quality
    validation_method VARCHAR(100), -- expert_review, automated_analysis, peer_review, pilot_test
    validated_by TEXT[], -- List of validators
    validation_date DATE,
    validation_confidence VARCHAR(50), -- high, medium, low
    
    -- Usage and Effectiveness
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2), -- Success rate when mapping is used
    user_feedback_rating DECIMAL(3,1), -- 1-5 rating from users
    common_issues TEXT[],
    
    -- Contextual Information
    applicable_contexts TEXT[], -- Organization types, sectors, regions where mapping applies
    prerequisites TEXT[],
    assumptions TEXT[],
    limitations TEXT[],
    
    -- Maintenance and Lifecycle
    created_method VARCHAR(100), -- manual, automated, ai_assisted, expert_consensus
    last_reviewed_date DATE,
    next_review_date DATE,
    review_frequency_months INTEGER DEFAULT 12,
    
    -- Dependencies
    dependent_mappings UUID[], -- Other mappings that depend on this one
    prerequisite_mappings UUID[], -- Mappings that must exist before this one
    conflicting_mappings UUID[], -- Mappings that conflict with this one
    
    -- Metadata
    tags TEXT[],
    keywords TEXT[],
    search_vector tsvector,
    mapping_source VARCHAR(255), -- Where the mapping came from
    evidence_references TEXT[],
    
    -- Standard Fields
    status VARCHAR(50) DEFAULT 'active',
    version INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- ================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ================================================================

-- Regulatory Authorities Indexes
CREATE INDEX IF NOT EXISTS idx_unified_authorities_code ON unified_regulatory_authorities(authority_code);
CREATE INDEX IF NOT EXISTS idx_unified_authorities_type ON unified_regulatory_authorities(type);
CREATE INDEX IF NOT EXISTS idx_unified_authorities_jurisdiction ON unified_regulatory_authorities(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_unified_authorities_parent ON unified_regulatory_authorities(parent_authority_id);
CREATE INDEX IF NOT EXISTS idx_unified_authorities_search ON unified_regulatory_authorities USING gin(search_vector);

-- Frameworks Indexes
CREATE INDEX IF NOT EXISTS idx_unified_frameworks_code ON unified_frameworks(framework_code);
CREATE INDEX IF NOT EXISTS idx_unified_frameworks_authority ON unified_frameworks(issuing_authority_id);
CREATE INDEX IF NOT EXISTS idx_unified_frameworks_type ON unified_frameworks(framework_type);
CREATE INDEX IF NOT EXISTS idx_unified_frameworks_category ON unified_frameworks(category);
CREATE INDEX IF NOT EXISTS idx_unified_frameworks_search ON unified_frameworks USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_unified_frameworks_sectors ON unified_frameworks USING gin(industry_sectors);

-- Controls Indexes
CREATE INDEX IF NOT EXISTS idx_unified_controls_control_id ON unified_controls_master(control_id);
CREATE INDEX IF NOT EXISTS idx_unified_controls_framework ON unified_controls_master(framework_id);
CREATE INDEX IF NOT EXISTS idx_unified_controls_domain ON unified_controls_master(domain);
CREATE INDEX IF NOT EXISTS idx_unified_controls_category ON unified_controls_master(category);
CREATE INDEX IF NOT EXISTS idx_unified_controls_type ON unified_controls_master(control_type);
CREATE INDEX IF NOT EXISTS idx_unified_controls_status ON unified_controls_master(implementation_status);
CREATE INDEX IF NOT EXISTS idx_unified_controls_parent ON unified_controls_master(parent_control_id);
CREATE INDEX IF NOT EXISTS idx_unified_controls_search ON unified_controls_master USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_unified_controls_tags ON unified_controls_master USING gin(tags);

-- Requirements Indexes
CREATE INDEX IF NOT EXISTS idx_unified_requirements_id ON unified_requirements(requirement_id);
CREATE INDEX IF NOT EXISTS idx_unified_requirements_framework ON unified_requirements(framework_id);
CREATE INDEX IF NOT EXISTS idx_unified_requirements_control ON unified_requirements(control_id);
CREATE INDEX IF NOT EXISTS idx_unified_requirements_type ON unified_requirements(requirement_type);
CREATE INDEX IF NOT EXISTS idx_unified_requirements_criticality ON unified_requirements(criticality);
CREATE INDEX IF NOT EXISTS idx_unified_requirements_search ON unified_requirements USING gin(search_vector);

-- Evidence Indexes
CREATE INDEX IF NOT EXISTS idx_unified_evidence_id ON unified_evidence_master(evidence_id);
CREATE INDEX IF NOT EXISTS idx_unified_evidence_control ON unified_evidence_master(control_id);
CREATE INDEX IF NOT EXISTS idx_unified_evidence_requirement ON unified_evidence_master(requirement_id);
CREATE INDEX IF NOT EXISTS idx_unified_evidence_type ON unified_evidence_master(evidence_type);
CREATE INDEX IF NOT EXISTS idx_unified_evidence_category ON unified_evidence_master(evidence_category);
CREATE INDEX IF NOT EXISTS idx_unified_evidence_search ON unified_evidence_master USING gin(search_vector);

-- Sectors Indexes
CREATE INDEX IF NOT EXISTS idx_unified_sectors_code ON unified_sectors(sector_code);
CREATE INDEX IF NOT EXISTS idx_unified_sectors_type ON unified_sectors(sector_type);
CREATE INDEX IF NOT EXISTS idx_unified_sectors_category ON unified_sectors(industry_category);
CREATE INDEX IF NOT EXISTS idx_unified_sectors_parent ON unified_sectors(parent_sector_id);
CREATE INDEX IF NOT EXISTS idx_unified_sectors_regulator ON unified_sectors(primary_regulator_id);
CREATE INDEX IF NOT EXISTS idx_unified_sectors_search ON unified_sectors USING gin(search_vector);

-- Mappings Indexes
CREATE INDEX IF NOT EXISTS idx_unified_mappings_id ON unified_mappings(mapping_id);
CREATE INDEX IF NOT EXISTS idx_unified_mappings_type ON unified_mappings(mapping_type);
CREATE INDEX IF NOT EXISTS idx_unified_mappings_source ON unified_mappings(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_unified_mappings_target ON unified_mappings(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_unified_mappings_category ON unified_mappings(mapping_category);
CREATE INDEX IF NOT EXISTS idx_unified_mappings_strength ON unified_mappings(relationship_strength);
CREATE INDEX IF NOT EXISTS idx_unified_mappings_search ON unified_mappings USING gin(search_vector);

-- ================================================================
-- CREATE VIEWS FOR EASY ACCESS
-- ================================================================

-- Saudi Regulators View
CREATE OR REPLACE VIEW view_saudi_regulators AS
SELECT 
    authority_code,
    name_en,
    name_ar,
    type,
    jurisdiction,
    website,
    contact_email,
    status,
    established_date,
    key_responsibilities,
    regulatory_scope
FROM unified_regulatory_authorities 
WHERE country = 'Saudi Arabia' AND status = 'active'
ORDER BY name_en;

-- Active Frameworks View
CREATE OR REPLACE VIEW view_active_frameworks AS
SELECT 
    f.framework_code,
    f.name_en,
    f.name_ar,
    f.framework_type,
    f.category,
    a.name_en as authority_name,
    f.version,
    f.effective_date,
    f.total_controls_count
FROM unified_frameworks f
LEFT JOIN unified_regulatory_authorities a ON f.issuing_authority_id = a.id
WHERE f.status = 'active'
ORDER BY f.name_en;

-- Controls Summary View  
CREATE OR REPLACE VIEW view_controls_summary AS
SELECT 
    c.control_id,
    c.title_en,
    c.domain,
    c.category,
    c.control_type,
    c.maturity_level,
    c.implementation_status,
    f.name_en as framework_name,
    f.framework_code
FROM unified_controls_master c
JOIN unified_frameworks f ON c.framework_id = f.id
WHERE c.status = 'active'
ORDER BY f.framework_code, c.control_id;

-- Cross-Framework Mapping View
CREATE OR REPLACE VIEW view_framework_mappings AS
SELECT 
    m.mapping_id,
    sf.name_en as source_framework,
    tf.name_en as target_framework,
    m.relationship_strength,
    m.similarity_score,
    m.confidence_level
FROM unified_mappings m
JOIN unified_frameworks sf ON m.source_id = sf.id
JOIN unified_frameworks tf ON m.target_id = tf.id
WHERE m.mapping_type = 'framework_to_framework' AND m.status = 'active'
ORDER BY sf.name_en, tf.name_en;

-- ================================================================
-- UPDATE SEARCH VECTORS (Run after data import)
-- ================================================================

-- Function to update all search vectors
CREATE OR REPLACE FUNCTION update_all_search_vectors() RETURNS void AS $$
BEGIN
    -- Update regulatory authorities search vectors
    UPDATE unified_regulatory_authorities SET 
        search_vector = to_tsvector('english', 
            coalesce(name_en,'') || ' ' || 
            coalesce(name_ar,'') || ' ' || 
            coalesce(description_en,'') || ' ' ||
            coalesce(array_to_string(key_responsibilities, ' '),'')
        );
    
    -- Update frameworks search vectors  
    UPDATE unified_frameworks SET
        search_vector = to_tsvector('english',
            coalesce(name_en,'') || ' ' ||
            coalesce(name_ar,'') || ' ' ||
            coalesce(description_en,'') || ' ' ||
            coalesce(array_to_string(key_requirements, ' '),'')
        );
    
    -- Update controls search vectors
    UPDATE unified_controls_master SET
        search_vector = to_tsvector('english',
            coalesce(title_en,'') || ' ' ||
            coalesce(title_ar,'') || ' ' ||
            coalesce(description_en,'') || ' ' ||
            coalesce(requirement_en,'') || ' ' ||
            coalesce(implementation_guidance_en,'')
        );
    
    -- Update requirements search vectors
    UPDATE unified_requirements SET
        search_vector = to_tsvector('english',
            coalesce(title_en,'') || ' ' ||
            coalesce(title_ar,'') || ' ' ||
            coalesce(description_en,'') || ' ' ||
            coalesce(detailed_requirement_en,'')
        );
    
    -- Update evidence search vectors
    UPDATE unified_evidence_master SET
        search_vector = to_tsvector('english',
            coalesce(title_en,'') || ' ' ||
            coalesce(title_ar,'') || ' ' ||
            coalesce(description_en,'') || ' ' ||
            coalesce(collection_procedure_en,'')
        );
    
    -- Update sectors search vectors
    UPDATE unified_sectors SET
        search_vector = to_tsvector('english',
            coalesce(name_en,'') || ' ' ||
            coalesce(name_ar,'') || ' ' ||
            coalesce(description_en,'')
        );
    
    -- Update mappings search vectors
    UPDATE unified_mappings SET
        search_vector = to_tsvector('english',
            coalesce(mapping_description_en,'') || ' ' ||
            coalesce(rationale_en,'')
        );
        
    RAISE NOTICE 'All search vectors updated successfully';
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- SUMMARY
-- ================================================================

/*
This unified migration creates 7 master tables that consolidate all scattered data:

1. unified_regulatory_authorities - Single table for all regulators
2. unified_frameworks - Single table for all frameworks  
3. unified_controls_master - Single table for all controls
4. unified_requirements - Single table for all requirements
5. unified_evidence_master - Single table for all evidence
6. unified_sectors - Single table for all sectors
7. unified_mappings - Single table for all mappings

Key Features:
✅ Bilingual support (English/Arabic)
✅ Comprehensive relationships and foreign keys
✅ Full-text search vectors
✅ Performance indexes
✅ Useful views for common queries
✅ UUID primary keys for global uniqueness
✅ JSONB for flexible metadata
✅ Audit trail fields
✅ Status and versioning support

Next Step: Run the data migration script to populate these tables from the CSV files.
*/

SELECT 'UNIFIED MASTER MIGRATION COMPLETED SUCCESSFULLY' as status;