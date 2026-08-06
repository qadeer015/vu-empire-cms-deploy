// services/cacheService.js
// Generic cache service built on Upstash Redis.
// Provides get / set / del / delByPattern / remember helpers.
// Features:
//   - Request coalescing (prevents cache stampede)
//   - Graceful fallback to DB when Redis is unavailable
//   - Development-only logging
//   - Centralised TTL via config/cacheTTL.js

const redis = require('../config/redis');
const TTL = require('../config/cacheTTL');
const isDev = process.env.NODE_ENV !== 'production';

// ─── In-flight promise map for request coalescing ────────────────────
const inflight = new Map();

// ─── Logging helpers (dev only) ──────────────────────────────────────
function logHit(key) {
    if (isDev) console.log(`[CACHE HIT] ${key}`);
}
function logMiss(key) {
    if (isDev) console.log(`[CACHE MISS] ${key}`);
}
function logInvalidate(key) {
    if (isDev) console.log(`[CACHE INVALIDATE] ${key}`);
}

// ─── Core cache service ──────────────────────────────────────────────

const cacheService = {
    /**
     * Get a cached value by key.
     * Returns parsed JSON or null on miss / error.
     */
    async get(key) {
        if (!redis) return null;
        try {
            const data = await redis.get(key);
            if (data) {
                logHit(key);
                return typeof data === 'string' ? JSON.parse(data) : data;
            }
            logMiss(key);
            return null;
        } catch (err) {
            console.error(`[REDIS ERROR] get(${key}): ${err.message}`);
            return null;
        }
    },

    /**
     * Store a value in Redis with a TTL.
     * @param {string} key
     * @param {*} value – will be JSON-serialised
     * @param {number} ttl – seconds
     */
    async set(key, value, ttl) {
        if (!redis) return;
        try {
            await redis.set(key, JSON.stringify(value), { ex: ttl });
        } catch (err) {
            console.error(`[REDIS ERROR] set(${key}): ${err.message}`);
        }
    },

    /**
     * Delete a single key.
     */
    async del(key) {
        if (!redis) return;
        try {
            await redis.del(key);
            logInvalidate(key);
        } catch (err) {
            console.error(`[REDIS ERROR] del(${key}): ${err.message}`);
        }
    },

    /**
     * Delete all keys matching a glob pattern.
     * Uses SCAN to iterate (non-blocking).
     * @param {string} pattern – e.g. "post:*"
     */
    async delByPattern(pattern) {
        if (!redis) return;
        try {
            let cursor = 0;
            do {
                const result = await redis.scan(cursor, { match: pattern, count: 100 });
                cursor = result[0];
                const keys = result[1];
                if (keys.length > 0) {
                    await redis.del(...keys);
                    if (isDev) {
                        keys.forEach(k => logInvalidate(k));
                    }
                }
            } while (cursor !== 0);
        } catch (err) {
            console.error(`[REDIS ERROR] delByPattern(${pattern}): ${err.message}`);
        }
    },

    /**
     * Remember – the main caching helper.
     * Checks Redis first; on miss, executes callback, stores result, returns it.
     * Request coalescing: concurrent callers for the same key share a single promise.
     *
     * @param {string} key
     * @param {number} ttl – seconds
     * @param {Function} callback – async function that returns fresh data
     * @returns {*} cached or fresh data
     */
    async remember(key, ttl, callback) {
        // 1. Try cache first
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }

        // 2. Request coalescing – if a request for this key is already in-flight,
        //    wait for it instead of duplicating the DB query.
        if (inflight.has(key)) {
            return inflight.get(key);
        }

        // 3. Launch the DB query and store the promise
        const promise = (async () => {
            try {
                const data = await callback();
                // Store in cache (fire-and-forget, don't block the response)
                await this.set(key, data, ttl);
                return data;
            } finally {
                // Clean up the inflight map regardless of success/failure
                inflight.delete(key);
            }
        })();

        inflight.set(key, promise);
        return promise;
    },
};

module.exports = cacheService;