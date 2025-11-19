const knex = require('knex');
require('dotenv').config();

// Parse DATABASE_URL if provided, otherwise use individual config
let connectionConfig;
if (process.env.DATABASE_URL) {
  // Use connection string directly (Knex will parse it)
  connectionConfig = process.env.DATABASE_URL;
} else {
  connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'dga_oversight',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: false,
  };
}

const dbConfig = {
  client: 'pg',
  connection: connectionConfig,
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: './database/migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './database/seeds',
  },
};

// Regional database connections
const regionalDatabases = {
  central: knex({
    ...dbConfig,
    connection: process.env.CENTRAL_REGION_DB || dbConfig.connection,
  }),
  western: knex({
    ...dbConfig,
    connection: process.env.WESTERN_REGION_DB || dbConfig.connection,
  }),
  eastern: knex({
    ...dbConfig,
    connection: process.env.EASTERN_REGION_DB || dbConfig.connection,
  }),
  northern: knex({
    ...dbConfig,
    connection: process.env.NORTHERN_REGION_DB || dbConfig.connection,
  }),
  southern: knex({
    ...dbConfig,
    connection: process.env.SOUTHERN_REGION_DB || dbConfig.connection,
  }),
};

// Main database connection
const db = knex(dbConfig);

// Get database by region
const getRegionalDb = (region) => {
  const regionLower = region?.toLowerCase();
  return regionalDatabases[regionLower] || db;
};

// Test database connection
const testConnection = async () => {
  try {
    await db.raw('SELECT 1+1 AS result');
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

module.exports = {
  db,
  getRegionalDb,
  testConnection,
  dbConfig,
};
