-- ================================================================
-- CONSOLIDATED 14-TABLE SCHEMA - ONE TABLE PER CATEGORY
-- Purpose: Merge 50+ tables into 14 comprehensive super-tables
-- Generated: 2025-01-27
-- ================================================================

\echo 'Creating 14 consolidated super-tables...'

-- Set connection parameters
\set ON_ERROR_STOP on

-- ================================================================
-- 1. USERS_CONSOLIDATED - All User Management in One Table
-- ================================================================
CREATE TABLE users_consolidated (
    -- Core User Info
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    phone VARCHAR(50),
    department VARCHAR(100),
    position VARCHAR(100),
    profile_picture VARCHAR(500),
    
    -- Authentication & Security
    role VARCHAR(50) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active',
    last_login TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Permissions & Roles
    permissions JSONB DEFAULT '[]'::jsonb,
    assigned_roles JSONB DEFAULT '[]'::jsonb,
    role_assignments JSONB DEFAULT '[]'::jsonb, -- [{role_id, assigned_date, assigned_by}]
    
    -- Session Management  
    current_session_id VARCHAR(255),
    session_data JSONB DEFAULT '{}',
    active_sessions JSONB DEFAULT '[]'::jsonb, -- [{session_id, ip, user_agent, created_at}]
    
    -- API & Tokens
    api_tokens JSONB DEFAULT '[]'::jsonb, -- [{token, name, expires, permissions}]
    refresh_token VARCHAR(255),
    token_expires TIMESTAMP WITH TIME ZONE,
    
    -- Password History
    password_history JSONB DEFAULT '[]'::jsonb, -- [{password_hash, changed_date}]
    password_changed_at TIMESTAMP WITH TIME ZONE,
    force_password_change BOOLEAN DEFAULT false,
    
    -- User Preferences
    preferences JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{}',
    dashboard_config JSONB DEFAULT '{}',
    ui_theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'Asia/Riyadh',
    
    -- Metadata & Audit
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    
    -- Organization Links
    organization_id UUID,
    organization_permissions JSONB DEFAULT '{}',
    
    -- Additional Fields (for expansion)
    custom_field_1 TEXT,
    custom_field_2 TEXT,
    custom_field_3 JSONB DEFAULT '{}',
    custom_field_4 INTEGER,
    custom_field_5 BOOLEAN DEFAULT false
);

-- ================================================================
-- 2. ORGANIZATIONS_CONSOLIDATED - All Organization Data
-- ================================================================
CREATE TABLE organizations_consolidated (
    -- Core Organization Info
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    description_ar TEXT,
    type VARCHAR(100),
    industry VARCHAR(100),
    size VARCHAR(50),
    
    -- Location & Contact
    country VARCHAR(100) DEFAULT 'Saudi Arabia',
    city VARCHAR(100),
    address TEXT,
    postal_code VARCHAR(20),
    website VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    
    -- Legal & Regulatory
    license_number VARCHAR(100),
    tax_id VARCHAR(100),
    regulatory_id VARCHAR(100),
    commercial_registration VARCHAR(100),
    vat_number VARCHAR(50),
    
    -- Hierarchy & Relationships
    parent_id UUID, -- Self-reference
    hierarchy_level INTEGER DEFAULT 0,
    organization_path TEXT[],
    subsidiaries JSONB DEFAULT '[]'::jsonb,
    
    -- Compliance Framework Assignments
    assigned_frameworks JSONB DEFAULT '[]'::jsonb, -- [{framework_id, assigned_date, status}]
    compliance_status JSONB DEFAULT '{}', -- {framework_id: status}
    compliance_scores JSONB DEFAULT '{}', -- {framework_id: score}
    
    -- Organization Settings
    status VARCHAR(50) DEFAULT 'active',
    logo_url TEXT,
    business_hours JSONB DEFAULT '{}',
    operating_countries TEXT[],
    employee_count INTEGER,
    annual_revenue DECIMAL(15,2),
    
    -- Metadata & Audit
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    
    -- Additional Fields
    custom_field_1 TEXT,
    custom_field_2 TEXT,
    custom_field_3 JSONB DEFAULT '{}',
    custom_field_4 INTEGER,
    custom_field_5 BOOLEAN DEFAULT false
);

-- ================================================================
-- 3. SECURITY_ACCESS_CONSOLIDATED - All Security & Access Control
-- ================================================================
CREATE TABLE security_access_consolidated (
    -- Core Security Record
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_type VARCHAR(50) NOT NULL, -- 'role', 'permission', 'session', 'audit'
    record_name VARCHAR(255) NOT NULL,
    
    -- Role Management
    role_code VARCHAR(100),
    role_description TEXT,
    role_level INTEGER,
    role_permissions JSONB DEFAULT '[]'::jsonb,
    is_system_role BOOLEAN DEFAULT false,
    
    -- Permission Management
    permission_code VARCHAR(100),
    permission_resource VARCHAR(100),
    permission_action VARCHAR(50), -- read, write, delete, admin
    permission_scope VARCHAR(100), -- global, organization, user
    
    -- Session Management
    session_id VARCHAR(255),
    user_id UUID,
    ip_address INET,
    user_agent TEXT,
    session_start TIMESTAMP WITH TIME ZONE,
    session_end TIMESTAMP WITH TIME ZONE,
    session_data JSONB DEFAULT '{}',
    
    -- Audit Information
    audit_action VARCHAR(100),
    audit_entity_type VARCHAR(100),
    audit_entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    audit_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Security Context
    organization_id UUID,
    related_user_id UUID,
    security_level VARCHAR(50),
    access_granted BOOLEAN DEFAULT true,
    
    -- Status & Metadata
    status VARCHAR(50) DEFAULT 'active',
    details TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional Fields
    custom_field_1 TEXT,
    custom_field_2 TEXT,
    custom_field_3 JSONB DEFAULT '{}'
);

-- ================================================================
-- 4. WORKFLOW_CONSOLIDATED - All Workflow & Task Management
-- ================================================================
CREATE TABLE workflow_consolidated (
    -- Core Workflow Item
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_type VARCHAR(50) NOT NULL, -- 'work_order', 'assignment', 'comment', 'attachment', 'notification'
    
    -- Work Order Fields
    title VARCHAR(500),
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    category VARCHAR(100),
    
    -- Assignment Fields
    assigned_to UUID,
    assigned_by UUID,
    assigned_role VARCHAR(50),
    assigned_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Time Tracking
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_hours DECIMAL(10,2),
    actual_hours DECIMAL(10,2),
    time_spent INTEGER, -- in minutes
    
    -- Comments & Communication
    comment_text TEXT,
    parent_comment_id UUID,
    is_internal BOOLEAN DEFAULT false,
    
    -- Attachments & Files
    attachment_name VARCHAR(255),
    attachment_path TEXT,
    attachment_size BIGINT,
    attachment_type VARCHAR(100),
    
    -- Notifications
    notification_type VARCHAR(50),
    notification_title VARCHAR(255),
    notification_message TEXT,
    notification_read BOOLEAN DEFAULT false,
    notification_read_at TIMESTAMP WITH TIME ZONE,
    action_url VARCHAR(500),
    
    -- Relationships
    parent_id UUID, -- Links to main work order
    organization_id UUID,
    created_by UUID,
    
    -- Workflow Data
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    search_vector tsvector,
    
    -- Status & Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional Fields
    custom_field_1 TEXT,
    custom_field_2 TEXT,
    custom_field_3 JSONB DEFAULT '{}'
);

-- ================================================================
-- 5. SAUDI_REGULATORY_CONSOLIDATED - All Saudi Regulatory Masters
-- ================================================================
CREATE TABLE saudi_regulatory_consolidated (
    -- Core Record
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_type VARCHAR(50) NOT NULL, -- 'authority', 'framework', 'sector', 'mapping'
    
    -- Authority Fields
    authority_code VARCHAR(50),
    authority_name_en VARCHAR(255),
    authority_name_ar VARCHAR(255),
    authority_type VARCHAR(100),
    jurisdiction VARCHAR(100),
    parent_authority_id UUID,
    
    -- Framework Fields
    framework_code VARCHAR(100),
    framework_name_en VARCHAR(500),
    framework_name_ar VARCHAR(500),
    framework_type VARCHAR(100),
    category VARCHAR(100),
    issuing_authority_id UUID,
    
    -- Common Bilingual Fields
    description_en TEXT,
    description_ar TEXT,
    title_en VARCHAR(500),
    title_ar VARCHAR(500),
    
    -- Versioning & Dates
    version VARCHAR(50),
    publication_date DATE,
    effective_date DATE,
    expiry_date DATE,
    review_cycle_months INTEGER,
    next_review_date DATE,
    
    -- Scope & Coverage
    industry_sectors TEXT[],
    geographical_scope VARCHAR(100),
    compliance_level VARCHAR(50),
    risk_rating VARCHAR(50),
    
    -- Contact & Reference
    website VARCHAR(500),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    official_reference VARCHAR(255),
    documentation_url TEXT,
    
    -- Relationships
    parent_framework_id UUID,
    related_frameworks UUID[],
    superseded_by_id UUID,
    mapping_source_id UUID,
    mapping_target_id UUID,
    mapping_relationship VARCHAR(100),
    
    -- Content Structure
    key_requirements TEXT[],
    total_controls_count INTEGER DEFAULT 0,
    total_requirements_count INTEGER DEFAULT 0,
    
    -- Compliance Information
    compliance_activities JSONB DEFAULT '{}',
    reporting_requirements JSONB DEFAULT '{}',
    audit_requirements JSONB DEFAULT '{}',
    penalties_fines JSONB DEFAULT '{}',
    
    -- Search & Organization
    tags TEXT[],
    search_vector tsvector,
    hierarchy_level INTEGER DEFAULT 0,
    
    -- Status & Metadata
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional Fields
    custom_field_1 TEXT,
    custom_field_2 TEXT,
    custom_field_3 JSONB DEFAULT '{}'
);

-- ================================================================
-- 6. COMPLIANCE_CONTROLS_CONSOLIDATED - All Controls & Implementation
-- ================================================================
CREATE TABLE compliance_controls_consolidated (
    -- Core Control
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_type VARCHAR(50) NOT NULL, -- 'master_control', 'implementation', 'ccm_control', 'ownership'
    
    -- Master Control Fields
    control_id VARCHAR(100) UNIQUE,
    control_number VARCHAR(50),
    framework_id UUID,
    domain VARCHAR(100),
    category VARCHAR(100),
    subcategory VARCHAR(100),
    
    -- Bilingual Content
    title_en VARCHAR(500),
    title_ar VARCHAR(500),
    description_en TEXT,
    description_ar TEXT,
    requirement_en TEXT,
    requirement_ar TEXT,
    
    -- Control Characteristics
    control_nature VARCHAR(50), -- technical, administrative, physical
    control_behavior VARCHAR(50), -- preventive, detective, corrective
    automation_potential VARCHAR(50),
    frequency VARCHAR(50),
    maturity_level INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 3,
    risk_level VARCHAR(50),
    
    -- Implementation Status
    implementation_status VARCHAR(50) DEFAULT 'not_implemented',
    implementation_date DATE,
    effectiveness VARCHAR(20),
    last_review_date DATE,
    next_review_date DATE,
    
    -- Ownership & Responsibility
    owner_id UUID,
    responsible_roles TEXT[],
    accountable_parties TEXT[],
    
    -- Dependencies & Relationships
    parent_control_id UUID,
    related_controls UUID[],
    dependent_controls UUID[],
    
    -- Implementation Guidance
    implementation_guidance_en TEXT,
    implementation_guidance_ar TEXT,
    testing_procedures_en TEXT,
    testing_procedures_ar TEXT,
    
    -- Evidence & Documentation
    evidence_requirements TEXT[],
    evidence_items JSONB DEFAULT '[]'::jsonb,
    related_policies TEXT[],
    documentation_links TEXT[],
    
    -- CCM Specific Fields
    ccm_domain VARCHAR(100),
    specification TEXT,
    assessment_guidance TEXT,
    control_category VARCHAR(100),
    
    -- Organization Context
    organization_id UUID,
    
    -- Status & Metadata
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional Fields
    custom_field_1 TEXT,
    custom_field_2 TEXT,
    custom_field_3 JSONB DEFAULT '{}'
);

-- ================================================================
-- 7. REQUIREMENTS_EVIDENCE_CONSOLIDATED - All Requirements & Evidence
-- ================================================================
CREATE TABLE requirements_evidence_consolidated (
    -- Core Record
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_type VARCHAR(50) NOT NULL, -- 'requirement', 'evidence_template', 'evidence_item'
    
    -- Requirement Fields
    requirement_number VARCHAR(50),
    framework_id UUID,
    control_id UUID,
    requirement_category VARCHAR(100),
    
    -- Bilingual Content
    title_en VARCHAR(500),
    title_ar VARCHAR(500),
    description_en TEXT,
    description_ar TEXT,
    requirement_text_en TEXT,
    requirement_text_ar TEXT,
    
    -- Evidence Template Fields
    evidence_type VARCHAR(100), -- policy, procedure, configuration, log, report
    evidence_format VARCHAR(50), -- document, file, screenshot, data
    collection_method VARCHAR(100),
    collection_frequency VARCHAR(50),
    retention_period VARCHAR(50),
    
    -- Evidence Item Fields
    evidence_name VARCHAR(255),
    evidence_description TEXT,
    file_path TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    evidence_date DATE,
    collected_by UUID,
    
    -- Compliance Context
    compliance_status VARCHAR(50),
    verification_status VARCHAR(50),
    verification_date DATE,
    verified_by UUID,
    verification_notes TEXT,
    
    -- Relationships
    parent_requirement_id UUID,
    related_requirements UUID[],
    linked_controls UUID[],
    evidence_template_id UUID,
    
    -- Requirements Metadata
    mandatory BOOLEAN DEFAULT true,
    applicable_roles TEXT[],
    applicable_sectors TEXT[],
    risk_rating VARCHAR(50),
    
    -- Evidence Quality
    evidence_quality VARCHAR(50), -- excellent, good, adequate, poor
    completeness_score INTEGER, -- 0-100
    review_status VARCHAR(50),
    review_comments TEXT,
    
    -- Organization Context
    organization_id UUID,
    
    -- Status & Metadata
    status VARCHAR(50) DEFAULT 'active',
    version INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional Fields
    custom_field_1 TEXT,
    custom_field_2 TEXT,
    custom_field_3 JSONB DEFAULT '{}'
);

-- ================================================================
-- 8. ASSESSMENT_EVALUATION_CONSOLIDATED - All Assessments & Results
-- ================================================================
CREATE TABLE assessment_evaluation_consolidated (
    -- Core Record
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_type VARCHAR(50) NOT NULL, -- 'assessment', 'response', 'finding', 'compliance_check'
    
    -- Assessment Fields
    assessment_name VARCHAR(255),
    assessment_description TEXT,
    framework_id UUID,
    organization_id UUID,
    assessor_id UUID,
    assessment_date DATE,
    
    -- Response Fields
    assessment_id UUID,
    control_id UUID,
    question_id UUID,
    response_type VARCHAR(50), -- compliant, partially_compliant, non_compliant, not_applicable
    response_value TEXT,
    evidence_provided TEXT,
    comments TEXT,
    
    -- Scoring
    score DECIMAL(5,2),
    max_score DECIMAL(5,2),
    weighted_score DECIMAL(5,2),
    
    -- Finding Fields
    finding_type VARCHAR(50), -- gap, weakness, strength, recommendation
    severity VARCHAR(20), -- critical, high, medium, low
    finding_title VARCHAR(500),
    finding_description TEXT,
    
    -- Recommendations & Actions
    recommendation TEXT,
    remediation_plan TEXT,
    responsible_party UUID,
    due_date DATE,
    implementation_status VARCHAR(50),
    
    -- Review & Approval
    reviewed_by UUID,
    review_date DATE,
    review_status VARCHAR(50),
    approved_by UUID,
    approval_date DATE,
    
    -- Compliance Tracking
    compliance_status VARCHAR(50),
    compliance_percentage DECIMAL(5,2),
    gap_analysis JSONB DEFAULT '{}',
    improvement_areas TEXT[],
    
    -- Assessment Metadata
    assessment_methodology VARCHAR(100),
    assessment_scope TEXT,
    assessment_criteria JSONB DEFAULT '{}',
    
    -- Relationships
    parent_assessment_id UUID,
    related_assessments UUID[],
    
    -- Status & Metadata
    status VARCHAR(50) DEFAULT 'active',
    findings TEXT,
    recommendations TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional Fields
    custom_field_1 TEXT,
    custom_field_2 TEXT,
    custom_field_3 JSONB DEFAULT '{}'
);

-- ================================================================
-- 9. RISK_MANAGEMENT_CONSOLIDATED - All Risk Data
-- ================================================================
CREATE TABLE risk_management_consolidated (
    -- Core Record
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    risk_type VARCHAR(50) NOT NULL, -- 'risk_assessment', 'risk_item', 'treatment'
    
    -- Risk Assessment Fields
    title VARCHAR(500),
    description TEXT,
    risk_category VARCHAR(100),
    
    -- Risk Scoring
    likelihood INTEGER, -- 1-5 scale
    impact INTEGER, -- 1-5 scale
    risk_level VARCHAR(20), -- calculated or manual
    risk_score DECIMAL(5,2),
    inherent_risk DECIMAL(5,2),
    residual_risk DECIMAL(5,2),
    
    -- Risk Treatment Fields
    risk_id UUID, -- Reference to parent risk
    treatment_type VARCHAR(50), -- avoid, mitigate, transfer, accept
    treatment_plan TEXT,
    responsible_party UUID,
    implementation_date DATE,
    target_residual_score DECIMAL(5,2),
    actual_residual_score DECIMAL(5,2),
    
    -- Cost & Effectiveness
    cost_estimate DECIMAL(15,2),
    actual_cost DECIMAL(15,2),
    effectiveness_rating INTEGER, -- 1-5 scale
    roi_calculation DECIMAL(10,2),
    
    -- Status & Dates
    status VARCHAR(50) DEFAULT 'identified',
    review_date DATE,
    next_review_date DATE,
    treatment_status VARCHAR(50) DEFAULT 'planned',
    
    -- Approval Workflow
    approval_status VARCHAR(50),
    approved_by UUID,
    approved_date DATE,
    review_comments TEXT,
    
    -- Risk Context
    owner_id UUID,
    organization_id UUID,
    affected_assets TEXT[],
    threat_sources TEXT[],
    vulnerabilities TEXT[],
    
    -- Mitigation & Controls
    mitigation_plan TEXT,
    existing_controls TEXT[],
    additional_controls TEXT[],
    control_effectiveness VARCHAR(50),
    
    -- Monitoring
    monitoring_frequency VARCHAR(50),
    key_indicators TEXT[],
    escalation_criteria TEXT,
    last_monitored DATE,
    
    -- Status & Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional Fields
    custom_field_1 TEXT,
    custom_field_2 TEXT,
    custom_field_3 JSONB DEFAULT '{}'
);

-- ================================================================
-- 10. FRAMEWORK_MAPPING_CONSOLIDATED - All Framework Relationships
-- ================================================================
CREATE TABLE framework_mapping_consolidated (
    -- Core Record
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mapping_type VARCHAR(50) NOT NULL, -- 'framework_definition', 'cross_mapping', 'regulatory_mapping', 'sector_mapping'
    
    -- Framework Definition Fields
    framework_name VARCHAR(500),
    framework_code VARCHAR(100),
    framework_description TEXT,
    issuing_authority VARCHAR(255),
    
    -- Mapping Fields
    source_framework_id UUID,
    target_framework_id UUID,
    source_control_id VARCHAR(100),
    target_control_id VARCHAR(100),
    mapping_relationship VARCHAR(100), -- equivalent, similar, subset, superset, related
    mapping_strength VARCHAR(50), -- strong, moderate, weak
    
    -- Regulatory Mapping
    regulatory_authority_id UUID,
    regulatory_requirement_id VARCHAR(100),
    compliance_obligation TEXT,
    
    -- Sector Mapping
    sector_id UUID,
    sector_name VARCHAR(255),
    industry_classification VARCHAR(100),
    sector_frameworks UUID[],
    
    -- Mapping Details
    mapping_notes TEXT,
    mapping_rationale TEXT,
    confidence_level INTEGER, -- 1-5
    validation_status VARCHAR(50),
    validated_by UUID,
    validation_date DATE,
    
    -- Cross-Reference Data
    external_reference VARCHAR(255),
    standard_reference VARCHAR(255),
    certification_requirements TEXT,
    
    -- Organizational Context
    organization_id UUID,
    applicable_organizations UUID[],
    
    -- Version & Lifecycle
    version VARCHAR(50),
    effective_date DATE,
    expiry_date DATE,
    superseded_by UUID,
    
    -- Status & Metadata
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional Fields
    custom_field_1 TEXT,
    custom_field_2 TEXT,
    custom_field_3 JSONB DEFAULT '{}'
);

-- ================================================================
-- 11. DOCUMENT_CONTENT_CONSOLIDATED - All Documents & Incidents
-- ================================================================
CREATE TABLE document_content_consolidated (
    -- Core Record
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type VARCHAR(50) NOT NULL, -- 'document', 'incident'
    
    -- Document Fields
    title VARCHAR(255),
    title_ar VARCHAR(255),
    description TEXT,
    description_ar TEXT,
    document_type VARCHAR(50),
    
    -- File Management
    file_path TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    mime_type VARCHAR(100),
    file_hash VARCHAR(255),
    
    -- Versioning
    version VARCHAR(50),
    version_notes TEXT,
    is_current_version BOOLEAN DEFAULT true,
    previous_version_id UUID,
    
    -- Incident Fields
    incident_type VARCHAR(100),
    incident_severity VARCHAR(20),
    incident_status VARCHAR(50),
    incident_date TIMESTAMP WITH TIME ZONE,
    resolution_date TIMESTAMP WITH TIME ZONE,
    
    -- Classification & Security
    classification VARCHAR(50), -- public, internal, confidential, restricted
    access_level VARCHAR(50),
    retention_period INTEGER, -- in months
    disposal_date DATE,
    
    -- Ownership & Responsibility
    uploaded_by UUID,
    document_owner UUID,
    reviewer_id UUID,
    approved_by UUID,
    approval_date DATE,
    
    -- Organization Context
    organization_id UUID,
    department VARCHAR(100),
    
    -- Content Metadata
    tags TEXT[],
    keywords TEXT[],
    search_vector tsvector,
    language VARCHAR(10) DEFAULT 'en',
    
    -- Workflow Integration
    related_work_orders UUID[],
    related_assessments UUID[],
    related_controls UUID[],
    
    -- Status & Lifecycle
    status VARCHAR(50) DEFAULT 'draft',
    publication_date DATE,
    expiry_date DATE,
    review_due_date DATE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional Fields
    custom_field_1 TEXT,
    custom_field_2 TEXT,
    custom_field_3 JSONB DEFAULT '{}'
);

-- ================================================================
-- 12. VENDOR_MANAGEMENT_CONSOLIDATED - All Vendor Data
-- ================================================================
CREATE TABLE vendor_management_consolidated (
    -- Core Vendor Info
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_type VARCHAR(50) DEFAULT 'vendor', -- vendor, supplier, partner, contractor
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    description_ar TEXT,
    vendor_code VARCHAR(100),
    
    -- Contact Information
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    website VARCHAR(255),
    
    -- Address Information
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Saudi Arabia',
    postal_code VARCHAR(20),
    
    -- Legal & Business Info
    registration_number VARCHAR(100),
    tax_id VARCHAR(100),
    license_number VARCHAR(100),
    business_type VARCHAR(100),
    
    -- Vendor Assessment
    risk_rating VARCHAR(50), -- high, medium, low
    performance_rating DECIMAL(3,2), -- 1-5 scale
    compliance_status VARCHAR(50),
    certification_status VARCHAR(50),
    
    -- Financial Information
    annual_revenue DECIMAL(15,2),
    credit_rating VARCHAR(50),
    payment_terms VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'SAR',
    
    -- Service Categories
    services_provided TEXT[],
    service_categories TEXT[],
    specializations TEXT[],
    geographical_coverage TEXT[],
    
    -- Compliance & Security
    security_clearance VARCHAR(50),
    compliance_frameworks TEXT[],
    certifications TEXT[], -- ISO27001, SOC2, etc.
    security_assessments JSONB DEFAULT '[]', -- [{date, score, status}]
    
    -- Contract Management
    contract_start_date DATE,
    contract_end_date DATE,
    contract_value DECIMAL(15,2),
    contract_status VARCHAR(50),
    renewal_date DATE,
    
    -- Performance Tracking
    sla_metrics JSONB DEFAULT '{}',
    performance_scores JSONB DEFAULT '{}', -- {metric: score}
    incidents_count INTEGER DEFAULT 0,
    last_performance_review DATE,
    
    -- Relationships
    parent_vendor_id UUID, -- For subsidiaries
    partner_vendors UUID[], -- Related vendors
    organization_id UUID,
    
    -- Status & Lifecycle
    status VARCHAR(50) DEFAULT 'active',
    onboarding_date DATE,
    offboarding_date DATE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional Fields
    custom_field_1 TEXT,
    custom_field_2 TEXT,
    custom_field_3 JSONB DEFAULT '{}'
);

-- ================================================================
-- 13. UI_SYSTEM_CONSOLIDATED - All UI & System Configuration
-- ================================================================
CREATE TABLE ui_system_consolidated (
    -- Core Record
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    component_type VARCHAR(50) NOT NULL, -- 'dynamic_component', 'dashboard_widget', 'system_setting'
    
    -- Dynamic Component Fields
    component_name VARCHAR(255),
    component_category VARCHAR(100),
    component_code VARCHAR(100),
    component_config JSONB DEFAULT '{}',
    component_html TEXT,
    component_css TEXT,
    component_javascript TEXT,
    
    -- Dashboard Widget Fields
    widget_name VARCHAR(255),
    widget_type VARCHAR(100), -- chart, table, metric, list
    widget_size VARCHAR(50), -- small, medium, large, full
    widget_position JSONB DEFAULT '{}', -- {x, y, width, height}
    data_source VARCHAR(255),
    data_query TEXT,
    refresh_interval INTEGER, -- in seconds
    
    -- System Setting Fields
    setting_key VARCHAR(255),
    setting_value TEXT,
    setting_category VARCHAR(100),
    setting_type VARCHAR(50), -- string, number, boolean, json
    setting_description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    
    -- User & Organization Context
    user_id UUID, -- For user-specific settings
    organization_id UUID, -- For org-specific settings
    role_based BOOLEAN DEFAULT false,
    applicable_roles TEXT[],
    
    -- Component Lifecycle
    version VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    deployment_environment VARCHAR(50), -- dev, staging, prod
    
    -- Permissions & Access
    access_level VARCHAR(50), -- public, user, admin, system
    required_permissions TEXT[],
    visibility_rules JSONB DEFAULT '{}',
    
    -- Configuration & Customization
    default_values JSONB DEFAULT '{}',
    validation_rules JSONB DEFAULT '{}',
    customization_options JSONB DEFAULT '{}',
    
    -- Integration
    api_endpoints TEXT[],
    webhook_urls TEXT[],
    external_dependencies TEXT[],
    
    -- Performance & Caching
    cache_ttl INTEGER, -- in seconds
    performance_metrics JSONB DEFAULT '{}',
    load_priority INTEGER DEFAULT 5, -- 1-10
    
    -- Metadata & Audit
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    
    -- Additional Fields
    custom_field_1 TEXT,
    custom_field_2 TEXT,
    custom_field_3 JSONB DEFAULT '{}'
);

-- ================================================================
-- 14. LOGGING_MONITORING_CONSOLIDATED - All Logs & Monitoring
-- ================================================================
CREATE TABLE logging_monitoring_consolidated (
    -- Core Record
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_type VARCHAR(50) NOT NULL, -- 'integration_log', 'backup_log', 'system_log', 'error_log'
    
    -- Log Entry Fields
    log_level VARCHAR(20), -- DEBUG, INFO, WARN, ERROR, FATAL
    log_message TEXT,
    log_source VARCHAR(100), -- system component that generated the log
    log_category VARCHAR(100),
    
    -- Integration Log Fields
    integration_name VARCHAR(255),
    integration_type VARCHAR(100), -- API, database, file, webhook
    endpoint_url VARCHAR(500),
    request_method VARCHAR(10),
    request_payload TEXT,
    response_status INTEGER,
    response_payload TEXT,
    response_time INTEGER, -- in milliseconds
    
    -- Backup Log Fields
    backup_type VARCHAR(50), -- full, incremental, differential
    backup_size BIGINT,
    backup_location TEXT,
    backup_status VARCHAR(50), -- started, completed, failed
    compression_ratio DECIMAL(5,2),
    verification_status VARCHAR(50),
    
    -- Error & Exception Fields
    error_code VARCHAR(100),
    error_message TEXT,
    stack_trace TEXT,
    user_id UUID,
    session_id VARCHAR(255),
    
    -- System Performance
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    disk_usage DECIMAL(5,2),
    network_io BIGINT,
    database_connections INTEGER,
    
    -- Request Context
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    correlation_id VARCHAR(255),
    
    -- Timing Information
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- in milliseconds
    
    -- Business Context
    organization_id UUID,
    affected_entities TEXT[], -- entities involved in the operation
    business_process VARCHAR(100),
    
    -- Alerting & Monitoring
    alert_level VARCHAR(20), -- none, low, medium, high, critical
    notification_sent BOOLEAN DEFAULT false,
    acknowledged_by UUID,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolution_status VARCHAR(50),
    
    -- Data Retention
    retention_period INTEGER, -- in days
    archived BOOLEAN DEFAULT false,
    archive_date TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional Fields
    custom_field_1 TEXT,
    custom_field_2 TEXT,
    custom_field_3 JSONB DEFAULT '{}'
);

-- ================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ================================================================

\echo 'Creating indexes for consolidated tables...'

-- Users Consolidated Indexes
CREATE INDEX idx_users_consolidated_email ON users_consolidated(email);
CREATE INDEX idx_users_consolidated_status ON users_consolidated(status);
CREATE INDEX idx_users_consolidated_role ON users_consolidated(role);
CREATE INDEX idx_users_consolidated_org ON users_consolidated(organization_id);

-- Organizations Consolidated Indexes
CREATE INDEX idx_organizations_consolidated_name ON organizations_consolidated(name);
CREATE INDEX idx_organizations_consolidated_parent ON organizations_consolidated(parent_id);
CREATE INDEX idx_organizations_consolidated_type ON organizations_consolidated(type);

-- Security Access Consolidated Indexes
CREATE INDEX idx_security_access_type ON security_access_consolidated(record_type);
CREATE INDEX idx_security_access_user ON security_access_consolidated(user_id);
CREATE INDEX idx_security_access_session ON security_access_consolidated(session_id);

-- Workflow Consolidated Indexes
CREATE INDEX idx_workflow_type ON workflow_consolidated(workflow_type);
CREATE INDEX idx_workflow_assigned ON workflow_consolidated(assigned_to);
CREATE INDEX idx_workflow_status ON workflow_consolidated(status);
CREATE INDEX idx_workflow_parent ON workflow_consolidated(parent_id);

-- Saudi Regulatory Consolidated Indexes
CREATE INDEX idx_saudi_regulatory_type ON saudi_regulatory_consolidated(record_type);
CREATE INDEX idx_saudi_regulatory_authority ON saudi_regulatory_consolidated(authority_code);
CREATE INDEX idx_saudi_regulatory_framework ON saudi_regulatory_consolidated(framework_code);

-- Compliance Controls Consolidated Indexes
CREATE INDEX idx_compliance_controls_type ON compliance_controls_consolidated(control_type);
CREATE INDEX idx_compliance_controls_id ON compliance_controls_consolidated(control_id);
CREATE INDEX idx_compliance_controls_framework ON compliance_controls_consolidated(framework_id);
CREATE INDEX idx_compliance_controls_status ON compliance_controls_consolidated(implementation_status);

-- Requirements Evidence Consolidated Indexes
CREATE INDEX idx_requirements_evidence_type ON requirements_evidence_consolidated(record_type);
CREATE INDEX idx_requirements_evidence_framework ON requirements_evidence_consolidated(framework_id);
CREATE INDEX idx_requirements_evidence_control ON requirements_evidence_consolidated(control_id);

-- Assessment Evaluation Consolidated Indexes
CREATE INDEX idx_assessment_evaluation_type ON assessment_evaluation_consolidated(assessment_type);
CREATE INDEX idx_assessment_evaluation_id ON assessment_evaluation_consolidated(assessment_id);
CREATE INDEX idx_assessment_evaluation_org ON assessment_evaluation_consolidated(organization_id);

-- Risk Management Consolidated Indexes
CREATE INDEX idx_risk_management_type ON risk_management_consolidated(risk_type);
CREATE INDEX idx_risk_management_level ON risk_management_consolidated(risk_level);
CREATE INDEX idx_risk_management_owner ON risk_management_consolidated(owner_id);

-- Framework Mapping Consolidated Indexes
CREATE INDEX idx_framework_mapping_type ON framework_mapping_consolidated(mapping_type);
CREATE INDEX idx_framework_mapping_source ON framework_mapping_consolidated(source_framework_id);
CREATE INDEX idx_framework_mapping_target ON framework_mapping_consolidated(target_framework_id);

-- Document Content Consolidated Indexes
CREATE INDEX idx_document_content_type ON document_content_consolidated(content_type);
CREATE INDEX idx_document_content_title ON document_content_consolidated(title);
CREATE INDEX idx_document_content_org ON document_content_consolidated(organization_id);

-- Vendor Management Consolidated Indexes
CREATE INDEX idx_vendor_management_name ON vendor_management_consolidated(name);
CREATE INDEX idx_vendor_management_type ON vendor_management_consolidated(vendor_type);
CREATE INDEX idx_vendor_management_status ON vendor_management_consolidated(status);

-- UI System Consolidated Indexes
CREATE INDEX idx_ui_system_type ON ui_system_consolidated(component_type);
CREATE INDEX idx_ui_system_name ON ui_system_consolidated(component_name);
CREATE INDEX idx_ui_system_user ON ui_system_consolidated(user_id);

-- Logging Monitoring Consolidated Indexes
CREATE INDEX idx_logging_monitoring_type ON logging_monitoring_consolidated(log_type);
CREATE INDEX idx_logging_monitoring_level ON logging_monitoring_consolidated(log_level);
CREATE INDEX idx_logging_monitoring_created ON logging_monitoring_consolidated(created_at);

-- ================================================================
-- CREATE UPDATE TRIGGERS
-- ================================================================

\echo 'Creating update triggers...'

-- Create trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all consolidated tables
CREATE TRIGGER update_users_consolidated_updated_at BEFORE UPDATE ON users_consolidated FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_consolidated_updated_at BEFORE UPDATE ON organizations_consolidated FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_security_access_consolidated_updated_at BEFORE UPDATE ON security_access_consolidated FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_consolidated_updated_at BEFORE UPDATE ON workflow_consolidated FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_saudi_regulatory_consolidated_updated_at BEFORE UPDATE ON saudi_regulatory_consolidated FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_controls_consolidated_updated_at BEFORE UPDATE ON compliance_controls_consolidated FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_requirements_evidence_consolidated_updated_at BEFORE UPDATE ON requirements_evidence_consolidated FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assessment_evaluation_consolidated_updated_at BEFORE UPDATE ON assessment_evaluation_consolidated FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_risk_management_consolidated_updated_at BEFORE UPDATE ON risk_management_consolidated FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_framework_mapping_consolidated_updated_at BEFORE UPDATE ON framework_mapping_consolidated FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_content_consolidated_updated_at BEFORE UPDATE ON document_content_consolidated FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendor_management_consolidated_updated_at BEFORE UPDATE ON vendor_management_consolidated FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ui_system_consolidated_updated_at BEFORE UPDATE ON ui_system_consolidated FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- SUCCESS SUMMARY
-- ================================================================

\echo '=========================================================================='
\echo '✅ 14 CONSOLIDATED TABLES CREATED SUCCESSFULLY!'
\echo '=========================================================================='
\echo ''
\echo '📊 CONSOLIDATION SUMMARY:'
\echo '   • 1. users_consolidated - All user management (6 tables → 1)'
\echo '   • 2. organizations_consolidated - All organization data (2 tables → 1)'
\echo '   • 3. security_access_consolidated - All security & access (4 tables → 1)'
\echo '   • 4. workflow_consolidated - All workflow management (5 tables → 1)'
\echo '   • 5. saudi_regulatory_consolidated - All Saudi regulatory (4 tables → 1)'
\echo '   • 6. compliance_controls_consolidated - All controls (6 tables → 1)'
\echo '   • 7. requirements_evidence_consolidated - All requirements & evidence (3 tables → 1)'
\echo '   • 8. assessment_evaluation_consolidated - All assessments (4 tables → 1)'
\echo '   • 9. risk_management_consolidated - All risk data (3 tables → 1)'
\echo '   • 10. framework_mapping_consolidated - All framework mappings (4 tables → 1)'
\echo '   • 11. document_content_consolidated - All documents & incidents (2 tables → 1)'
\echo '   • 12. vendor_management_consolidated - All vendor data (1 table → 1)'
\echo '   • 13. ui_system_consolidated - All UI & system config (3 tables → 1)'
\echo '   • 14. logging_monitoring_consolidated - All logs & monitoring (2 tables → 1)'
\echo ''
\echo '🎯 RESULT: 50+ TABLES CONSOLIDATED INTO 14 SUPER-TABLES!'
\echo '=========================================================================='