/**
 * Redis Configuration for Regulatory Intelligence Service
 * Used for caching regulatory data and rate limiting
 */

const redis = require('redis');
const logger = require('../utils/logger');

let redisClient;

/**
 * Initialize Redis connection
 */
async function initializeRedis() {
  try {
    redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB || 0
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });

    await redisClient.connect();
    
    return true;
  } catch (error) {
    logger.error('❌ Redis initialization error:', error);
    // Don't throw error, allow service to continue without caching
    return false;
  }
}

/**
 * Cache regulatory change data
 */
async function cacheRegulatoryData(key, data, expirationInSeconds = 3600) {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.setEx(key, expirationInSeconds, JSON.stringify(data));
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Redis cache set error:', error);
    return false;
  }
}

/**
 * Get cached regulatory data
 */
async function getCachedRegulatoryData(key) {
  try {
    if (redisClient && redisClient.isOpen) {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    }
    return null;
  } catch (error) {
    logger.error('Redis cache get error:', error);
    return null;
  }
}

/**
 * Delete cached data
 */
async function deleteCachedData(key) {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.del(key);
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Redis cache delete error:', error);
    return false;
  }
}

/**
 * Close Redis connection
 */
async function closeRedis() {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
}

module.exports = {
  initializeRedis,
  cacheRegulatoryData,
  getCachedRegulatoryData,
  deleteCachedData,
  closeRedis,
  getClient: () => redisClient
};

