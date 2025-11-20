const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = ['is_active = true'];
    let queryParams = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      whereConditions.push(`category = $${paramCount}`);
      queryParams.push(category);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(name ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total FROM grc_frameworks WHERE ${whereClause}
    `, queryParams);

    // Get frameworks with pagination
    queryParams.push(limit, offset);
    const { rows } = await query(`
      SELECT
        id, name, name_ar, version, category, description,
        issuing_authority, effective_date, status, is_active,
        created_at, updated_at
      FROM grc_frameworks
      WHERE ${whereClause}
      ORDER BY name ASC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: rows,
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
    res.status(500).json({ success: false, error: 'Failed to fetch frameworks' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const frameworkResult = await query(`
      SELECT id, framework_code, name, category, issuing_authority, status, is_active
      FROM grc_frameworks
      WHERE id = $1
    `, [id]);

    if (frameworkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Framework not found'
      });
    }

    const controlsResult = await query(`
      SELECT id, framework_id, control_code, title, criticality_level, is_mandatory, is_active
      FROM grc_controls
      WHERE framework_id = $1 AND is_active = true
      ORDER BY control_code
    `, [id]);

    res.json({
      success: true,
      data: {
        framework: frameworkResult.rows[0],
        controls: controlsResult.rows
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch framework' });
  }
});

module.exports = router;

/**
 * POST /api/frameworks/seed
 * Seed core frameworks into the database
 */
router.post('/seed', async (req, res) => {
  try {
    const frameworks = [
      { code: 'ISO27001', name: 'ISO 27001', category: 'information_security', issuing_authority: 'ISO', status: 'active' },
      { code: 'NIST-CSF', name: 'NIST Cybersecurity Framework', category: 'cybersecurity', issuing_authority: 'NIST', status: 'active' },
      { code: 'SAMA-CS', name: 'SAMA Cybersecurity Framework', category: 'banking', issuing_authority: 'SAMA', status: 'active' },
    ];

    for (const fw of frameworks) {
      const existing = await query('SELECT id FROM grc_frameworks WHERE framework_code = $1', [fw.code]);
      if (existing.rows.length === 0) {
        await query(
          `INSERT INTO grc_frameworks (framework_code, name, category, issuing_authority, status, is_active)
           VALUES ($1, $2, $3, $4, $5, true)`,
          [fw.code, fw.name, fw.category, fw.issuing_authority, fw.status]
        );
      }
    }

    res.json({ success: true, message: 'Frameworks seed completed' });
  } catch (error) {
    console.error('❌ Error seeding frameworks:', error);
    res.status(500).json({ success: false, error: 'Seed failed', message: error.message });
  }
});
