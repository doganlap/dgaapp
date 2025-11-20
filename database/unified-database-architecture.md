# 🏗️ Unified Database Architecture
## Single Master Database for All GRC Modules

### 📋 **Architecture Principles:**

#### **1. Single Source of Truth**
- **Master Database**: `shahin_ksa_compliance` (existing 300+ tables)
- **All modules connect to the same database**
- **No module-specific databases**
- **Shared data models across all modules**

#### **2. Modular Integration Strategy**
```
┌─────────────────────────────────────────────────────────────┐
│                    MASTER DATABASE                          │
│                 shahin_ksa_compliance                       │
├─────────────────────────────────────────────────────────────┤
│  Core Tables (Existing 300+ tables)                        │
│  ├── organizations                                         │
│  ├── users                                                 │
│  ├── assessments                                           │
│  ├── workflows                                             │
│  ├── approvals                                             │
│  ├── evidence                                              │
│  ├── controls                                              │
│  ├── frameworks                                            │
│  └── ... (290+ more tables)                               │
├─────────────────────────────────────────────────────────────┤
│  Module Extensions (New tables as needed)                  │
│  ├── dynamic_components (for UI management)                │
│  ├── module_configurations (for module settings)          │
│  ├── integration_mappings (for module connections)        │
│  └── module_permissions (for access control)              │
└─────────────────────────────────────────────────────────────┘
```

#### **3. Module Architecture**
```
Assessment Module ──┐
Risk Module ────────┼──► Master Database (shahin_ksa_compliance)
Report Module ──────┤
Design Module ──────┘
```

### 🔧 **Implementation Strategy:**

#### **1. Database Connection Unification**
All modules use the same connection configuration:

```javascript
// Unified Database Configuration
const MASTER_DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: 'shahin_ksa_compliance', // SINGLE DATABASE
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};
```

#### **2. Module Integration Tables**
Only add essential tables for module management:

```sql
-- Module Management Tables (minimal additions)
CREATE TABLE IF NOT EXISTS module_registry (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS module_permissions (
    id SERIAL PRIMARY KEY,
    module_id VARCHAR(100) REFERENCES module_registry(id),
    user_id INTEGER, -- Links to existing users table
    organization_id INTEGER, -- Links to existing organizations table
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integration_mappings (
    id SERIAL PRIMARY KEY,
    source_module VARCHAR(100),
    target_module VARCHAR(100),
    mapping_config JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### **3. Existing Table Utilization**
Leverage your existing 300+ tables:

```javascript
// Core Tables Mapping
const CORE_TABLES = {
  // User Management
  users: 'users',
  organizations: 'organizations',
  roles: 'roles',
  permissions: 'permissions',
  
  // Assessment Module
  assessments: 'assessments',
  assessment_templates: 'assessment_templates',
  assessment_responses: 'assessment_responses',
  assessment_evidence: 'assessment_evidence',
  
  // Workflow Management
  workflows: 'workflows',
  workflow_steps: 'workflow_steps',
  workflow_instances: 'workflow_instances',
  approvals: 'approvals',
  
  // GRC Core
  frameworks: 'frameworks',
  controls: 'controls',
  requirements: 'requirements',
  evidence: 'evidence',
  
  // Risk Management (for future Risk Module)
  risks: 'risks',
  risk_assessments: 'risk_assessments',
  risk_treatments: 'risk_treatments',
  
  // Reporting (for future Report Module)
  reports: 'reports',
  report_templates: 'report_templates',
  dashboards: 'dashboards'
};
```

### 🎯 **Module Integration Approach:**

#### **1. Assessment Module (Current)**
- Uses existing assessment tables
- Connects to master database
- Shares user/org data with other modules

#### **2. Risk Module (Future)**
- Extends existing risk tables
- Integrates with assessment data
- Shares risk data across modules

#### **3. Report Module (Future)**
- Uses existing report tables
- Aggregates data from all modules
- Provides unified reporting

#### **4. Design Module (Future)**
- Stores design templates in existing tables
- Links to assessment/risk data
- Maintains design-data relationships

### 🔐 **Data Integrity & Security:**

#### **1. Referential Integrity**
```sql
-- Ensure all modules respect existing relationships
-- Users belong to organizations
-- Assessments belong to organizations
-- All data maintains proper foreign keys
```

#### **2. Multi-Tenant Security**
```javascript
// Organization-based data isolation
const getDataForOrganization = (organizationId, tableName) => {
  return `SELECT * FROM ${tableName} WHERE organization_id = ${organizationId}`;
};
```

#### **3. Module Permissions**
```javascript
// Module-specific permissions within unified system
const checkModuleAccess = (userId, moduleId, permission) => {
  // Check against unified permissions system
  // Respect organizational boundaries
  // Maintain role-based access control
};
```

### 📊 **Benefits of Unified Database:**

#### **1. Data Consistency**
- Single source of truth for all data
- No data duplication across modules
- Consistent data models and relationships

#### **2. Module Interoperability**
- Seamless data sharing between modules
- Cross-module reporting and analytics
- Unified user and organization management

#### **3. Scalability**
- Add new modules without database fragmentation
- Maintain performance with proper indexing
- Single backup and maintenance strategy

#### **4. Development Efficiency**
- Shared database utilities and services
- Common data access patterns
- Unified testing and deployment

### 🛠️ **Implementation Steps:**

#### **1. Database Service Unification**
```javascript
// Single database service for all modules
class UnifiedDatabaseService {
  constructor() {
    this.pool = new Pool(MASTER_DB_CONFIG);
  }
  
  // Methods used by all modules
  async getByOrganization(table, organizationId) { ... }
  async createWithAudit(table, data, userId) { ... }
  async updateWithHistory(table, id, data, userId) { ... }
}
```

#### **2. Module Registration**
```javascript
// Register each module with the master database
const registerModule = async (moduleConfig) => {
  await db.query(`
    INSERT INTO module_registry (id, name, version, config)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (id) DO UPDATE SET
      version = EXCLUDED.version,
      config = EXCLUDED.config
  `, [moduleConfig.id, moduleConfig.name, moduleConfig.version, moduleConfig.config]);
};
```

#### **3. Cross-Module Data Access**
```javascript
// Standardized data access across modules
class CrossModuleDataAccess {
  async getAssessmentData(assessmentId, requestingModule) {
    // Check permissions
    // Return assessment data for use by other modules
  }
  
  async getRiskData(riskId, requestingModule) {
    // Cross-module risk data access
  }
}
```

### 🎯 **Next Steps:**

1. **Map existing 300+ tables** to module functions
2. **Create minimal integration tables** (3-4 tables max)
3. **Implement unified database service**
4. **Update all modules** to use master database
5. **Test cross-module integration**
6. **Document data relationships** for future modules

This approach ensures:
- ✅ **Single database** for all modules
- ✅ **Clean data organization** with existing tables
- ✅ **Modular architecture** that can integrate or standalone
- ✅ **Future-proof design** for Risk, Report, and Design modules
- ✅ **Data integrity** and consistency across all modules
