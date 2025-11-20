const express = require('express');
const router = express.Router();
const { validatePartnerAccess, requirePartnerAccess } = require('../middleware/partnerAccess');
const { query } = require('../config/database');

// GET /api/partners/:partnerId/resources - Get shared resources
router.get('/:partnerId/resources', validatePartnerAccess, async (req, res) => {
  try {
    const { partnerId } = req.params;
    
    const result = await query(`
      SELECT 
        c.id as collaboration_id,
        c.shared_resources,
        c.access_level,
        c.collaboration_type
      FROM partner_collaborations c
      JOIN partners p ON c.partner_id = p.id
      WHERE c.partner_id = $1 AND c.tenant_id = $2
    `, [partnerId, req.tenantId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shared resources',
      message: error.message
    });
  }
});

// POST /api/partners/:partnerId/share-resource - Share resource with partner
router.post('/:partnerId/share-resource', validatePartnerAccess, requirePartnerAccess('write'), async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { resource_type, resource_id, access_level = 'read' } = req.body;

    // Find or create collaboration
    let collaboration = await query(`
      SELECT id, shared_resources
      FROM partner_collaborations
      WHERE partner_id = $1 AND tenant_id = $2
      LIMIT 1
    `, [partnerId, req.tenantId]);

    if (collaboration.rows.length === 0) {
      // Create new collaboration
      const { v4: uuidv4 } = require('uuid');
      const newCollaboration = await query(`
        INSERT INTO partner_collaborations (
          id, tenant_id, partner_id, collaboration_type,
          shared_resources, access_level, created_at
        ) VALUES ($1, $2, $3, 'resource_sharing', $4, $5, CURRENT_TIMESTAMP)
        RETURNING *
      `, [
        uuidv4(),
        req.tenantId,
        partnerId,
        JSON.stringify([{ resource_type, resource_id, access_level }]),
        access_level
      ]);

      return res.status(201).json({
        success: true,
        message: 'Resource shared successfully',
        data: newCollaboration.rows[0]
      });
    }

    // Update existing collaboration
    const existingResources = collaboration.rows[0].shared_resources || [];
    const updatedResources = [
      ...existingResources,
      { resource_type, resource_id, access_level, shared_at: new Date().toISOString() }
    ];

    const updated = await query(`
      UPDATE partner_collaborations
      SET shared_resources = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [JSON.stringify(updatedResources), collaboration.rows[0].id]);

    res.json({
      success: true,
      message: 'Resource shared successfully',
      data: updated.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to share resource',
      message: error.message
    });
  }
});

module.exports = router;

