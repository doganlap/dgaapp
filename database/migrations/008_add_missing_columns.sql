-- Migration 008: Add Missing Standard Columns
-- Purpose: Standardize all tables with created_at, updated_at, status columns
-- Author: System Auto-Fix
-- Date: 2024
-- FIXED: Added table existence checks to prevent errors

-- =============================================================================
-- HELPER FUNCTION: Check if table exists
-- =============================================================================
CREATE OR REPLACE FUNCTION table_exists(table_name text) RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND tables.table_name = table_exists.table_name
    );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- CREATE OR REPLACE TRIGGER FUNCTION FOR AUTOMATIC TIMESTAMP UPDATES
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ASSESSMENTS TABLE (if exists)
-- =============================================================================
DO $$ 
BEGIN
    IF table_exists('assessments') THEN
        -- Add created_at if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'assessments' AND column_name = 'created_at'
        ) THEN
            ALTER TABLE assessments ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        -- Add updated_at if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'assessments' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE assessments ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        -- Add status if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'assessments' AND column_name = 'status'
        ) THEN
            ALTER TABLE assessments ADD COLUMN status VARCHAR(50) DEFAULT 'draft';
        END IF;

        -- Create trigger for updated_at
        DROP TRIGGER IF EXISTS update_assessments_updated_at ON assessments;
        CREATE TRIGGER update_assessments_updated_at
            BEFORE UPDATE ON assessments
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at);
        CREATE INDEX IF NOT EXISTS idx_assessments_updated_at ON assessments(updated_at);
        CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
    ELSE
        RAISE NOTICE 'Skipping assessments table - does not exist yet';
    END IF;
END $$;

-- =============================================================================
-- CONTROLS TABLE (if exists)
-- =============================================================================
DO $$ 
BEGIN
    IF table_exists('controls') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'controls' AND column_name = 'created_at'
        ) THEN
            ALTER TABLE controls ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'controls' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE controls ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'controls' AND column_name = 'status'
        ) THEN
            ALTER TABLE controls ADD COLUMN status VARCHAR(50) DEFAULT 'active';
        END IF;

        DROP TRIGGER IF EXISTS update_controls_updated_at ON controls;
        CREATE TRIGGER update_controls_updated_at
            BEFORE UPDATE ON controls
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        CREATE INDEX IF NOT EXISTS idx_controls_created_at ON controls(created_at);
        CREATE INDEX IF NOT EXISTS idx_controls_updated_at ON controls(updated_at);
        CREATE INDEX IF NOT EXISTS idx_controls_status ON controls(status);
    ELSE
        RAISE NOTICE 'Skipping controls table - does not exist yet';
    END IF;
END $$;

-- =============================================================================
-- COMPLIANCE_FRAMEWORKS TABLE (if exists)
-- =============================================================================
DO $$ 
BEGIN
    IF table_exists('compliance_frameworks') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'compliance_frameworks' AND column_name = 'created_at'
        ) THEN
            ALTER TABLE compliance_frameworks ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'compliance_frameworks' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE compliance_frameworks ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'compliance_frameworks' AND column_name = 'status'
        ) THEN
            ALTER TABLE compliance_frameworks ADD COLUMN status VARCHAR(50) DEFAULT 'active';
        END IF;

        DROP TRIGGER IF EXISTS update_compliance_frameworks_updated_at ON compliance_frameworks;
        CREATE TRIGGER update_compliance_frameworks_updated_at
            BEFORE UPDATE ON compliance_frameworks
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_created_at ON compliance_frameworks(created_at);
        CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_updated_at ON compliance_frameworks(updated_at);
        CREATE INDEX IF NOT EXISTS idx_compliance_frameworks_status ON compliance_frameworks(status);
    ELSE
        RAISE NOTICE 'Skipping compliance_frameworks table - does not exist yet';
    END IF;
END $$;

-- =============================================================================
-- RISKS TABLE (if exists)
-- =============================================================================
DO $$ 
BEGIN
    IF table_exists('risks') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'risks' AND column_name = 'created_at'
        ) THEN
            ALTER TABLE risks ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'risks' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE risks ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'risks' AND column_name = 'status'
        ) THEN
            ALTER TABLE risks ADD COLUMN status VARCHAR(50) DEFAULT 'open';
        END IF;

        DROP TRIGGER IF EXISTS update_risks_updated_at ON risks;
        CREATE TRIGGER update_risks_updated_at
            BEFORE UPDATE ON risks
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        CREATE INDEX IF NOT EXISTS idx_risks_created_at ON risks(created_at);
        CREATE INDEX IF NOT EXISTS idx_risks_updated_at ON risks(updated_at);
        CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
    ELSE
        RAISE NOTICE 'Skipping risks table - does not exist yet';
    END IF;
END $$;

-- =============================================================================
-- EVIDENCE TABLE (if exists)
-- =============================================================================
DO $$ 
BEGIN
    IF table_exists('evidence') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'evidence' AND column_name = 'created_at'
        ) THEN
            ALTER TABLE evidence ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'evidence' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE evidence ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'evidence' AND column_name = 'status'
        ) THEN
            ALTER TABLE evidence ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
        END IF;

        DROP TRIGGER IF EXISTS update_evidence_updated_at ON evidence;
        CREATE TRIGGER update_evidence_updated_at
            BEFORE UPDATE ON evidence
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        CREATE INDEX IF NOT EXISTS idx_evidence_created_at ON evidence(created_at);
        CREATE INDEX IF NOT EXISTS idx_evidence_updated_at ON evidence(updated_at);
        CREATE INDEX IF NOT EXISTS idx_evidence_status ON evidence(status);
    ELSE
        RAISE NOTICE 'Skipping evidence table - does not exist yet';
    END IF;
END $$;

-- =============================================================================
-- TASKS TABLE (if exists)
-- =============================================================================
DO $$ 
BEGIN
    IF table_exists('tasks') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tasks' AND column_name = 'created_at'
        ) THEN
            ALTER TABLE tasks ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tasks' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE tasks ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tasks' AND column_name = 'status'
        ) THEN
            ALTER TABLE tasks ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
        END IF;

        DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
        CREATE TRIGGER update_tasks_updated_at
            BEFORE UPDATE ON tasks
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
        CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    ELSE
        RAISE NOTICE 'Skipping tasks table - does not exist yet';
    END IF;
END $$;

-- =============================================================================
-- WORKFLOWS TABLE (if exists)
-- =============================================================================
DO $$ 
BEGIN
    IF table_exists('workflows') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'workflows' AND column_name = 'created_at'
        ) THEN
            ALTER TABLE workflows ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'workflows' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE workflows ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'workflows' AND column_name = 'status'
        ) THEN
            ALTER TABLE workflows ADD COLUMN status VARCHAR(50) DEFAULT 'draft';
        END IF;

        DROP TRIGGER IF EXISTS update_workflows_updated_at ON workflows;
        CREATE TRIGGER update_workflows_updated_at
            BEFORE UPDATE ON workflows
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at);
        CREATE INDEX IF NOT EXISTS idx_workflows_updated_at ON workflows(updated_at);
        CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
    ELSE
        RAISE NOTICE 'Skipping workflows table - does not exist yet';
    END IF;
END $$;

-- =============================================================================
-- REPORTS TABLE (if exists)
-- =============================================================================
DO $$ 
BEGIN
    IF table_exists('reports') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'reports' AND column_name = 'created_at'
        ) THEN
            ALTER TABLE reports ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'reports' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE reports ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'reports' AND column_name = 'status'
        ) THEN
            ALTER TABLE reports ADD COLUMN status VARCHAR(50) DEFAULT 'draft';
        END IF;

        DROP TRIGGER IF EXISTS update_reports_updated_at ON reports;
        CREATE TRIGGER update_reports_updated_at
            BEFORE UPDATE ON reports
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
        CREATE INDEX IF NOT EXISTS idx_reports_updated_at ON reports(updated_at);
        CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    ELSE
        RAISE NOTICE 'Skipping reports table - does not exist yet';
    END IF;
END $$;

-- =============================================================================
-- CLEANUP: Drop helper function
-- =============================================================================
DROP FUNCTION IF EXISTS table_exists(text);

-- Migration completed successfully
SELECT 'Migration 008 completed - columns added where tables exist' as status;