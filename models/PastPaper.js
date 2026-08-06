const db = require('../config/db');
const cache = require('../services/cacheService');
const TTL = require('../config/cacheTTL');

class PastPaper {
    static async _invalidateCaches(courseId) {
        if (courseId) await cache.del(`pastPaper:course:${courseId}`);
        await cache.delByPattern('pastPapers:*');
        await cache.delByPattern('dashboard:*');
    }

    static async create(data) {
        const {
            courseId,
            year,
            type,
            semester,
            filePath,
            storageProvider = 'gdrive',
            storageKey = null,
            originalFilename,
            fileSize,
            status = 'publish'
        } = data;

        const [result] = await db.query(
            `INSERT INTO past_papers
            (
                courseId,
                year,
                type,
                semester,
                filePath,
                storageProvider,
                storageKey,
                originalFilename,
                fileSize,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                courseId,
                year,
                type,
                semester,
                filePath,
                storageProvider,
                storageKey,
                originalFilename,
                fileSize,
                status
            ]
        );

        await this._invalidateCaches(courseId);
        return this.findById(result.insertId);
    }

    static async findById(id) {
        const [rows] = await db.query(
            `SELECT
                pp.*,
                c.courseCode,
                c.courseName
            FROM past_papers pp
            LEFT JOIN courses c ON pp.courseId = c.courseId
            WHERE pp.id = ?`,
            [id]
        );

        return rows[0] || null;
    }

    static async getByCourse(courseId) {
        const cacheKey = `pastPaper:course:${courseId}`;

        return cache.remember(cacheKey, TTL.PASTPAPERS, async () => {
            const [rows] = await db.query(
                `SELECT
                    pp.*,
                    c.courseCode,
                    c.courseName
                FROM past_papers pp
                LEFT JOIN courses c ON pp.courseId = c.courseId
                WHERE pp.courseId = ?
                ORDER BY pp.year DESC,
                         pp.createdAt DESC`,
                [courseId]
            );

            return rows;
        });
    }

    static async getMarketplace(limit = 25, offset = 0) {
        const cacheKey = `pastPapers:marketplace:${limit}:${offset}`;

        return cache.remember(cacheKey, TTL.PASTPAPERS, async () => {
            const [rows] = await db.query(
                `SELECT
                    pp.*,
                    c.courseCode,
                    c.courseName
                FROM past_papers pp
                LEFT JOIN courses c ON pp.courseId = c.courseId
                WHERE pp.status='publish'
                ORDER BY pp.createdAt DESC
                LIMIT ?
                OFFSET ?`,
                [parseInt(limit), parseInt(offset)]
            );

            return rows;
        });
    }

    static async getAll(limit = 25, offset = 0) {
        const [rows] = await db.query(
            `SELECT
                pp.*,
                c.courseCode,
                c.courseName
            FROM past_papers pp
            LEFT JOIN courses c ON pp.courseId = c.courseId
            ORDER BY pp.createdAt DESC
            LIMIT ?
            OFFSET ?`,
            [parseInt(limit), parseInt(offset)]
        );

        return rows;
    }

    static async countAll() {
        const cacheKey = 'pastPapers:count';
        return cache.remember(cacheKey, TTL.PASTPAPERS, async () => {
            const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM past_papers');
            return total;
        });
    }

    static async update(id, updates) {
        const allowed = [
            'courseId',
            'year',
            'type',
            'semester',
            'filePath',
            'storageProvider',
            'storageKey',
            'originalFilename',
            'fileSize',
            'status'
        ];

        const fields = [];
        const values = [];

        for (const key of allowed) {
            if (updates[key] !== undefined) {
                fields.push(`${key}=?`);
                values.push(updates[key]);
            }
        }

        if (!fields.length)
            return this.findById(id);

        values.push(id);

        await db.query(
            `UPDATE past_papers
             SET ${fields.join(', ')}
             WHERE id=?`,
            values
        );

        const paper = await this.findById(id);

        await this._invalidateCaches(paper.courseId);

        return paper;
    }

    static async delete(id) {
        const paper = await this.findById(id);

        if (!paper)
            return false;

        await db.query(
            'DELETE FROM past_papers WHERE id=?',
            [id]
        );

        await this._invalidateCaches(paper.courseId);

        return true;
    }

    static async search(query, limit = 20) {
        const [rows] = await db.query(
            `SELECT
                pp.*,
                c.courseCode,
                c.courseName
            FROM past_papers pp
            LEFT JOIN courses c ON pp.courseId=c.courseId
            WHERE
                (
                    c.courseCode LIKE ?
                    OR c.courseName LIKE ?
                    OR pp.year LIKE ?
                )
            ORDER BY pp.createdAt DESC
            LIMIT ?`,
            [
                `%${query}%`,
                `%${query}%`,
                `%${query}%`,
                parseInt(limit)
            ]
        );

        return rows;
    }
}

module.exports = PastPaper;