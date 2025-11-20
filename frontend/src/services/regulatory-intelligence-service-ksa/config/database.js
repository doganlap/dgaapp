/**
 * Database Configuration for Regulatory Intelligence Service
 * Connects to main GRC PostgreSQL database
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'sk_ziZoE_g62VBpHvM3Nv6C7',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Unexpected database error:', err);
});

/**
 * Initialize database tables for regulatory intelligence
 */
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Create regulatory_changes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS regulatory_changes (
        id SERIAL PRIMARY KEY,
        regulator_id VARCHAR(50) NOT NULL,
        regulator_name VARCHAR(255) NOT NULL,
        title VARCHAR(500) NOT NULL,
        title_ar VARCHAR(500),
        description TEXT,
        description_ar TEXT,
        regulation_url TEXT,
        effective_date DATE,
        deadline_date DATE,
        urgency_level VARCHAR(20) DEFAULT 'medium',
        affected_sectors TEXT[],
        change_type VARCHAR(50),
        document_ref VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tenant_id INTEGER
      );
    `);

    // Create regulatory_impacts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS regulatory_impacts (
        id SERIAL PRIMARY KEY,
        regulatory_change_id INTEGER REFERENCES regulatory_changes(id),
        organization_id INTEGER,
        impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 10),
        impact_description TEXT,
        required_actions TEXT[],
        estimated_cost NUMERIC(15, 2),
        responsible_department VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tenant_id INTEGER
      );
    `);

    // Create regulatory_calendar table
    await client.query(`
      CREATE TABLE IF NOT EXISTS regulatory_calendar (
        id SERIAL PRIMARY KEY,
        regulatory_change_id INTEGER REFERENCES regulatory_changes(id),
        organization_id INTEGER,
        deadline_date_gregorian DATE NOT NULL,
        deadline_date_hijri VARCHAR(50),
        reminder_sent BOOLEAN DEFAULT FALSE,
        reminder_date DATE,
        completed BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tenant_id INTEGER
      );
    `);

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_regulatory_changes_regulator 
      ON regulatory_changes(regulator_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_regulatory_changes_urgency 
      ON regulatory_changes(urgency_level);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_regulatory_impacts_org 
      ON regulatory_impacts(organization_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_regulatory_calendar_deadline 
      ON regulatory_calendar(deadline_date_gregorian);
    `);

    logger.info('✅ Database tables for regulatory intelligence initialized');
    return true;
  } catch (error) {
    logger.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Save regulatory change to database
 */
async function saveRegulatoryChange(change) {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO regulatory_changes (
        regulator_id, regulator_name, title, title_ar, 
        description, description_ar, regulation_url, 
        effective_date, deadline_date, urgency_level, 
        affected_sectors, change_type, document_ref
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      change.regulatorId,
      change.regulatorName,
      change.title,
      change.titleAr,
      change.description,
      change.descriptionAr,
      change.regulationUrl,
      change.effectiveDate,
      change.deadlineDate,
      change.urgencyLevel,
      change.affectedSectors,
      change.changeType,
      change.documentRef
    ]);

    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Get recent regulatory changes
 */
async function getRecentChanges(regulatorId = null, limit = 50) {
  const client = await pool.connect();
  try {
    let query = `
      SELECT * FROM regulatory_changes 
      WHERE 1=1
    `;
    const params = [];
    
    if (regulatorId) {
      params.push(regulatorId);
      query += ` AND regulator_id = $${params.length}`;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initializeDatabase,
  saveRegulatoryChange,
  getRecentChanges
};

