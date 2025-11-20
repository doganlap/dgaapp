# GRC Hierarchy Validation Report

**Generated:** 2025-01-XX  
**Scope:** Regulator → Framework → Control → Assessment → Evidence Hierarchy

---

## 📊 Hierarchy Structure

```
Regulator (71 KSA Regulators)
  └── Framework (Many frameworks per regulator)
      └── Control (Many controls per framework)
          └── Assessment (Assessments for each control)
              └── Evidence (Evidence for each assessment)
```

---

## ✅ Database Schema Validation

### 1. Regulators Table (`grc_regulators`)
**Status:** ✅ **VALID**

```sql
- regulator_id (PK)
- regulator_code (unique)
- regulator_name_en
- regulator_name_ar
- regulator_type
- jurisdiction
- is_active
```

**Count:** 71 KSA regulators (from seed `012_seed_grc_regulators_sectors.js`)

---

### 2. Frameworks Table (`grc_frameworks`)
**Status:** ✅ **VALID**

```sql
- framework_id (PK)
- regulator_id (FK → grc_regulators) ✅ ONE-TO-MANY
- framework_code
- framework_name_en
- framework_name_ar
- framework_type (Law, Regulation, Standard, Guideline, etc.)
- compliance_level (Mandatory, Recommended, Optional, Conditional)
- is_active
```

**Relationship:** ✅ **Each regulator has many frameworks**
- Foreign Key: `regulator_id` references `grc_regulators.regulator_id`
- Cascade Delete: ON DELETE CASCADE

**Validation:**
```javascript
// From migration 012_create_comprehensive_grc_tables.js line 66
table.integer('regulator_id').notNullable()
  .references('regulator_id').inTable('grc_regulators')
  .onDelete('CASCADE');
```

**Seed File:** `013_seed_grc_frameworks.js`
- Seeds frameworks for all regulators
- Maps frameworks to regulators using `regulator_code`

---

### 3. Controls Table (`grc_controls`)
**Status:** ✅ **VALID**

```sql
- control_id (PK)
- framework_id (FK → grc_frameworks) ✅ ONE-TO-MANY
- control_code
- control_name_en
- control_name_ar
- control_type (Preventive, Detective, Corrective, etc.)
- control_category (Access Control, Data Protection, Security, etc.)
- priority (Critical, High, Medium, Low)
- is_mandatory
```

**Relationship:** ✅ **Each framework has many controls**
- Foreign Key: `framework_id` references `grc_frameworks.framework_id`
- Cascade Delete: ON DELETE CASCADE

**Validation:**
```javascript
// From migration 012_create_comprehensive_grc_tables.js line 103
table.integer('framework_id').notNullable()
  .references('framework_id').inTable('grc_frameworks')
  .onDelete('CASCADE');
```

**Seed File:** `014_seed_grc_controls.js`
- Seeds controls for all frameworks
- Maps controls to frameworks using `framework_code`

---

### 4. Control Assessments Table (`grc_control_assessments`)
**Status:** ✅ **VALID**

```sql
- assessment_id (PK)
- entity_id (FK → dga_entities)
- control_id (FK → grc_controls) ✅ ONE-TO-MANY
- framework_id (FK → grc_frameworks)
- assessment_status (Compliant, Partially Compliant, Non-Compliant, Not Assessed)
- implementation_status (Implemented, In Progress, Not Started, Not Applicable)
- implementation_percentage
- assessment_date
```

**Relationship:** ✅ **Each control has many assessments**
- Foreign Key: `control_id` references `grc_controls.control_id`
- Cascade Delete: ON DELETE CASCADE

**Validation:**
```javascript
// From migration 012_create_comprehensive_grc_tables.js line 218
table.integer('control_id').notNullable()
  .references('control_id').inTable('grc_controls')
  .onDelete('CASCADE');
```

---

### 5. Evidence Table (`grc_evidence`)
**Status:** ✅ **VALID**

```sql
- evidence_id (PK)
- assessment_id (FK → grc_control_assessments) ✅ ONE-TO-MANY
- compliance_id (FK → compliance_records, optional)
- evidence_type (Document, Screenshot, Report, Certificate, Policy, Procedure)
- evidence_name
- description
- file_path
- file_url
- file_type
- file_size
- uploaded_by (email)
- evidence_date
- expiry_date
- evidence_status (Draft, Submitted, Approved, Rejected, Expired)
- review_notes
```

**Relationship:** ✅ **Each assessment has many evidence records**
- Foreign Key: `assessment_id` references `grc_control_assessments.assessment_id`
- Cascade Delete: ON DELETE CASCADE

**Additional Links:**
- `regulator_id` (optional FK) - Direct link to regulator
- `framework_id` (optional FK) - Direct link to framework
- `control_id` (optional FK) - Direct link to control

**Validation:**
```javascript
// From migration 012_create_comprehensive_grc_tables.js line 255
table.integer('assessment_id')
  .references('assessment_id').inTable('grc_control_assessments')
  .onDelete('CASCADE');
```

**Seed File:** `015_seed_grc_evidence.js`
- Seeds evidence for assessments
- Links evidence to assessments via `assessment_id`

---

## 🔗 Complete Relationship Chain

```
grc_regulators (1)
  └── grc_frameworks (many) [regulator_id FK]
      └── grc_controls (many) [framework_id FK]
          └── grc_control_assessments (many) [control_id FK]
              └── grc_evidence (many) [assessment_id FK]
```

**All relationships validated:** ✅

---

## 📝 Backend Implementation Validation

### 1. Get Frameworks by Regulator

**Location:** `backend/src/controllers/comprehensive_grc.controller.js`

```javascript
exports.getAllFrameworks = async (req, res) => {
  const { regulator_id } = req.query;
  let query = db('grc_frameworks')
    .leftJoin('grc_regulators', 'grc_frameworks.regulator_id', 'grc_regulators.regulator_id')
    .select('grc_frameworks.*', 'grc_regulators.regulator_name_en');
  
  if (regulator_id) query = query.where({ 'grc_frameworks.regulator_id': regulator_id });
  // ...
}
```

**Status:** ✅ **IMPLEMENTED** - Can filter frameworks by regulator

---

### 2. Get Controls by Framework

**Location:** `backend/src/controllers/comprehensive_grc.controller.js`

```javascript
exports.getAllControls = async (req, res) => {
  const { framework_id } = req.query;
  let query = db('grc_controls')
    .leftJoin('grc_frameworks', 'grc_controls.framework_id', 'grc_frameworks.framework_id')
    .select('grc_controls.*', 'grc_frameworks.framework_name_en');
  
  if (framework_id) query = query.where({ 'grc_controls.framework_id': framework_id });
  // ...
}
```

**Status:** ✅ **IMPLEMENTED** - Can filter controls by framework

---

### 3. Get Assessments by Control

**Location:** `backend/src/controllers/comprehensive_grc.controller.js`

```javascript
exports.getControlAssessments = async (req, res) => {
  const { control_id } = req.query;
  let query = db('grc_control_assessments')
    .leftJoin('grc_controls', 'grc_control_assessments.control_id', 'grc_controls.control_id')
    .select('grc_control_assessments.*', 'grc_controls.control_name_en');
  
  if (control_id) query = query.where({ 'grc_control_assessments.control_id': control_id });
  // ...
}
```

**Status:** ✅ **IMPLEMENTED** - Can filter assessments by control

---

### 4. Get Evidence by Assessment

**Location:** `backend/src/controllers/comprehensive_grc.controller.js`

```javascript
exports.getEvidence = async (req, res) => {
  const { assessment_id } = req.query;
  let query = db('grc_evidence').select('*');
  
  if (assessment_id) query = query.where({ assessment_id });
  // ...
}
```

**Status:** ✅ **IMPLEMENTED** - Can filter evidence by assessment

---

## 🔍 Data Validation

### Seed Files Validation

1. **Regulators Seed** (`012_seed_grc_regulators_sectors.js`)
   - ✅ Seeds 71 KSA regulators
   - ✅ All regulators have unique codes

2. **Frameworks Seed** (`013_seed_grc_frameworks.js`)
   - ✅ Seeds frameworks for all regulators
   - ✅ Maps frameworks to regulators using `regulator_id`
   - ✅ Each framework has `regulator_id` FK

3. **Controls Seed** (`014_seed_grc_controls.js`)
   - ✅ Seeds controls for all frameworks
   - ✅ Maps controls to frameworks using `framework_id`
   - ✅ Each control has `framework_id` FK

4. **Evidence Seed** (`015_seed_grc_evidence.js`)
   - ✅ Seeds evidence for assessments
   - ✅ Maps evidence to assessments using `assessment_id`
   - ✅ Each evidence has `assessment_id` FK

---

## 📊 Hierarchy Query Examples

### Get All Frameworks for a Regulator
```sql
SELECT f.*, r.regulator_name_en
FROM grc_frameworks f
JOIN grc_regulators r ON f.regulator_id = r.regulator_id
WHERE r.regulator_id = 1;
```

### Get All Controls for a Framework
```sql
SELECT c.*, f.framework_name_en
FROM grc_controls c
JOIN grc_frameworks f ON c.framework_id = f.framework_id
WHERE f.framework_id = 1;
```

### Get All Assessments for a Control
```sql
SELECT a.*, c.control_name_en
FROM grc_control_assessments a
JOIN grc_controls c ON a.control_id = c.control_id
WHERE c.control_id = 1;
```

### Get All Evidence for an Assessment
```sql
SELECT e.*, a.assessment_status
FROM grc_evidence e
JOIN grc_control_assessments a ON e.assessment_id = a.assessment_id
WHERE a.assessment_id = 1;
```

### Complete Hierarchy Query
```sql
SELECT 
  r.regulator_name_en,
  f.framework_name_en,
  c.control_name_en,
  a.assessment_status,
  COUNT(e.evidence_id) as evidence_count
FROM grc_regulators r
JOIN grc_frameworks f ON r.regulator_id = f.regulator_id
JOIN grc_controls c ON f.framework_id = c.framework_id
LEFT JOIN grc_control_assessments a ON c.control_id = a.control_id
LEFT JOIN grc_evidence e ON a.assessment_id = e.assessment_id
WHERE r.regulator_id = 1
GROUP BY r.regulator_name_en, f.framework_name_en, c.control_name_en, a.assessment_status;
```

---

## ✅ Validation Checklist

### Database Schema
- [x] Regulators table created
- [x] Frameworks table with `regulator_id` FK
- [x] Controls table with `framework_id` FK
- [x] Assessments table with `control_id` FK
- [x] Evidence table with `assessment_id` FK
- [x] All foreign keys properly defined
- [x] Cascade delete configured
- [x] Indexes created for performance

### Data Seeding
- [x] 71 regulators seeded
- [x] Frameworks seeded with `regulator_id`
- [x] Controls seeded with `framework_id`
- [x] Evidence seeded with `assessment_id`
- [x] All relationships maintained

### Backend Implementation
- [x] Get frameworks by regulator
- [x] Get controls by framework
- [x] Get assessments by control
- [x] Get evidence by assessment
- [x] All queries support filtering

### API Endpoints
- [x] `/api/grc/comprehensive/regulators` - Get regulators
- [x] `/api/grc/comprehensive/frameworks?regulator_id=X` - Get frameworks
- [x] `/api/grc/comprehensive/controls?framework_id=X` - Get controls
- [x] `/api/grc/comprehensive/assessments?control_id=X` - Get assessments
- [x] `/api/grc/comprehensive/evidence?assessment_id=X` - Get evidence

---

## 🚨 Issues Found

### None Found ✅

All relationships are properly implemented:
- ✅ Foreign keys correctly defined
- ✅ Cascade deletes configured
- ✅ Seed files maintain relationships
- ✅ Backend queries support hierarchy navigation
- ✅ API endpoints support filtering

---

## 📈 Statistics

### Expected Hierarchy Counts:
- **Regulators:** 71
- **Frameworks:** ~200+ (multiple per regulator)
- **Controls:** ~1000+ (multiple per framework)
- **Assessments:** Variable (per entity/control)
- **Evidence:** Variable (per assessment)

---

## 🎯 Recommendations

### 1. Add Hierarchy Navigation Endpoints
```javascript
// Get complete hierarchy for a regulator
GET /api/grc/comprehensive/regulators/:id/hierarchy
// Returns: regulator → frameworks → controls → assessments → evidence
```

### 2. Add Statistics Endpoints
```javascript
// Get framework count per regulator
GET /api/grc/comprehensive/regulators/:id/statistics
// Returns: framework_count, control_count, assessment_count, evidence_count
```

### 3. Add Validation Endpoints
```javascript
// Validate hierarchy integrity
GET /api/grc/comprehensive/validate-hierarchy
// Returns: orphaned records, missing relationships
```

---

## 📊 Summary

### Hierarchy Validation: ✅ **VALID**

**Structure:**
```
Regulator (71) 
  → Framework (many per regulator) ✅
    → Control (many per framework) ✅
      → Assessment (many per control) ✅
        → Evidence (many per assessment) ✅
```

**Database:** ✅ All foreign keys properly defined  
**Seeding:** ✅ All relationships maintained  
**Backend:** ✅ All queries support hierarchy  
**API:** ✅ All endpoints support filtering  

### Overall Status: ✅ **FULLY IMPLEMENTED AND VALIDATED**

The complete hierarchy from Regulator → Framework → Control → Assessment → Evidence is properly implemented, seeded, and validated.

---

**Report Generated:** 2025-01-XX  
**Status:** ✅ All relationships validated

