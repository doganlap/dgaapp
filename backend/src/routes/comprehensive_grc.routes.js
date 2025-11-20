/**
 * Comprehensive GRC Routes
 * 
 * All routes for GRC operations
 */

const express = require('express');
const router = express.Router();
const grcController = require('../controllers/comprehensive_grc.controller');
// const { authenticate, authorize } = require('../middleware/auth');

// All GRC routes require authentication
// router.use(authenticate);

// ========== REGULATORS ==========
router.get('/regulators', grcController.getAllRegulators);
router.get('/regulators/:id', grcController.getRegulatorById);

// ========== SECTORS ==========
router.get('/sectors', grcController.getAllSectors);

// ========== FRAMEWORKS ==========
router.get('/frameworks', grcController.getAllFrameworks);
router.get('/frameworks/:id', grcController.getFrameworkById);
router.post('/frameworks', grcController.createFramework);

// ========== CONTROLS ==========
router.get('/controls', grcController.getAllControls);
router.get('/controls/:id', grcController.getControlById);
router.post('/controls', grcController.createControl);

// ========== ORGANIZATION-REGULATOR MAPPING ==========
router.get('/organizations/:entity_id/regulators', grcController.getOrganizationRegulators);
router.post('/organizations/:entity_id/regulators', grcController.mapOrganizationToRegulator);
router.post('/organizations/:entity_id/regulators/auto-map', grcController.autoMapRegulators);

// ========== CONTROL ASSESSMENTS ==========
router.get('/assessments', grcController.getControlAssessments);
router.post('/assessments', grcController.createControlAssessment);
router.put('/assessments/:id', grcController.updateControlAssessment);

// ========== EVIDENCE ==========
router.get('/evidence', grcController.getEvidence);
router.post('/evidence', grcController.createEvidence);

// ========== IMPLEMENTATION PLANS ==========
router.get('/plans', grcController.getImplementationPlans);
router.post('/plans', grcController.createImplementationPlan);

// ========== COMPLIANCE REPORTS ==========
router.get('/reports', grcController.getComplianceReports);
router.post('/reports', grcController.createComplianceReport);
router.post('/reports/generate', grcController.generateComplianceReport);

// ========== MULTI-RESPONSIBLE ASSIGNMENT & SLA TRACKING ==========
router.post('/plans/:plan_id/auto-assign', grcController.autoAssignPlanResponsibles);
router.post('/tasks/:task_id/auto-assign', grcController.autoAssignTask);
router.get('/sla-tracking', grcController.getSLATracking);
router.put('/sla-tracking/:item_type/:item_id', grcController.updateSLATracking);
router.get('/role-actions', grcController.getRoleActions);
router.post('/internal-actions', grcController.createInternalAction);
router.get('/task-assignments', grcController.getTaskAssignments);

module.exports = router;

