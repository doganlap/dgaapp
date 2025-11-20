-- Migration: Create Work Order Database Functions
-- Date: 2025
-- Description: Creates all required PostgreSQL functions for work orders system

-- ============================================================================
-- FUNCTION 1: work_orders_list() - Paginated list with filtering
-- ============================================================================
CREATE OR REPLACE FUNCTION work_orders_list(
    p_organization_id UUID,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 10,
    p_status VARCHAR DEFAULT NULL,
    p_priority VARCHAR DEFAULT NULL,
    p_search VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    data JSONB,
    total BIGINT
) AS $$
DECLARE
    v_offset INTEGER;
BEGIN
    v_offset := (p_page - 1) * p_limit;
    
    RETURN QUERY
    WITH filtered_orders AS (
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
            -- Assignee details
            jsonb_build_object(
                'id', assignee.id,
                'name', CONCAT(assignee.first_name, ' ', assignee.last_name),
                'email', assignee.email
            ) as assignee,
            -- Reviewer details
            jsonb_build_object(
                'id', reviewer.id,
                'name', CONCAT(reviewer.first_name, ' ', reviewer.last_name),
                'email', reviewer.email
            ) as reviewer,
            -- Creator details
            jsonb_build_object(
                'id', creator.id,
                'name', CONCAT(creator.first_name, ' ', creator.last_name),
                'email', creator.email
            ) as created_by_user,
            -- Count related items
            (SELECT COUNT(*) FROM work_order_acceptance_criteria WHERE work_order_id = wo.id) as acceptance_criteria_count,
            (SELECT COUNT(*) FROM work_order_blockers WHERE work_order_id = wo.id AND resolved_at IS NULL) as active_blockers_count,
            (SELECT COUNT(*) FROM work_order_comments WHERE work_order_id = wo.id) as comments_count
        FROM work_orders wo
        LEFT JOIN users assignee ON wo.assignee_id = assignee.id
        LEFT JOIN users reviewer ON wo.reviewer_id = reviewer.id
        LEFT JOIN users creator ON wo.created_by = creator.id
        WHERE 
            wo.deleted_at IS NULL
            AND (p_organization_id IS NULL OR wo.organization_id = p_organization_id)
            AND (p_status IS NULL OR wo.status = p_status)
            AND (p_priority IS NULL OR wo.priority = p_priority)
            AND (
                p_search IS NULL 
                OR wo.title ILIKE '%' || p_search || '%'
                OR wo.description ILIKE '%' || p_search || '%'
            )
        ORDER BY wo.created_at DESC
        LIMIT p_limit
        OFFSET v_offset
    ),
    total_count AS (
        SELECT COUNT(*) as count
        FROM work_orders wo
        WHERE 
            wo.deleted_at IS NULL
            AND (p_organization_id IS NULL OR wo.organization_id = p_organization_id)
            AND (p_status IS NULL OR wo.status = p_status)
            AND (p_priority IS NULL OR wo.priority = p_priority)
            AND (
                p_search IS NULL 
                OR wo.title ILIKE '%' || p_search || '%'
                OR wo.description ILIKE '%' || p_search || '%'
            )
    )
    SELECT 
        jsonb_agg(
            jsonb_build_object(
                'id', fo.id,
                'title', fo.title,
                'description', fo.description,
                'category', fo.category,
                'status', fo.status,
                'priority', fo.priority,
                'due_date', fo.due_date,
                'start_date', fo.start_date,
                'completion_date', fo.completion_date,
                'estimated_hours', fo.estimated_hours,
                'actual_hours', fo.actual_hours,
                'sla_breached', fo.sla_breached,
                'created_at', fo.created_at,
                'updated_at', fo.updated_at,
                'organization_id', fo.organization_id,
                'assignee', fo.assignee,
                'reviewer', fo.reviewer,
                'created_by', fo.created_by_user,
                'acceptance_criteria_count', fo.acceptance_criteria_count,
                'active_blockers_count', fo.active_blockers_count,
                'comments_count', fo.comments_count
            )
        ) as data,
        (SELECT count FROM total_count) as total
    FROM filtered_orders fo;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION 2: work_order_summary() - Dashboard statistics
-- ============================================================================
CREATE OR REPLACE FUNCTION work_order_summary(
    p_organization_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_summary JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total', COUNT(*),
        'by_status', (
            SELECT jsonb_object_agg(status, count)
            FROM (
                SELECT status, COUNT(*) as count
                FROM work_orders
                WHERE deleted_at IS NULL
                    AND (p_organization_id IS NULL OR organization_id = p_organization_id)
                GROUP BY status
            ) status_counts
        ),
        'by_priority', (
            SELECT jsonb_object_agg(priority, count)
            FROM (
                SELECT priority, COUNT(*) as count
                FROM work_orders
                WHERE deleted_at IS NULL
                    AND (p_organization_id IS NULL OR organization_id = p_organization_id)
                GROUP BY priority
            ) priority_counts
        ),
        'by_category', (
            SELECT jsonb_object_agg(category, count)
            FROM (
                SELECT category, COUNT(*) as count
                FROM work_orders
                WHERE deleted_at IS NULL
                    AND (p_organization_id IS NULL OR organization_id = p_organization_id)
                GROUP BY category
            ) category_counts
        ),
        'overdue', (
            SELECT COUNT(*)
            FROM work_orders
            WHERE deleted_at IS NULL
                AND (p_organization_id IS NULL OR organization_id = p_organization_id)
                AND due_date < CURRENT_DATE
                AND status NOT IN ('completed', 'cancelled')
        ),
        'sla_breached', (
            SELECT COUNT(*)
            FROM work_orders
            WHERE deleted_at IS NULL
                AND (p_organization_id IS NULL OR organization_id = p_organization_id)
                AND sla_breached = true
        ),
        'completed_this_month', (
            SELECT COUNT(*)
            FROM work_orders
            WHERE deleted_at IS NULL
                AND (p_organization_id IS NULL OR organization_id = p_organization_id)
                AND status = 'completed'
                AND completion_date >= DATE_TRUNC('month', CURRENT_DATE)
        ),
        'avg_completion_time', (
            SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (completion_date - created_at))/3600), 0)
            FROM work_orders
            WHERE deleted_at IS NULL
                AND (p_organization_id IS NULL OR organization_id = p_organization_id)
                AND status = 'completed'
                AND completion_date IS NOT NULL
        )
    ) INTO v_summary
    FROM work_orders
    WHERE deleted_at IS NULL
        AND (p_organization_id IS NULL OR organization_id = p_organization_id);
    
    RETURN v_summary;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION 3: work_orders_kanban() - Grouped by status for Kanban board
-- ============================================================================
CREATE OR REPLACE FUNCTION work_orders_kanban(
    p_organization_id UUID,
    p_category VARCHAR DEFAULT NULL,
    p_priority VARCHAR DEFAULT NULL,
    p_assignee_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_kanban JSONB;
BEGIN
    SELECT jsonb_object_agg(status, orders)
    INTO v_kanban
    FROM (
        SELECT 
            wo.status,
            jsonb_agg(
                jsonb_build_object(
                    'id', wo.id,
                    'title', wo.title,
                    'description', wo.description,
                    'category', wo.category,
                    'priority', wo.priority,
                    'due_date', wo.due_date,
                    'start_date', wo.start_date,
                    'estimated_hours', wo.estimated_hours,
                    'sla_breached', wo.sla_breached,
                    'created_at', wo.created_at,
                    'assignee', jsonb_build_object(
                        'id', assignee.id,
                        'name', CONCAT(assignee.first_name, ' ', assignee.last_name),
                        'email', assignee.email
                    ),
                    'active_blockers_count', (
                        SELECT COUNT(*)
                        FROM work_order_blockers
                        WHERE work_order_id = wo.id AND resolved_at IS NULL
                    ),
                    'comments_count', (
                        SELECT COUNT(*)
                        FROM work_order_comments
                        WHERE work_order_id = wo.id
                    )
                )
                ORDER BY wo.created_at DESC
            ) as orders
        FROM work_orders wo
        LEFT JOIN users assignee ON wo.assignee_id = assignee.id
        WHERE 
            wo.deleted_at IS NULL
            AND (p_organization_id IS NULL OR wo.organization_id = p_organization_id)
            AND (p_category IS NULL OR wo.category = p_category)
            AND (p_priority IS NULL OR wo.priority = p_priority)
            AND (p_assignee_id IS NULL OR wo.assignee_id = p_assignee_id)
        GROUP BY wo.status
    ) kanban_data;
    
    -- Ensure all statuses are present even if empty
    v_kanban := COALESCE(v_kanban, '{}'::jsonb);
    v_kanban := v_kanban || jsonb_build_object(
        'pending', COALESCE(v_kanban->'pending', '[]'::jsonb),
        'in_progress', COALESCE(v_kanban->'in_progress', '[]'::jsonb),
        'in_review', COALESCE(v_kanban->'in_review', '[]'::jsonb),
        'blocked', COALESCE(v_kanban->'blocked', '[]'::jsonb),
        'completed', COALESCE(v_kanban->'completed', '[]'::jsonb),
        'cancelled', COALESCE(v_kanban->'cancelled', '[]'::jsonb)
    );
    
    RETURN v_kanban;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION 4: work_orders_search() - Full-text search
-- ============================================================================
CREATE OR REPLACE FUNCTION work_orders_search(
    p_organization_id UUID,
    p_search_term VARCHAR,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    description TEXT,
    category VARCHAR,
    status VARCHAR,
    priority VARCHAR,
    relevance REAL
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
        ts_rank(
            to_tsvector('english', COALESCE(wo.title, '') || ' ' || COALESCE(wo.description, '')),
            plainto_tsquery('english', p_search_term)
        ) as relevance
    FROM work_orders wo
    WHERE 
        wo.deleted_at IS NULL
        AND (p_organization_id IS NULL OR wo.organization_id = p_organization_id)
        AND (
            to_tsvector('english', COALESCE(wo.title, '') || ' ' || COALESCE(wo.description, ''))
            @@ plainto_tsquery('english', p_search_term)
        )
    ORDER BY relevance DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION work_orders_list TO PUBLIC;
GRANT EXECUTE ON FUNCTION work_order_summary TO PUBLIC;
GRANT EXECUTE ON FUNCTION work_orders_kanban TO PUBLIC;
GRANT EXECUTE ON FUNCTION work_orders_search TO PUBLIC;

-- ============================================================================
-- Migration complete
-- ============================================================================