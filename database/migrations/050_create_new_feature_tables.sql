-- =====================================================
-- NEW FEATURE TABLES FOR FRONTEND COMPONENTS
-- Supporting Evidence Management, Notifications, Workflows, etc.
-- =====================================================

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL DEFAULT 'info', -- info, warning, error, deadline, compliance, workflow
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'unread', -- unread, read, archived
    priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high, critical
    deadline TIMESTAMPTZ,
    control_id VARCHAR(50),
    framework_id VARCHAR(50),
    action_required BOOLEAN DEFAULT false,
    action_url TEXT,
    metadata JSONB DEFAULT '{}',
    scheduled_for TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template VARCHAR(100), -- compliance_review, evidence_approval, risk_mitigation
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, active, paused, completed, failed
    priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high, critical
    assignee INTEGER REFERENCES users(id),
    due_date TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    paused_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow steps table
CREATE TABLE IF NOT EXISTS workflow_steps (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    assignee INTEGER REFERENCES users(id),
    duration_days INTEGER DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, active, completed, skipped
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workflow_id, step_order)
);

-- Approvals table
CREATE TABLE IF NOT EXISTS approvals (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES workflows(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'general', -- compliance, evidence, risk, general
    priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- low, medium, high, critical
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, cancelled
    requester INTEGER NOT NULL REFERENCES users(id),
    approver INTEGER NOT NULL REFERENCES users(id),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    details JSONB DEFAULT '{}',
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced risks table (if not exists)
CREATE TABLE IF NOT EXISTS risks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL, -- Operational, Financial, Strategic, Compliance, Technology, Reputational, Environmental, Legal
    probability INTEGER NOT NULL CHECK (probability >= 1 AND probability <= 5), -- 1-5 scale
    impact INTEGER NOT NULL CHECK (impact >= 1 AND impact <= 5), -- 1-5 scale
    risk_score INTEGER GENERATED ALWAYS AS (probability * impact) STORED,
    risk_level VARCHAR(20) GENERATED ALWAYS AS (
        CASE 
            WHEN (probability * impact) >= 15 THEN 'Critical'
            WHEN (probability * impact) >= 10 THEN 'High'
            WHEN (probability * impact) >= 6 THEN 'Medium'
            WHEN (probability * impact) >= 3 THEN 'Low'
            ELSE 'Very Low'
        END
    ) STORED,
    status VARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, Mitigated, Accepted, Transferred
    owner INTEGER REFERENCES users(id),
    mitigation_plan TEXT,
    last_assessed TIMESTAMPTZ DEFAULT NOW(),
    next_review TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk mitigations table
CREATE TABLE IF NOT EXISTS risk_mitigations (
    id SERIAL PRIMARY KEY,
    risk_id INTEGER NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'planned', -- planned, in_progress, completed, cancelled
    assigned_to INTEGER REFERENCES users(id),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
    cost_estimate DECIMAL(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboards table
CREATE TABLE IF NOT EXISTS dashboards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    layout VARCHAR(50) NOT NULL DEFAULT 'grid', -- grid, list, custom
    is_default BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboard widgets table
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id SERIAL PRIMARY KEY,
    dashboard_id INTEGER NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL, -- compliance_score, risk_distribution, compliance_trend, framework_status, etc.
    title VARCHAR(255) NOT NULL,
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    position_w INTEGER DEFAULT 4,
    position_h INTEGER DEFAULT 3,
    position_order INTEGER DEFAULT 0,
    config JSONB DEFAULT '{}', -- Widget configuration
    data JSONB DEFAULT '{}', -- Widget data cache
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced evidence table (if not exists or needs updates)
CREATE TABLE IF NOT EXISTS evidence (
    id SERIAL PRIMARY KEY,
    control_id VARCHAR(50) NOT NULL,
    framework_id VARCHAR(50),
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    file_path TEXT NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT,
    description TEXT,
    tags TEXT[],
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    approved_by INTEGER REFERENCES users(id),
    ocr_text TEXT, -- For searchable text from documents
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_deadline ON notifications(deadline);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Workflows indexes
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_assignee ON workflows(assignee);
CREATE INDEX IF NOT EXISTS idx_workflows_due_date ON workflows(due_date);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at DESC);

-- Workflow steps indexes
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_status ON workflow_steps(status);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_assignee ON workflow_steps(assignee);

-- Approvals indexes
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_approver ON approvals(approver);
CREATE INDEX IF NOT EXISTS idx_approvals_requester ON approvals(requester);
CREATE INDEX IF NOT EXISTS idx_approvals_due_date ON approvals(due_date);

-- Risks indexes
CREATE INDEX IF NOT EXISTS idx_risks_category ON risks(category);
CREATE INDEX IF NOT EXISTS idx_risks_risk_level ON risks(risk_level);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
CREATE INDEX IF NOT EXISTS idx_risks_owner ON risks(owner);
CREATE INDEX IF NOT EXISTS idx_risks_next_review ON risks(next_review);

-- Risk mitigations indexes
CREATE INDEX IF NOT EXISTS idx_risk_mitigations_risk_id ON risk_mitigations(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_mitigations_status ON risk_mitigations(status);
CREATE INDEX IF NOT EXISTS idx_risk_mitigations_assigned_to ON risk_mitigations(assigned_to);

-- Dashboards indexes
CREATE INDEX IF NOT EXISTS idx_dashboards_created_by ON dashboards(created_by);
CREATE INDEX IF NOT EXISTS idx_dashboards_is_default ON dashboards(is_default);
CREATE INDEX IF NOT EXISTS idx_dashboards_is_public ON dashboards(is_public);

-- Dashboard widgets indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_dashboard_id ON dashboard_widgets(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_type ON dashboard_widgets(type);

-- Evidence indexes
CREATE INDEX IF NOT EXISTS idx_evidence_control_id ON evidence(control_id);
CREATE INDEX IF NOT EXISTS idx_evidence_framework_id ON evidence(framework_id);
CREATE INDEX IF NOT EXISTS idx_evidence_status ON evidence(status);
CREATE INDEX IF NOT EXISTS idx_evidence_uploaded_by ON evidence(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_evidence_uploaded_at ON evidence(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_tags ON evidence USING GIN(tags);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_evidence_filename_search ON evidence USING GIN(to_tsvector('english', filename));
CREATE INDEX IF NOT EXISTS idx_evidence_description_search ON evidence USING GIN(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_evidence_ocr_text_search ON evidence USING GIN(to_tsvector('english', ocr_text));

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_steps_updated_at BEFORE UPDATE ON workflow_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_approvals_updated_at BEFORE UPDATE ON approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_risks_updated_at BEFORE UPDATE ON risks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_risk_mitigations_updated_at BEFORE UPDATE ON risk_mitigations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dashboards_updated_at BEFORE UPDATE ON dashboards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dashboard_widgets_updated_at BEFORE UPDATE ON dashboard_widgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_evidence_updated_at BEFORE UPDATE ON evidence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample notifications
INSERT INTO notifications (user_id, type, title, message, priority, deadline, action_required) VALUES
(1, 'deadline', 'SAMA Compliance Deadline', 'SAMA-001 control implementation due in 3 days', 'high', NOW() + INTERVAL '3 days', true),
(1, 'compliance', 'CMA Assessment Completed', 'CMA-002 control has been successfully implemented', 'medium', NULL, false),
(1, 'warning', 'Evidence Upload Required', 'Missing evidence for CITC-003 control', 'high', NOW() + INTERVAL '5 days', true)
ON CONFLICT DO NOTHING;

-- Insert sample workflows
INSERT INTO workflows (name, description, template, status, priority, assignee, due_date, created_by) VALUES
('SAMA Compliance Review', 'Review SAMA compliance controls', 'compliance_review', 'active', 'high', 1, NOW() + INTERVAL '7 days', 1),
('Evidence Document Approval', 'Approve uploaded evidence documents', 'evidence_approval', 'pending', 'medium', 1, NOW() + INTERVAL '3 days', 1)
ON CONFLICT DO NOTHING;

-- Insert sample risks
INSERT INTO risks (title, description, category, probability, impact, owner, mitigation_plan, next_review, created_by) VALUES
('Data Breach Risk', 'Risk of unauthorized access to sensitive compliance data', 'Technology', 3, 4, 1, 'Implement multi-factor authentication and encryption', NOW() + INTERVAL '90 days', 1),
('Regulatory Non-Compliance', 'Risk of failing to meet SAMA regulatory requirements', 'Compliance', 2, 5, 1, 'Regular compliance audits and training programs', NOW() + INTERVAL '60 days', 1),
('Operational Disruption', 'Risk of business process interruption', 'Operational', 2, 3, 1, 'Business continuity planning and backup systems', NOW() + INTERVAL '120 days', 1)
ON CONFLICT DO NOTHING;

-- Insert sample dashboards
INSERT INTO dashboards (name, description, is_default, created_by) VALUES
('Executive Overview', 'High-level compliance metrics for executives', true, 1),
('Risk Management', 'Detailed risk analysis and trends', false, 1),
('Operational Dashboard', 'Day-to-day operational metrics', false, 1)
ON CONFLICT DO NOTHING;
