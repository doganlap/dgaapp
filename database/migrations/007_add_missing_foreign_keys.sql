-- Migration 007: Add Missing Foreign Key Constraints
-- Purpose: Establish referential integrity across all tables
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
-- ASSESSMENTS TABLE - Add foreign keys (if table exists)
-- =============================================================================
DO $$ 
BEGIN
    IF table_exists('assessments') THEN
        -- Add organization_id foreign key
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_assessments_organization'
        ) THEN
            ALTER TABLE assessments 
            ADD CONSTRAINT fk_assessments_organization 
            FOREIGN KEY (organization_id) 
            REFERENCES organizations(id) 
            ON DELETE CASCADE;
            
            CREATE INDEX IF NOT EXISTS idx_assessments_organization_id 
            ON assessments(organization_id);
        END IF;

        -- Add framework_id foreign key
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_assessments_framework'
        ) THEN
            ALTER TABLE assessments 
            ADD CONSTRAINT fk_assessments_framework 
            FOREIGN KEY (framework_id) 
            REFERENCES compliance_frameworks(id) 
            ON DELETE SET NULL;
            
            CREATE INDEX IF NOT EXISTS idx_assessments_framework_id 
            ON assessments(framework_id);
        END IF;

        -- Add created_by foreign key
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_assessments_created_by'
        ) THEN
            ALTER TABLE assessments 
            ADD CONSTRAINT fk_assessments_created_by 
            FOREIGN KEY (created_by) 
            REFERENCES users(id) 
            ON DELETE SET NULL;
            
            CREATE INDEX IF NOT EXISTS idx_assessments_created_by 
            ON assessments(created_by);
        END IF;
    ELSE
        RAISE NOTICE 'Skipping assessments table - does not exist yet';
    END IF;
END $$;

-- =============================================================================
-- CONTROLS TABLE - Add foreign keys (if table exists)
-- =============================================================================
DO $$ 
BEGIN
    IF table_exists('controls') THEN
        -- Add framework_id foreign key
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_controls_framework'
        ) THEN
            ALTER TABLE controls 
            ADD CONSTRAINT fk_controls_framework 
            FOREIGN KEY (framework_id) 
            REFERENCES compliance_frameworks(id) 
            ON DELETE CASCADE;
            
            CREATE INDEX IF NOT EXISTS idx_controls_framework_id 
            ON controls(framework_id);
        END IF;

        -- Add created_by foreign key
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_controls_created_by'
        ) THEN
            ALTER TABLE controls 
            ADD CONSTRAINT fk_controls_created_by 
            FOREIGN KEY (created_by) 
            REFERENCES users(id) 
            ON DELETE SET NULL;
            
            CREATE INDEX IF NOT EXISTS idx_controls_created_by 
            ON controls(created_by);
        END IF;
    ELSE
        RAISE NOTICE 'Skipping controls table - does not exist yet';
    END IF;
END $$;

-- =============================================================================
-- RISKS TABLE - Add foreign keys (if table exists)
-- =============================================================================
DO $$ 
BEGIN
    IF table_exists('risks') THEN
        -- Add organization_id foreign key
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_risks_organization'
        ) THEN
            ALTER TABLE risks 
            ADD CONSTRAINT fk_risks_organization 
            FOREIGN KEY (organization_id) 
            REFERENCES organizations(id) 
            ON DELETE CASCADE;
            
            CREATE INDEX IF NOT EXISTS idx_risks_organization_id 
            ON risks(organization_id);
        END IF;

        -- Add owner_id foreign key
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_risks_owner'
        ) THEN
            ALTER TABLE risks 
            ADD CONSTRAINT fk_risks_owner 
            FOREIGN KEY (owner_id) 
            REFERENCES users(id) 
            ON DELETE SET NULL;
            
            CREATE INDEX IF NOT EXISTS idx_risks_owner_id 
            ON risks(owner_id);
        END IF;
    ELSE
        RAISE NOTICE 'Skipping risks table - does not exist yet';
    END IF;
END $$;

-- =============================================================================
-- EVIDENCE TABLE - Add foreign keys (if table exists)
-- =============================================================================
DO $$ 
BEGIN
    IF table_exists('evidence') THEN
        -- Add organization_id foreign key
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_evidence_organization'
        ) THEN
            ALTER TABLE evidence 
            ADD CONSTRAINT fk_evidence_organization 
            FOREIGN KEY (organization_id) 
            REFERENCES organizations(id) 
            ON DELETE CASCADE;
            
            CREATE INDEX IF NOT EXISTS idx_evidence_organization_id 
            ON evidence(organization_id);
        END IF;

        -- Add uploaded_by foreign key
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_evidence_uploaded_by'
        ) THEN
            ALTER TABLE evidence 
            ADD CONSTRAINT fk_evidence_uploaded_by 
            FOREIGN KEY (uploaded_by) 
            REFERENCES users(id) 
            ON DELETE SET NULL;
            
            CREATE INDEX IF NOT EXISTS idx_evidence_uploaded_by 
            ON evidence(uploaded_by);
        END IF;
    ELSE
        RAISE NOTICE 'Skipping evidence table - does not exist yet';
    END IF;
END $$;

-- =============================================================================
-- TASKS TABLE - Add foreign keys (if table exists)
-- =============================================================================
DO $$ 
BEGIN
    IF table_exists('tasks') THEN
        -- Add organization_id foreign key
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_tasks_organization'
        ) THEN
            ALTER TABLE tasks 
            ADD CONSTRAINT fk_tasks_organization 
            FOREIGN KEY (organization_id) 
            REFERENCES organizations(id) 
            ON DELETE CASCADE;
            
            CREATE INDEX IF NOT EXISTS idx_tasks_organization_id 
            ON tasks(organization_id);
        END IF;

        -- Add assigned_to foreign key
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_tasks_assigned_to'
        ) THEN
            ALTER TABLE tasks 
            ADD CONSTRAINT fk_tasks_assigned_to 
            FOREIGN KEY (assigned_to) 
            REFERENCES users(id) 
            ON DELETE SET NULL;
            
            CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to 
            ON tasks(assigned_to);
        END IF;

        -- Add created_by foreign key
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_tasks_created_by'
        ) THEN
            ALTER TABLE tasks 
            ADD CONSTRAINT fk_tasks_created_by 
            FOREIGN KEY (created_by) 
            REFERENCES users(id) 
            ON DELETE SET NULL;
            
            CREATE INDEX IF NOT EXISTS idx_tasks_created_by 
            ON tasks(created_by);
        END IF;
    ELSE
        RAISE NOTICE 'Skipping tasks table - does not exist yet';
    END IF;
END $$;

-- =============================================================================
-- WORKFLOWS TABLE - Add foreign keys (if table exists)
-- =============================================================================
DO $$ 
BEGIN
    IF table_exists('workflows') THEN
        -- Add organization_id foreign key
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_workflows_organization'
        ) THEN
            ALTER TABLE workflows 
            ADD CONSTRAINT fk_workflows_organization 
            FOREIGN KEY (organization_id) 
            REFERENCES organizations(id) 
            ON DELETE CASCADE;
            
            CREATE INDEX IF NOT EXISTS idx_workflows_organization_id 
            ON workflows(organization_id);
        END IF;

        -- Add created_by foreign key
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_workflows_created_by'
        ) THEN
            ALTER TABLE workflows 
            ADD CONSTRAINT fk_workflows_created_by 
            FOREIGN KEY (created_by) 
            REFERENCES users(id) 
            ON DELETE SET NULL;
            
            CREATE INDEX IF NOT EXISTS idx_workflows_created_by 
            ON workflows(created_by);
        END IF;
    ELSE
        RAISE NOTICE 'Skipping workflows table - does not exist yet';
    END IF;
END $$;

-- =============================================================================
-- REPORTS TABLE - Add foreign keys (if table exists)
-- =============================================================================
DO $$ 
BEGIN
    IF table_exists('reports') THEN
        -- Add organization_id foreign key
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_reports_organization'
        ) THEN
            ALTER TABLE reports 
            ADD CONSTRAINT fk_reports_organization 
            FOREIGN KEY (organization_id) 
            REFERENCES organizations(id) 
            ON DELETE CASCADE;
            
            CREATE INDEX IF NOT EXISTS idx_reports_organization_id 
            ON reports(organization_id);
        END IF;

        -- Add generated_by foreign key
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_reports_generated_by'
        ) THEN
            ALTER TABLE reports 
            ADD CONSTRAINT fk_reports_generated_by 
            FOREIGN KEY (generated_by) 
            REFERENCES users(id) 
            ON DELETE SET NULL;
            
            CREATE INDEX IF NOT EXISTS idx_reports_generated_by 
            ON reports(generated_by);
        END IF;
    ELSE
        RAISE NOTICE 'Skipping reports table - does not exist yet';
    END IF;
END $$;

-- =============================================================================
-- CLEANUP: Drop helper function
-- =============================================================================
DROP FUNCTION IF EXISTS table_exists(text);

-- Migration completed successfully
SELECT 'Migration 007 completed - foreign keys added where tables exist' as status;