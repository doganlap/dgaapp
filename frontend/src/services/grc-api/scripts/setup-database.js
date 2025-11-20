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

const sql = {
  compliance: `
    CREATE TABLE IF NOT EXISTS frameworks (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `,
  finance: `
    CREATE TABLE IF NOT EXISTS tenants (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `,
  auth: `
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `
};

async function run() {
  const pools = {
    compliance: mkPool('COMPLIANCE_DB'),
    finance: mkPool('FINANCE_DB'),
    auth: mkPool('AUTH_DB')
  };

  await pools.compliance.query(sql.compliance);
  await pools.finance.query(sql.finance);
  await pools.auth.query(sql.auth);

  await pools.auth.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT');
  await pools.auth.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT');
  await pools.auth.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT');
  await pools.auth.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true');
  await pools.auth.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()');

  await Promise.all(Object.values(pools).map(p => p.end()));
}

run().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});