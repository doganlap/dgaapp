const express = require('express');
const router = express.Router();
const partnerService = require('../services/partnerService');
const { validatePartnerAccess } = require('../middleware/partnerAccess');

// GET /api/partners - List all partners
router.get('/', validatePartnerAccess, async (req, res) => {
  try {
    const partners = await partnerService.getPartners(req.tenantId, req.query);
    res.json({
      success: true,
      data: partners
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch partners',
      message: error.message
    });
  }
});

// GET /api/partners/:id - Get partner by ID
router.get('/:id', validatePartnerAccess, async (req, res) => {
  try {
    const partner = await partnerService.getPartnerById(req.params.id, req.tenantId);
    res.json({
      success: true,
      data: partner
    });
  } catch (error) {
    res.status(error.message === 'Partner not found' ? 404 : 500).json({
      success: false,
      error: 'Failed to fetch partner',
      message: error.message
    });
  }
});

// POST /api/partners - Create new partner
router.post('/', validatePartnerAccess, async (req, res) => {
  try {
    const partner = await partnerService.createPartner(req.tenantId, req.body);
    res.status(201).json({
      success: true,
      message: 'Partner created successfully',
      data: partner
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create partner',
      message: error.message
    });
  }
});

// POST /api/partners/invite - Invite partner
router.post('/invite', validatePartnerAccess, async (req, res) => {
  try {
    const partner = await partnerService.invitePartner(req.tenantId, req.body);
    res.status(201).json({
      success: true,
      message: 'Partner invitation sent',
      data: partner
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to invite partner',
      message: error.message
    });
  }
});

// PUT /api/partners/:id - Update partner
router.put('/:id', validatePartnerAccess, async (req, res) => {
  try {
    const partner = await partnerService.updatePartner(
      req.params.id,
      req.tenantId,
      req.body
    );
    res.json({
      success: true,
      message: 'Partner updated successfully',
      data: partner
    });
  } catch (error) {
    res.status(error.message === 'Partner not found' ? 404 : 500).json({
      success: false,
      error: 'Failed to update partner',
      message: error.message
    });
  }
});

// DELETE /api/partners/:id - Delete partner
router.delete('/:id', validatePartnerAccess, async (req, res) => {
  try {
    await partnerService.deletePartner(req.params.id, req.tenantId);
    res.json({
      success: true,
      message: 'Partner deleted successfully'
    });
  } catch (error) {
    res.status(error.message === 'Partner not found' ? 404 : 500).json({
      success: false,
      error: 'Failed to delete partner',
      message: error.message
    });
  }
});

module.exports = router;

