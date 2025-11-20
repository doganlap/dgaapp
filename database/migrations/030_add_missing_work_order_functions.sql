-- Migration: Add Missing Work Order Functions
-- Date: 2025
-- Description: Adds search_work_orders() and get_work_order_details() functions required by API routes

-- ============================================================================
-- FUNCTION: search_work_orders() - Search and filter work orders
-- ============================================================================
CREATE OR REPLACE FUNCTION search_work_orders(
    p_organization_id INTEGER,
    p_status VARCHAR DEFAULT NULL,
    p_priority VARCHAR DEFAULT NULL,
    p_assigned_to INTEGER DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id INTEGER,
    title VARCHAR,
    description TEXT,
    category VARCHAR,
    status VARCHAR,
    priority VARCHAR,
    due_date TIMESTAMP,
    start_date TIMESTAMP,
    completion_date TIMESTAMP,
    estimated_hours NUMERIC,
    actual_hours NUMERIC,
    sla_breached BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    organization_id INTEGER,
    assignee_id INTEGER,
    reviewer_id INTEGER,
    created_by INTEGER,
    work_order_number VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wo.id,
        wo.title,
        wo.description,
        wo.category,
        wo.status,
        wo.priority,
        wo.due_date,
        wo.start_date,
        wo.completion_date,
        wo.estimated_hours,
        wo.actual_hours,
        wo.sla_breached,
        wo.created_at,
        wo.updated_at,
        wo.organization_id,
        wo.assignee_id,
        wo.reviewer_id,
        wo.created_by,
        wo.work_order_number
    FROM work_orders wo
    WHERE 
        wo.deleted_at IS NULL
        AND (p_organization_id IS NULL OR wo.organization_id = p_organization_id)
        AND (p_status IS NULL OR wo.status = p_status)
        AND (p_priority IS NULL OR wo.priority = p_priority)
        AND (p_assigned_to IS NULL OR wo.assignee_id = p_assigned_to)
        AND (
            p_search IS NULL 
            OR wo.title ILIKE '%' || p_search || '%'
            OR wo.description ILIKE '%' || p_search || '%'
        )
    ORDER BY wo.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_work_order_details() - Get complete work order details as JSONB
-- ============================================================================
CREATE OR REPLACE FUNCTION get_work_order_details(
    p_work_order_id INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_details JSONB;
BEGIN
    SELECT jsonb_build_object(
        'work_order', jsonb_build_object(
            'id', wo.id,
            'title', wo.title,
            'description', wo.description,
            'category', wo.category,
            'status', wo.status,
            'priority', wo.priority,
            'due_date', wo.due_date,
            'start_date', wo.start_date,
            'completion_date', wo.completion_date,
            'estimated_hours', wo.estimated_hours,
            'actual_hours', wo.actual_hours,
            'sla_breached', wo.sla_breached,
            'created_at', wo.created_at,
            'updated_at', wo.updated_at,
            'organization_id', wo.organization_id,
            'work_order_number', wo.work_order_number
        ),
        'assignee', CASE 
            WHEN assignee.id IS NOT NULL THEN jsonb_build_object(
                'id', assignee.id,
                'name', CONCAT(COALESCE(assignee.first_name, ''), ' ', COALESCE(assignee.last_name, '')),
                'email', assignee.email
            )
            ELSE NULL
        END,
        'reviewer', CASE
            WHEN reviewer.id IS NOT NULL THEN jsonb_build_object(
                'id', reviewer.id,
                'name', CONCAT(COALESCE(reviewer.first_name, ''), ' ', COALESCE(reviewer.last_name, '')),
                'email', reviewer.email
            )
            ELSE NULL
        END,
        'created_by', CASE
            WHEN creator.id IS NOT NULL THEN jsonb_build_object(
                'id', creator.id,
                'name', CONCAT(COALESCE(creator.first_name, ''), ' ', COALESCE(creator.last_name, '')),
                'email', creator.email
            )
            ELSE NULL
        END,
        'acceptance_criteria_count', (
            SELECT COUNT(*) FROM work_order_acceptance_criteria 
            WHERE work_order_id = p_work_order_id AND deleted_at IS NULL
        ),
        'active_blockers_count', (
            SELECT COUNT(*) FROM work_order_blockers 
            WHERE work_order_id = p_work_order_id AND resolved_at IS NULL
        ),
        'comments_count', (
            SELECT COUNT(*) FROM work_order_comments 
            WHERE work_order_id = p_work_order_id
        )
    ) INTO v_details
    FROM work_orders wo
    LEFT JOIN users assignee ON wo.assignee_id = assignee.id
    LEFT JOIN users reviewer ON wo.reviewer_id = reviewer.id
    LEFT JOIN users creator ON wo.created_by = creator.id
    WHERE wo.id = p_work_order_id
        AND wo.deleted_at IS NULL;
    
    RETURN v_details;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION search_work_orders(INTEGER, VARCHAR, VARCHAR, INTEGER, TEXT, INTEGER, INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_work_order_details(INTEGER) TO PUBLIC;

-- ============================================================================
-- Migration complete
-- ============================================================================