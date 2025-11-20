const { Pool } = require('pg');
require('dotenv').config();
const { getSecret } = require('../src/services/keyVault');

// Multi-database pools for 3-database architecture
let pools = {};

const DATABASE_CONFIGS = {
  // 1. Core Business Workflow - KSA Compliance
  compliance: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.COMPLIANCE_DB || 'shahin_ksa_compliance',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 10000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
    ssl: false
  },

  // 2. Finance & Administration
  finance: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.FINANCE_DB || 'grc_master',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 10000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
    ssl: false
  },

  // 3. Access & Authority Control
  auth: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.AUTH_DB || 'shahin_access_control',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 10000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
    ssl: false
  }
};

const createPools = async () => {
    for (const [dbName, config] of Object.entries(DATABASE_CONFIGS)) {
        if (process.env.NODE_ENV === 'production' && process.env.KEY_VAULT_NAME) {
            console.log(`[INFO] Fetching DB credentials for ${dbName} from Azure Key Vault...`);
            try {
                const [userSecret, passwordSecret] = await Promise.all([
                    getSecret('DB-USER'),
                    getSecret('DB-PASSWORD')
                ]);
                config.user = userSecret.value;
                config.password = passwordSecret.value;
                console.log(`[INFO] Successfully fetched DB credentials for ${dbName} from Key Vault.`);
            } catch (error) {
                console.error(`[ERROR] Could not fetch secrets for ${dbName} from Key Vault.`, error);
            }
        }

        if (process.env.POSTGRES_URL) {
            pools[dbName] = new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } });
        } else {
            pools[dbName] = new Pool(config);
        }
        pools[dbName].on('error', (err, client) => {
            console.error(`Unexpected error on idle client for ${dbName}`, err);
        });
    }

    return pools;
};

const getPools = async () => {
    if (Object.keys(pools).length === 0) {
        pools = await createPools();
    }
    return pools;
};

const getPool = async (dbType = 'finance') => {
    const allPools = await getPools();
    return allPools[dbType];
};

const testConnection = async () => {
    try {
        await getPools();
        const results = {};
        
        for (const [dbName, pool] of Object.entries(pools)) {
            try {
                const client = await pool.connect();
                const result = await client.query('SELECT NOW() as current_time');
                console.log(`[INFO] ${dbName.toUpperCase()} database connected successfully`);
                console.log(`[INFO] ${dbName.toUpperCase()} database time:`, result.rows[0].current_time);
                client.release();
                results[dbName] = { status: 'connected', database: DATABASE_CONFIGS[dbName].database };
            } catch (err) {
                console.error(`[ERROR] ${dbName.toUpperCase()} database connection failed:`, err.message);
                results[dbName] = { status: 'error', error: err.message };
            }
        }
        
        return results;
    } catch (err) {
        console.error('[ERROR] Database initialization failed:', err.message);
        return false;
    }
};

// Multi-database query functions
const dbQueries = {
    // Compliance database queries
    compliance: {
        async query(text, params) {
            const pool = await getPool('compliance');
            const start = Date.now();
            try {
                const result = await pool.query(text, params);
                const duration = Date.now() - start;
                if (duration > 1000) {
                    console.warn(`[WARN] Slow COMPLIANCE query detected (${duration}ms):`, text.substring(0, 100));
                }
                return result;
            } catch (error) {
                console.error('[ERROR] COMPLIANCE database query error:', error.message);
                console.error('[ERROR] Query:', text);
                throw error;
            }
        }
    },

    // Finance database queries
    finance: {
        async query(text, params) {
            const pool = await getPool('finance');
            const start = Date.now();
            try {
                const result = await pool.query(text, params);
                const duration = Date.now() - start;
                if (duration > 1000) {
                    console.warn(`[WARN] Slow FINANCE query detected (${duration}ms):`, text.substring(0, 100));
                }
                return result;
            } catch (error) {
                console.error('[ERROR] FINANCE database query error:', error.message);
                console.error('[ERROR] Query:', text);
                throw error;
            }
        }
    },

    // Auth database queries
    auth: {
        async query(text, params) {
            const pool = await getPool('auth');
            const start = Date.now();
            try {
                const result = await pool.query(text, params);
                const duration = Date.now() - start;
                if (duration > 1000) {
                    console.warn(`[WARN] Slow AUTH query detected (${duration}ms):`, text.substring(0, 100));
                }
                return result;
            } catch (error) {
                console.error('[ERROR] AUTH database query error:', error.message);
                console.error('[ERROR] Query:', text);
                throw error;
            }
        }
    }
};

// Legacy query function for backward compatibility (defaults to finance DB)
const query = async (text, params) => {
    return await dbQueries.finance.query(text, params);
};

const transaction = async (callback, dbType = 'finance') => {
    const pool = await getPool(dbType);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const gracefulShutdown = async () => {
    if (Object.keys(pools).length > 0) {
        console.log('[INFO] Closing database connections...');
        await Promise.all(Object.values(pools).map(pool => pool.end()));
        console.log('[INFO] All database connections closed');
    }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = {
    query,
    transaction,
    testConnection,
    gracefulShutdown,
    dbQueries,
    getPools,
    getPool,
    DATABASE_CONFIGS
};
