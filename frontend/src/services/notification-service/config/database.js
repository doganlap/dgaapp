const { Pool } = require('pg');
require('dotenv').config();

let pool;

const createPool = async () => {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'grc_master',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        min: parseInt(process.env.DB_POOL_MIN) || 2,
        max: parseInt(process.env.DB_POOL_MAX) || 10,
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 10000,
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
        ssl: false
    };

    return new Pool(dbConfig);
};

const getPool = async () => {
    if (!pool) {
        pool = await createPool();
        pool.on('error', (err, client) => {
            console.error('[Notification Service] Unexpected error on idle client', err);
            process.exit(-1);
        });
    }
    return pool;
};

const testConnection = async () => {
    try {
        const p = await getPool();
        const client = await p.connect();
        console.log('[Notification Service] Database connected successfully');
        const result = await client.query('SELECT NOW() as current_time');
        console.log('[Notification Service] Database time:', result.rows[0].current_time);
        client.release();
        return true;
    } catch (err) {
        console.error('[Notification Service] Database connection failed:', err.message);
        return false;
    }
};

const query = async (text, params) => {
    const p = await getPool();
    const start = Date.now();
    try {
        const result = await p.query(text, params);
        const duration = Date.now() - start;
        if (duration > 1000) {
            console.warn(`[Notification Service] Slow query detected (${duration}ms):`, text.substring(0, 100));
        }
        return result;
    } catch (error) {
        console.error('[Notification Service] Database query error:', error.message);
        console.error('[Notification Service] Query:', text);
        console.error('[Notification Service] Params:', params);
        throw error;
    }
};

const transaction = async (callback) => {
    const p = await getPool();
    const client = await p.connect();
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
    if (pool) {
        console.log('[Notification Service] Closing database connections...');
        await pool.end();
        console.log('[Notification Service] Database connections closed');
    }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = {
    query,
    transaction,
    testConnection,
    gracefulShutdown
};
