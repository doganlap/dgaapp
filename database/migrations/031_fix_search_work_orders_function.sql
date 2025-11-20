-- Migration: Fix search_work_orders function to match actual table structure
-- Date: 2025
-- Description: Corrects the search_work_orders function signature to return SET OF work_orders

-- Drop the old function
DROP FUNCTION IF EXISTS search_work_orders(INTEGER, VARCHAR, VARCHAR, INTEGER, TEXT, INTEGER, INTEGER);

-- Create corrected function that returns rows from work_orders table
CREATE OR REPLACE FUNCTION search_work_orders(
    p_organization_id INTEGER,
    p_status VARCHAR DEFAULT NULL,
    p_priority VARCHAR DEFAULT NULL,
    p_assigned_to INTEGER DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS SETOF work_orders AS $$
BEGIN
    RETURN QUERY
    SELECT wo.*
    FROM work_orders wo
    WHERE 
        wo.deleted_at IS NULL
        AND (p_organization_id IS NULL OR wo.organization_id = p_organization_id)
        AND (p_status IS NULL OR LOWER(wo.status) = LOWER(p_status))
        AND (p_priority IS NULL OR LOWER(wo.priority) = LOWER(p_priority))
        AND (p_assigned_to IS NULL OR wo.assigned_to = p_assigned_to)
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
-- Grant permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION search_work_orders(INTEGER, VARCHAR, VARCHAR, INTEGER, TEXT, INTEGER, INTEGER) TO PUBLIC;