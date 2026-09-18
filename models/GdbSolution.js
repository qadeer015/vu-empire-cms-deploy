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
        const { courseId, gdbTitle, solution, authorId } = data;

        const [result] = await db.query(
            `INSERT INTO gdb_solutions (courseId, gdbTitle, solution, authorId)
             VALUES (?, ?, ?, ?)`,
            [courseId, gdbTitle, solution, authorId]
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

    static async findAllWithFilters({ search, limit = 20, offset = 0 } = {}) {
        const conditions = [];
        const params = [];

        if (search && search.trim()) {
            conditions.push('(gs.gdbTitle LIKE ? OR c.courseCode LIKE ? OR c.courseName LIKE ? OR gs.solution LIKE ?)');
            params.push(
                `%${search.trim()}%`,
                `%${search.trim()}%`,
                `%${search.trim()}%`,
                `%${search.trim()}%`
            );
        }

        const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        const cacheKey = `gdbSolutions:filtered:${search}:${limit}:${offset}`;

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

    static async countAllWithFilters({ search } = {}) {
        const conditions = [];
        const params = [];

        if (search && search.trim()) {
            conditions.push('(gs.gdbTitle LIKE ? OR c.courseCode LIKE ? OR c.courseName LIKE ? OR gs.solution LIKE ?)');
            params.push(
                `%${search.trim()}%`,
                `%${search.trim()}%`,
                `%${search.trim()}%`,
                `%${search.trim()}%`
            );
        }

        const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        const cacheKey = `gdbSolutions:count:${search}`;

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
        const allowed = ['courseId', 'gdbTitle', 'solution', 'authorId'];
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
             WHERE gs.gdbTitle LIKE ? OR c.courseCode LIKE ? OR gs.solution LIKE ?
             ORDER BY gs.createdAt DESC
             LIMIT ?`,
            [`%${query}%`, `%${query}%`, `%${query}%`, parseInt(limit)]
        );
        return rows;
    }
}

module.exports = GdbSolution;
