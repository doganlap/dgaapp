-- ================================================================
-- Create Missing Production Tables for Shahin KSA
-- ================================================================

-- Regulatory Knowledge Base Enhanced
CREATE TABLE IF NOT EXISTS regulatory_knowledge_base_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    authority_id UUID REFERENCES regulatory_authorities_enhanced(id) ON DELETE CASCADE,
    framework_id UUID REFERENCES regulatory_frameworks_enhanced(id) ON DELETE CASCADE,
    control_id UUID REFERENCES regulatory_controls_enhanced(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    title_ar VARCHAR(500),
    content TEXT NOT NULL,
    content_ar TEXT,
    category VARCHAR(100),
    tags TEXT[],
    reference_number VARCHAR(100),
    effective_date DATE,
    expiry_date DATE,
    version VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    attachments JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    search_vector tsvector,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Regulatory Audit Trail Enhanced
CREATE TABLE IF NOT EXISTS regulatory_audit_trail_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL, -- 'authority', 'framework', 'control', 'knowledge'
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'approve', 'reject'
    changes JSONB DEFAULT '{}',
    previous_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(255),
    user_role VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    organization_id UUID REFERENCES organizations(id),
    comments TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assessment Evidence
CREATE TABLE IF NOT EXISTS assessment_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    response_id UUID REFERENCES assessment_responses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_name VARCHAR(255),
    file_path TEXT,
    file_size BIGINT,
    file_type VARCHAR(100),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uploaded_by UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending',
    review_status VARCHAR(50),
    review_comments TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assessment Templates
CREATE TABLE IF NOT EXISTS assessment_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    description_ar TEXT,
    framework_id UUID REFERENCES regulatory_frameworks_enhanced(id),
    category VARCHAR(100),
    type VARCHAR(50),
    questions JSONB DEFAULT '[]',
    scoring_method VARCHAR(50),
    passing_score DECIMAL(5,2),
    sections JSONB DEFAULT '[]',
    instructions TEXT,
    instructions_ar TEXT,
    version VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    is_public BOOLEAN DEFAULT false,
    organization_id UUID REFERENCES organizations(id),
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Work Order Assignments
CREATE TABLE IF NOT EXISTS work_order_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id),
    assigned_by UUID REFERENCES users(id),
    role VARCHAR(50), -- 'owner', 'reviewer', 'approver', 'contributor'
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    time_spent INTEGER, -- in minutes
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CCM Controls
CREATE TABLE IF NOT EXISTS ccm_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    control_id VARCHAR(50) UNIQUE NOT NULL,
    domain VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    specification TEXT NOT NULL,
    implementation_guidance TEXT,
    assessment_guidance TEXT,
    control_type VARCHAR(50),
    control_category VARCHAR(100),
    risk_category VARCHAR(100),
    maturity_level INTEGER,
    applicable_services TEXT[],
    related_standards TEXT[],
    references TEXT[],
    version VARCHAR(20) DEFAULT '4.0',
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CCM Assessments
CREATE TABLE IF NOT EXISTS ccm_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    assessment_name VARCHAR(255) NOT NULL,
    assessment_date DATE NOT NULL,
    assessor_id UUID REFERENCES users(id),
    ccm_version VARCHAR(20) DEFAULT '4.0',
    scope TEXT,
    methodology TEXT,
    overall_score DECIMAL(5,2),
    maturity_level INTEGER,
    status VARCHAR(50) DEFAULT 'in_progress',
    findings_summary TEXT,
    recommendations TEXT,
    next_assessment_date DATE,
    report_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- CCM Evidence
CREATE TABLE IF NOT EXISTS ccm_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES ccm_assessments(id) ON DELETE CASCADE,
    control_id UUID REFERENCES ccm_controls(id) ON DELETE CASCADE,
    evidence_type VARCHAR(50), -- 'document', 'screenshot', 'configuration', 'report'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_name VARCHAR(255),
    file_path TEXT,
    file_size BIGINT,
    implementation_status VARCHAR(50), -- 'implemented', 'partially_implemented', 'not_implemented', 'not_applicable'
    effectiveness_rating INTEGER, -- 1-5 scale
    gaps_identified TEXT,
    remediation_plan TEXT,
    collected_date DATE,
    collected_by UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    review_date DATE,
    review_comments TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Risk Treatments
CREATE TABLE IF NOT EXISTS risk_treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_id UUID REFERENCES risks(id) ON DELETE CASCADE,
    treatment_type VARCHAR(50) NOT NULL, -- 'avoid', 'mitigate', 'transfer', 'accept'
    treatment_plan TEXT NOT NULL,
    responsible_party UUID REFERENCES users(id),
    implementation_date DATE,
    target_residual_score DECIMAL(5,2),
    actual_residual_score DECIMAL(5,2),
    cost_estimate DECIMAL(15,2),
    actual_cost DECIMAL(15,2),
    effectiveness_rating INTEGER, -- 1-5 scale
    status VARCHAR(50) DEFAULT 'planned',
    review_date DATE,
    review_comments TEXT,
    approval_status VARCHAR(50),
    approved_by UUID REFERENCES users(id),
    approved_date DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Risk Matrices
CREATE TABLE IF NOT EXISTS risk_matrices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organization_id UUID REFERENCES organizations(id),
    likelihood_levels JSONB NOT NULL, -- Array of likelihood levels with scores
    impact_levels JSONB NOT NULL, -- Array of impact levels with scores
    risk_levels JSONB NOT NULL, -- Risk level definitions based on scores
    color_scheme JSONB DEFAULT '{}',
    is_default BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Document Approvals
CREATE TABLE IF NOT EXISTS document_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES users(id),
    approval_level INTEGER, -- For multi-level approvals
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'recalled'
    comments TEXT,
    conditions TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    due_date DATE,
    reminder_sent BOOLEAN DEFAULT false,
    delegation_from UUID REFERENCES users(id),
    delegation_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL, -- 'email', 'sms', 'in_app', 'push'
    category VARCHAR(100) NOT NULL, -- 'assessment', 'work_order', 'risk', 'compliance', etc.
    enabled BOOLEAN DEFAULT true,
    frequency VARCHAR(50) DEFAULT 'immediate', -- 'immediate', 'daily', 'weekly', 'monthly'
    schedule_time TIME,
    schedule_days INTEGER[], -- Days of week (1-7) or days of month (1-31)
    filters JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, channel, category)
);

-- Report Templates
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    type VARCHAR(50), -- 'compliance', 'risk', 'assessment', 'executive', 'operational'
    format VARCHAR(20), -- 'pdf', 'excel', 'word', 'html'
    template_content TEXT,
    template_config JSONB DEFAULT '{}',
    data_sources JSONB DEFAULT '[]',
    parameters JSONB DEFAULT '[]',
    sections JSONB DEFAULT '[]',
    styling JSONB DEFAULT '{}',
    header_footer JSONB DEFAULT '{}',
    is_system BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    organization_id UUID REFERENCES organizations(id),
    version VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Integrations
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- 'api', 'webhook', 'database', 'file', 'email'
    provider VARCHAR(100), -- 'azure', 'aws', 'google', 'custom'
    configuration JSONB NOT NULL,
    credentials JSONB, -- Encrypted credentials
    status VARCHAR(50) DEFAULT 'inactive',
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_frequency VARCHAR(50), -- 'realtime', 'hourly', 'daily', 'weekly', 'monthly'
    sync_status VARCHAR(50),
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    last_error_at TIMESTAMP WITH TIME ZONE,
    organization_id UUID REFERENCES organizations(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    method VARCHAR(10) DEFAULT 'POST',
    headers JSONB DEFAULT '{}',
    events TEXT[] NOT NULL, -- Array of event types to trigger webhook
    active BOOLEAN DEFAULT true,
    secret_token VARCHAR(255), -- For webhook signature verification
    retry_count INTEGER DEFAULT 3,
    retry_delay INTEGER DEFAULT 60, -- seconds
    timeout INTEGER DEFAULT 30, -- seconds
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    last_status_code INTEGER,
    last_response TEXT,
    failure_count INTEGER DEFAULT 0,
    organization_id UUID REFERENCES organizations(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_regulatory_knowledge_base_authority ON regulatory_knowledge_base_enhanced(authority_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_knowledge_base_framework ON regulatory_knowledge_base_enhanced(framework_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_knowledge_base_control ON regulatory_knowledge_base_enhanced(control_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_knowledge_base_search ON regulatory_knowledge_base_enhanced USING gin(search_vector);

CREATE INDEX IF NOT EXISTS idx_regulatory_audit_trail_entity ON regulatory_audit_trail_enhanced(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_audit_trail_user ON regulatory_audit_trail_enhanced(user_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_audit_trail_created ON regulatory_audit_trail_enhanced(created_at);

CREATE INDEX IF NOT EXISTS idx_assessment_evidence_assessment ON assessment_evidence(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_evidence_response ON assessment_evidence(response_id);

CREATE INDEX IF NOT EXISTS idx_assessment_templates_framework ON assessment_templates(framework_id);
CREATE INDEX IF NOT EXISTS idx_assessment_templates_org ON assessment_templates(organization_id);

CREATE INDEX IF NOT EXISTS idx_work_order_assignments_order ON work_order_assignments(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_order_assignments_user ON work_order_assignments(assigned_to);

CREATE INDEX IF NOT EXISTS idx_ccm_controls_control_id ON ccm_controls(control_id);
CREATE INDEX IF NOT EXISTS idx_ccm_controls_domain ON ccm_controls(domain);

CREATE INDEX IF NOT EXISTS idx_ccm_assessments_org ON ccm_assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_ccm_assessments_date ON ccm_assessments(assessment_date);

CREATE INDEX IF NOT EXISTS idx_ccm_evidence_assessment ON ccm_evidence(assessment_id);
CREATE INDEX IF NOT EXISTS idx_ccm_evidence_control ON ccm_evidence(control_id);

CREATE INDEX IF NOT EXISTS idx_risk_treatments_risk ON risk_treatments(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_treatments_responsible ON risk_treatments(responsible_party);

CREATE INDEX IF NOT EXISTS idx_document_approvals_document ON document_approvals(document_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_approver ON document_approvals(approver_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_integrations_org ON integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);

CREATE INDEX IF NOT EXISTS idx_webhooks_org ON webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks USING gin(events);

-- Update search vectors
CREATE OR REPLACE FUNCTION update_regulatory_knowledge_search_vector()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_regulatory_knowledge_search
    BEFORE INSERT OR UPDATE ON regulatory_knowledge_base_enhanced
    FOR EACH ROW
    EXECUTE FUNCTION update_regulatory_knowledge_search_vector();

-- Add updated_at triggers
CREATE TRIGGER update_regulatory_knowledge_base_updated_at
    BEFORE UPDATE ON regulatory_knowledge_base_enhanced
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_evidence_updated_at
    BEFORE UPDATE ON assessment_evidence
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_templates_updated_at
    BEFORE UPDATE ON assessment_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_order_assignments_updated_at
    BEFORE UPDATE ON work_order_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ccm_controls_updated_at
    BEFORE UPDATE ON ccm_controls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ccm_assessments_updated_at
    BEFORE UPDATE ON ccm_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ccm_evidence_updated_at
    BEFORE UPDATE ON ccm_evidence
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_treatments_updated_at
    BEFORE UPDATE ON risk_treatments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_matrices_updated_at
    BEFORE UPDATE ON risk_matrices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_approvals_updated_at
    BEFORE UPDATE ON document_approvals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at
    BEFORE UPDATE ON report_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
    BEFORE UPDATE ON integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();