const db = require('../config/db');
const cache = require('../services/cacheService');
const TTL = require('../config/cacheTTL');

class Assignment {
    static async _invalidateCaches(courseCode) {
        if (courseCode) await cache.del(`assignment:course:${courseCode}`);
        await cache.delByPattern('assignments:*');
        await cache.delByPattern('dashboard:*');
    }

    static async create(data) {
        const { courseCode, courseName, title, description, dueDate, filePath, originalFilename, status = 'publish' } = data;

        const [result] = await db.query(
            `INSERT INTO assignments (courseCode, courseName, title, description, dueDate, filePath, originalFilename, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [courseCode, courseName, title, description, dueDate, filePath, originalFilename, status]
        );

        await this._invalidateCaches(courseCode);
        return this.findById(result.insertId);
    }

    static async findById(id) {
        const [rows] = await db.query(
            `SELECT a.*, c.courseId
             FROM assignments a
             LEFT JOIN courses c ON CONVERT(a.courseCode USING utf8mb4) COLLATE utf8mb4_0900_ai_ci = CONVERT(c.courseCode USING utf8mb4) COLLATE utf8mb4_0900_ai_ci
             WHERE a.id = ?`,
            [id]
        );
        return rows[0] || null;
    }

    static async getByCourse(courseCode) {
        const cacheKey = `assignment:course:${courseCode}`;
        return cache.remember(cacheKey, TTL.ASSIGNMENTS, async () => {
            const [rows] = await db.query(
                `SELECT a.*, c.courseId
                 FROM assignments a
                 LEFT JOIN courses c ON CONVERT(a.courseCode USING utf8mb4) COLLATE utf8mb4_0900_ai_ci = CONVERT(c.courseCode USING utf8mb4) COLLATE utf8mb4_0900_ai_ci
                 WHERE CONVERT(a.courseCode USING utf8mb4) COLLATE utf8mb4_0900_ai_ci = CONVERT(? USING utf8mb4) COLLATE utf8mb4_0900_ai_ci
                 ORDER BY a.createdAt DESC`,
                [courseCode]
            );
            return rows;
        });
    }

    static async findAll({ limit = 20, offset = 0 } = {}) {
        const cacheKey = `assignments:list:${limit}:${offset}`;
        return cache.remember(cacheKey, TTL.ASSIGNMENTS, async () => {
            const [rows] = await db.query(
                `SELECT a.*, c.courseId
                 FROM assignments a
                 LEFT JOIN courses c ON CONVERT(a.courseCode USING utf8mb4) COLLATE utf8mb4_0900_ai_ci = CONVERT(c.courseCode USING utf8mb4) COLLATE utf8mb4_0900_ai_ci
                 ORDER BY a.createdAt DESC
                 LIMIT ? OFFSET ?`,
                [parseInt(limit), parseInt(offset)]
            );
            return rows;
        });
    }

    static async countAll() {
        const cacheKey = 'assignments:count';
        return cache.remember(cacheKey, TTL.ASSIGNMENTS, async () => {
            const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM assignments');
            return total;
        });
    }

    static async update(id, updates) {
        const allowed = ['courseCode', 'courseName', 'title', 'description', 'dueDate', 'filePath', 'originalFilename', 'status'];
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
        await db.query(`UPDATE assignments SET ${fields.join(', ')} WHERE id = ?`, values);

        const assignment = await this.findById(id);
        await this._invalidateCaches(assignment.courseCode);
        return assignment;
    }

    static async delete(id) {
        const assignment = await this.findById(id);
        if (!assignment) return false;

        await db.query('DELETE FROM assignments WHERE id = ?', [id]);
        await this._invalidateCaches(assignment.courseCode);
        return true;
    }

    static async search(query, limit = 20) {
        const [rows] = await db.query(
            `SELECT a.*, c.courseId
             FROM assignments a
             LEFT JOIN courses c ON CONVERT(a.courseCode USING utf8mb4) COLLATE utf8mb4_0900_ai_ci = CONVERT(c.courseCode USING utf8mb4) COLLATE utf8mb4_0900_ai_ci
             WHERE a.title LIKE ? OR a.courseCode LIKE ? OR a.description LIKE ?
             ORDER BY a.createdAt DESC
             LIMIT ?`,
            [`%${query}%`, `%${query}%`, `%${query}%`, parseInt(limit)]
        );
        return rows;
    }
}

module.exports = Assignment;