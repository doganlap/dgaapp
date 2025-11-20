-- ================================================================
-- Shahin KSA Database Initialization Script
-- ================================================================

-- Create database if not exists
SELECT 'CREATE DATABASE shahin_ksa'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'shahin_ksa')\gexec

-- Connect to the database
\c shahin_ksa;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ================================================================
-- Core Tables
-- ================================================================

-- Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    code VARCHAR(50) UNIQUE,
    type VARCHAR(50),
    sector VARCHAR(100),
    size VARCHAR(50),
    country VARCHAR(100) DEFAULT 'Saudi Arabia',
    city VARCHAR(100),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url TEXT,
    status VARCHAR(50) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(200) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'user',
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    department VARCHAR(100),
    position VARCHAR(100),
    avatar_url TEXT,
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'Asia/Riyadh',
    status VARCHAR(50) DEFAULT 'active',
    is_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE,
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP WITH TIME ZONE,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255),
    preferences JSONB DEFAULT '{}',
    permissions JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- Regulatory Tables
-- ================================================================

-- Regulatory Authorities Enhanced
CREATE TABLE IF NOT EXISTS regulatory_authorities_enhanced (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    description_ar TEXT,
    type VARCHAR(100),
    jurisdiction VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Saudi Arabia',
    website VARCHAR(500),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    parent_id UUID REFERENCES regulatory_authorities_enhanced(id),
    hierarchy_level INTEGER DEFAULT 0,
    path_from_root TEXT[],
    logo_url TEXT,
    status VARCHAR(50) DEFAULT 'active',
    established_date DATE,
    mandate TEXT,
    key_responsibilities TEXT[],
    regulatory_scope TEXT[],
    enforcement_powers TEXT[],
    reporting_requirements JSONB,
    compliance_deadlines JSONB,
    penalty_structure JSONB,
    version INTEGER DEFAULT 1,
    effective_from DATE,
    effective_to DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- Regulatory Frameworks Enhanced
CREATE TABLE IF NOT EXISTS regulatory_frameworks_enhanced (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(500) NOT NULL,
    name_ar VARCHAR(500),
    description TEXT,
    description_ar TEXT,
    authority_id UUID REFERENCES regulatory_authorities_enhanced(id),
    type VARCHAR(100),
    category VARCHAR(100),
    industry_sectors TEXT[],
    jurisdiction VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    version VARCHAR(50),
    publication_date DATE,
    effective_date DATE,
    expiry_date DATE,
    review_cycle INTEGER,
    next_review_date DATE,
    compliance_level VARCHAR(50),
    risk_rating VARCHAR(50),
    documentation_url TEXT,
    official_reference VARCHAR(255),
    key_requirements TEXT[],
    compliance_activities JSONB,
    reporting_requirements JSONB,
    penalties JSONB,
    exemptions JSONB,
    related_frameworks UUID[],
    superseded_by UUID,
    supersedes UUID[],
    tags TEXT[],
    search_vector tsvector,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- Regulatory Controls Enhanced
CREATE TABLE IF NOT EXISTS regulatory_controls_enhanced (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_id VARCHAR(100) UNIQUE NOT NULL,
    framework_id UUID REFERENCES regulatory_frameworks_enhanced(id),
    title VARCHAR(500) NOT NULL,
    title_ar VARCHAR(500),
    description TEXT,
    description_ar TEXT,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    control_type VARCHAR(50),
    control_nature VARCHAR(50),
    frequency VARCHAR(50),
    automation_potential VARCHAR(50),
    risk_level VARCHAR(50),
    priority INTEGER,
    implementation_guidance TEXT,
    testing_procedures TEXT,
    evidence_requirements TEXT[],
    responsible_roles TEXT[],
    related_policies TEXT[],
    compensating_controls UUID[],
    parent_control_id UUID REFERENCES regulatory_controls_enhanced(id),
    control_dependencies UUID[],
    implementation_status VARCHAR(50),
    implementation_date DATE,
    last_review_date DATE,
    next_review_date DATE,
    effectiveness_rating INTEGER,
    maturity_level INTEGER,
    compliance_status VARCHAR(50),
    gaps_identified TEXT[],
    remediation_plan JSONB,
    automation_status VARCHAR(50),
    integration_points JSONB,
    monitoring_metrics JSONB,
    kpi_targets JSONB,
    tags TEXT[],
    search_vector tsvector,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- ================================================================
-- Assessment Tables
-- ================================================================

-- Assessments Table
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100),
    framework_id UUID,
    organization_id UUID REFERENCES organizations(id),
    status VARCHAR(50) DEFAULT 'draft',
    start_date DATE,
    end_date DATE,
    due_date DATE,
    assigned_to UUID REFERENCES users(id),
    reviewer_id UUID REFERENCES users(id),
    score DECIMAL(5,2),
    risk_rating VARCHAR(50),
    findings_summary TEXT,
    recommendations TEXT,
    action_items JSONB DEFAULT '[]',
    evidence_files JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- Assessment Responses Table
CREATE TABLE IF NOT EXISTS assessment_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    control_id UUID,
    question_id VARCHAR(100),
    question_text TEXT,
    response_type VARCHAR(50),
    response_value TEXT,
    response_score DECIMAL(5,2),
    compliance_status VARCHAR(50),
    evidence_provided BOOLEAN DEFAULT false,
    evidence_files JSONB DEFAULT '[]',
    notes TEXT,
    reviewer_comments TEXT,
    metadata JSONB DEFAULT '{}',
    responded_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responded_by UUID,
    reviewed_by UUID
);

-- ================================================================
-- Work Orders Tables
-- ================================================================

-- Work Orders Table
CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    type VARCHAR(100),
    category VARCHAR(100),
    priority VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    organization_id UUID REFERENCES organizations(id),
    requester_id UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    assigned_team VARCHAR(100),
    due_date TIMESTAMP WITH TIME ZONE,
    start_date TIMESTAMP WITH TIME ZONE,
    completion_date TIMESTAMP WITH TIME ZONE,
    estimated_hours DECIMAL(10,2),
    actual_hours DECIMAL(10,2),
    cost_estimate DECIMAL(15,2),
    actual_cost DECIMAL(15,2),
    location VARCHAR(255),
    assets_involved JSONB DEFAULT '[]',
    checklist_items JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    dependencies UUID[],
    parent_work_order_id UUID REFERENCES work_orders(id),
    recurrence_pattern JSONB,
    approval_required BOOLEAN DEFAULT false,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    completion_notes TEXT,
    satisfaction_rating INTEGER,
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- ================================================================
-- Audit Tables
-- ================================================================

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    entity_name VARCHAR(255),
    changes JSONB,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id UUID,
    request_method VARCHAR(10),
    request_url TEXT,
    response_status INTEGER,
    response_time_ms INTEGER,
    error_message TEXT,
    details JSONB,
    severity VARCHAR(50) DEFAULT 'info',
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- Indexes for Performance
-- ================================================================

-- Organizations Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_sector ON organizations(sector);

-- Users Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Sessions Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Regulatory Authorities Indexes
CREATE INDEX IF NOT EXISTS idx_regulatory_authorities_status ON regulatory_authorities_enhanced(status);
CREATE INDEX IF NOT EXISTS idx_regulatory_authorities_parent ON regulatory_authorities_enhanced(parent_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_authorities_code ON regulatory_authorities_enhanced(code);

-- Regulatory Frameworks Indexes
CREATE INDEX IF NOT EXISTS idx_regulatory_frameworks_authority ON regulatory_frameworks_enhanced(authority_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_frameworks_status ON regulatory_frameworks_enhanced(status);
CREATE INDEX IF NOT EXISTS idx_regulatory_frameworks_search ON regulatory_frameworks_enhanced USING GIN(search_vector);

-- Regulatory Controls Indexes
CREATE INDEX IF NOT EXISTS idx_regulatory_controls_framework ON regulatory_controls_enhanced(framework_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_controls_status ON regulatory_controls_enhanced(implementation_status);
CREATE INDEX IF NOT EXISTS idx_regulatory_controls_search ON regulatory_controls_enhanced USING GIN(search_vector);

-- Assessments Indexes
CREATE INDEX IF NOT EXISTS idx_assessments_organization ON assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_assigned_to ON assessments(assigned_to);

-- Work Orders Indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_organization ON work_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON work_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority);

-- Audit Logs Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ================================================================
-- Initial Data
-- ================================================================

-- Insert default organization
INSERT INTO organizations (id, name, name_ar, code, type, sector, status)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Shahin KSA',
    'شاهين السعودية',
    'SHAHIN',
    'enterprise',
    'technology',
    'active'
) ON CONFLICT (id) DO NOTHING;

-- Insert admin user (password: Admin@123)
INSERT INTO users (
    id,
    username,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    organization_id,
    status,
    is_verified
) VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin',
    'admin@shahinksa.com',
    '$2a$10$8K1p/a0Z3pfBqzTw5JQMI.LOHhaTWNFU2GhKA4BpSVTLgm4aSXLgm',
    'System',
    'Administrator',
    'super_admin',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'active',
    true
) ON CONFLICT (id) DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE shahin_ksa TO shahin_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO shahin_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO shahin_admin;