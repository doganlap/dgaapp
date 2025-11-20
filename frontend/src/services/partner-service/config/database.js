const { Pool } = require('pg');
require('dotenv').config();

let pool;

const createPool = async () => {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'grc_ecosystem',
        user: process.env.DB_USER || 'grc_user',
        password: process.env.DB_PASSWORD,
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
            console.error('Unexpected error on idle client', err);
            process.exit(-1);
        });
    }
    return pool;
};

const testConnection = async () => {
    try {
        const p = await getPool();
        const client = await p.connect();
        console.log('[Partner Service] Database connected successfully');
        client.release();
        return true;
    } catch (err) {
        console.error('[Partner Service] Database connection failed:', err.message);
        return false;
    }
};

const query = async (text, params) => {
    const p = await getPool();
    try {
        return await p.query(text, params);
    } catch (error) {
        console.error('[Partner Service] Database query error:', error.message);
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

module.exports = {
    query,
    transaction,
    testConnection
};

