const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { framework_id, criticality_level, is_mandatory, is_active = true } = req.query;

    let whereConditions = ['c.is_active = $1'];
    let queryParams = [is_active];
    let paramCount = 1;

    if (framework_id) {
      paramCount++;
      whereConditions.push(`c.framework_id = $${paramCount}`);
      queryParams.push(framework_id);
    }

    if (criticality_level) {
      paramCount++;
      whereConditions.push(`c.criticality = $${paramCount}`);
      queryParams.push(criticality_level);
    }

    if (is_mandatory !== undefined) {
      paramCount++;
      whereConditions.push(`c.is_mandatory = $${paramCount}`);
      queryParams.push(is_mandatory === 'true');
    }

    const result = await query(`
      SELECT
        c.*,
        f.name_en as framework_name,
        f.framework_code,
        r.name_en as regulator_name,
        r.authority_code as regulator_code
      FROM unified_controls_master c
      JOIN unified_frameworks f ON c.framework_id = f.id
      JOIN unified_regulatory_authorities r ON f.regulator_id = r.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY
        c.criticality = 'critical' DESC,
        c.criticality = 'high' DESC,
        c.criticality = 'medium' DESC,
        c.is_mandatory DESC,
        c.control_id
    `, queryParams);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch controls',
      message: error.message
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT
        c.*,
        f.name_en as framework_name,
        f.framework_code,
        r.name_en as regulator_name,
        r.authority_code as regulator_code
      FROM unified_controls_master c
      JOIN unified_frameworks f ON c.framework_id = f.id
      JOIN unified_regulatory_authorities r ON f.regulator_id = r.id
      WHERE c.id = $1 AND c.is_active = true
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Control not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch control',
      message: error.message
    });
  }
});

module.exports = router;
