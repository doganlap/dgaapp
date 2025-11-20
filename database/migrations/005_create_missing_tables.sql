-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    document_type VARCHAR(50),
    file_path TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft',
    version VARCHAR(50),
    uploaded_by UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create incidents table
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'open',
    category VARCHAR(100),
    reported_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    occurred_at TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    country VARCHAR(100),
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    compliance_status VARCHAR(50),
    organization_id UUID REFERENCES organizations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create translations table (for UI translations, not entity translations)
CREATE TABLE IF NOT EXISTS ui_translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) NOT NULL,
    language VARCHAR(10) NOT NULL,
    value TEXT NOT NULL,
    context VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(key, language)
);

-- Create evidence_catalog table
CREATE TABLE IF NOT EXISTS evidence_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    evidence_type VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    organization_id UUID REFERENCES organizations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NOTE: Commented out tables that reference non-existent tables (tasks, workflows, reports, evidence)
-- These will be created in later migrations once the referenced tables exist

-- -- Create task_evidence table
-- CREATE TABLE IF NOT EXISTS task_evidence (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     task_id UUID REFERENCES tasks(id),
--     evidence_id UUID REFERENCES evidence(id),
--     relationship_type VARCHAR(50),
--     notes TEXT,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     UNIQUE(task_id, evidence_id)
-- );

-- -- Create workflow_tasks table
-- CREATE TABLE IF NOT EXISTS workflow_tasks (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     workflow_id UUID REFERENCES workflows(id),
--     task_id UUID REFERENCES tasks(id),
--     sequence_order INTEGER,
--     is_required BOOLEAN DEFAULT true,
--     dependencies TEXT,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     UNIQUE(workflow_id, task_id)
-- );

-- -- Create report_data table
-- CREATE TABLE IF NOT EXISTS report_data (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     report_id UUID REFERENCES reports(id),
--     data_type VARCHAR(100) NOT NULL,
--     data_value TEXT,
--     metadata JSONB,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
-- );

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) NOT NULL,
    session_token TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create attachments_index table
CREATE TABLE IF NOT EXISTS attachments_index (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    uploaded_by UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create international_organizations table
CREATE TABLE IF NOT EXISTS international_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    acronym VARCHAR(50),
    country VARCHAR(100),
    website VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create crosswalk_versions table
CREATE TABLE IF NOT EXISTS crosswalk_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_name VARCHAR(255) NOT NULL,
    source_framework VARCHAR(100) NOT NULL,
    target_framework VARCHAR(100) NOT NULL,
    version_number VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at
    BEFORE UPDATE ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ui_translations_updated_at
    BEFORE UPDATE ON ui_translations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evidence_catalog_updated_at
    BEFORE UPDATE ON evidence_catalog
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Commented out triggers for commented-out tables
-- CREATE TRIGGER update_task_evidence_updated_at
--     BEFORE UPDATE ON task_evidence
--     FOR EACH ROW
--     EXECUTE FUNCTION update_updated_at_column();

-- CREATE TRIGGER update_workflow_tasks_updated_at
--     BEFORE UPDATE ON workflow_tasks
--     FOR EACH ROW
--     EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attachments_index_updated_at
    BEFORE UPDATE ON attachments_index
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_international_organizations_updated_at
    BEFORE UPDATE ON international_organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crosswalk_versions_updated_at
    BEFORE UPDATE ON crosswalk_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_documents_title ON documents(title);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_organization_id ON documents(organization_id);

CREATE INDEX idx_incidents_title ON incidents(title);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_organization_id ON incidents(organization_id);

CREATE INDEX idx_vendors_name ON vendors(name);
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_organization_id ON vendors(organization_id);

CREATE INDEX idx_ui_translations_key ON ui_translations(key);
CREATE INDEX idx_ui_translations_language ON ui_translations(language);

CREATE INDEX idx_evidence_catalog_name ON evidence_catalog(name);
CREATE INDEX idx_evidence_catalog_status ON evidence_catalog(status);
CREATE INDEX idx_evidence_catalog_organization_id ON evidence_catalog(organization_id);

-- Commented out indexes for commented-out tables
-- CREATE INDEX idx_task_evidence_task_id ON task_evidence(task_id);
-- CREATE INDEX idx_task_evidence_evidence_id ON task_evidence(evidence_id);

-- CREATE INDEX idx_workflow_tasks_workflow_id ON workflow_tasks(workflow_id);
-- CREATE INDEX idx_workflow_tasks_task_id ON workflow_tasks(task_id);

-- CREATE INDEX idx_report_data_report_id ON report_data(report_id);
-- CREATE INDEX idx_report_data_data_type ON report_data(data_type);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_session_token ON sessions(session_token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

CREATE INDEX idx_attachments_index_file_name ON attachments_index(file_name);
CREATE INDEX idx_attachments_index_entity_type ON attachments_index(entity_type);
CREATE INDEX idx_attachments_index_organization_id ON attachments_index(organization_id);

CREATE INDEX idx_international_organizations_name ON international_organizations(name);
CREATE INDEX idx_international_organizations_country ON international_organizations(country);

CREATE INDEX idx_crosswalk_versions_version_name ON crosswalk_versions(version_name);
CREATE INDEX idx_crosswalk_versions_source_framework ON crosswalk_versions(source_framework);
CREATE INDEX idx_crosswalk_versions_target_framework ON crosswalk_versions(target_framework);