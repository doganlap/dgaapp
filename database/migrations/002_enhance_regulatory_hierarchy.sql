-- Migration: Enhance Regulatory Authority Hierarchy
-- Description: Implements full dynamic hierarchical structure for regulatory authorities
-- Version: 002
-- Date: 2025-10-02

-- 1. Add hierarchy support to regulatory_authorities
ALTER TABLE regulatory_authorities 
ADD COLUMN parent_id UUID REFERENCES regulatory_authorities(id),
ADD COLUMN hierarchy_level INTEGER DEFAULT 1,
ADD COLUMN authority_status VARCHAR(50) DEFAULT 'active' 
    CHECK (authority_status IN ('draft', 'active', 'superseded', 'archived', 'deprecated')),
ADD COLUMN version VARCHAR(50),
ADD COLUMN valid_from DATE,
ADD COLUMN valid_until DATE,
ADD COLUMN superseded_by UUID REFERENCES regulatory_authorities(id),
ADD COLUMN authority_category VARCHAR(50) 
    CHECK (authority_category IN ('master', 'subsidiary', 'committee', 'specialized_unit', 'task_force')),
ADD COLUMN jurisdiction_scope VARCHAR(50)[] DEFAULT ARRAY['national'],
ADD COLUMN metadata JSONB;

-- 2. Create regulatory_authority_relationships table
CREATE TABLE IF NOT EXISTS regulatory_authority_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_authority_id UUID REFERENCES regulatory_authorities(id),
    child_authority_id UUID REFERENCES regulatory_authorities(id),
    relationship_type VARCHAR(50) NOT NULL 
        CHECK (relationship_type IN ('hierarchical', 'advisory', 'oversight', 'collaborative', 'reporting')),
    effective_from DATE,
    effective_until DATE,
    relationship_status VARCHAR(50) DEFAULT 'active'
        CHECK (relationship_status IN ('proposed', 'active', 'suspended', 'terminated')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    CONSTRAINT unique_authority_relationship UNIQUE (parent_authority_id, child_authority_id)
);

-- 3. Create regulatory_authority_version_history table
CREATE TABLE IF NOT EXISTS regulatory_authority_version_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    authority_id UUID REFERENCES regulatory_authorities(id),
    version VARCHAR(50) NOT NULL,
    changes JSONB NOT NULL,
    change_type VARCHAR(50) NOT NULL 
        CHECK (change_type IN ('creation', 'modification', 'status_change', 'hierarchy_change', 'merger')),
    effective_from DATE NOT NULL,
    effective_until DATE,
    change_reason TEXT,
    approved_by UUID REFERENCES users(id),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- 4. Create view for active regulatory hierarchy
CREATE OR REPLACE VIEW v_regulatory_hierarchy AS
WITH RECURSIVE authority_tree AS (
    -- Base case: top-level authorities
    SELECT 
        id,
        reg_id,
        name_en,
        name_ar,
        parent_id,
        hierarchy_level,
        authority_category,
        authority_status,
        ARRAY[id] as path,
        ARRAY[name_en::VARCHAR] as name_path
    FROM regulatory_authorities
    WHERE parent_id IS NULL
    
    UNION ALL
    
    -- Recursive case: child authorities
    SELECT
        ra.id,
        ra.reg_id,
        ra.name_en,
        ra.name_ar,
        ra.parent_id,
        ra.hierarchy_level,
        ra.authority_category,
        ra.authority_status,
        at.path || ra.id,
        at.name_path || ra.name_en::VARCHAR
    FROM regulatory_authorities ra
    INNER JOIN authority_tree at ON ra.parent_id = at.id
)
SELECT 
    id,
    reg_id,
    name_en,
    name_ar,
    parent_id,
    hierarchy_level,
    authority_category,
    authority_status,
    path,
    name_path
FROM authority_tree;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reg_auth_parent ON regulatory_authorities(parent_id);
CREATE INDEX IF NOT EXISTS idx_reg_auth_category ON regulatory_authorities(authority_category);
CREATE INDEX IF NOT EXISTS idx_reg_auth_status ON regulatory_authorities(authority_status);
CREATE INDEX IF NOT EXISTS idx_reg_auth_hierarchy ON regulatory_authorities(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_reg_rel_parent ON regulatory_authority_relationships(parent_authority_id);
CREATE INDEX IF NOT EXISTS idx_reg_rel_child ON regulatory_authority_relationships(child_authority_id);
CREATE INDEX IF NOT EXISTS idx_reg_version_authority ON regulatory_authority_version_history(authority_id);

-- 6. Create functions for hierarchy management
CREATE OR REPLACE FUNCTION update_authority_hierarchy_level()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.hierarchy_level := 1;
    ELSE
        SELECT hierarchy_level + 1 
        INTO NEW.hierarchy_level
        FROM regulatory_authorities
        WHERE id = NEW.parent_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_authority_hierarchy_level
BEFORE INSERT OR UPDATE ON regulatory_authorities
FOR EACH ROW
EXECUTE FUNCTION update_authority_hierarchy_level();

-- 7. Create function to prevent circular references
CREATE OR REPLACE FUNCTION check_circular_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        WITH RECURSIVE cycle_check AS (
            SELECT id, parent_id, 1 as level
            FROM regulatory_authorities
            WHERE id = NEW.parent_id
            UNION ALL
            SELECT ra.id, ra.parent_id, cc.level + 1
            FROM regulatory_authorities ra
            JOIN cycle_check cc ON ra.id = cc.parent_id
            WHERE cc.level < 100
        )
        SELECT 1 FROM cycle_check WHERE id = NEW.id
    ) THEN
        RAISE EXCEPTION 'Circular reference detected in regulatory authority hierarchy';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_circular_hierarchy
BEFORE INSERT OR UPDATE ON regulatory_authorities
FOR EACH ROW
WHEN (NEW.parent_id IS NOT NULL)
EXECUTE FUNCTION check_circular_hierarchy();

-- 8. Create function to get full authority lineage
CREATE OR REPLACE FUNCTION get_authority_lineage(authority_uuid UUID)
RETURNS TABLE (
    id UUID,
    name_en VARCHAR(255),
    hierarchy_level INTEGER,
    path UUID[],
    name_path VARCHAR[]
) AS $$
    SELECT id, name_en, hierarchy_level, path, name_path
    FROM v_regulatory_hierarchy
    WHERE id = authority_uuid;
$$ LANGUAGE sql;