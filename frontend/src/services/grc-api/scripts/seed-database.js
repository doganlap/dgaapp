const { Pool } = require('pg');

const mkPool = (db) => process.env.POSTGRES_URL
  ? new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
      database: process.env[db] || 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: { rejectUnauthorized: false }
    });

async function seedCompliance(pool) {
  const rows = await pool.query('SELECT COUNT(*)::int AS c FROM frameworks');
  if (rows.rows[0].c === 0) {
    await pool.query(`INSERT INTO frameworks (name, description) VALUES 
      ('NCA Essential Cybersecurity Controls','Saudi NCA essential controls'),
      ('SAMA Cybersecurity Framework','Saudi Arabian Monetary Authority CSF')
    `);
  }
}

async function seedFinance(pool) {
  const rows = await pool.query('SELECT COUNT(*)::int AS c FROM tenants');
  if (rows.rows[0].c === 0) {
    await pool.query(`INSERT INTO tenants (name, status) VALUES 
      ('Saudi Advanced Technology Company','active'),
      ('Gulf Financial Services','active')
    `);
  }
}

async function seedAuth(pool) {
  const rows = await pool.query('SELECT COUNT(*)::int AS c FROM users');
  if (rows.rows[0].c === 0) {
    await pool.query(`INSERT INTO users (email, username, first_name, last_name) VALUES 
      ('admin@shahin.ai','admin','System','Administrator'),
      ('owner@tenant.local','owner','Tenant','Owner')
    `);
  }
}

async function run() {
  const pools = {
    compliance: mkPool('COMPLIANCE_DB'),
    finance: mkPool('FINANCE_DB'),
    auth: mkPool('AUTH_DB')
  };

  await seedCompliance(pools.compliance);
  await seedFinance(pools.finance);
  await seedAuth(pools.auth);

  await Promise.all(Object.values(pools).map(p => p.end()));
}

run().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });