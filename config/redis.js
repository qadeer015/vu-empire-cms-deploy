// config/redis.js
// Upstash Redis client – reads credentials from environment variables.
// Exports a singleton Redis instance used throughout the application.

const { Redis } = require('@upstash/redis');

require('dotenv').config();

let redis = null;

try {
    // Only initialize if credentials are provided.
    // This allows the app to run without Redis in local dev if needed.
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        console.log('[REDIS] Upstash Redis client initialized');
    } else {
        console.warn('[REDIS] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set – Redis caching disabled');
    }
} catch (err) {
    console.error('[REDIS] Failed to initialize Redis client:', err.message);
}

module.exports = redis;