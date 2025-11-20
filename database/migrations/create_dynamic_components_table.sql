-- Dynamic Components Management Schema
-- Stores registration and configuration data for all dynamic UI components

-- Drop existing table if it exists
DROP TABLE IF EXISTS dynamic_components CASCADE;

-- Create dynamic_components table
CREATE TABLE dynamic_components (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    roles JSONB DEFAULT '[]'::jsonb,
    permissions JSONB DEFAULT '[]'::jsonb,
    features JSONB DEFAULT '[]'::jsonb,
    guidance JSONB DEFAULT '{}'::jsonb,
    tooltips JSONB DEFAULT '{}'::jsonb,
    api_endpoints JSONB DEFAULT '[]'::jsonb,
    required_services JSONB DEFAULT '[]'::jsonb,
    database_tables JSONB DEFAULT '[]'::jsonb,
    priority INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active',
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_validated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    validation_errors JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_dynamic_components_category ON dynamic_components(category);
CREATE INDEX idx_dynamic_components_status ON dynamic_components(status);
CREATE INDEX idx_dynamic_components_priority ON dynamic_components(priority);
CREATE INDEX idx_dynamic_components_roles ON dynamic_components USING GIN(roles);
CREATE INDEX idx_dynamic_components_permissions ON dynamic_components USING GIN(permissions);
CREATE INDEX idx_dynamic_components_features ON dynamic_components USING GIN(features);

-- Create component_dependencies table to track relationships
CREATE TABLE component_dependencies (
    id SERIAL PRIMARY KEY,
    component_id VARCHAR(255) REFERENCES dynamic_components(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) NOT NULL, -- 'service', 'route', 'table', 'component'
    dependency_name VARCHAR(255) NOT NULL,
    dependency_status VARCHAR(50) DEFAULT 'unknown',
    last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_component_dependencies_component ON component_dependencies(component_id);
CREATE INDEX idx_component_dependencies_type ON component_dependencies(dependency_type);
CREATE INDEX idx_component_dependencies_status ON component_dependencies(dependency_status);

-- Create component_usage_stats table for analytics
CREATE TABLE component_usage_stats (
    id SERIAL PRIMARY KEY,
    component_id VARCHAR(255) REFERENCES dynamic_components(id) ON DELETE CASCADE,
    user_id INTEGER,
    organization_id INTEGER,
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_duration INTEGER DEFAULT 0, -- in seconds
    error_count INTEGER DEFAULT 0,
    performance_metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_component_usage_component ON component_usage_stats(component_id);
CREATE INDEX idx_component_usage_user ON component_usage_stats(user_id);
CREATE INDEX idx_component_usage_org ON component_usage_stats(organization_id);
CREATE INDEX idx_component_usage_accessed ON component_usage_stats(last_accessed);

-- Create component_health_checks table
CREATE TABLE component_health_checks (
    id SERIAL PRIMARY KEY,
    component_id VARCHAR(255) REFERENCES dynamic_components(id) ON DELETE CASCADE,
    check_type VARCHAR(50) NOT NULL, -- 'api', 'service', 'database', 'dependency'
    check_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'healthy', 'unhealthy', 'warning', 'unknown'
    response_time INTEGER, -- in milliseconds
    error_message TEXT,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_component_health_component ON component_health_checks(component_id);
CREATE INDEX idx_component_health_type ON component_health_checks(check_type);
CREATE INDEX idx_component_health_status ON component_health_checks(status);
CREATE INDEX idx_component_health_checked ON component_health_checks(checked_at);

-- Insert initial component registrations
INSERT INTO dynamic_components (
    id, name, description, category, roles, permissions, features, 
    guidance, tooltips, api_endpoints, required_services, database_tables, priority
) VALUES 
-- Admin Components
(
    'admin.admin_cards',
    'Admin Card System',
    'Enhanced card-based admin interface with real-time metrics',
    'admin',
    '["admin", "super_admin"]'::jsonb,
    '["admin:cards", "admin:manage"]'::jsonb,
    '["real-time-metrics", "card-interface", "system-control"]'::jsonb,
    '{
        "purpose": "Centralized admin dashboard with interactive cards for system management",
        "usage": "Click cards to access different admin functions. Real-time data updates automatically.",
        "tips": ["Use the refresh button to manually update metrics", "Hover over cards for detailed information", "Click and drag to rearrange card layout"],
        "prerequisites": ["admin role", "system access permissions"],
        "relatedComponents": ["system_health", "comprehensive_admin"]
    }'::jsonb,
    '{
        "main": "Interactive admin dashboard with real-time system metrics",
        "cards": "Each card represents a different admin function - click to access",
        "metrics": "Live data updates every 30 seconds automatically",
        "actions": "Available actions depend on your admin permissions"
    }'::jsonb,
    '["/api/admin/cards", "/api/admin/metrics", "/api/admin/status"]'::jsonb,
    '["adminService", "metricsService", "systemHealthService"]'::jsonb,
    '["admin_cards", "system_metrics", "admin_actions"]'::jsonb,
    10
),
-- Assessment Components
(
    'assessment.compliance_assessment',
    'Compliance Assessment Module',
    'Complete compliance assessment management with real database integration',
    'assessment',
    '["admin", "compliance_manager", "compliance_officer", "auditor"]'::jsonb,
    '["assessment:manage", "assessment:view", "grc:access", "compliance:manage"]'::jsonb,
    '["assessment-management", "compliance-tracking", "real-database", "framework-support"]'::jsonb,
    '{
        "purpose": "Comprehensive assessment lifecycle management from creation to completion",
        "usage": "Create, execute, and manage compliance assessments with full workflow support",
        "tips": ["Use templates for consistent assessments", "Track progress with real-time dashboards", "Collect evidence systematically"],
        "prerequisites": ["compliance role", "assessment permissions", "organization assignment"],
        "relatedComponents": ["evidence_management", "approval_workflow", "assessment_data"]
    }'::jsonb,
    '{
        "main": "Complete assessment management with workflow automation",
        "creation": "Use smart forms and templates for consistent assessment creation",
        "execution": "Track progress, collect evidence, and manage responses",
        "reporting": "Generate comprehensive reports and analytics"
    }'::jsonb,
    '["/api/assessments", "/api/assessment-templates", "/api/assessment-responses", "/api/assessment-evidence"]'::jsonb,
    '["assessmentService", "workflowService", "evidenceService", "reportingService"]'::jsonb,
    '["assessments", "assessment_templates", "assessment_responses", "assessment_evidence", "workflows"]'::jsonb,
    1
),
-- Workflow Components
(
    'forms_workflow.approval_workflow',
    'Approval Workflow System',
    'Multi-level approval workflows with role-based routing and real database tracking',
    'workflow',
    '["admin", "manager", "compliance_manager", "compliance_officer"]'::jsonb,
    '["approval:manage", "workflow:approve", "process:control"]'::jsonb,
    '["multi-level-approval", "role-based-routing", "workflow-tracking", "real-database"]'::jsonb,
    '{
        "purpose": "Automated approval workflows with configurable routing and escalation",
        "usage": "Configure approval chains, route requests, and track approval status",
        "tips": ["Set up approval matrices for different request types", "Use escalation rules for overdue approvals", "Monitor workflow performance"],
        "prerequisites": ["manager role", "approval permissions", "workflow configuration"],
        "relatedComponents": ["authority_matrix", "workflow_manager", "organizational_hierarchy"]
    }'::jsonb,
    '{
        "main": "Automated approval workflows with intelligent routing",
        "routing": "Requests are routed based on configured approval matrices",
        "escalation": "Automatic escalation for overdue approvals",
        "tracking": "Real-time status tracking and notifications"
    }'::jsonb,
    '["/api/approvals", "/api/workflows", "/api/workflow-instances", "/api/workflow-steps"]'::jsonb,
    '["workflowService", "approvalService", "notificationService", "organizationalService"]'::jsonb,
    '["approvals", "workflows", "workflow_instances", "workflow_steps", "authority_matrix"]'::jsonb,
    5
);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dynamic_components_updated_at 
    BEFORE UPDATE ON dynamic_components 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_component_usage_stats_updated_at 
    BEFORE UPDATE ON component_usage_stats 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for easier querying
CREATE VIEW v_component_health AS
SELECT 
    dc.id,
    dc.name,
    dc.category,
    dc.status,
    COUNT(chc.id) as total_checks,
    COUNT(CASE WHEN chc.status = 'healthy' THEN 1 END) as healthy_checks,
    COUNT(CASE WHEN chc.status = 'unhealthy' THEN 1 END) as unhealthy_checks,
    MAX(chc.checked_at) as last_health_check
FROM dynamic_components dc
LEFT JOIN component_health_checks chc ON dc.id = chc.component_id
GROUP BY dc.id, dc.name, dc.category, dc.status;

CREATE VIEW v_component_usage AS
SELECT 
    dc.id,
    dc.name,
    dc.category,
    COALESCE(SUM(cus.access_count), 0) as total_access_count,
    COALESCE(AVG(cus.session_duration), 0) as avg_session_duration,
    COALESCE(SUM(cus.error_count), 0) as total_error_count,
    MAX(cus.last_accessed) as last_accessed
FROM dynamic_components dc
LEFT JOIN component_usage_stats cus ON dc.id = cus.component_id
GROUP BY dc.id, dc.name, dc.category;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON dynamic_components TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON component_dependencies TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON component_usage_stats TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON component_health_checks TO postgres;
GRANT SELECT ON v_component_health TO postgres;
GRANT SELECT ON v_component_usage TO postgres;
GRANT USAGE ON SEQUENCE component_dependencies_id_seq TO postgres;
GRANT USAGE ON SEQUENCE component_usage_stats_id_seq TO postgres;
GRANT USAGE ON SEQUENCE component_health_checks_id_seq TO postgres;
