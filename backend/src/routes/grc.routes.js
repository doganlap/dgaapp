const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const grcController = require('../controllers/grc.controller');

// All routes require authentication
// router.use(authenticate); // Uncomment when authentication is fully set up

// ========== GRC DASHBOARD ==========

// @route   GET /api/grc/dashboard
// @desc    Get GRC dashboard overview with insights
// @access  Private
router.get('/dashboard', grcController.getDashboard);

// @route   GET /api/grc/dashboard/insights
// @desc    Get AI-powered insights and recommendations
// @access  Private
router.get('/dashboard/insights', grcController.getInsights);

// ========== RISK MANAGEMENT ==========

// @route   GET /api/grc/risks
// @desc    Get all risks with filtering and analytics
// @access  Private
router.get('/risks', grcController.getAllRisks);

// @route   GET /api/grc/risks/:id
// @desc    Get risk by ID with details
// @access  Private
router.get('/risks/:id', grcController.getRiskById);

// @route   POST /api/grc/risks
// @desc    Create new risk
// @access  Private
router.post('/risks', grcController.createRisk);

// @route   PUT /api/grc/risks/:id
// @desc    Update risk
// @access  Private
router.put('/risks/:id', grcController.updateRisk);

// @route   DELETE /api/grc/risks/:id
// @desc    Delete risk
// @access  Private (grc_admin, compliance_auditor)
router.delete('/risks/:id', grcController.deleteRisk);

// @route   GET /api/grc/risks/analytics/overview
// @desc    Get risk analytics overview
// @access  Private
router.get('/risks/analytics/overview', grcController.getRiskAnalytics);

// @route   GET /api/grc/risks/analytics/trends
// @desc    Get risk trends over time
// @access  Private
router.get('/risks/analytics/trends', grcController.getRiskTrends);

// ========== COMPLIANCE MANAGEMENT ==========

// @route   GET /api/grc/compliance
// @desc    Get all compliance records with filtering
// @access  Private
router.get('/compliance', grcController.getAllCompliance);

// @route   GET /api/grc/compliance/:id
// @desc    Get compliance record by ID
// @access  Private
router.get('/compliance/:id', grcController.getComplianceById);

// @route   POST /api/grc/compliance
// @desc    Create new compliance record
// @access  Private
router.post('/compliance', grcController.createCompliance);

// @route   PUT /api/grc/compliance/:id
// @desc    Update compliance record
// @access  Private
router.put('/compliance/:id', grcController.updateCompliance);

// @route   GET /api/grc/compliance/analytics/overview
// @desc    Get compliance analytics overview
// @access  Private
router.get('/compliance/analytics/overview', grcController.getComplianceAnalytics);

// @route   GET /api/grc/compliance/standards/:standard
// @desc    Get compliance by standard (PDPL, NCA ECC, ISO 27001, etc.)
// @access  Private
router.get('/compliance/standards/:standard', grcController.getComplianceByStandard);

// @route   GET /api/grc/compliance/entity/:entityId
// @desc    Get compliance status for specific entity
// @access  Private
router.get('/compliance/entity/:entityId', grcController.getEntityCompliance);

// ========== GOVERNANCE ==========

// @route   GET /api/grc/governance/overview
// @desc    Get governance overview
// @access  Private
router.get('/governance/overview', grcController.getGovernanceOverview);

// @route   GET /api/grc/governance/policies
// @desc    Get governance policies
// @access  Private
router.get('/governance/policies', grcController.getGovernancePolicies);

// @route   GET /api/grc/governance/frameworks
// @desc    Get governance frameworks
// @access  Private
router.get('/governance/frameworks', grcController.getGovernanceFrameworks);

// @route   GET /api/grc/governance/controls
// @desc    Get governance controls
// @access  Private
router.get('/governance/controls', grcController.getGovernanceControls);

// ========== INSIGHTS & ANALYTICS ==========

// @route   GET /api/grc/insights/risk-predictions
// @desc    Get AI-powered risk predictions
// @access  Private
router.get('/insights/risk-predictions', grcController.getRiskPredictions);

// @route   GET /api/grc/insights/compliance-trends
// @desc    Get compliance trends and forecasts
// @access  Private
router.get('/insights/compliance-trends', grcController.getComplianceTrends);

// @route   GET /api/grc/insights/recommendations
// @desc    Get actionable recommendations
// @access  Private
router.get('/insights/recommendations', grcController.getRecommendations);

// @route   GET /api/grc/insights/heatmap
// @desc    Get risk/compliance heatmap
// @access  Private
router.get('/insights/heatmap', grcController.getHeatmap);

// ========== REPORTS ==========

// @route   GET /api/grc/reports/executive-summary
// @desc    Get executive summary report
// @access  Private
router.get('/reports/executive-summary', grcController.getExecutiveSummary);

// @route   GET /api/grc/reports/risk-report
// @desc    Get comprehensive risk report
// @access  Private
router.get('/reports/risk-report', grcController.getRiskReport);

// @route   GET /api/grc/reports/compliance-report
// @desc    Get comprehensive compliance report
// @access  Private
router.get('/reports/compliance-report', grcController.getComplianceReport);

module.exports = router;

