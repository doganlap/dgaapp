const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

/**
 * Universal table viewer endpoint for dynamic table access
 */
router.get('/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { page = 1, limit = 10, search, sortBy, sortOrder = 'ASC' } = req.query;
    
    // Whitelist allowed tables for security
    const allowedTables = [
      'organizations', 'users', 'regulators', 'grc_frameworks', 
      'grc_controls', 'assessments', 'assessment_templates',
      'assessment_responses', 'assessment_evidence'
    ];
    
    if (!allowedTables.includes(tableName)) {
      return res.status(400).json({
        success: false,
        error: 'Table not allowed',
        message: `Table '${tableName}' is not accessible through this endpoint`
      });
    }

    const offset = (page - 1) * limit;
    
    // Build search condition
    let searchCondition = '';
    let queryParams = [];
    let paramCount = 0;
    
    if (search) {
      // This is a simplified search - in production, you'd want more sophisticated search
      paramCount++;
      searchCondition = `WHERE CAST(${tableName} AS TEXT) ILIKE $${paramCount}`;
      queryParams.push(`%${search}%`);
    }
    
    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total FROM ${tableName} ${searchCondition}
    `, queryParams);
    
    // Get data with pagination
    queryParams.push(limit, offset);
    const dataResult = await query(`
      SELECT * FROM ${tableName} 
      ${searchCondition}
      ORDER BY ${sortBy || 'created_at'} ${sortOrder}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch table data',
      message: error.message
    });
  }
});

/**
 * Get table schema information
 */
router.get('/:tableName/schema', async (req, res) => {
  try {
    const { tableName } = req.params;
    
    const result = await query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `, [tableName]);

    res.json({
      success: true,
      columns: result.rows
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch table schema',
      message: error.message
    });
  }
});

module.exports = router;
