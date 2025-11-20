const express = require('express');
const router = express.Router();
const collaborationService = require('../services/collaborationService');
const { validatePartnerAccess, requirePartnerAccess } = require('../middleware/partnerAccess');

// GET /api/collaborations - List all collaborations
router.get('/', validatePartnerAccess, async (req, res) => {
  try {
    const collaborations = await collaborationService.getCollaborations(
      req.tenantId,
      req.query
    );
    res.json({
      success: true,
      data: collaborations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch collaborations',
      message: error.message
    });
  }
});

// GET /api/collaborations/:id - Get collaboration by ID
router.get('/:id', validatePartnerAccess, async (req, res) => {
  try {
    const collaboration = await collaborationService.getCollaborationById(
      req.params.id,
      req.tenantId
    );
    res.json({
      success: true,
      data: collaboration
    });
  } catch (error) {
    res.status(error.message === 'Collaboration not found' ? 404 : 500).json({
      success: false,
      error: 'Failed to fetch collaboration',
      message: error.message
    });
  }
});

// POST /api/collaborations - Create collaboration
router.post('/', validatePartnerAccess, async (req, res) => {
  try {
    const collaboration = await collaborationService.createCollaboration(
      req.tenantId,
      req.body
    );
    res.status(201).json({
      success: true,
      message: 'Collaboration created successfully',
      data: collaboration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create collaboration',
      message: error.message
    });
  }
});

// PUT /api/collaborations/:id - Update collaboration
router.put('/:id', validatePartnerAccess, requirePartnerAccess('write'), async (req, res) => {
  try {
    const collaboration = await collaborationService.updateCollaboration(
      req.params.id,
      req.tenantId,
      req.body
    );
    res.json({
      success: true,
      message: 'Collaboration updated successfully',
      data: collaboration
    });
  } catch (error) {
    res.status(error.message === 'Collaboration not found' ? 404 : 500).json({
      success: false,
      error: 'Failed to update collaboration',
      message: error.message
    });
  }
});

// DELETE /api/collaborations/:id - Delete collaboration
router.delete('/:id', validatePartnerAccess, requirePartnerAccess('admin'), async (req, res) => {
  try {
    await collaborationService.deleteCollaboration(req.params.id, req.tenantId);
    res.json({
      success: true,
      message: 'Collaboration deleted successfully'
    });
  } catch (error) {
    res.status(error.message === 'Collaboration not found' ? 404 : 500).json({
      success: false,
      error: 'Failed to delete collaboration',
      message: error.message
    });
  }
});

module.exports = router;

