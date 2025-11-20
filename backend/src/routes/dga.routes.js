const express = require('express');
const router = express.Router();
const { authenticate, authorize, authorizeRegion } = require('../middleware/auth');
const { auditLog } = require('../middleware/validation');
const dgaController = require('../controllers/dga.controller');

// All routes require authentication
// router.use(authenticate); // Uncomment when authentication is fully set up

// ========== ENTITIES ==========

// @route   GET /api/dga/entities
// @desc    Get all entities
// @access  Private
router.get('/entities', dgaController.getAllEntities);

// @route   GET /api/dga/entities/:id
// @desc    Get entity by ID
// @access  Private
router.get('/entities/:id', dgaController.getEntityById);

// @route   POST /api/dga/entities
// @desc    Create new entity
// @access  Private (dga_admin only)
router.post('/entities', dgaController.createEntity);

// @route   PUT /api/dga/entities/:id
// @desc    Update entity
// @access  Private (dga_admin, regional_manager)
router.put('/entities/:id', dgaController.updateEntity);

// @route   DELETE /api/dga/entities/:id
// @desc    Delete entity
// @access  Private (dga_admin only)
router.delete('/entities/:id', dgaController.deleteEntity);

// ========== PROGRAMS ==========

// @route   GET /api/dga/programs
// @desc    Get all programs
// @access  Private
router.get('/programs', dgaController.getAllPrograms);

// @route   GET /api/dga/programs/:id
// @desc    Get program by ID
// @access  Private
router.get('/programs/:id', dgaController.getProgramById);

// @route   POST /api/dga/programs
// @desc    Create new program
// @access  Private
router.post('/programs', dgaController.createProgram);

// @route   PUT /api/dga/programs/:id
// @desc    Update program
// @access  Private
router.put('/programs/:id', dgaController.updateProgram);

// ========== PROJECTS ==========

// @route   GET /api/dga/projects
// @desc    Get all projects
// @access  Private
router.get('/projects', dgaController.getAllProjects);

// @route   GET /api/dga/projects/:id
// @desc    Get project by ID
// @access  Private
router.get('/projects/:id', dgaController.getProjectById);

// ========== BUDGET ==========

// @route   GET /api/dga/budget/overview
// @desc    Get budget overview
// @access  Private
router.get('/budget/overview', dgaController.getBudgetOverview);

// @route   GET /api/dga/budget/entity/:entityId
// @desc    Get entity budget
// @access  Private
router.get('/budget/entity/:entityId', dgaController.getEntityBudget);

// ========== REPORTING ==========

// @route   GET /api/dga/reporting/overview
// @desc    Get national overview
// @access  Private
router.get('/reporting/overview', dgaController.getNationalOverview);

// @route   GET /api/dga/reporting/region/:region
// @desc    Get regional report
// @access  Private
router.get('/reporting/region/:region', dgaController.getRegionalReport);

// @route   GET /api/dga/reporting/kpis
// @desc    Get all KPIs
// @access  Private
router.get('/reporting/kpis', dgaController.getKPIs);

// ========== KPIs ==========

// @route   GET /api/dga/kpis
// @desc    Get all KPIs with optional filtering
// @access  Private
router.get('/kpis', dgaController.getAllKPIs);

// ========== COMPLIANCE RECORDS ==========

// @route   GET /api/dga/compliance-records
// @desc    Get all compliance records with optional filtering
// @access  Private
router.get('/compliance-records', dgaController.getAllComplianceRecords);

// ========== RISKS ==========

// @route   GET /api/dga/risks
// @desc    Get all risks with optional filtering
// @access  Private
router.get('/risks', dgaController.getAllRisks);

// ========== STAKEHOLDER CONSENSUS ==========

// @route   GET /api/dga/stakeholder-consensus
// @desc    Get all stakeholder consensus entries with optional filtering
// @access  Private
router.get('/stakeholder-consensus', dgaController.getAllStakeholderConsensus);

// ========== DIGITAL MATURITY SCORES ==========

// @route   GET /api/dga/digital-maturity-scores
// @desc    Get all digital maturity scores with optional filtering
// @access  Private
router.get('/digital-maturity-scores', dgaController.getAllDigitalMaturityScores);

// ========== TICKETS ==========

// @route   GET /api/dga/tickets
// @desc    Get all tickets
// @access  Private
router.get('/tickets', dgaController.getAllTickets);

// @route   POST /api/dga/tickets
// @desc    Create new ticket
// @access  Private
router.post('/tickets', dgaController.createTicket);

// @route   PUT /api/dga/tickets/:id
// @desc    Update ticket
// @access  Private
router.put('/tickets/:id', dgaController.updateTicket);

// ========== USERS ==========

// @route   GET /api/dga/users
// @desc    Get all users
// @access  Private (DGA Admin only)
router.get('/users', dgaController.getAllUsers);

// @route   GET /api/dga/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/users/:id', dgaController.getUserById);

// ========== FINANCE DEMO ==========

// @route   GET /api/dga/finance/summary
// @desc    Get finance summary for demo
// @access  Private
router.get('/finance/summary', dgaController.getFinanceSummary);

// @route   GET /api/dga/finance/contracts
// @desc    Get all contracts with entity info
// @access  Private
router.get('/finance/contracts', dgaController.getFinanceContracts);

// @route   GET /api/dga/finance/invoices
// @desc    Get recent invoices with contract details
// @access  Private
router.get('/finance/invoices', dgaController.getFinanceInvoices);

// @route   GET /api/dga/finance/report
// @desc    Generate comprehensive finance report
// @access  Private
router.get('/finance/report', dgaController.generateFinanceReport);

// @route   GET /api/dga/finance/budget-trends
// @desc    Get budget trends over time
// @access  Private
router.get('/finance/budget-trends', dgaController.getBudgetTrends);

// @route   GET /api/dga/finance/contract-analysis
// @desc    Get contract analysis by status
// @access  Private
router.get('/finance/contract-analysis', dgaController.getContractAnalysis);

module.exports = router;
