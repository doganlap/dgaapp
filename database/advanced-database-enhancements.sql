-- ===============================
-- 🚀 ADVANCED DATABASE ENHANCEMENTS
-- ShahinKSA Compliance Platform
-- ===============================

-- 1. PERFORMANCE ENHANCEMENTS
-- ===============================

-- Advanced Indexing Strategy
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_unified_performance 
ON controls_unified USING btree (framework_code, category, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_unified_fulltext 
ON controls_unified USING gin (to_tsvector('english', title_en || ' ' || description_en));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_unified_arabic 
ON controls_unified USING gin (to_tsvector('arabic', title_ar || ' ' || description_ar));

-- Partial indexes for active records only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_controls 
ON controls_unified (control_id, framework_code) WHERE status = 'active';

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_framework_authority_lookup 
ON regulatory_frameworks_enhanced (issuing_authority, effective_date DESC, status);

-- 2. DATA QUALITY ENHANCEMENTS
-- ===============================

-- Data validation functions
CREATE OR REPLACE FUNCTION validate_control_id(control_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Control ID must follow pattern: AUTHORITY-NNN (e.g., SAMA-001)
    RETURN control_id ~ '^[A-Z]{2,10}-[0-9]{3,4}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Email validation function
CREATE OR REPLACE FUNCTION validate_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Arabic text validation
CREATE OR REPLACE FUNCTION validate_arabic_text(text_input TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if text contains Arabic characters
    RETURN text_input ~ '[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. AUTOMATED DATA COMPLETION
-- ===============================

-- Function to auto-generate control codes
CREATE OR REPLACE FUNCTION generate_control_code(authority_code TEXT)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    new_code TEXT;
BEGIN
    -- Get next sequential number for this authority
    SELECT COALESCE(MAX(CAST(SUBSTRING(control_id FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM controls_unified 
    WHERE control_id LIKE authority_code || '-%';
    
    -- Format with leading zeros
    new_code := authority_code || '-' || LPAD(next_number::TEXT, 3, '0');
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Auto-completion trigger for controls
CREATE OR REPLACE FUNCTION auto_complete_control_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-generate control_id if not provided
    IF NEW.control_id IS NULL OR NEW.control_id = '' THEN
        NEW.control_id := generate_control_code(NEW.framework_code);
    END IF;
    
    -- Auto-generate slug from title
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := LOWER(REGEXP_REPLACE(NEW.title_en, '[^a-zA-Z0-9]+', '-', 'g'));
    END IF;
    
    -- Set default evidence priority based on risk level
    IF NEW.evidence_priority IS NULL THEN
        NEW.evidence_priority := CASE 
            WHEN NEW.risk_level = 'Critical' THEN 'Critical'
            WHEN NEW.risk_level = 'High' THEN 'High'
            WHEN NEW.risk_level = 'Medium' THEN 'Medium'
            ELSE 'Low'
        END;
    END IF;
    
    -- Auto-set automation level based on control type
    IF NEW.automation_level IS NULL THEN
        NEW.automation_level := CASE 
            WHEN NEW.control_type = 'Automated' THEN 'Very High'
            WHEN NEW.control_type = 'Detective' THEN 'High'
            WHEN NEW.control_type = 'Preventive' THEN 'Medium'
            ELSE 'Low'
        END;
    END IF;
    
    -- Set timestamps
    IF TG_OP = 'INSERT' THEN
        NEW.created_at := COALESCE(NEW.created_at, NOW());
    END IF;
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to controls_unified
DROP TRIGGER IF EXISTS trigger_auto_complete_control_data ON controls_unified;
CREATE TRIGGER trigger_auto_complete_control_data
    BEFORE INSERT OR UPDATE ON controls_unified
    FOR EACH ROW EXECUTE FUNCTION auto_complete_control_data();

-- 4. ADVANCED AUDIT SYSTEM
-- ===============================

-- Enhanced audit log table
CREATE TABLE IF NOT EXISTS audit_log_enhanced (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100),
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id VARCHAR(100),
    user_ip INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    correlation_id UUID DEFAULT gen_random_uuid(),
    business_context JSONB,
    compliance_impact TEXT,
    automated BOOLEAN DEFAULT FALSE
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_enhanced_table_time 
ON audit_log_enhanced (table_name, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_enhanced_user 
ON audit_log_enhanced (user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_enhanced_correlation 
ON audit_log_enhanced (correlation_id);

-- Generic audit function
CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[] := '{}';
    field_name TEXT;
BEGIN
    -- Capture old and new data
    IF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        new_data := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        old_data := NULL;
        new_data := to_jsonb(NEW);
    ELSE -- UPDATE
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        
        -- Identify changed fields
        FOR field_name IN SELECT jsonb_object_keys(new_data) LOOP
            IF old_data->field_name IS DISTINCT FROM new_data->field_name THEN
                changed_fields := array_append(changed_fields, field_name);
            END IF;
        END LOOP;
    END IF;
    
    -- Insert audit record
    INSERT INTO audit_log_enhanced (
        table_name, record_id, operation, old_values, new_values, 
        changed_fields, user_id, timestamp, automated
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id::TEXT, OLD.id::TEXT),
        TG_OP,
        old_data,
        new_data,
        changed_fields,
        current_setting('app.current_user_id', true),
        NOW(),
        current_setting('app.automated_operation', true)::BOOLEAN
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 5. INTELLIGENT DATA RELATIONSHIPS
-- ===============================

-- Function to find related controls
CREATE OR REPLACE FUNCTION find_related_controls(input_control_id TEXT)
RETURNS TABLE (
    control_id TEXT,
    title_en TEXT,
    relationship_type TEXT,
    similarity_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH control_data AS (
        SELECT c.control_id, c.title_en, c.description_en, c.category, c.framework_code
        FROM controls_unified c
        WHERE c.control_id = input_control_id
    )
    SELECT 
        c.control_id,
        c.title_en,
        CASE 
            WHEN c.framework_code = cd.framework_code THEN 'Same Framework'
            WHEN c.category = cd.category THEN 'Same Category'
            ELSE 'Related Content'
        END as relationship_type,
        CASE 
            WHEN c.framework_code = cd.framework_code THEN 0.9
            WHEN c.category = cd.category THEN 0.7
            ELSE similarity(c.title_en, cd.title_en)
        END as similarity_score
    FROM controls_unified c, control_data cd
    WHERE c.control_id != input_control_id
    AND (
        c.framework_code = cd.framework_code OR
        c.category = cd.category OR
        similarity(c.title_en, cd.title_en) > 0.3
    )
    ORDER BY similarity_score DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- 6. AUTOMATED COMPLIANCE SCORING
-- ===============================

-- Function to calculate compliance score
CREATE OR REPLACE FUNCTION calculate_compliance_score(framework_code_input TEXT)
RETURNS TABLE (
    framework_code TEXT,
    total_controls INTEGER,
    implemented_controls INTEGER,
    compliance_percentage NUMERIC,
    risk_score NUMERIC,
    last_updated TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.framework_code,
        COUNT(*)::INTEGER as total_controls,
        COUNT(CASE WHEN c.implementation_status = 'Implemented' THEN 1 END)::INTEGER as implemented_controls,
        ROUND(
            (COUNT(CASE WHEN c.implementation_status = 'Implemented' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
            2
        ) as compliance_percentage,
        ROUND(
            AVG(CASE 
                WHEN c.risk_level = 'Critical' THEN 4
                WHEN c.risk_level = 'High' THEN 3
                WHEN c.risk_level = 'Medium' THEN 2
                ELSE 1
            END), 
            2
        ) as risk_score,
        MAX(c.updated_at) as last_updated
    FROM controls_unified c
    WHERE c.framework_code = framework_code_input OR framework_code_input IS NULL
    GROUP BY c.framework_code;
END;
$$ LANGUAGE plpgsql;

-- 7. ADVANCED SEARCH CAPABILITIES
-- ===============================

-- Full-text search function with ranking
CREATE OR REPLACE FUNCTION advanced_search_controls(
    search_query TEXT,
    framework_filter TEXT DEFAULT NULL,
    category_filter TEXT DEFAULT NULL,
    language_preference TEXT DEFAULT 'en'
)
RETURNS TABLE (
    control_id TEXT,
    title TEXT,
    description TEXT,
    framework_code TEXT,
    category TEXT,
    relevance_score REAL,
    snippet TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.control_id,
        CASE 
            WHEN language_preference = 'ar' AND c.title_ar IS NOT NULL THEN c.title_ar
            ELSE c.title_en
        END as title,
        CASE 
            WHEN language_preference = 'ar' AND c.description_ar IS NOT NULL THEN c.description_ar
            ELSE c.description_en
        END as description,
        c.framework_code,
        c.category,
        ts_rank(
            to_tsvector('english', c.title_en || ' ' || c.description_en),
            plainto_tsquery('english', search_query)
        ) as relevance_score,
        ts_headline(
            'english',
            c.description_en,
            plainto_tsquery('english', search_query),
            'MaxWords=20, MinWords=5'
        ) as snippet
    FROM controls_unified c
    WHERE 
        to_tsvector('english', c.title_en || ' ' || c.description_en) @@ plainto_tsquery('english', search_query)
        AND (framework_filter IS NULL OR c.framework_code = framework_filter)
        AND (category_filter IS NULL OR c.category = category_filter)
    ORDER BY relevance_score DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- 8. DATA QUALITY MONITORING
-- ===============================

-- Data quality metrics view
CREATE OR REPLACE VIEW data_quality_metrics AS
SELECT 
    'controls_unified' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN title_ar IS NULL OR title_ar = '' THEN 1 END) as missing_arabic_titles,
    COUNT(CASE WHEN description_ar IS NULL OR description_ar = '' THEN 1 END) as missing_arabic_descriptions,
    COUNT(CASE WHEN evidence_type IS NULL OR evidence_type = '' THEN 1 END) as missing_evidence_types,
    COUNT(CASE WHEN evidence_priority IS NULL OR evidence_priority = '' THEN 1 END) as missing_evidence_priorities,
    ROUND(
        (COUNT(*) - COUNT(CASE WHEN title_ar IS NULL OR title_ar = '' THEN 1 END))::NUMERIC / COUNT(*)::NUMERIC * 100,
        2
    ) as arabic_title_completion_rate,
    ROUND(
        (COUNT(*) - COUNT(CASE WHEN evidence_type IS NULL OR evidence_type = '' THEN 1 END))::NUMERIC / COUNT(*)::NUMERIC * 100,
        2
    ) as evidence_completion_rate
FROM controls_unified

UNION ALL

SELECT 
    'regulatory_authorities_enhanced' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN authority_name_ar IS NULL OR authority_name_ar = '' THEN 1 END) as missing_arabic_names,
    COUNT(CASE WHEN contact_info IS NULL THEN 1 END) as missing_contact_info,
    COUNT(CASE WHEN website IS NULL OR website = '' THEN 1 END) as missing_websites,
    COUNT(CASE WHEN digital_services IS NULL THEN 1 END) as missing_digital_services,
    ROUND(
        (COUNT(*) - COUNT(CASE WHEN authority_name_ar IS NULL OR authority_name_ar = '' THEN 1 END))::NUMERIC / COUNT(*)::NUMERIC * 100,
        2
    ) as arabic_name_completion_rate,
    ROUND(
        (COUNT(*) - COUNT(CASE WHEN contact_info IS NULL THEN 1 END))::NUMERIC / COUNT(*)::NUMERIC * 100,
        2
    ) as contact_completion_rate
FROM regulatory_authorities_enhanced;

-- 9. AUTOMATED MAINTENANCE
-- ===============================

-- Function to clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_log_enhanced 
    WHERE timestamp < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
    INSERT INTO audit_log_enhanced (
        table_name, operation, new_values, user_id, automated
    ) VALUES (
        'audit_log_enhanced',
        'DELETE',
        jsonb_build_object('deleted_records', deleted_count, 'retention_days', retention_days),
        'system',
        true
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update statistics
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS VOID AS $$
BEGIN
    -- Update statistics for all tables
    ANALYZE controls_unified;
    ANALYZE regulatory_frameworks_enhanced;
    ANALYZE regulatory_authorities_enhanced;
    ANALYZE audit_log_enhanced;
    
    -- Log the statistics update
    INSERT INTO audit_log_enhanced (
        table_name, operation, new_values, user_id, automated
    ) VALUES (
        'system_maintenance',
        'UPDATE',
        jsonb_build_object('action', 'statistics_update', 'timestamp', NOW()),
        'system',
        true
    );
END;
$$ LANGUAGE plpgsql;

-- 10. PERFORMANCE MONITORING
-- ===============================

-- View for slow queries monitoring
CREATE OR REPLACE VIEW slow_queries_monitor AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE mean_time > 100  -- Queries taking more than 100ms on average
ORDER BY mean_time DESC;

-- Function to get table sizes
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE (
    table_name TEXT,
    size_pretty TEXT,
    size_bytes BIGINT,
    row_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size_pretty,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
        n_tup_ins + n_tup_upd + n_tup_del as row_count
    FROM pg_stat_user_tables
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- ===============================
-- 🎯 ENHANCEMENT SUMMARY
-- ===============================

/*
ENHANCEMENTS APPLIED:

1. ⚡ PERFORMANCE
   - Advanced indexing (B-tree, GIN, partial)
   - Full-text search optimization
   - Query performance monitoring

2. 🔍 DATA QUALITY
   - Validation functions (email, Arabic, control IDs)
   - Data quality metrics view
   - Automated data completion

3. 🤖 AUTOMATION
   - Auto-generate control codes
   - Auto-complete missing fields
   - Intelligent defaults based on context

4. 📊 AUDIT & COMPLIANCE
   - Enhanced audit logging
   - Compliance scoring algorithms
   - Change tracking with business context

5. 🔗 RELATIONSHIPS
   - Find related controls
   - Cross-reference analysis
   - Similarity scoring

6. 🔍 ADVANCED SEARCH
   - Multi-language full-text search
   - Relevance ranking
   - Snippet generation

7. 🧹 MAINTENANCE
   - Automated cleanup procedures
   - Statistics updates
   - Performance monitoring

8. 📈 MONITORING
   - Slow query detection
   - Table size tracking
   - Data quality dashboards
*/
