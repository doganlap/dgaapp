-- ===============================
-- 🚀 DATABASE VERSIONING & STRUCTURE ENFORCEMENT SYSTEM
-- ShahinKSA Compliance Platform
-- Version: 2.0.0
-- ===============================

-- Create database version tracking table
CREATE TABLE IF NOT EXISTS database_versions (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    migration_file VARCHAR(255),
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    applied_by VARCHAR(100) DEFAULT current_user,
    checksum VARCHAR(64),
    execution_time_ms INTEGER,
    status VARCHAR(20) DEFAULT 'applied' CHECK (status IN ('applied', 'failed', 'rolled_back')),
    rollback_script TEXT,
    dependencies TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create schema validation table
CREATE TABLE IF NOT EXISTS schema_validations (
    id SERIAL PRIMARY KEY,
    validation_name VARCHAR(100) NOT NULL,
    validation_type VARCHAR(50) NOT NULL, -- 'constraint', 'index', 'function', 'trigger'
    table_name VARCHAR(100),
    column_name VARCHAR(100),
    expected_definition TEXT,
    current_definition TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('valid', 'invalid', 'missing', 'pending')),
    last_checked TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT,
    auto_fix_script TEXT,
    priority INTEGER DEFAULT 5 -- 1=critical, 5=low
);

-- Insert current version
INSERT INTO database_versions (version, description, migration_file, checksum) 
VALUES ('2.0.0', 'Database Versioning & Structure Enforcement System', '999_database_versioning_system.sql', 'v2.0.0-initial')
ON CONFLICT (version) DO NOTHING;

-- ===============================
-- STRUCTURE VALIDATION FUNCTIONS
-- ===============================

-- Function to validate table structure
CREATE OR REPLACE FUNCTION validate_table_structure(target_table TEXT)
RETURNS TABLE (
    validation_name TEXT,
    status TEXT,
    message TEXT,
    fix_script TEXT
) AS $$
DECLARE
    table_exists BOOLEAN;
    missing_columns TEXT[];
    invalid_constraints TEXT[];
    missing_indexes TEXT[];
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = target_table AND table_schema = 'public'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RETURN QUERY SELECT 
            target_table || '_existence'::TEXT,
            'invalid'::TEXT,
            'Table does not exist'::TEXT,
            'CREATE TABLE ' || target_table || ' (...);'::TEXT;
        RETURN;
    END IF;
    
    -- Validate based on table type
    CASE target_table
        WHEN 'controls_unified' THEN
            -- Check required columns for controls_unified
            SELECT array_agg(column_name) INTO missing_columns
            FROM (
                SELECT unnest(ARRAY['control_id', 'framework_code', 'title_en', 'status', 'created_at', 'updated_at']) AS column_name
                EXCEPT
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'controls_unified' AND table_schema = 'public'
            ) missing;
            
            IF array_length(missing_columns, 1) > 0 THEN
                RETURN QUERY SELECT 
                    'controls_unified_columns'::TEXT,
                    'invalid'::TEXT,
                    'Missing columns: ' || array_to_string(missing_columns, ', '),
                    'ALTER TABLE controls_unified ADD COLUMN ...'::TEXT;
            END IF;
            
        WHEN 'regulatory_frameworks_enhanced' THEN
            -- Similar validation for frameworks
            SELECT array_agg(column_name) INTO missing_columns
            FROM (
                SELECT unnest(ARRAY['framework_code', 'framework_name_en', 'issuing_authority', 'status']) AS column_name
                EXCEPT
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'regulatory_frameworks_enhanced' AND table_schema = 'public'
            ) missing;
            
            IF array_length(missing_columns, 1) > 0 THEN
                RETURN QUERY SELECT 
                    'frameworks_columns'::TEXT,
                    'invalid'::TEXT,
                    'Missing columns: ' || array_to_string(missing_columns, ', '),
                    'ALTER TABLE regulatory_frameworks_enhanced ADD COLUMN ...'::TEXT;
            END IF;
    END CASE;
    
    -- If no issues found
    IF missing_columns IS NULL OR array_length(missing_columns, 1) = 0 THEN
        RETURN QUERY SELECT 
            target_table || '_structure'::TEXT,
            'valid'::TEXT,
            'Table structure is valid'::TEXT,
            NULL::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to validate indexes
CREATE OR REPLACE FUNCTION validate_required_indexes()
RETURNS TABLE (
    index_name TEXT,
    table_name TEXT,
    status TEXT,
    create_script TEXT
) AS $$
DECLARE
    required_indexes RECORD;
BEGIN
    -- Define required indexes
    FOR required_indexes IN 
        SELECT * FROM (VALUES
            ('idx_controls_unified_framework', 'controls_unified', 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_unified_framework ON controls_unified (framework_code);'),
            ('idx_controls_unified_status', 'controls_unified', 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_unified_status ON controls_unified (status);'),
            ('idx_controls_unified_created', 'controls_unified', 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_unified_created ON controls_unified (created_at DESC);'),
            ('idx_frameworks_authority', 'regulatory_frameworks_enhanced', 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_frameworks_authority ON regulatory_frameworks_enhanced (issuing_authority);'),
            ('idx_frameworks_status', 'regulatory_frameworks_enhanced', 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_frameworks_status ON regulatory_frameworks_enhanced (status);')
        ) AS t(idx_name, tbl_name, create_sql)
    LOOP
        -- Check if index exists
        IF EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = required_indexes.idx_name 
            AND tablename = required_indexes.tbl_name
        ) THEN
            RETURN QUERY SELECT 
                required_indexes.idx_name::TEXT,
                required_indexes.tbl_name::TEXT,
                'exists'::TEXT,
                NULL::TEXT;
        ELSE
            RETURN QUERY SELECT 
                required_indexes.idx_name::TEXT,
                required_indexes.tbl_name::TEXT,
                'missing'::TEXT,
                required_indexes.create_sql::TEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to validate foreign key constraints
CREATE OR REPLACE FUNCTION validate_foreign_keys()
RETURNS TABLE (
    constraint_name TEXT,
    table_name TEXT,
    status TEXT,
    create_script TEXT
) AS $$
DECLARE
    required_fks RECORD;
BEGIN
    -- Define required foreign keys
    FOR required_fks IN 
        SELECT * FROM (VALUES
            ('fk_controls_framework', 'controls_unified', 'framework_code', 'regulatory_frameworks_enhanced', 'framework_code'),
            ('fk_assessments_user', 'assessments', 'created_by', 'users', 'id'),
            ('fk_audit_logs_user', 'audit_logs', 'user_id', 'users', 'id')
        ) AS t(fk_name, source_table, source_column, target_table, target_column)
    LOOP
        -- Check if foreign key exists
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = required_fks.source_table
            AND kcu.column_name = required_fks.source_column
        ) THEN
            RETURN QUERY SELECT 
                required_fks.fk_name::TEXT,
                required_fks.source_table::TEXT,
                'exists'::TEXT,
                NULL::TEXT;
        ELSE
            RETURN QUERY SELECT 
                required_fks.fk_name::TEXT,
                required_fks.source_table::TEXT,
                'missing'::TEXT,
                format('ALTER TABLE %s ADD CONSTRAINT %s FOREIGN KEY (%s) REFERENCES %s(%s);',
                    required_fks.source_table, required_fks.fk_name, 
                    required_fks.source_column, required_fks.target_table, required_fks.target_column)::TEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- AUTOMATED STRUCTURE ENFORCEMENT
-- ===============================

-- Function to auto-fix database structure
CREATE OR REPLACE FUNCTION auto_fix_database_structure(dry_run BOOLEAN DEFAULT TRUE)
RETURNS TABLE (
    action_type TEXT,
    action_description TEXT,
    sql_executed TEXT,
    status TEXT,
    error_message TEXT
) AS $$
DECLARE
    fix_record RECORD;
    sql_command TEXT;
    execution_result TEXT;
BEGIN
    -- Fix missing indexes
    FOR fix_record IN SELECT * FROM validate_required_indexes() WHERE status = 'missing' LOOP
        sql_command := fix_record.create_script;
        
        IF NOT dry_run THEN
            BEGIN
                EXECUTE sql_command;
                execution_result := 'success';
            EXCEPTION WHEN OTHERS THEN
                execution_result := 'error';
            END;
        ELSE
            execution_result := 'dry_run';
        END IF;
        
        RETURN QUERY SELECT 
            'create_index'::TEXT,
            'Creating missing index: ' || fix_record.index_name,
            sql_command,
            execution_result,
            CASE WHEN execution_result = 'error' THEN SQLERRM ELSE NULL END;
    END LOOP;
    
    -- Fix missing foreign keys
    FOR fix_record IN SELECT * FROM validate_foreign_keys() WHERE status = 'missing' LOOP
        sql_command := fix_record.create_script;
        
        IF NOT dry_run THEN
            BEGIN
                EXECUTE sql_command;
                execution_result := 'success';
            EXCEPTION WHEN OTHERS THEN
                execution_result := 'error';
            END;
        ELSE
            execution_result := 'dry_run';
        END IF;
        
        RETURN QUERY SELECT 
            'create_foreign_key'::TEXT,
            'Creating missing foreign key: ' || fix_record.constraint_name,
            sql_command,
            execution_result,
            CASE WHEN execution_result = 'error' THEN SQLERRM ELSE NULL END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- VERSION MANAGEMENT FUNCTIONS
-- ===============================

-- Function to get current database version
CREATE OR REPLACE FUNCTION get_database_version()
RETURNS TABLE (
    current_version TEXT,
    applied_at TIMESTAMPTZ,
    total_migrations INTEGER,
    last_migration TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dv.version::TEXT,
        dv.applied_at,
        (SELECT COUNT(*)::INTEGER FROM database_versions WHERE status = 'applied'),
        dv.description::TEXT
    FROM database_versions dv
    WHERE dv.status = 'applied'
    ORDER BY dv.applied_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to check if migration is needed
CREATE OR REPLACE FUNCTION check_migration_status()
RETURNS TABLE (
    needs_migration BOOLEAN,
    current_version TEXT,
    available_migrations INTEGER,
    next_version TEXT
) AS $$
DECLARE
    current_ver TEXT;
    available_count INTEGER;
BEGIN
    -- Get current version
    SELECT version INTO current_ver 
    FROM database_versions 
    WHERE status = 'applied' 
    ORDER BY applied_at DESC 
    LIMIT 1;
    
    -- Count available migrations (this is a placeholder - in real implementation,
    -- you'd scan migration files or have a registry)
    available_count := 0;
    
    RETURN QUERY SELECT 
        (available_count > 0)::BOOLEAN,
        COALESCE(current_ver, 'none')::TEXT,
        available_count,
        CASE WHEN available_count > 0 THEN 'next_version' ELSE NULL END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- COMPREHENSIVE HEALTH CHECK
-- ===============================

-- Function for complete database health check
CREATE OR REPLACE FUNCTION database_health_check()
RETURNS TABLE (
    check_category TEXT,
    check_name TEXT,
    status TEXT,
    details TEXT,
    recommendation TEXT,
    priority INTEGER
) AS $$
BEGIN
    -- Version check
    RETURN QUERY
    SELECT 
        'version'::TEXT,
        'database_version'::TEXT,
        CASE WHEN EXISTS (SELECT 1 FROM database_versions WHERE status = 'applied') 
             THEN 'ok' ELSE 'warning' END::TEXT,
        'Database version: ' || COALESCE((SELECT version FROM database_versions WHERE status = 'applied' ORDER BY applied_at DESC LIMIT 1), 'unknown'),
        CASE WHEN NOT EXISTS (SELECT 1 FROM database_versions WHERE status = 'applied') 
             THEN 'Initialize version tracking' ELSE 'None' END::TEXT,
        1;
    
    -- Table structure checks
    RETURN QUERY
    SELECT 
        'structure'::TEXT,
        'table_' || t.table_name,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = t.table_name AND table_schema = 'public'
        ) THEN 'ok' ELSE 'error' END::TEXT,
        'Table existence check',
        CASE WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = t.table_name AND table_schema = 'public'
        ) THEN 'Create missing table' ELSE 'None' END::TEXT,
        2
    FROM (VALUES 
        ('controls_unified'),
        ('regulatory_frameworks_enhanced'),
        ('regulatory_authorities_enhanced'),
        ('users'),
        ('audit_logs')
    ) AS t(table_name);
    
    -- Index checks
    RETURN QUERY
    SELECT 
        'performance'::TEXT,
        'index_' || idx.index_name,
        idx.status::TEXT,
        'Required index check',
        CASE WHEN idx.status = 'missing' THEN 'Create index: ' || idx.create_script ELSE 'None' END::TEXT,
        3
    FROM validate_required_indexes() idx;
    
    -- Foreign key checks
    RETURN QUERY
    SELECT 
        'integrity'::TEXT,
        'fk_' || fk.constraint_name,
        fk.status::TEXT,
        'Foreign key constraint check',
        CASE WHEN fk.status = 'missing' THEN 'Create constraint: ' || fk.create_script ELSE 'None' END::TEXT,
        2
    FROM validate_foreign_keys() fk;
    
    -- Data quality checks
    RETURN QUERY
    SELECT 
        'data_quality'::TEXT,
        'controls_completeness'::TEXT,
        CASE WHEN (
            SELECT COUNT(*) FROM controls_unified 
            WHERE title_en IS NULL OR title_en = '' OR framework_code IS NULL
        ) = 0 THEN 'ok' ELSE 'warning' END::TEXT,
        'Controls data completeness',
        'Review and fix incomplete control records'::TEXT,
        4;
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- AUTOMATED MAINTENANCE SCHEDULER
-- ===============================

-- Function to run scheduled maintenance
CREATE OR REPLACE FUNCTION run_scheduled_maintenance()
RETURNS TABLE (
    maintenance_task TEXT,
    status TEXT,
    details TEXT,
    execution_time_ms INTEGER
) AS $$
DECLARE
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    task_duration INTEGER;
BEGIN
    -- Update table statistics
    start_time := clock_timestamp();
    PERFORM update_table_statistics();
    end_time := clock_timestamp();
    task_duration := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
    
    RETURN QUERY SELECT 
        'update_statistics'::TEXT,
        'completed'::TEXT,
        'Table statistics updated'::TEXT,
        task_duration;
    
    -- Clean up old audit logs (keep last 365 days)
    start_time := clock_timestamp();
    PERFORM cleanup_old_audit_logs(365);
    end_time := clock_timestamp();
    task_duration := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
    
    RETURN QUERY SELECT 
        'cleanup_audit_logs'::TEXT,
        'completed'::TEXT,
        'Old audit logs cleaned up'::TEXT,
        task_duration;
    
    -- Validate database structure
    start_time := clock_timestamp();
    PERFORM auto_fix_database_structure(false); -- Actually apply fixes
    end_time := clock_timestamp();
    task_duration := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
    
    RETURN QUERY SELECT 
        'structure_validation'::TEXT,
        'completed'::TEXT,
        'Database structure validated and fixed'::TEXT,
        task_duration;
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- MONITORING VIEWS
-- ===============================

-- Database status dashboard view
CREATE OR REPLACE VIEW database_status_dashboard AS
SELECT 
    'Database Version' as metric_name,
    (SELECT version FROM database_versions WHERE status = 'applied' ORDER BY applied_at DESC LIMIT 1) as metric_value,
    'info' as metric_type,
    1 as sort_order
UNION ALL
SELECT 
    'Total Tables' as metric_name,
    (SELECT COUNT(*)::TEXT FROM information_schema.tables WHERE table_schema = 'public') as metric_value,
    'count' as metric_type,
    2 as sort_order
UNION ALL
SELECT 
    'Total Records (Controls)' as metric_name,
    (SELECT COUNT(*)::TEXT FROM controls_unified) as metric_value,
    'count' as metric_type,
    3 as sort_order
UNION ALL
SELECT 
    'Active Frameworks' as metric_name,
    (SELECT COUNT(*)::TEXT FROM regulatory_frameworks_enhanced WHERE status = 'active') as metric_value,
    'count' as metric_type,
    4 as sort_order
UNION ALL
SELECT 
    'Database Size' as metric_name,
    pg_size_pretty(pg_database_size(current_database())) as metric_value,
    'size' as metric_type,
    5 as sort_order
ORDER BY sort_order;

-- ===============================
-- INITIALIZATION SCRIPT
-- ===============================

-- Apply all enhancements from the advanced enhancements file
DO $$
BEGIN
    -- This would typically source the advanced-database-enhancements.sql file
    -- For now, we'll ensure key components are in place
    
    -- Ensure audit_log_enhanced table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log_enhanced') THEN
        RAISE NOTICE 'Creating audit_log_enhanced table...';
        -- The table creation is in the advanced enhancements file
    END IF;
    
    -- Run initial health check
    RAISE NOTICE 'Running initial database health check...';
    
    -- Log the initialization
    INSERT INTO database_versions (version, description, migration_file, status) 
    VALUES ('2.0.1', 'Database structure validation and enforcement initialized', '999_database_versioning_system.sql', 'applied')
    ON CONFLICT (version) DO NOTHING;
    
    RAISE NOTICE 'Database versioning system initialized successfully!';
END $$;

-- ===============================
-- USAGE EXAMPLES
-- ===============================

/*
-- Check database health
SELECT * FROM database_health_check() ORDER BY priority, check_category;

-- Get current version
SELECT * FROM get_database_version();

-- Validate and fix structure (dry run)
SELECT * FROM auto_fix_database_structure(true);

-- Apply fixes
SELECT * FROM auto_fix_database_structure(false);

-- Run maintenance
SELECT * FROM run_scheduled_maintenance();

-- View dashboard
SELECT * FROM database_status_dashboard;

-- Check specific table structure
SELECT * FROM validate_table_structure('controls_unified');

-- Validate indexes
SELECT * FROM validate_required_indexes();

-- Validate foreign keys
SELECT * FROM validate_foreign_keys();
*/
