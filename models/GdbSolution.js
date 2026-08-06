const db = require('../config/db');
const cache = require('../services/cacheService');
const TTL = require('../config/cacheTTL');

class GdbSolution {
    static async _invalidateCaches(courseCode) {
        if (courseCode) await cache.del(`gdbSolution:course:${courseCode}`);
        await cache.delByPattern('gdbSolutions:*');
        await cache.delByPattern('dashboard:*');
    }

    static async create(data) {
        const { courseCode, courseName, gdbTitle, solution } = data;
        
        const [result] = await db.query(
            `INSERT INTO gdb_solutions (courseCode, courseName, gdbTitle, solution)
             VALUES (?, ?, ?, ?)`,
            [courseCode, courseName, gdbTitle, solution]
        );
        
        await this._invalidateCaches(courseCode);
        return this.findById(result.insertId);
    }

    static async findById(id) {
        const [rows] = await db.query(
            `SELECT gs.*, c.courseId
             FROM gdb_solutions gs
             LEFT JOIN courses c ON gs.courseCode = c.courseCode
             WHERE gs.id = ?`,
            [id]
        );
        return rows[0] || null;
    }

    static async getByCourse(courseCode) {
        const cacheKey = `gdbSolution:course:${courseCode}`;
        return cache.remember(cacheKey, TTL.GDB_SOLUTIONS, async () => {
            const [rows] = await db.query(
                `SELECT gs.*, c.courseId
                 FROM gdb_solutions gs
                 LEFT JOIN courses c ON gs.courseCode = c.courseCode
                 WHERE gs.courseCode = ?
                 ORDER BY gs.createdAt DESC`,
                [courseCode]
            );
            return rows;
        });
    }

    static async findAll({ limit = 20, offset = 0 } = {}) {
        const cacheKey = `gdbSolutions:list:${limit}:${offset}`;
        return cache.remember(cacheKey, TTL.GDB_SOLUTIONS, async () => {
            const [rows] = await db.query(
                `SELECT gs.*, c.courseId
                 FROM gdb_solutions gs
                 LEFT JOIN courses c ON gs.courseCode = c.courseCode
                 ORDER BY gs.createdAt DESC
                 LIMIT ? OFFSET ?`,
                [parseInt(limit), parseInt(offset)]
            );
            return rows;
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
        const allowed = ['courseCode', 'courseName', 'gdbTitle', 'solution'];
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
        await this._invalidateCaches(solution.courseCode);
        return solution;
    }

    static async delete(id) {
        const solution = await this.findById(id);
        if (!solution) return false;

        await db.query('DELETE FROM gdb_solutions WHERE id = ?', [id]);
        await this._invalidateCaches(solution.courseCode);
        return true;
    }

    static async search(query, limit = 20) {
        const [rows] = await db.query(
            `SELECT gs.*, c.courseId
             FROM gdb_solutions gs
             LEFT JOIN courses c ON gs.courseCode = c.courseCode
             WHERE gs.gdbTitle LIKE ? OR gs.courseCode LIKE ? OR gs.solution LIKE ?
             ORDER BY gs.createdAt DESC
             LIMIT ?`,
            [`%${query}%`, `%${query}%`, `%${query}%`, parseInt(limit)]
        );
        return rows;
    }
}

module.exports = GdbSolution;