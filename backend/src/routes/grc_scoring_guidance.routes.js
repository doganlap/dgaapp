/**
 * GRC Scoring, Leading Indicators & Guidance Routes
 */

const express = require('express');
const router = express.Router();
const scoringController = require('../controllers/grc_scoring_guidance.controller');
// const { authenticate, authorize } = require('../middleware/auth');

// router.use(authenticate);

// Scoring
router.get('/scoring/compliance', scoringController.getComplianceScore);
router.get('/scoring/risk', scoringController.getRiskScore);
router.get('/scoring/maturity/:entity_id', scoringController.getMaturityScore);

// Leading Indicators
router.get('/indicators/leading', scoringController.getLeadingIndicators);

// Guidance
router.get('/guidance', scoringController.getGuidance);

module.exports = router;

