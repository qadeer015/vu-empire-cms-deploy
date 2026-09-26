const db = require('../config/db');
const cache = require('../services/cacheService');
const TTL = require('../config/cacheTTL');

class GdbSolution {
    static async _invalidateCaches(courseId) {
        if (courseId) await cache.del(`gdbSolution:course:${courseId}`);
        await cache.delByPattern('gdbSolutions:*');
        await cache.delByPattern('dashboard:*');
    }

    static async create(data) {
        const { courseId, questionTitle, questionDescription, solution, startDate, endDate, status, authorId } = data;

        const [result] = await db.query(
            `INSERT INTO gdb_solutions (courseId, questionTitle, questionDescription, solution, startDate, endDate, status, authorId)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [courseId, questionTitle, questionDescription || null, solution, startDate || null, endDate || null, status || 'open', authorId]
        );

        await this._invalidateCaches(courseId);
        return this.findById(result.insertId);
    }

    static async findById(id) {
        const [rows] = await db.query(
            `SELECT gs.*, c.courseCode, c.courseName
             FROM gdb_solutions gs
             LEFT JOIN courses c ON gs.courseId = c.courseId
             WHERE gs.id = ?`,
            [id]
        );
        return rows[0] || null;
    }

    static async getByCourse(courseId) {
        const cacheKey = `gdbSolution:course:${courseId}`;
        return cache.remember(cacheKey, TTL.GDB_SOLUTIONS, async () => {
            const [rows] = await db.query(
                `SELECT gs.*, c.courseCode, c.courseName
                 FROM gdb_solutions gs
                 LEFT JOIN courses c ON gs.courseId = c.courseId
                 WHERE gs.courseId = ?
                 ORDER BY gs.createdAt DESC`,
                [courseId]
            );
            return rows;
        });
    }

    static async findAll({ limit = 20, offset = 0 } = {}) {
        const cacheKey = `gdbSolutions:list:${limit}:${offset}`;
        return cache.remember(cacheKey, TTL.GDB_SOLUTIONS, async () => {
            const [rows] = await db.query(
                `SELECT gs.*, c.courseCode, c.courseName
                 FROM gdb_solutions gs
                 LEFT JOIN courses c ON gs.courseId = c.courseId
                 ORDER BY gs.createdAt DESC
                 LIMIT ? OFFSET ?`,
                [parseInt(limit), parseInt(offset)]
            );
            return rows;
        });
    }

    // Validate a YYYY-MM-DD filter value coming from a date input
    static _dateCondition(value) {
        if (!value || value === 'all' || typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return null;
        }
        const d = new Date(`${value}T00:00:00Z`);
        return isNaN(d.getTime()) ? null : value;
    }

    static async findAllWithFilters({ search, createdDate, startDate, endDate, status, limit = 20, offset = 0 } = {}) {
        const conditions = [];
        const params = [];

        if (search && search.trim()) {
            conditions.push('(gs.questionTitle LIKE ? OR gs.questionDescription LIKE ? OR c.courseCode LIKE ? OR c.courseName LIKE ?)');
            params.push(
                `%${search.trim()}%`,
                `%${search.trim()}%`,
                `%${search.trim()}%`,
                `%${search.trim()}%`
            );
        }

        if (createdDate) {
            conditions.push('DATE(gs.createdAt) = ?');
            params.push(createdDate);
        }

        const startDateFilter = this._dateCondition(startDate);
        if (startDateFilter) {
            conditions.push('DATE(gs.startDate) = ?');
            params.push(startDateFilter);
        }

        const endDateFilter = this._dateCondition(endDate);
        if (endDateFilter) {
            conditions.push('DATE(gs.endDate) = ?');
            params.push(endDateFilter);
        }

        if (status && status !== 'all') {
            conditions.push('gs.status = ?');
            params.push(status);
        }

        const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        const cacheKey = `gdbSolutions:filtered:${search}:${createdDate || ''}:${startDate || ''}:${endDate || ''}:${status || ''}:${limit}:${offset}`;

        return cache.remember(cacheKey, TTL.GDB_SOLUTIONS, async () => {
            const [rows] = await db.query(
                `SELECT gs.*, c.courseCode, c.courseName
                 FROM gdb_solutions gs
                 LEFT JOIN courses c ON gs.courseId = c.courseId
                 ${whereClause}
                 ORDER BY gs.createdAt DESC
                 LIMIT ? OFFSET ?`,
                [...params, parseInt(limit), parseInt(offset)]
            );
            return rows;
        });
    }

    static async countAllWithFilters({ search, createdDate, startDate, endDate, status } = {}) {
        const conditions = [];
        const params = [];

        if (search && search.trim()) {
            conditions.push('(gs.questionTitle LIKE ? OR gs.questionDescription LIKE ? OR c.courseCode LIKE ? OR c.courseName LIKE ?)');
            params.push(
                `%${search.trim()}%`,
                `%${search.trim()}%`,
                `%${search.trim()}%`,
                `%${search.trim()}%`
            );
        }

        if (createdDate) {
            conditions.push('DATE(gs.createdAt) = ?');
            params.push(createdDate);
        }

        const startDateCountFilter = this._dateCondition(startDate);
        if (startDateCountFilter) {
            conditions.push('DATE(gs.startDate) = ?');
            params.push(startDateCountFilter);
        }

        const endDateCountFilter = this._dateCondition(endDate);
        if (endDateCountFilter) {
            conditions.push('DATE(gs.endDate) = ?');
            params.push(endDateCountFilter);
        }

        if (status && status !== 'all') {
            conditions.push('gs.status = ?');
            params.push(status);
        }

        const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        const cacheKey = `gdbSolutions:count:${search}:${createdDate || ''}:${startDate || ''}:${endDate || ''}:${status || ''}`;

        return cache.remember(cacheKey, TTL.GDB_SOLUTIONS, async () => {
            const [[{ total }]] = await db.query(
                `SELECT COUNT(*) as total
                 FROM gdb_solutions gs
                 LEFT JOIN courses c ON gs.courseId = c.courseId
                 ${whereClause}`,
                params
            );
            return total;
        });
    }

    static async countAll() {
        const cacheKey = 'gdbSolutions:count';
        return cache.remember(cacheKey, TTL.GDB_SOLUTIONS, async () => {
            const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM gdb_solutions');
            return total;
        });
    }

    static async update(id, updates) {
        const allowed = ['courseId', 'questionTitle', 'questionDescription', 'solution', 'startDate', 'endDate', 'status', 'authorId'];
        const fields = [];
        const values = [];

        for (const key of allowed) {
            if (updates[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(updates[key]);
            }
        }

        if (!fields.length) return this.findById(id);

        values.push(id);
        await db.query(`UPDATE gdb_solutions SET ${fields.join(', ')} WHERE id = ?`, values);

        const solution = await this.findById(id);
        await this._invalidateCaches(solution.courseId);
        return solution;
    }

    static async delete(id) {
        const solution = await this.findById(id);
        if (!solution) return false;

        await db.query('DELETE FROM gdb_solutions WHERE id = ?', [id]);
        await this._invalidateCaches(solution.courseId);
        return true;
    }

    static async search(query, limit = 20) {
        const [rows] = await db.query(
            `SELECT gs.*, c.courseCode, c.courseName
             FROM gdb_solutions gs
             LEFT JOIN courses c ON gs.courseId = c.courseId
             WHERE gs.questionTitle LIKE ? OR gs.questionDescription LIKE ? OR c.courseCode LIKE ? OR gs.solution LIKE ?
             ORDER BY gs.createdAt DESC
             LIMIT ?`,
            [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, parseInt(limit)]
        );
        return rows;
    }
}

module.exports = GdbSolution;
