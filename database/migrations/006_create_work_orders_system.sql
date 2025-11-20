-- Enhanced Work Order Management System Schema
-- Migration: 006_create_work_orders_system.sql

-- Work Orders Main Table
CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('onboarding', 'evidence', 'ccm', 'risk', 'audit', 'vendor', 'general')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'in_progress', 'blocked', 'testing', 'completed', 'cancelled')),
    
    -- Assignment
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Time Tracking
    estimated_hours INTEGER DEFAULT 0,
    actual_hours INTEGER DEFAULT 0,
    start_date TIMESTAMP,
    due_date TIMESTAMP,
    completion_date TIMESTAMP,
    
    -- SLA Metrics
    response_time_minutes INTEGER DEFAULT 0,
    resolution_time_hours INTEGER DEFAULT 0,
    escalation_level INTEGER DEFAULT 0,
    sla_breached BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- Search optimization
    search_vector tsvector
);

-- Work Order Dependencies
CREATE TABLE IF NOT EXISTS work_order_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    depends_on_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'blocks' CHECK (dependency_type IN ('blocks', 'triggers', 'parallel', 'prerequisite')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(work_order_id, depends_on_id)
);

-- Work Order Blockers
CREATE TABLE IF NOT EXISTS work_order_blockers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    blocker_type VARCHAR(50) DEFAULT 'technical' CHECK (blocker_type IN ('technical', 'resource', 'approval', 'external', 'other')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT
);

-- Work Order Acceptance Criteria
CREATE TABLE IF NOT EXISTS work_order_acceptance_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    criterion TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'failed', 'skipped')),
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP,
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Work Order Artifacts
CREATE TABLE IF NOT EXISTS work_order_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64),
    metadata JSONB DEFAULT '{}'
);

-- Work Order Comments
CREATE TABLE IF NOT EXISTS work_order_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    comment TEXT NOT NULL,
    comment_type VARCHAR(50) DEFAULT 'general' CHECK (comment_type IN ('general', 'status_update', 'blocker', 'resolution', 'review')),
    parent_comment_id UUID REFERENCES work_order_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited BOOLEAN DEFAULT FALSE
);

-- Work Order Templates
CREATE TABLE IF NOT EXISTS work_order_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    template_data JSONB NOT NULL,
    checklist JSONB DEFAULT '[]',
    automation_rules JSONB DEFAULT '{}',
    quality_gates JSONB DEFAULT '[]',
    estimated_hours INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Work Order Automation Rules
CREATE TABLE IF NOT EXISTS work_order_automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    trigger_event VARCHAR(100) NOT NULL,
    trigger_conditions JSONB DEFAULT '{}',
    actions JSONB NOT NULL,
    template_id UUID REFERENCES work_order_templates(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Work Order Analytics
CREATE TABLE IF NOT EXISTS work_order_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC,
    metric_data JSONB DEFAULT '{}',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE
);

-- Work Order History (Audit Trail)
CREATE TABLE IF NOT EXISTS work_order_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    old_values JSONB,
    new_values JSONB,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Indexes for Performance
CREATE INDEX idx_work_orders_status ON work_orders(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_work_orders_assignee ON work_orders(assignee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_work_orders_organization ON work_orders(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_work_orders_category ON work_orders(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_work_orders_priority ON work_orders(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_work_orders_due_date ON work_orders(due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_work_orders_created_at ON work_orders(created_at DESC);
CREATE INDEX idx_work_orders_search ON work_orders USING gin(search_vector);

CREATE INDEX idx_wo_dependencies_work_order ON work_order_dependencies(work_order_id);
CREATE INDEX idx_wo_dependencies_depends_on ON work_order_dependencies(depends_on_id);
CREATE INDEX idx_wo_blockers_work_order ON work_order_blockers(work_order_id);
CREATE INDEX idx_wo_blockers_unresolved ON work_order_blockers(work_order_id) WHERE resolved_at IS NULL;
CREATE INDEX idx_wo_comments_work_order ON work_order_comments(work_order_id, created_at DESC);
CREATE INDEX idx_wo_artifacts_work_order ON work_order_artifacts(work_order_id);
CREATE INDEX idx_wo_history_work_order ON work_order_history(work_order_id, changed_at DESC);
CREATE INDEX idx_wo_analytics_organization ON work_order_analytics(organization_id, recorded_at DESC);

-- Full-text search trigger
CREATE OR REPLACE FUNCTION work_orders_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.category, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_orders_search_update 
    BEFORE INSERT OR UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION work_orders_search_trigger();

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_work_orders_timestamp() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_orders_updated_at 
    BEFORE UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION update_work_orders_timestamp();

-- Insert sample work order templates
INSERT INTO work_order_templates (name, category, description, template_data, checklist, automation_rules, quality_gates, estimated_hours) VALUES
('Client Onboarding', 'onboarding', 'Complete client onboarding process', 
'{"steps": ["organization_creation", "user_setup", "framework_linking", "scope_definition"]}',
'[
    {"task": "Create organization", "api": "POST /api/organizations", "required": true},
    {"task": "Setup user roles", "api": "POST /api/organizations/{id}/users", "required": true},
    {"task": "Link frameworks", "api": "POST /api/organizations/{id}/frameworks", "required": true},
    {"task": "Define scope", "api": "POST /api/organizations/{id}/scope", "required": false}
]',
'{"email_notifications": true, "slack_integration": true, "auto_testing": true}',
'[
    {"gate": "Functional Test", "required": true},
    {"gate": "Security Scan", "required": true},
    {"gate": "Performance Check", "required": false}
]',
40),

('Evidence Collection', 'evidence', 'Evidence lifecycle management setup',
'{"steps": ["evidence_repository", "collection_rules", "review_workflow"]}',
'[
    {"task": "Setup evidence repository", "required": true},
    {"task": "Configure collection rules", "required": true},
    {"task": "Setup review workflow", "required": true}
]',
'{"auto_classification": true, "duplicate_detection": true}',
'[{"gate": "Evidence Validation", "required": true}]',
24),

('Risk Assessment', 'risk', 'Comprehensive risk assessment workflow',
'{"steps": ["risk_identification", "risk_analysis", "mitigation_planning"]}',
'[
    {"task": "Identify risks", "required": true},
    {"task": "Analyze impact", "required": true},
    {"task": "Plan mitigation", "required": true}
]',
'{"auto_risk_scoring": true, "compliance_mapping": true}',
'[{"gate": "Risk Review", "required": true}]',
32),

('Audit Room Setup', 'audit', 'Audit room configuration and preparation',
'{"steps": ["audit_scope", "evidence_collection", "stakeholder_assignment"]}',
'[
    {"task": "Define audit scope", "required": true},
    {"task": "Collect evidence", "required": true},
    {"task": "Assign stakeholders", "required": true}
]',
'{"auto_evidence_linking": true, "compliance_validation": true}',
'[{"gate": "Audit Readiness", "required": true}]',
48);

-- Insert sample automation rules
INSERT INTO work_order_automation_rules (name, trigger_event, trigger_conditions, actions, is_active, priority) VALUES
('Auto-create Evidence WO on Onboarding', 'work_order.completed', 
'{"category": "onboarding"}',
'{"create_work_order": {"category": "evidence", "title": "Evidence Setup for {org_name}", "template": "Evidence Collection"}}',
true, 1),

('Auto-create Risk Assessment on Onboarding', 'work_order.completed',
'{"category": "onboarding"}',
'{"create_work_order": {"category": "risk", "title": "Risk Assessment for {org_name}", "template": "Risk Assessment"}}',
true, 2),

('Escalate Overdue Critical WOs', 'work_order.overdue',
'{"priority": "critical"}',
'{"escalate": {"notify": ["manager", "admin"], "escalation_level": 2}}',
true, 10),

('Auto-assign CCM Rules', 'evidence.uploaded',
'{}',
'{"create_work_order": {"category": "ccm", "title": "Review Evidence: {evidence_name}"}}',
true, 5);

COMMENT ON TABLE work_orders IS 'Main work orders tracking table';
COMMENT ON TABLE work_order_dependencies IS 'Work order dependency relationships';
COMMENT ON TABLE work_order_blockers IS 'Active and resolved blockers for work orders';
COMMENT ON TABLE work_order_templates IS 'Reusable work order templates with automation';
COMMENT ON TABLE work_order_automation_rules IS 'Trigger-based automation rules for work orders';
COMMENT ON TABLE work_order_analytics IS 'Analytics and metrics for work order performance';