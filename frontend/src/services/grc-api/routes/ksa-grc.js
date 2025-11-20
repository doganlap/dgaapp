const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

// ==========================================
// REGULATOR RULES
// ==========================================

// Get all regulator rules
router.get('/regulator-rules', authenticateToken, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const query = `
            SELECT rr.*, r.name as regulator_name, r.name_ar as regulator_name_ar
            FROM regulator_rules rr
            LEFT JOIN regulators r ON rr.regulator_id = r.id
            WHERE rr.tenant_id = ? OR rr.tenant_id IS NULL
            ORDER BY rr.created_at DESC
        `;
        
        const [rows] = await db.execute(query, [tenantId]);
        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (error) {
        console.error('Error fetching regulator rules:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch regulator rules',
            message: error.message
        });
    }
});

// Create new regulator rule
router.post('/regulator-rules', authenticateToken, checkPermission('regulator_rules', 'create'), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { regulator_id, rule_code, rule_title, rule_title_ar, description, description_ar, category, severity, compliance_deadline } = req.body;
        
        const query = `
            INSERT INTO regulator_rules (tenant_id, regulator_id, rule_code, rule_title, rule_title_ar, description, description_ar, category, severity, compliance_deadline, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await db.execute(query, [
            tenantId, regulator_id, rule_code, rule_title, rule_title_ar, 
            description, description_ar, category, severity, compliance_deadline, req.user.id
        ]);
        
        res.status(201).json({
            success: true,
            data: { id: result.insertId, ...req.body },
            message: 'Regulator rule created successfully'
        });
    } catch (error) {
        console.error('Error creating regulator rule:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create regulator rule',
            message: error.message
        });
    }
});

// ==========================================
// FRAMEWORK VERSIONS
// ==========================================

// Get all framework versions
router.get('/framework-versions', authenticateToken, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const query = `
            SELECT fv.*, gf.name as framework_name, gf.name_ar as framework_name_ar
            FROM framework_versions fv
            LEFT JOIN grc_frameworks gf ON fv.framework_id = gf.id
            WHERE fv.tenant_id = ? OR fv.tenant_id IS NULL
            ORDER BY fv.version_number DESC, fv.created_at DESC
        `;
        
        const [rows] = await db.execute(query, [tenantId]);
        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (error) {
        console.error('Error fetching framework versions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch framework versions',
            message: error.message
        });
    }
});

// Create new framework version
router.post('/framework-versions', authenticateToken, checkPermission('frameworks', 'create'), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { framework_id, version_number, version_name, version_name_ar, description, description_ar, release_date, is_active } = req.body;
        
        const query = `
            INSERT INTO framework_versions (tenant_id, framework_id, version_number, version_name, version_name_ar, description, description_ar, release_date, is_active, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await db.execute(query, [
            tenantId, framework_id, version_number, version_name, version_name_ar,
            description, description_ar, release_date, is_active, req.user.id
        ]);
        
        res.status(201).json({
            success: true,
            data: { id: result.insertId, ...req.body },
            message: 'Framework version created successfully'
        });
    } catch (error) {
        console.error('Error creating framework version:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create framework version',
            message: error.message
        });
    }
});

// ==========================================
// CONTROL REQUIREMENTS
// ==========================================

// Get all control requirements
router.get('/control-requirements', authenticateToken, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const query = `
            SELECT cr.*, gc.control_id, gc.title as control_title, gc.title_ar as control_title_ar
            FROM control_requirements cr
            LEFT JOIN grc_controls gc ON cr.control_id = gc.id
            WHERE cr.tenant_id = ? OR cr.tenant_id IS NULL
            ORDER BY cr.priority DESC, cr.created_at DESC
        `;
        
        const [rows] = await db.execute(query, [tenantId]);
        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (error) {
        console.error('Error fetching control requirements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch control requirements',
            message: error.message
        });
    }
});

// Create new control requirement
router.post('/control-requirements', authenticateToken, checkPermission('controls', 'create'), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { control_id, requirement_text, requirement_text_ar, priority, compliance_level, evidence_required } = req.body;
        
        const query = `
            INSERT INTO control_requirements (tenant_id, control_id, requirement_text, requirement_text_ar, priority, compliance_level, evidence_required, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await db.execute(query, [
            tenantId, control_id, requirement_text, requirement_text_ar,
            priority, compliance_level, evidence_required, req.user.id
        ]);
        
        res.status(201).json({
            success: true,
            data: { id: result.insertId, ...req.body },
            message: 'Control requirement created successfully'
        });
    } catch (error) {
        console.error('Error creating control requirement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create control requirement',
            message: error.message
        });
    }
});

// ==========================================
// EVIDENCE MANAGEMENT
// ==========================================

// Get all evidence
router.get('/evidence', authenticateToken, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { assessment_id, control_id } = req.query;
        
        let query = `
            SELECT e.*, ae.assessment_id, gc.title as control_title
            FROM assessment_evidence e
            LEFT JOIN assessments ae ON e.assessment_id = ae.id
            LEFT JOIN grc_controls gc ON e.control_id = gc.id
            WHERE e.tenant_id = ?
        `;
        const params = [tenantId];
        
        if (assessment_id) {
            query += ' AND e.assessment_id = ?';
            params.push(assessment_id);
        }
        
        if (control_id) {
            query += ' AND e.control_id = ?';
            params.push(control_id);
        }
        
        query += ' ORDER BY e.created_at DESC';
        
        const [rows] = await db.execute(query, params);
        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (error) {
        console.error('Error fetching evidence:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch evidence',
            message: error.message
        });
    }
});

// Create new evidence
router.post('/evidence', authenticateToken, checkPermission('evidence', 'create'), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { assessment_id, control_id, evidence_type, file_name, file_path, description, description_ar } = req.body;
        
        const query = `
            INSERT INTO assessment_evidence (tenant_id, assessment_id, control_id, evidence_type, file_name, file_path, description, description_ar, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await db.execute(query, [
            tenantId, assessment_id, control_id, evidence_type,
            file_name, file_path, description, description_ar, req.user.id
        ]);
        
        res.status(201).json({
            success: true,
            data: { id: result.insertId, ...req.body },
            message: 'Evidence uploaded successfully'
        });
    } catch (error) {
        console.error('Error creating evidence:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to upload evidence',
            message: error.message
        });
    }
});

// ==========================================
// VALIDATION MANAGEMENT
// ==========================================

// Get all validations
router.get('/validation', authenticateToken, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const query = `
            SELECT v.*, ae.file_name as evidence_file, u.name as validator_name
            FROM evidence_validations v
            LEFT JOIN assessment_evidence ae ON v.evidence_id = ae.id
            LEFT JOIN users u ON v.validated_by = u.id
            WHERE v.tenant_id = ?
            ORDER BY v.validation_date DESC
        `;
        
        const [rows] = await db.execute(query, [tenantId]);
        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (error) {
        console.error('Error fetching validations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch validations',
            message: error.message
        });
    }
});

// Create new validation
router.post('/validation', authenticateToken, checkPermission('evidence', 'validate'), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { evidence_id, validation_status, validation_notes, validation_notes_ar } = req.body;
        
        const query = `
            INSERT INTO evidence_validations (tenant_id, evidence_id, validation_status, validation_notes, validation_notes_ar, validated_by, validation_date)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const [result] = await db.execute(query, [
            tenantId, evidence_id, validation_status,
            validation_notes, validation_notes_ar, req.user.id
        ]);
        
        res.status(201).json({
            success: true,
            data: { id: result.insertId, ...req.body },
            message: 'Evidence validation completed successfully'
        });
    } catch (error) {
        console.error('Error creating validation:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create validation',
            message: error.message
        });
    }
});

// ==========================================
// SCOPES MANAGEMENT
// ==========================================

// Get all scopes
router.get('/scopes', authenticateToken, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const query = `
            SELECT s.*, o.name as organization_name, gf.name as framework_name
            FROM assessment_scopes s
            LEFT JOIN organizations o ON s.organization_id = o.id
            LEFT JOIN grc_frameworks gf ON s.framework_id = gf.id
            WHERE s.tenant_id = ?
            ORDER BY s.created_at DESC
        `;
        
        const [rows] = await db.execute(query, [tenantId]);
        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (error) {
        console.error('Error fetching scopes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch scopes',
            message: error.message
        });
    }
});

// Create new scope
router.post('/scopes', authenticateToken, checkPermission('assessments', 'create'), async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { organization_id, framework_id, scope_name, scope_name_ar, description, description_ar, business_units, systems_included } = req.body;
        
        const query = `
            INSERT INTO assessment_scopes (tenant_id, organization_id, framework_id, scope_name, scope_name_ar, description, description_ar, business_units, systems_included, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await db.execute(query, [
            tenantId, organization_id, framework_id, scope_name, scope_name_ar,
            description, description_ar, JSON.stringify(business_units), JSON.stringify(systems_included), req.user.id
        ]);
        
        res.status(201).json({
            success: true,
            data: { id: result.insertId, ...req.body },
            message: 'Assessment scope created successfully'
        });
    } catch (error) {
        console.error('Error creating scope:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create scope',
            message: error.message
        });
    }
});

module.exports = router;