const express = require('express');
const { dbQueries, query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// GET /api/regulators - list regulators
router.get('/', async (req, res) => {
  try {
    const { sector, country_code, is_active = true } = req.query;

    let whereConditions = ['is_active = $1'];
    let queryParams = [is_active];
    let paramCount = 1;

    if (sector) {
      paramCount++;
      whereConditions.push(`sector = $${paramCount}`);
      queryParams.push(sector);
    }

    if (country_code) {
      paramCount++;
      whereConditions.push(`country_code = $${paramCount}`);
      queryParams.push(country_code);
    }

    const whereClause = whereConditions.join(' AND ');

    const { rows } = await query(
      `SELECT id, name, code, sector, country_code, is_active, created_at
       FROM regulators
       WHERE ${whereClause}
       ORDER BY name ASC`,
      queryParams
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Regulators list error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch regulators' });
  }
});

// GET /api/regulators/:id - regulator detail and related frameworks
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const regRes = await query(
      `SELECT id, name, code, sector, country_code, is_active, created_at
       FROM regulators
       WHERE id = $1 AND is_active = true`,
      [id]
    );

    if (regRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Regulator not found' });
    }

    const fwRes = await query(
      `SELECT id, framework_code, name, category, issuing_authority, status, is_active
       FROM grc_frameworks
       WHERE is_active = true
       ORDER BY name ASC`
    );

    res.json({ success: true, data: { regulator: regRes.rows[0], frameworks: fwRes.rows } });
  } catch (error) {
    console.error('❌ Regulator detail error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch regulator' });
  }
});

module.exports = router;

/**
 * POST /api/regulators/seed
 * Seed core regulators into the database
 */
router.post('/seed', async (req, res) => {
  try {
    const regulators = [
      { code: 'SAMA', name: 'Saudi Central Bank (SAMA)', sector: 'banking', country_code: 'SA' },
      { code: 'NCA', name: 'National Cybersecurity Authority (NCA)', sector: 'technology', country_code: 'SA' },
      { code: 'CITC', name: 'Communications and Information Technology Commission (CITC)', sector: 'telecommunications', country_code: 'SA' },
    ];

    for (const r of regulators) {
      const existing = await query('SELECT id FROM regulators WHERE code = $1', [r.code]);
      if (existing.rows.length === 0) {
        await query(
          `INSERT INTO regulators (name, code, sector, country_code, is_active)
           VALUES ($1, $2, $3, $4, true)`,
          [r.name, r.code, r.sector, r.country_code]
        );
      }
    }

    res.json({ success: true, message: 'Regulators seed completed' });
  } catch (error) {
    console.error('❌ Error seeding regulators:', error);
    res.status(500).json({ success: false, error: 'Seed failed', message: error.message });
  }
});
