-- Migration: Create Dashboard Functions
-- Description: Creates PostgreSQL functions to support dashboard statistics and analytics
-- Date: 2025-01-06

-- Drop existing functions if they exist (to handle upgrades)
DROP FUNCTION IF EXISTS dashboard_counts(INTEGER);
DROP FUNCTION IF EXISTS dashboard_compliance_scores(INTEGER);
DROP FUNCTION IF EXISTS dashboard_assessment_status(INTEGER);
DROP FUNCTION IF EXISTS dashboard_task_status(INTEGER);
DROP FUNCTION IF EXISTS dashboard_workflow_status(INTEGER);
DROP FUNCTION IF EXISTS dashboard_recent_activity(INTEGER);
DROP FUNCTION IF EXISTS dashboard_overdue_items(INTEGER);
DROP FUNCTION IF EXISTS dashboard_monthly_trends(INTEGER);
DROP FUNCTION IF EXISTS dashboard_compliance_overview(INTEGER);
DROP FUNCTION IF EXISTS dashboard_risk_overview(INTEGER);
DROP FUNCTION IF EXISTS dashboard_team_overview(INTEGER);

-- Function: dashboard_counts
-- Returns: Basic counts for dashboard overview
CREATE OR REPLACE FUNCTION dashboard_counts(org_id UUID DEFAULT NULL)
RETURNS TABLE (
  total_organizations INTEGER,
  total_users INTEGER,
  total_frameworks INTEGER,
  total_controls INTEGER,
  total_assessments INTEGER,
  total_risks INTEGER,
  total_evidence INTEGER,
  total_audits INTEGER,
  total_vendors INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM organizations WHERE org_id IS NULL OR id = org_id) as total_organizations,
    (SELECT COUNT(*)::INTEGER FROM users WHERE org_id IS NULL OR organization_id = org_id) as total_users,
    (SELECT COUNT(*)::INTEGER FROM regulatory_frameworks_enhanced) as total_frameworks,
    (SELECT COUNT(*)::INTEGER FROM regulatory_controls_enhanced) as total_controls,
    (SELECT COUNT(*)::INTEGER FROM assessments WHERE org_id IS NULL OR organization_id = org_id) as total_assessments,
    (SELECT COUNT(*)::INTEGER FROM risks WHERE org_id IS NULL OR organization_id = org_id) as total_risks,
    (SELECT COUNT(*)::INTEGER FROM evidence WHERE org_id IS NULL OR organization_id = org_id) as total_evidence,
    (SELECT COUNT(*)::INTEGER FROM audit_engagements WHERE org_id IS NULL OR organization_id = org_id) as total_audits,
    (SELECT COUNT(*)::INTEGER FROM vendor_profiles WHERE org_id IS NULL OR organization_id = org_id) as total_vendors;
END;
$$ LANGUAGE plpgsql;

-- Function: dashboard_compliance_scores
-- Returns: Compliance scores by framework
CREATE OR REPLACE FUNCTION dashboard_compliance_scores(org_id UUID DEFAULT NULL)
RETURNS TABLE (
  framework_id INTEGER,
  framework_code VARCHAR,
  framework_name VARCHAR,
  compliance_score NUMERIC,
  total_controls INTEGER,
  implemented_controls INTEGER,
  last_updated TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id as framework_id,
    f.framework_code,
    f.framework_name,
    CASE 
      WHEN COUNT(c.id) > 0 THEN 
        ROUND((COUNT(CASE WHEN c.is_active = true THEN 1 END)::NUMERIC / COUNT(c.id)::NUMERIC) * 100, 2)
      ELSE 0
    END as compliance_score,
    COUNT(c.id)::INTEGER as total_controls,
    COUNT(CASE WHEN c.is_active = true THEN 1 END)::INTEGER as implemented_controls,
    MAX(c.updated_at) as last_updated
  FROM regulatory_frameworks_enhanced f
  LEFT JOIN regulatory_controls_enhanced c ON c.framework_id = f.id
  WHERE f.is_active = true
  GROUP BY f.id, f.framework_code, f.framework_name
  ORDER BY compliance_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: dashboard_assessment_status
-- Returns: Assessment status breakdown
CREATE OR REPLACE FUNCTION dashboard_assessment_status(org_id UUID DEFAULT NULL)
RETURNS TABLE (
  status VARCHAR,
  count INTEGER,
  percentage NUMERIC
) AS $$
DECLARE
  total_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO total_count 
  FROM assessments 
  WHERE org_id IS NULL OR organization_id = org_id;

  RETURN QUERY
  SELECT
    COALESCE(a.status, 'unknown')::VARCHAR as status,
    COUNT(*)::INTEGER as count,
    CASE 
      WHEN total_count > 0 THEN ROUND((COUNT(*)::NUMERIC / total_count::NUMERIC) * 100, 2)
      ELSE 0
    END as percentage
  FROM assessments a
  WHERE org_id IS NULL OR a.organization_id = org_id
  GROUP BY a.status
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: dashboard_task_status
-- Returns: Task status breakdown
CREATE OR REPLACE FUNCTION dashboard_task_status(org_id UUID DEFAULT NULL)
RETURNS TABLE (
  status VARCHAR,
  count INTEGER,
  percentage NUMERIC
) AS $$
DECLARE
  total_count INTEGER;
BEGIN
  -- Check if tasks table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    SELECT COUNT(*)::INTEGER INTO total_count 
    FROM tasks 
    WHERE org_id IS NULL OR organization_id = org_id;

    RETURN QUERY
    SELECT
      COALESCE(t.status, 'unknown')::VARCHAR as status,
      COUNT(*)::INTEGER as count,
      CASE 
        WHEN total_count > 0 THEN ROUND((COUNT(*)::NUMERIC / total_count::NUMERIC) * 100, 2)
        ELSE 0
      END as percentage
    FROM tasks t
    WHERE org_id IS NULL OR t.organization_id = org_id
    GROUP BY t.status
    ORDER BY count DESC;
  ELSE
    -- Return empty result if table doesn't exist
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: dashboard_workflow_status
-- Returns: Workflow status breakdown
CREATE OR REPLACE FUNCTION dashboard_workflow_status(org_id UUID DEFAULT NULL)
RETURNS TABLE (
  status VARCHAR,
  count INTEGER,
  percentage NUMERIC
) AS $$
DECLARE
  total_count INTEGER;
BEGIN
  -- Check if workflows table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflows') THEN
    SELECT COUNT(*)::INTEGER INTO total_count 
    FROM workflows 
    WHERE org_id IS NULL OR organization_id = org_id;

    RETURN QUERY
    SELECT
      COALESCE(w.status, 'unknown')::VARCHAR as status,
      COUNT(*)::INTEGER as count,
      CASE 
        WHEN total_count > 0 THEN ROUND((COUNT(*)::NUMERIC / total_count::NUMERIC) * 100, 2)
        ELSE 0
      END as percentage
    FROM workflows w
    WHERE org_id IS NULL OR w.organization_id = org_id
    GROUP BY w.status
    ORDER BY count DESC;
  ELSE
    -- Return empty result if table doesn't exist
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: dashboard_recent_activity
-- Returns: Recent activity from audit logs
CREATE OR REPLACE FUNCTION dashboard_recent_activity(org_id UUID DEFAULT NULL)
RETURNS TABLE (
  id INTEGER,
  action VARCHAR,
  table_name VARCHAR,
  user_id INTEGER,
  user_email VARCHAR,
  created_at TIMESTAMP,
  details JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.action::VARCHAR,
    a.table_name::VARCHAR,
    a.user_id,
    u.email::VARCHAR as user_email,
    a.created_at,
    a.changes as details
  FROM audit_logs a
  LEFT JOIN users u ON u.id = a.user_id
  WHERE org_id IS NULL OR u.organization_id = org_id
  ORDER BY a.created_at DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function: dashboard_overdue_items
-- Returns: Overdue assessments and tasks
CREATE OR REPLACE FUNCTION dashboard_overdue_items(org_id UUID DEFAULT NULL)
RETURNS TABLE (
  item_type VARCHAR,
  item_id INTEGER,
  item_name VARCHAR,
  due_date TIMESTAMP,
  days_overdue INTEGER,
  assigned_to INTEGER,
  assigned_to_email VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'assessment'::VARCHAR as item_type,
    a.id as item_id,
    a.name::VARCHAR as item_name,
    a.due_date,
    EXTRACT(DAY FROM NOW() - a.due_date)::INTEGER as days_overdue,
    a.assigned_to,
    u.email::VARCHAR as assigned_to_email
  FROM assessments a
  LEFT JOIN users u ON u.id = a.assigned_to
  WHERE a.due_date < NOW()
    AND a.status NOT IN ('completed', 'cancelled')
    AND (org_id IS NULL OR a.organization_id = org_id)
  ORDER BY a.due_date ASC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function: dashboard_monthly_trends
-- Returns: Monthly compliance trends for the last 6 months
CREATE OR REPLACE FUNCTION dashboard_monthly_trends(org_id UUID DEFAULT NULL)
RETURNS TABLE (
  month_name VARCHAR,
  month_date DATE,
  nca_score NUMERIC,
  sama_score NUMERIC,
  pdpl_score NUMERIC,
  overall_score NUMERIC,
  total_assessments INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_data AS (
    SELECT
      TO_CHAR(a.created_at, 'Mon') as month_name,
      DATE_TRUNC('month', a.created_at)::DATE as month_date,
      a.framework_id,
      f.framework_code,
      COUNT(*)::INTEGER as assessment_count,
      AVG(CASE WHEN a.status = 'completed' THEN 100 ELSE 50 END)::NUMERIC as avg_score
    FROM assessments a
    LEFT JOIN regulatory_frameworks_enhanced f ON f.id = a.framework_id
    WHERE a.created_at >= NOW() - INTERVAL '6 months'
      AND (org_id IS NULL OR a.organization_id = org_id)
    GROUP BY DATE_TRUNC('month', a.created_at), a.framework_id, f.framework_code
  )
  SELECT
    md.month_name::VARCHAR,
    md.month_date,
    COALESCE(MAX(CASE WHEN LOWER(md.framework_code) LIKE '%nca%' THEN md.avg_score END), 0)::NUMERIC as nca_score,
    COALESCE(MAX(CASE WHEN LOWER(md.framework_code) LIKE '%sama%' THEN md.avg_score END), 0)::NUMERIC as sama_score,
    COALESCE(MAX(CASE WHEN LOWER(md.framework_code) LIKE '%pdpl%' THEN md.avg_score END), 0)::NUMERIC as pdpl_score,
    COALESCE(AVG(md.avg_score), 0)::NUMERIC as overall_score,
    SUM(md.assessment_count)::INTEGER as total_assessments
  FROM monthly_data md
  GROUP BY md.month_name, md.month_date
  ORDER BY md.month_date DESC
  LIMIT 6;
END;
$$ LANGUAGE plpgsql;

-- Function: dashboard_compliance_overview
-- Returns: Comprehensive compliance overview
CREATE OR REPLACE FUNCTION dashboard_compliance_overview(org_id UUID DEFAULT NULL)
RETURNS TABLE (
  framework_code VARCHAR,
  framework_name VARCHAR,
  total_controls INTEGER,
  implemented_controls INTEGER,
  compliance_percentage NUMERIC,
  risk_level VARCHAR,
  last_assessment_date TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.framework_code,
    f.framework_name,
    COUNT(c.id)::INTEGER as total_controls,
    COUNT(CASE WHEN c.is_active = true THEN 1 END)::INTEGER as implemented_controls,
    CASE 
      WHEN COUNT(c.id) > 0 THEN 
        ROUND((COUNT(CASE WHEN c.is_active = true THEN 1 END)::NUMERIC / COUNT(c.id)::NUMERIC) * 100, 2)
      ELSE 0
    END as compliance_percentage,
    CASE
      WHEN COUNT(CASE WHEN c.is_active = true THEN 1 END)::NUMERIC / NULLIF(COUNT(c.id), 0) >= 0.9 THEN 'Low'
      WHEN COUNT(CASE WHEN c.is_active = true THEN 1 END)::NUMERIC / NULLIF(COUNT(c.id), 0) >= 0.7 THEN 'Medium'
      ELSE 'High'
    END::VARCHAR as risk_level,
    MAX(a.updated_at) as last_assessment_date
  FROM regulatory_frameworks_enhanced f
  LEFT JOIN regulatory_controls_enhanced c ON c.framework_id = f.id
  LEFT JOIN assessments a ON a.framework_id = f.id AND (org_id IS NULL OR a.organization_id = org_id)
  WHERE f.is_active = true
  GROUP BY f.id, f.framework_code, f.framework_name
  ORDER BY compliance_percentage DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: dashboard_risk_overview
-- Returns: Risk overview statistics
CREATE OR REPLACE FUNCTION dashboard_risk_overview(org_id UUID DEFAULT NULL)
RETURNS TABLE (
  total_risks INTEGER,
  critical_risks INTEGER,
  high_risks INTEGER,
  medium_risks INTEGER,
  low_risks INTEGER,
  mitigated_risks INTEGER,
  average_risk_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_risks,
    COUNT(CASE WHEN r.risk_level = 'critical' THEN 1 END)::INTEGER as critical_risks,
    COUNT(CASE WHEN r.risk_level = 'high' THEN 1 END)::INTEGER as high_risks,
    COUNT(CASE WHEN r.risk_level = 'medium' THEN 1 END)::INTEGER as medium_risks,
    COUNT(CASE WHEN r.risk_level = 'low' THEN 1 END)::INTEGER as low_risks,
    COUNT(CASE WHEN r.status = 'mitigated' THEN 1 END)::INTEGER as mitigated_risks,
    COALESCE(AVG(r.risk_score), 0)::NUMERIC as average_risk_score
  FROM risks r
  WHERE org_id IS NULL OR r.organization_id = org_id;
END;
$$ LANGUAGE plpgsql;

-- Function: dashboard_team_overview
-- Returns: Team activity and performance
CREATE OR REPLACE FUNCTION dashboard_team_overview(org_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id INTEGER,
  user_name VARCHAR,
  user_email VARCHAR,
  role VARCHAR,
  active_tasks INTEGER,
  completed_tasks INTEGER,
  pending_assessments INTEGER,
  last_activity TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.name::VARCHAR as user_name,
    u.email::VARCHAR as user_email,
    u.role::VARCHAR,
    0::INTEGER as active_tasks, -- Placeholder, update when tasks table is available
    0::INTEGER as completed_tasks, -- Placeholder
    COUNT(DISTINCT a.id)::INTEGER as pending_assessments,
    MAX(al.created_at) as last_activity
  FROM users u
  LEFT JOIN assessments a ON a.assigned_to = u.id AND a.status NOT IN ('completed', 'cancelled')
  LEFT JOIN audit_logs al ON al.user_id = u.id
  WHERE org_id IS NULL OR u.organization_id = org_id
  GROUP BY u.id, u.name, u.email, u.role
  ORDER BY last_activity DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION dashboard_counts(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION dashboard_compliance_scores(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION dashboard_assessment_status(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION dashboard_task_status(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION dashboard_workflow_status(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION dashboard_recent_activity(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION dashboard_overdue_items(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION dashboard_monthly_trends(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION dashboard_compliance_overview(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION dashboard_risk_overview(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION dashboard_team_overview(UUID) TO PUBLIC;

-- Add comments
COMMENT ON FUNCTION dashboard_counts(UUID) IS 'Returns basic counts for dashboard overview';
COMMENT ON FUNCTION dashboard_compliance_scores(UUID) IS 'Returns compliance scores by framework';
COMMENT ON FUNCTION dashboard_assessment_status(UUID) IS 'Returns assessment status breakdown';
COMMENT ON FUNCTION dashboard_task_status(UUID) IS 'Returns task status breakdown';
COMMENT ON FUNCTION dashboard_workflow_status(UUID) IS 'Returns workflow status breakdown';
COMMENT ON FUNCTION dashboard_recent_activity(UUID) IS 'Returns recent activity from audit logs';
COMMENT ON FUNCTION dashboard_overdue_items(UUID) IS 'Returns overdue assessments and tasks';
COMMENT ON FUNCTION dashboard_monthly_trends(UUID) IS 'Returns monthly compliance trends';
COMMENT ON FUNCTION dashboard_compliance_overview(UUID) IS 'Returns comprehensive compliance overview';
COMMENT ON FUNCTION dashboard_risk_overview(UUID) IS 'Returns risk overview statistics';
COMMENT ON FUNCTION dashboard_team_overview(UUID) IS 'Returns team activity and performance';