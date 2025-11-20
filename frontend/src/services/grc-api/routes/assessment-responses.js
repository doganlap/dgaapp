const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { assessment_id } = req.query;
    
    let whereClause = '';
    let queryParams = [];
    
    if (assessment_id) {
      whereClause = 'WHERE ar.assessment_id = $1';
      queryParams.push(assessment_id);
    }

    const result = await query(`
      SELECT 
        ar.*,
        c.title as control_title,
        c.control_code,
        u.first_name || ' ' || u.last_name as assessor_name
      FROM assessment_responses ar
      JOIN grc_controls c ON ar.control_id = c.id
      LEFT JOIN users u ON ar.assessor_id = u.id
      ${whereClause}
      ORDER BY ar.created_at DESC
    `, queryParams);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assessment responses',
      message: error.message
    });
  }
});

module.exports = router;
