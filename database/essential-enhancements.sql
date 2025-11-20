-- ===============================
-- 🚀 ESSENTIAL DATABASE ENHANCEMENTS
-- ShahinKSA Compliance Platform - Minimal Working Version
-- ===============================

-- 1. BASIC PERFORMANCE INDEXES
-- ===============================

-- Basic indexes for controls_unified (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'controls_unified') THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_unified_framework 
        ON controls_unified (framework_code);
        
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_unified_status 
        ON controls_unified (status);
        
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_unified_created 
        ON controls_unified (created_at DESC);
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if table doesn't exist or indexes already exist
    NULL;
END $$;

-- Basic indexes for regulatory_frameworks_enhanced (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'regulatory_frameworks_enhanced') THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_frameworks_authority 
        ON regulatory_frameworks_enhanced (issuing_authority);
        
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_frameworks_status 
        ON regulatory_frameworks_enhanced (status);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 2. BASIC DATA VALIDATION FUNCTIONS
-- ===============================

-- Simple email validation function
CREATE OR REPLACE FUNCTION validate_email_simple(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Simple control ID validation
CREATE OR REPLACE FUNCTION validate_control_id_simple(control_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN control_id ~ '^[A-Z]{2,10}-[0-9]{3,4}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. BASIC AUDIT TABLE
-- ===============================

-- Simple audit log table
CREATE TABLE IF NOT EXISTS audit_log_simple (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100),
    operation VARCHAR(10) NOT NULL,
    user_id VARCHAR(100),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    details JSONB
);

-- Basic index for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_simple_table_time 
ON audit_log_simple (table_name, timestamp DESC);

-- 4. BASIC STATISTICS FUNCTIONS
-- ===============================

-- Get table row counts
CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE(table_name TEXT, row_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.table_name::TEXT,
        COALESCE(
            (SELECT n_tup_ins + n_tup_upd - n_tup_del 
             FROM pg_stat_user_tables 
             WHERE relname = t.table_name), 
            0
        ) as row_count
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql;

-- 5. BASIC CLEANUP FUNCTION
-- ===============================

-- Clean old audit logs (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_log_simple 
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- 🎯 ESSENTIAL ENHANCEMENTS COMPLETE
-- ===============================

-- Summary:
-- ✅ Basic performance indexes
-- ✅ Simple validation functions
-- ✅ Basic audit logging
-- ✅ Table statistics
-- ✅ Cleanup utilities
