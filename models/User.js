//models/User.js
const db = require('../config/db');
const cache = require('../services/cacheService');
const TTL = require('../config/cacheTTL');

class User {
    // ── Cache invalidation helpers ─────────────────────────────────
    static async _invalidateUserCaches(id, studentId, email) {
        if (id) await cache.del(`user:${id}`);
        if (studentId) await cache.del(`user:student:${studentId}`);
        if (email) await cache.del(`user:email:${email}`);
        await cache.delByPattern('users:*');
        await cache.delByPattern('dashboard:*');
    }

    static async findAll({ limit = 25, offset = 0 } = {}) {
        const cacheKey = `users:list:${limit}:${offset}`;
        return cache.remember(cacheKey, TTL.USERS, async () => {
            const [rows] = await db.query(
                `SELECT u.*, s.vuEmail, s.studentName
                 FROM users u
                 JOIN students s ON u.studentId = s.studentId
                 ORDER BY u.id ASC
                 LIMIT ? OFFSET ?`,
                [parseInt(limit), parseInt(offset)]
            );
            return rows;
        });
    }

    // Builds WHERE clause shared by filtered list/count
    static _buildFilters({ search, role, status } = {}) {
        const where = [];
        const params = [];

        if (search) {
            where.push('(u.studentId LIKE ? OR s.studentName LIKE ? OR s.vuEmail LIKE ?)');
            const like = `%${search}%`;
            params.push(like, like, like);
        }
        if (role && role !== 'all') {
            where.push('u.role = ?');
            params.push(role);
        }
        if (status && status !== 'all') {
            where.push('u.status = ?');
            params.push(status);
        }

        return { clause: where.length ? ` WHERE ${where.join(' AND ')}` : '', params };
    }

    static async findAllWithFilters({ search = '', role = 'all', status = 'all', limit = 50, offset = 0 } = {}) {
        const cacheKey = `users:filtered:${search}:${role}:${status}:${limit}:${offset}`;
        return cache.remember(cacheKey, TTL.USERS, async () => {
            const { clause, params } = this._buildFilters({ search, role, status });
            const [rows] = await db.query(
                `SELECT u.*, s.vuEmail, s.studentName
                 FROM users u
                 JOIN students s ON u.studentId = s.studentId
                 ${clause}
                 ORDER BY u.id ASC
                 LIMIT ? OFFSET ?`,
                [...params, parseInt(limit), parseInt(offset)]
            );
            return rows;
        });
    }

    static async countAllWithFilters({ search = '', role = 'all', status = 'all' } = {}) {
        const cacheKey = `users:filtered:count:${search}:${role}:${status}`;
        return cache.remember(cacheKey, TTL.USERS, async () => {
            const { clause, params } = this._buildFilters({ search, role, status });
            const [[{ total }]] = await db.query(
                `SELECT COUNT(*) AS total
                 FROM users u
                 JOIN students s ON u.studentId = s.studentId
                 ${clause}`,
                params
            );
            return total;
        });
    }

    static async countAll() {
        const cacheKey = 'users:count';
        return cache.remember(cacheKey, TTL.USERS, async () => {
            const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM users');
            return total;
        });
    }

    // Finds by studentId OR vuEmail
    static async findByIdentifier(identifier) {
        const cacheKey = `user:identifier:${identifier}`;
        return cache.remember(cacheKey, TTL.USERS, async () => {
            const [rows] = await db.query(
                `SELECT u.*, s.*
                 FROM users u
                 JOIN students s ON u.studentId = s.studentId
                 WHERE u.studentId = ? OR s.vuEmail = ?
                 LIMIT 1`,
                [identifier, identifier]
            );
            return rows[0] || null;
        });
    }

    static async findById(id) {
        const cacheKey = `user:${id}`;
        return cache.remember(cacheKey, TTL.USERS, async () => {
            const [rows] = await db.query(
                `SELECT u.*, s.*
                 FROM users u
                 JOIN students s ON u.studentId = s.studentId
                 WHERE u.id = ?`,
                [id]
            );
            return rows[0] || null;
        });
    }

    static async findByStudentId(studentId) {
        const cacheKey = `user:student:${studentId}`;
        return cache.remember(cacheKey, TTL.USERS, async () => {
            const [rows] = await db.query(
                `SELECT u.*, s.vuEmail, s.studentName 
                 FROM users u
                 JOIN students s ON u.studentId = s.studentId
                 WHERE u.studentId = ?`,
                [studentId]
            );
            return rows[0] || null;
        });
    }

    static async findByVuEmail(vuEmail) {
        const cacheKey = `user:email:${vuEmail}`;
        return cache.remember(cacheKey, TTL.USERS, async () => {
            const [rows] = await db.query(
                `SELECT u.*, s.vuEmail, s.studentName 
                 FROM users u
                 JOIN students s ON u.studentId = s.studentId
                 WHERE s.vuEmail = ?`,
                [vuEmail]
            );
            return rows[0] || null;
        });
    }

    static async findByResetToken(token) {
        // Don't cache reset token lookups for security
        const [rows] = await db.query(
            `SELECT u.*, s.vuEmail, s.studentName 
             FROM users u
             JOIN students s ON u.studentId = s.studentId
             WHERE u.resetToken = ? AND u.resetTokenExpiresAt > NOW()`,
            [token]
        );
        return rows[0];
    }

    static async create(userData) {
        const {
            studentId,
            password,
            role = 'admin'
        } = userData;

        const [result] = await db.query(
            `INSERT INTO users (studentId, password, role)
             VALUES (?, ?, ?)`,
            [studentId, password, role]
        );
        
        await this._invalidateUserCaches(result.insertId, studentId);
        return this.findById(result.insertId);
    }

    static async updatePassword(userId, newPassword) {
        await db.query(
            'UPDATE users SET password = ?, resetToken = NULL, resetTokenExpiresAt = NULL WHERE id = ?',
            [newPassword, userId]
        );
        await this._invalidateUserCaches(userId);
        return this.findById(userId);
    }

    static async setResetToken(identifier, resetToken, resetTokenExpires) {
        const user = await this.findByIdentifier(identifier);

        if (!user) {
            return;
        }

        await db.query(
            `UPDATE users SET resetToken = ?, resetTokenExpiresAt = ?
             WHERE studentId = ?`,
            [resetToken, resetTokenExpires, user.studentId]
        );
    }

    static async updateLastLogin(userId) {
        await db.query(
            'UPDATE users SET lastLoginAt = NOW() WHERE id = ?',
            [userId]
        );
    }

    static async updateStatus(id, status) {
        const [result] = await db.query(
            'UPDATE users SET status = ? WHERE id = ?',
            [status, id]
        );
        await this._invalidateUserCaches(id);
        return result.affectedRows;
    }

    static async getUserStats() {
        const cacheKey = 'users:stats';
        return cache.remember(cacheKey, TTL.USERS, async () => {
            const [[{ totalUsers }]] = await db.query('SELECT COUNT(*) AS totalUsers FROM users');
            const [[{ adminCount }]] = await db.query('SELECT COUNT(*) AS adminCount FROM users WHERE role = "admin"');

            return {
                totalUsers,
                adminCount
            };
        });
    }

    static async getAllUsers(excludeUserId = null) {
        const cacheKey = `users:all:${excludeUserId || 'none'}`;
        return cache.remember(cacheKey, TTL.USERS, async () => {
            let query = `
                SELECT 
                    u.id, u.studentId, u.role, u.status, u.isOnline, 
                    u.lastLoginAt, u.createdAt, u.updatedAt,
                    s.studentName, s.vuEmail
                FROM users u
                JOIN students s ON u.studentId = s.studentId
                WHERE u.status != 'deleted'
            `;

            const params = [];
            if (excludeUserId) {
                query += ` AND u.id != ?`;
                params.push(excludeUserId);
            }

            query += ` ORDER BY u.id`;

            const [rows] = await db.query(query, params);
            return rows;
        });
    }

    static async updateUser(id, updates) {
        const allowedFields = ['studentId', 'password', 'role', 'avatar', 'profilePublic', 'emailNotifications'];

        const filteredUpdates = {};
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key) && value !== undefined) {
                filteredUpdates[key] = value;
            }
        }

        if (Object.keys(filteredUpdates).length === 0) {
            return this.findById(id);
        }

        const fields = [];
        const values = [];

        for (const [key, value] of Object.entries(filteredUpdates)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
        values.push(id);

        await db.query(
            `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        await this._invalidateUserCaches(id);
        return this.findById(id);
    }

    static async deleteUser(id) {
        await db.query('UPDATE users SET status = "deleted" WHERE id = ?', [id]);
        await this._invalidateUserCaches(id);
    }
}

module.exports = User;