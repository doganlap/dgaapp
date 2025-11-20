const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { response_id } = req.query;
    
    let whereClause = '';
    let queryParams = [];
    
    if (response_id) {
      whereClause = 'WHERE ae.response_id = $1';
      queryParams.push(response_id);
    }

    const result = await query(`
      SELECT 
        ae.*,
        u.first_name || ' ' || u.last_name as uploaded_by_name
      FROM assessment_evidence ae
      LEFT JOIN users u ON ae.uploaded_by = u.id
      ${whereClause}
      ORDER BY ae.upload_date DESC
    `, queryParams);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assessment evidence',
      message: error.message
    });
  }
});

module.exports = router;
