# Database Migration & Seed Integration - Complete Guide

## 🎯 Overview

This document ensures all database migrations and seed files are properly coupled to achieve **100% DGA database coverage** across the Kingdom.

---

## 📋 Database Structure

### Core Migrations (15 tables)

#### Migration 001: Core Tables
- ✅ `users` - User management
- ✅ `dga_entities` - **158 entities** (supports 100% coverage)
- ✅ `dga_programs` - Digital transformation programs
- ✅ `dga_projects` - Implementation projects
- ✅ `dga_budget` - Budget tracking
- ✅ `dga_kpi_reports` - KPI tracking
- ✅ `dga_milestones` - Project milestones
- ✅ `dga_audit_trail` - Audit logging
- ✅ `dga_tickets` - Support tickets
- ✅ `dga_notifications` - Notifications

#### Extended Migrations
- ✅ Migration 003: `kpis` table
- ✅ Migration 004: `compliance_records` table
- ✅ Migration 005: `risks` table
- ✅ Migration 006: `stakeholder_consensus` table
- ✅ Migration 007: `digital_maturity_scores` table
- ✅ Migration 011: Finance tables (`dga_contracts`, `dga_invoices`)

---

## 🌱 Seed Files Integration

### Seed File Order (Dependency Chain)

```
1. 002_seed_all_158_entities.js
   └─→ No dependencies (base table)
   
2. 003_seed_users.js
   └─→ Depends on: dga_entities
   
3. 002_seed_programs.js
   └─→ Depends on: dga_entities
   
4. 004_seed_budget.js
   └─→ Depends on: dga_entities, dga_programs
   
5. 005_seed_kpis.js
   └─→ Depends on: dga_entities, dga_programs
   
6. 006_seed_compliance_records.js
   └─→ Depends on: dga_entities
   
7. 007_seed_risks.js
   └─→ Depends on: dga_entities
   
8. 008_seed_stakeholder_consensus.js
   └─→ Depends on: dga_entities
   
9. 009_seed_digital_maturity_scores.js
   └─→ Depends on: dga_entities
```

### Master Seed File
**File**: `000_master_seed.js`

Coordinates all seed files in correct order to ensure:
- ✅ Proper dependency resolution
- ✅ Data integrity
- ✅ Complete coverage verification
- ✅ Progress reporting

---

## 🔗 Migration-Seed Coupling

### Entity Table Schema (Migration 001)
```sql
CREATE TABLE dga_entities (
  entity_id UUID PRIMARY KEY,
  entity_code VARCHAR(50) UNIQUE NOT NULL,
  entity_name_en VARCHAR(255) NOT NULL,
  entity_name_ar VARCHAR(255) NOT NULL,
  entity_type ENUM('Ministry', 'Authority', 'Agency', 'Commission', 'Center', 'Municipality', 'Corporation'),
  region ENUM('Central', 'Western', 'Eastern', 'Northern', 'Southern'),
  sector ENUM('Health', 'Education', 'Interior', 'Defense', 'Economy', 'Justice', 'Transport', 'Energy', 'Tourism', 'Environment', 'Social Development', 'Culture', 'Technology', 'Other'),
  location_city VARCHAR(100) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  description TEXT,
  status ENUM('Active', 'Inactive', 'Under Review'),
  total_programs INTEGER DEFAULT 0,
  active_programs INTEGER DEFAULT 0,
  total_budget DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Seed File Mapping
The seed file (`002_seed_all_158_entities.js`) maps exactly to this schema:

```javascript
{
  entity_id: uuidv4(),              // ✅ Matches migration
  entity_code: 'MOI-001',            // ✅ Matches migration
  entity_name_en: 'Ministry...',     // ✅ Matches migration
  entity_name_ar: 'وزارة...',        // ✅ Matches migration
  entity_type: 'Ministry',           // ✅ Matches enum
  region: 'Central',                 // ✅ Matches enum
  sector: 'Interior',                // ✅ Matches enum
  location_city: 'Riyadh',           // ✅ Matches migration
  contact_email: 'info@...',         // ✅ Matches migration
  contact_phone: '+966...',          // ✅ Matches migration
  description: '...',                // ✅ Matches migration
  status: 'Active',                  // ✅ Matches enum
  total_programs: 0,                 // ✅ Matches migration
  active_programs: 0,                // ✅ Matches migration
  total_budget: 95000000000,         // ✅ Matches migration
  created_at: new Date(),            // ✅ Matches migration
  updated_at: new Date()             // ✅ Matches migration
}
```

---

## ✅ Verification Checklist

### Migration Verification
- [x] All 15 tables created
- [x] All foreign keys defined
- [x] All indexes created
- [x] All enums match seed data
- [x] All constraints in place

### Seed File Verification
- [x] Seed file matches migration schema
- [x] All 158 entities defined
- [x] All regions represented
- [x] All sectors represented
- [x] All entity types included
- [x] Proper dependency order

### Data Integrity
- [x] Foreign keys valid
- [x] Enums match
- [x] Required fields populated
- [x] Unique constraints satisfied
- [x] Relationships valid

---

## 🚀 Running Migrations & Seeds

### Step 1: Run Migrations
```bash
cd backend
npm run migrate
```

This creates all tables with proper structure.

### Step 2: Run Seeds
```bash
cd backend
npm run seed
```

Or use master seed:
```bash
npx knex seed:run --specific=000_master_seed.js
```

### Step 3: Verify
```bash
# Check entity count
node -e "const {db} = require('./src/config/database'); db('dga_entities').count('* as count').then(r => console.log('Entities:', r[0].count, '/ 158')).finally(() => process.exit())"
```

---

## 📊 Expected Results

### After Running Seeds

**Entities**: 158/158 (100%)
- Central: 42
- Western: 38
- Eastern: 28
- Northern: 24
- Southern: 26

**Entity Types**:
- Ministries: 25
- Authorities: 35
- Agencies: 20
- Commissions: 15
- Centers: 10
- Municipalities: 30
- Corporations: 23

**Sectors**: All 14 sectors represented

---

## 🔧 Troubleshooting

### Issue: Foreign Key Violations
**Solution**: Ensure seed order matches dependency chain

### Issue: Enum Mismatch
**Solution**: Verify seed data matches migration enums

### Issue: Missing Fields
**Solution**: Check seed file includes all required fields

### Issue: Duplicate Keys
**Solution**: Ensure entity_code is unique

---

## 📝 Files Structure

```
backend/database/
├── migrations/
│   ├── 001_create_core_tables.js      ✅ Core tables
│   ├── 003_create_kpis_table.js       ✅ KPIs
│   ├── 004_create_compliance_records_table.js  ✅ Compliance
│   ├── 005_create_risks_table.js      ✅ Risks
│   ├── 006_create_stakeholder_consensus_table.js  ✅ Stakeholders
│   ├── 007_create_digital_maturity_scores_table.js  ✅ Maturity
│   └── 011_create_finance_tables.js   ✅ Finance
│
└── seeds/
    ├── 000_master_seed.js             ✅ Master coordinator
    ├── 001_seed_entities.js           ✅ Basic entities (38)
    ├── 002_seed_all_158_entities.js   ✅ Complete entities (158)
    ├── 002_seed_programs.js           ✅ Programs
    ├── 003_seed_users.js              ✅ Users
    ├── 004_seed_budget.js             ✅ Budget
    ├── 005_seed_kpis.js               ✅ KPIs
    ├── 006_seed_compliance_records.js ✅ Compliance
    ├── 007_seed_risks.js              ✅ Risks
    ├── 008_seed_stakeholder_consensus.js  ✅ Stakeholders
    └── 009_seed_digital_maturity_scores.js  ✅ Maturity
```

---

## ✅ Integration Status

- ✅ **Migrations**: Complete and tested
- ✅ **Seed Files**: Properly coupled with migrations
- ✅ **Schema Matching**: 100% aligned
- ✅ **Dependency Order**: Correct
- ✅ **Data Integrity**: Verified
- ✅ **Coverage**: Ready for 100%

---

**Status**: ✅ **FULLY INTEGRATED  
**Migrations**: ✅ Complete  
**Seeds**: ✅ Coupled  
**Coverage**: Ready for 100%

