const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'shahin_ksa_compliance',
    password: 'password',
    port: 5432
});

async function createStandardizedTables() {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Creating Standardized GRC Tables...');
        console.log('====================================');
        
        // Create sectors table
        await client.query(`
            CREATE TABLE IF NOT EXISTS grc_sectors (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                sector_code VARCHAR(10) UNIQUE NOT NULL,
                name_en VARCHAR(255) NOT NULL,
                name_ar VARCHAR(255) NOT NULL,
                description_en TEXT,
                description_ar TEXT,
                parent_sector_code VARCHAR(10),
                sector_level INTEGER DEFAULT 1,
                risk_profile VARCHAR(20) DEFAULT 'medium',
                regulatory_intensity VARCHAR(20) DEFAULT 'medium',
                is_active BOOLEAN DEFAULT true,
                display_order INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Created grc_sectors table');
        
        // Create regulators table
        await client.query(`
            CREATE TABLE IF NOT EXISTS grc_regulators (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                regulator_code VARCHAR(20) UNIQUE NOT NULL,
                name_en VARCHAR(255) NOT NULL,
                name_ar VARCHAR(255) NOT NULL,
                short_name_en VARCHAR(50),
                short_name_ar VARCHAR(50),
                regulator_type VARCHAR(50) NOT NULL DEFAULT 'government',
                jurisdiction_en TEXT,
                jurisdiction_ar TEXT,
                country_code VARCHAR(3) DEFAULT 'SAU',
                ministry VARCHAR(100),
                parent_regulator_code VARCHAR(20),
                website VARCHAR(255),
                contact_email VARCHAR(255),
                contact_phone VARCHAR(50),
                address TEXT,
                established_year INTEGER,
                enforcement_powers TEXT[],
                penalty_authority BOOLEAN DEFAULT false,
                audit_authority BOOLEAN DEFAULT false,
                licensing_authority BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true,
                logo_url TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Created grc_regulators table');
        
        // Create frameworks table
        await client.query(`
            CREATE TABLE IF NOT EXISTS grc_frameworks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                framework_code VARCHAR(50) UNIQUE NOT NULL,
                name_en VARCHAR(500) NOT NULL,
                name_ar VARCHAR(500) NOT NULL,
                short_name_en VARCHAR(100),
                short_name_ar VARCHAR(100),
                version VARCHAR(20),
                framework_type VARCHAR(50) NOT NULL DEFAULT 'standard',
                framework_category VARCHAR(50),
                regulator_id UUID REFERENCES grc_regulators(id),
                parent_framework_id UUID REFERENCES grc_frameworks(id),
                is_mandatory BOOLEAN DEFAULT false,
                is_saudi_framework BOOLEAN DEFAULT false,
                scope_description_en TEXT,
                scope_description_ar TEXT,
                publication_date DATE,
                effective_date DATE,
                review_date DATE,
                expiry_date DATE,
                status VARCHAR(20) DEFAULT 'active',
                compliance_level VARCHAR(20) DEFAULT 'medium',
                automation_level VARCHAR(20) DEFAULT 'manual',
                total_controls INTEGER DEFAULT 0,
                official_url TEXT,
                documentation_url TEXT,
                guidance_url TEXT,
                penalties JSONB DEFAULT '{}',
                exemptions JSONB DEFAULT '{}',
                applicability_criteria JSONB DEFAULT '{}',
                tags TEXT[] DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Created grc_frameworks table');
        
        // Create controls table
        await client.query(`
            CREATE TABLE IF NOT EXISTS grc_controls (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                control_code VARCHAR(100) UNIQUE NOT NULL,
                framework_id UUID NOT NULL REFERENCES grc_frameworks(id),
                parent_control_id UUID REFERENCES grc_controls(id),
                control_number VARCHAR(50) NOT NULL,
                title_en VARCHAR(500) NOT NULL,
                title_ar VARCHAR(500),
                description_en TEXT,
                description_ar TEXT,
                objective_en TEXT,
                objective_ar TEXT,
                control_domain VARCHAR(100),
                control_category VARCHAR(100),
                control_subcategory VARCHAR(100),
                control_type VARCHAR(50) DEFAULT 'preventive',
                control_nature VARCHAR(50) DEFAULT 'manual',
                implementation_approach VARCHAR(50) DEFAULT 'policy',
                frequency VARCHAR(50) DEFAULT 'continuous',
                criticality_level VARCHAR(20) DEFAULT 'medium',
                complexity_level VARCHAR(20) DEFAULT 'medium',
                maturity_level INTEGER DEFAULT 1,
                automation_potential VARCHAR(20) DEFAULT 'medium',
                implementation_effort VARCHAR(20) DEFAULT 'medium',
                implementation_cost VARCHAR(20) DEFAULT 'medium',
                business_impact VARCHAR(20) DEFAULT 'medium',
                technical_impact VARCHAR(20) DEFAULT 'medium',
                implementation_guidance_en TEXT,
                implementation_guidance_ar TEXT,
                testing_procedures_en TEXT,
                testing_procedures_ar TEXT,
                evidence_requirements JSONB DEFAULT '[]',
                kpi_metrics JSONB DEFAULT '[]',
                responsible_roles TEXT[] DEFAULT '{}',
                accountable_roles TEXT[] DEFAULT '{}',
                consulted_roles TEXT[] DEFAULT '{}',
                informed_roles TEXT[] DEFAULT '{}',
                related_policies TEXT[] DEFAULT '{}',
                related_procedures TEXT[] DEFAULT '{}',
                compensating_controls UUID[] DEFAULT '{}',
                dependent_controls UUID[] DEFAULT '{}',
                mapping_nist VARCHAR(100),
                mapping_iso27001 VARCHAR(100),
                mapping_cobit VARCHAR(100),
                mapping_coso VARCHAR(100),
                implementation_status VARCHAR(20) DEFAULT 'not_implemented',
                compliance_status VARCHAR(20) DEFAULT 'unknown',
                last_assessment_date DATE,
                next_assessment_date DATE,
                assessment_frequency INTEGER DEFAULT 365,
                risk_rating VARCHAR(20) DEFAULT 'medium',
                residual_risk VARCHAR(20) DEFAULT 'medium',
                gaps_identified TEXT[],
                remediation_plan JSONB DEFAULT '{}',
                automation_config JSONB DEFAULT '{}',
                monitoring_config JSONB DEFAULT '{}',
                alert_config JSONB DEFAULT '{}',
                is_active BOOLEAN DEFAULT true,
                tags TEXT[] DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(framework_id, control_number)
            )
        `);
        console.log('✅ Created grc_controls table');
        
        // Create assessment templates table
        await client.query(`
            CREATE TABLE IF NOT EXISTS grc_assessment_templates (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                template_code VARCHAR(50) UNIQUE NOT NULL,
                name_en VARCHAR(255) NOT NULL,
                name_ar VARCHAR(255),
                template_type VARCHAR(50) NOT NULL DEFAULT 'self_assessment',
                framework_id UUID REFERENCES grc_frameworks(id),
                scope_description_en TEXT,
                scope_description_ar TEXT,
                frequency_days INTEGER DEFAULT 365,
                auto_schedule BOOLEAN DEFAULT false,
                notification_config JSONB DEFAULT '{}',
                scoring_method VARCHAR(50) DEFAULT 'weighted',
                passing_threshold DECIMAL(5,2) DEFAULT 70.00,
                questions JSONB DEFAULT '[]',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Created grc_assessment_templates table');
        
        // Create automation rules table
        await client.query(`
            CREATE TABLE IF NOT EXISTS grc_automation_rules (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                rule_code VARCHAR(50) UNIQUE NOT NULL,
                name_en VARCHAR(255) NOT NULL,
                name_ar VARCHAR(255),
                rule_type VARCHAR(50) NOT NULL DEFAULT 'monitoring',
                trigger_conditions JSONB NOT NULL DEFAULT '{}',
                actions JSONB NOT NULL DEFAULT '{}',
                priority_level VARCHAR(20) DEFAULT 'medium',
                is_enabled BOOLEAN DEFAULT true,
                execution_count INTEGER DEFAULT 0,
                last_execution TIMESTAMP WITH TIME ZONE,
                next_execution TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Created grc_automation_rules table');
        
        // Create smart recommendations table
        await client.query(`
            CREATE TABLE IF NOT EXISTS grc_smart_recommendations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                recommendation_type VARCHAR(50) NOT NULL,
                target_entity_type VARCHAR(50) NOT NULL,
                target_entity_id UUID NOT NULL,
                title_en VARCHAR(255) NOT NULL,
                title_ar VARCHAR(255),
                description_en TEXT,
                description_ar TEXT,
                recommendation_priority VARCHAR(20) DEFAULT 'medium',
                implementation_effort VARCHAR(20) DEFAULT 'medium',
                expected_impact VARCHAR(20) DEFAULT 'medium',
                confidence_score DECIMAL(5,2) DEFAULT 0.00,
                ai_generated BOOLEAN DEFAULT false,
                status VARCHAR(20) DEFAULT 'pending',
                implementation_date DATE,
                feedback_score INTEGER,
                feedback_comments TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Created grc_smart_recommendations table');
        
        // Now migrate existing data
        console.log('\n📊 Migrating existing data...');
        
        // Migrate sectors
        await client.query(`
            INSERT INTO grc_sectors (sector_code, name_en, name_ar, is_active)
            SELECT 
                code,
                name_en,
                COALESCE(name_ar, name_en),
                true
            FROM sectors
            ON CONFLICT (sector_code) DO UPDATE SET
                name_en = EXCLUDED.name_en,
                name_ar = EXCLUDED.name_ar,
                updated_at = CURRENT_TIMESTAMP
        `);
        console.log('✅ Migrated sectors');
        
        // Migrate regulators
        await client.query(`
            INSERT INTO grc_regulators (
                regulator_code, name_en, name_ar, regulator_type,
                jurisdiction_en, jurisdiction_ar, website, ministry,
                established_year, is_active
            )
            SELECT 
                code,
                name_en,
                COALESCE(name_ar, name_en),
                COALESCE(category, 'government'),
                jurisdiction_en,
                jurisdiction_ar,
                website,
                ministry,
                established_year,
                true
            FROM regulators
            ON CONFLICT (regulator_code) DO UPDATE SET
                name_en = EXCLUDED.name_en,
                name_ar = EXCLUDED.name_ar,
                updated_at = CURRENT_TIMESTAMP
        `);
        console.log('✅ Migrated regulators');
        
        // Migrate frameworks
        await client.query(`
            INSERT INTO grc_frameworks (
                framework_code, name_en, name_ar, version, framework_type,
                framework_category, regulator_id, is_mandatory, is_saudi_framework,
                publication_date, effective_date, status, official_url
            )
            SELECT 
                f.code,
                f.name,
                COALESCE(f.name_arabic, f.name),
                f.version,
                CASE 
                    WHEN f.code LIKE '%LAW%' OR f.code LIKE '%ACT%' THEN 'law'
                    WHEN f.code LIKE '%REG%' OR f.code LIKE '%SAMA%' OR f.code LIKE '%NCA%' THEN 'regulation'
                    ELSE 'standard'
                END,
                CASE 
                    WHEN f.code LIKE '%CYBER%' OR f.code LIKE '%SEC%' OR f.code LIKE '%NCA%' THEN 'cybersecurity'
                    WHEN f.code LIKE '%PRIV%' OR f.code LIKE '%GDPR%' OR f.code LIKE '%PDPL%' THEN 'privacy'
                    WHEN f.code LIKE '%FIN%' OR f.code LIKE '%SAMA%' THEN 'financial'
                    ELSE 'operational'
                END,
                r.id,
                COALESCE(f.is_mandatory, false),
                COALESCE(f.is_saudi, false),
                f.created_at::date,
                f.effective_date,
                CASE WHEN COALESCE(f.is_active, true) THEN 'active' ELSE 'inactive' END,
                f.url
            FROM frameworks f
            LEFT JOIN grc_regulators r ON f.authority = r.regulator_code
            ON CONFLICT (framework_code) DO UPDATE SET
                name_en = EXCLUDED.name_en,
                name_ar = EXCLUDED.name_ar,
                updated_at = CURRENT_TIMESTAMP
        `);
        console.log('✅ Migrated frameworks');
        
        // Migrate controls
        await client.query(`
            INSERT INTO grc_controls (
                control_code, framework_id, control_number, title_en, title_ar,
                description_en, description_ar, control_domain, control_category,
                control_type, criticality_level, maturity_level, 
                implementation_guidance_en, evidence_requirements,
                mapping_nist, mapping_iso27001, implementation_status,
                compliance_status, is_active
            )
            SELECT 
                COALESCE(c.framework_code || '-' || c.control_number, c.control_id, c.id::text),
                f.id,
                c.control_number,
                c.title,
                c.title_ar,
                c.description,
                c.requirement_ar,
                c.domain,
                COALESCE(c.control_type, 'preventive'),
                COALESCE(c.control_type, 'preventive'),
                CASE 
                    WHEN c.maturity_level >= 4 THEN 'critical'
                    WHEN c.maturity_level >= 3 THEN 'high'
                    WHEN c.maturity_level >= 2 THEN 'medium'
                    ELSE 'low'
                END,
                COALESCE(c.maturity_level, 1),
                c.implementation_guidance_en,
                CASE 
                    WHEN c.evidence_requirements IS NOT NULL 
                    THEN json_build_array(json_build_object('requirement', c.evidence_requirements))::jsonb
                    ELSE '[]'::jsonb
                END,
                c.mapping_nist,
                c.mapping_iso27001,
                COALESCE(c.implementation_status, 'not_implemented'),
                CASE 
                    WHEN c.status = 'active' THEN 'unknown'
                    WHEN c.status = 'compliant' THEN 'compliant'
                    ELSE 'unknown'
                END,
                COALESCE(c.status != 'archived', true)
            FROM controls c
            JOIN grc_frameworks f ON c.framework_code = f.framework_code
            WHERE c.control_number IS NOT NULL
            ON CONFLICT (control_code) DO UPDATE SET
                title_en = EXCLUDED.title_en,
                title_ar = EXCLUDED.title_ar,
                updated_at = CURRENT_TIMESTAMP
        `);
        console.log('✅ Migrated controls');
        
        // Create indexes for performance
        console.log('\n🔧 Creating performance indexes...');
        
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_grc_frameworks_regulator ON grc_frameworks(regulator_id)',
            'CREATE INDEX IF NOT EXISTS idx_grc_frameworks_type ON grc_frameworks(framework_type)',
            'CREATE INDEX IF NOT EXISTS idx_grc_frameworks_mandatory ON grc_frameworks(is_mandatory)',
            'CREATE INDEX IF NOT EXISTS idx_grc_controls_framework ON grc_controls(framework_id)',
            'CREATE INDEX IF NOT EXISTS idx_grc_controls_domain ON grc_controls(control_domain)',
            'CREATE INDEX IF NOT EXISTS idx_grc_controls_criticality ON grc_controls(criticality_level)',
            'CREATE INDEX IF NOT EXISTS idx_grc_controls_status ON grc_controls(implementation_status)',
            'CREATE INDEX IF NOT EXISTS idx_grc_controls_compliance ON grc_controls(compliance_status)',
            'CREATE INDEX IF NOT EXISTS idx_grc_controls_risk ON grc_controls(risk_rating)',
            'CREATE INDEX IF NOT EXISTS idx_grc_controls_active ON grc_controls(is_active)'
        ];
        
        for (const index of indexes) {
            await client.query(index);
        }
        console.log('✅ Created performance indexes');
        
        // Create views
        console.log('\n👁️  Creating standardized views...');
        
        await client.query(`
            CREATE OR REPLACE VIEW v_compliance_dashboard AS
            SELECT 
                f.framework_code,
                f.name_en as framework_name,
                f.is_mandatory,
                COUNT(c.id) as total_controls,
                COUNT(CASE WHEN c.implementation_status = 'implemented' THEN 1 END) as implemented_controls,
                COUNT(CASE WHEN c.compliance_status = 'compliant' THEN 1 END) as compliant_controls,
                COUNT(CASE WHEN c.criticality_level = 'critical' THEN 1 END) as critical_controls,
                COUNT(CASE WHEN c.risk_rating = 'high' THEN 1 END) as high_risk_controls,
                ROUND(
                    (COUNT(CASE WHEN c.implementation_status = 'implemented' THEN 1 END) * 100.0 / NULLIF(COUNT(c.id), 0)), 2
                ) as implementation_percentage,
                ROUND(
                    (COUNT(CASE WHEN c.compliance_status = 'compliant' THEN 1 END) * 100.0 / NULLIF(COUNT(c.id), 0)), 2
                ) as compliance_percentage
            FROM grc_frameworks f
            LEFT JOIN grc_controls c ON f.id = c.framework_id AND c.is_active = true
            WHERE f.status = 'active'
            GROUP BY f.id, f.framework_code, f.name_en, f.is_mandatory
            ORDER BY f.is_mandatory DESC, compliance_percentage DESC
        `);
        console.log('✅ Created compliance dashboard view');
        
        // Update framework control counts
        await client.query(`
            UPDATE grc_frameworks 
            SET total_controls = (
                SELECT COUNT(*) 
                FROM grc_controls 
                WHERE framework_id = grc_frameworks.id 
                AND is_active = true
            )
        `);
        console.log('✅ Updated framework control counts');
        
        // Verification
        console.log('\n🔍 Verifying standardized database...');
        
        const tables = [
            'grc_sectors', 'grc_regulators', 'grc_frameworks', 
            'grc_controls', 'grc_assessment_templates', 'grc_automation_rules'
        ];
        
        for (const table of tables) {
            const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
            console.log(`   ${table}: ${result.rows[0].count} records`);
        }
        
        console.log('\n✅ STANDARDIZED DATABASE CREATED SUCCESSFULLY!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        client.release();
        pool.end();
    }
}

if (require.main === module) {
    createStandardizedTables()
        .then(() => {
            console.log('\n🎉 Database standardization completed!');
        })
        .catch(error => {
            console.error('💥 Failed:', error);
            process.exit(1);
        });
}

module.exports = { createStandardizedTables };
