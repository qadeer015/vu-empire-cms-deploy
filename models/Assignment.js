const db = require('../config/db');
const cache = require('../services/cacheService');
const TTL = require('../config/cacheTTL');

class Assignment {
    static async _invalidateCaches(courseId) {
        if (courseId) await cache.del(`assignment:course:${courseId}`);
        await cache.delByPattern('assignments:*');
        await cache.delByPattern('dashboard:*');
    }

    static async create(data) {
        const { courseId, title, description, dueDate, filePath, originalFilename, status = 'publish', authorId } = data;

        const [result] = await db.query(
            `INSERT INTO assignments (courseId, title, description, dueDate, filePath, originalFilename, status, authorId)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [courseId, title, description, dueDate, filePath, originalFilename, status, authorId]
        );

        await this._invalidateCaches(courseId);
        return this.findById(result.insertId);
    }

    static async findById(id) {
        const [rows] = await db.query(
            `SELECT a.*, c.courseCode, c.courseName
             FROM assignments a
             LEFT JOIN courses c ON a.courseId = c.courseId
             WHERE a.id = ?`,
            [id]
        );
        return rows[0] || null;
    }

    static async getByCourse(courseId) {
        const cacheKey = `assignment:course:${courseId}`;
        return cache.remember(cacheKey, TTL.ASSIGNMENTS, async () => {
            const [rows] = await db.query(
                `SELECT a.*, c.courseCode, c.courseName
                 FROM assignments a
                 LEFT JOIN courses c ON a.courseId = c.courseId
                 WHERE a.courseId = ?
                 ORDER BY a.createdAt DESC`,
                [courseId]
            );
            return rows;
        });
    }

    static async findAll({ limit = 20, offset = 0 } = {}) {
        const cacheKey = `assignments:list:${limit}:${offset}`;
        return cache.remember(cacheKey, TTL.ASSIGNMENTS, async () => {
            const [rows] = await db.query(
                `SELECT a.*, c.courseCode, c.courseName
                 FROM assignments a
                 LEFT JOIN courses c ON a.courseId = c.courseId
                 ORDER BY a.createdAt DESC
                 LIMIT ? OFFSET ?`,
                [parseInt(limit), parseInt(offset)]
            );
            return rows;
        });
    }

    // Validate the dueDate filter value (expects YYYY-MM-DD from the date input)
    static _dueDateCondition(dueDate) {
        if (!dueDate || typeof dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
            return null;
        }
        const d = new Date(`${dueDate}T00:00:00Z`);
        return isNaN(d.getTime()) ? null : dueDate;
    }

    static async findAllWithFilters({ search, status, dueDate, limit = 20, offset = 0 } = {}) {
        const conditions = [];
        const params = [];

        if (search && search.trim()) {
            conditions.push('(a.title LIKE ? OR c.courseCode LIKE ? OR c.courseName LIKE ? OR a.description LIKE ?)');
            params.push(
                `%${search.trim()}%`,
                `%${search.trim()}%`,
                `%${search.trim()}%`,
                `%${search.trim()}%`
            );
        }

        if (status && status !== 'all') {
            conditions.push('a.status = ?');
            params.push(status);
        }

        const dueDateFilter = this._dueDateCondition(dueDate);
        if (dueDateFilter) {
            conditions.push('DATE(a.dueDate) = ?');
            params.push(dueDateFilter);
        }

        const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        const cacheKey = `assignments:filtered:${search}:${status}:${dueDate}:${limit}:${offset}`;

        return cache.remember(cacheKey, TTL.ASSIGNMENTS, async () => {
            const [rows] = await db.query(
                `SELECT a.*, c.courseCode, c.courseName
                 FROM assignments a
                 LEFT JOIN courses c ON a.courseId = c.courseId
                 ${whereClause}
                 ORDER BY a.createdAt DESC
                 LIMIT ? OFFSET ?`,
                [...params, parseInt(limit), parseInt(offset)]
            );
            return rows;
        });
    }

    static async countAllWithFilters({ search, status, dueDate } = {}) {
        const conditions = [];
        const params = [];

        if (search && search.trim()) {
            conditions.push('(a.title LIKE ? OR c.courseCode LIKE ? OR c.courseName LIKE ? OR a.description LIKE ?)');
            params.push(
                `%${search.trim()}%`,
                `%${search.trim()}%`,
                `%${search.trim()}%`,
                `%${search.trim()}%`
            );
        }

        if (status && status !== 'all') {
            conditions.push('a.status = ?');
            params.push(status);
        }

        const dueDateCountFilter = this._dueDateCondition(dueDate);
        if (dueDateCountFilter) {
            conditions.push('DATE(a.dueDate) = ?');
            params.push(dueDateCountFilter);
        }

        const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        const cacheKey = `assignments:count:${search}:${status}:${dueDate}`;

        return cache.remember(cacheKey, TTL.ASSIGNMENTS, async () => {
            const [[{ total }]] = await db.query(
                `SELECT COUNT(*) as total
                 FROM assignments a
                 LEFT JOIN courses c ON a.courseId = c.courseId
                 ${whereClause}`,
                params
            );
            return total;
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
        const allowed = ['courseId', 'title', 'description', 'dueDate', 'filePath', 'originalFilename', 'status', 'authorId'];
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
        await this._invalidateCaches(assignment.courseId);
        return assignment;
    }

    static async delete(id) {
        const assignment = await this.findById(id);
        if (!assignment) return false;

        await db.query('DELETE FROM assignments WHERE id = ?', [id]);
        await this._invalidateCaches(assignment.courseId);
        return true;
    }

    static async search(query, limit = 20) {
        const [rows] = await db.query(
            `SELECT a.*, c.courseCode, c.courseName
             FROM assignments a
             LEFT JOIN courses c ON a.courseId = c.courseId
             WHERE a.title LIKE ? OR c.courseCode LIKE ? OR a.description LIKE ?
             ORDER BY a.createdAt DESC
             LIMIT ?`,
            [`%${query}%`, `%${query}%`, `%${query}%`, parseInt(limit)]
        );
        return rows;
    }
}

module.exports = Assignment;
