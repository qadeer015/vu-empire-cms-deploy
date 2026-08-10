const db = require('../config/db');
const slugify = require('slugify');
const cache = require('../services/cacheService');
const TTL = require('../config/cacheTTL');

class Course {

    // ── Cache invalidation helpers ─────────────────────────────────
    static async _invalidateCourseCaches(id, courseCode) {
        if (id) await cache.del(`course:${id}`);
        if (courseCode) await cache.del(`course:code:${courseCode}`);
        await cache.delByPattern('courses:*');
        await cache.delByPattern('dashboard:*');
    }

    static async findAll({ limit = 25, offset = 0 } = {}) {
        const cacheKey = `courses:list:${limit}:${offset}`;
        return cache.remember(cacheKey, TTL.COURSES, async () => {
            const [rows] = await db.query(
                `SELECT courseId, slug, courseCode, courseName, handoutPdf,
                        handoutOriginalFilename, downloadCount, createdAt
                 FROM courses 
                 ORDER BY courseId ASC
                 LIMIT ? OFFSET ?`,
                [parseInt(limit), parseInt(offset)]
            );
            return rows;
        });
    }

    static async findAllWithFilters({ search, handout, limit = 25, offset = 0 } = {}) {
        const conditions = [];
        const params = [];

        if (search && search.trim()) {
            conditions.push('(courseCode LIKE ? OR courseName LIKE ?)');
            params.push(`${search.trim()}%`, `%${search.trim()}%`);
        }

        if (handout === 'with') {
            conditions.push('handoutPdf IS NOT NULL');
        } else if (handout === 'without') {
            conditions.push('handoutPdf IS NULL');
        }

        const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        const cacheKey = `courses:filtered:${search}:${handout}:${limit}:${offset}`;

        console.log('FIND ALL WITH FILTERS:', { search, handout, whereClause, params, cacheKey });

        return cache.remember(cacheKey, TTL.COURSES, async () => {
            const [rows] = await db.query(
                `SELECT courseId, slug, courseCode, courseName, handoutPdf,
                        handoutOriginalFilename, downloadCount, createdAt
                 FROM courses 
                 ${whereClause}
                 ORDER BY courseId ASC
                 LIMIT ? OFFSET ?`,
                [...params, parseInt(limit), parseInt(offset)]
            );
            console.log('FIND ALL RESULT:', rows.length, 'rows');
            return rows;
        });
    }

    static async countAll() {
        const cacheKey = 'courses:count';
        return cache.remember(cacheKey, TTL.COURSES, async () => {
            const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM courses');
            return total;
        });
    }

    static async countAllWithFilters({ search, handout } = {}) {
        const conditions = [];
        const params = [];

        if (search && search.trim()) {
            conditions.push('(courseCode LIKE ? OR courseName LIKE ?)');
            params.push(`${search.trim()}%`, `%${search.trim()}%`);
        }

        if (handout === 'with') {
            conditions.push('handoutPdf IS NOT NULL');
        } else if (handout === 'without') {
            conditions.push('handoutPdf IS NULL');
        }

        const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        const cacheKey = `courses:count:${search}:${handout}`;

        console.log('COUNT ALL WITH FILTERS:', { search, handout, whereClause, params, cacheKey });

        return cache.remember(cacheKey, TTL.COURSES, async () => {
            const [[{ total }]] = await db.query(
                `SELECT COUNT(*) as total FROM courses ${whereClause}`,
                params
            );
            console.log('COUNT RESULT:', total);
            return total;
        });
    }

    /**
     * Find courses with question counts, limited and ordered by courseCode.
     */
    static async findWithStats(limit = 50, offset = 0) {
        const cacheKey = `courses:withStats:${limit}:${offset}`;
        return cache.remember(cacheKey, TTL.COURSES, async () => {
            const [rows] = await db.query(
                `SELECT c.*, COUNT(q.questionId) as questionCount
                 FROM courses c
                 LEFT JOIN questions q ON q.courseId = c.courseId
                 GROUP BY c.courseId
                 ORDER BY c.courseCode
                 LIMIT ? OFFSET ?`,
                [parseInt(limit), parseInt(offset)]
            );
            return rows;
        });
    }

    static async findById(id) {
        const cacheKey = `course:${id}`;
        return cache.remember(cacheKey, TTL.COURSES, async () => {
            const [rows] = await db.query(
                'SELECT * FROM courses WHERE courseId = ?', [id]
            );
            return rows[0] || null;
        });
    }

    static async findByCode(courseCode) {
        const cacheKey = `course:code:${courseCode}`;
        return cache.remember(cacheKey, TTL.COURSES, async () => {
            const [rows] = await db.query(
                'SELECT * FROM courses WHERE courseCode = ?', [courseCode]
            );
            return rows[0] || null;
        });
    }

    static async create(data) {
        const {
            courseCode, courseName,
            handoutPdf = null, handoutOriginalFilename = null
        } = data;

        const slug = slugify(String(courseName || courseCode), {
            lower: true, strict: true
        });

        const [result] = await db.query(
            `INSERT INTO courses
                (courseCode, courseName, slug, handoutPdf, handoutOriginalFilename)
             VALUES (?, ?, ?, ?, ?)`,
            [courseCode, courseName, slug, handoutPdf, handoutOriginalFilename]
        );
        await this._invalidateCourseCaches(result.insertId, courseCode);
        return this.findById(result.insertId);
    }

    static async update(id, data) {
        const allowed = ['courseCode', 'courseName', 'handoutPdf',
            'handoutOriginalFilename', 'downloadCount'];
        const fields = [];
        const values = [];

        for (const key of allowed) {
            if (data[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(data[key]);
            }
        }
        if (!fields.length) return this.findById(id);

        // Regenerate slug if name changes
        if (data.courseName) {
            fields.push('slug = ?');
            values.push(slugify(data.courseName, { lower: true, strict: true }));
        }

        values.push(id);
        await db.query(`UPDATE courses SET ${fields.join(', ')} WHERE courseId = ?`, values);
        await this._invalidateCourseCaches(id, data.courseCode);
        return this.findById(id);
    }

    static async incrementDownloadCount(id) {
        await db.query(
            'UPDATE courses SET downloadCount = downloadCount + 1 WHERE courseId = ?', [id]
        );
    }

    static async delete(id) {
        const [result] = await db.query('DELETE FROM courses WHERE courseId = ?', [id]);
        if (result.affectedRows > 0) {
            await this._invalidateCourseCaches(id);
        }
        return result.affectedRows > 0;
    }

    static async getCourseStats(courseId) {
        const cacheKey = `course:${courseId}:stats`;
        return cache.remember(cacheKey, TTL.COURSES, async () => {
            const [rows] = await db.query(`
                SELECT
                    c.courseId, c.courseCode, c.courseName,
                    COUNT(DISTINCT q.questionId)   AS total_questions,
                    COUNT(DISTINCT qz.quizId)      AS total_quizzes,
                    COUNT(DISTINCT pp.id)          AS total_past_papers,
                    COUNT(DISTINCT a.id)           AS total_assignments,
                    COUNT(DISTINCT gs.id)          AS total_gdb_solutions
                FROM courses c
                LEFT JOIN questions   q  ON c.courseId = q.courseId
                LEFT JOIN quizzes     qz ON c.courseId = qz.courseId
                LEFT JOIN past_papers pp ON c.courseId = pp.courseId
                LEFT JOIN assignments a  ON CONVERT(c.courseCode USING utf8mb4) COLLATE utf8mb4_0900_ai_ci = CONVERT(a.courseCode USING utf8mb4) COLLATE utf8mb4_0900_ai_ci
                LEFT JOIN gdb_solutions gs ON CONVERT(c.courseCode USING utf8mb4) COLLATE utf8mb4_0900_ai_ci = CONVERT(gs.courseCode USING utf8mb4) COLLATE utf8mb4_0900_ai_ci
                WHERE c.courseId = ?
                GROUP BY c.courseId
            `, [courseId]);
            return rows[0] || null;
        });
    }

    static async courseStats(search = '') {
        const conditions = [];
        const params = [];

        if (search && search.trim()) {
            conditions.push('(c.courseCode LIKE ? OR c.courseName LIKE ?)');
            params.push(`${search.trim()}%`, `%${search.trim()}%`);
        }

        const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        const cacheKey = `courses:allStats:${search}`;

        return cache.remember(cacheKey, TTL.COURSES, async () => {
            const [rows] = await db.query(`
                SELECT
                    c.courseCode, c.courseName,
                    c.courseId,
                    COUNT(q.questionId)                                AS question_count,
                    COUNT(DISTINCT qz.quizId)                          AS quiz_count,
                    COUNT(DISTINCT pp.id)                              AS past_paper_count,
                    COUNT(DISTINCT a.id)                               AS assignment_count,
                    COUNT(DISTINCT gs.id)                              AS gdb_count,
                    DATE_FORMAT(MAX(COALESCE(q.timestamp, qz.createdAt, pp.createdAt, a.createdAt, gs.createdAt)), '%Y-%m-%d %H:%i') AS last_updated
                FROM courses c
                LEFT JOIN questions   q  ON c.courseId = q.courseId
                LEFT JOIN quizzes     qz ON c.courseId = qz.courseId
                LEFT JOIN past_papers pp ON c.courseId = pp.courseId
                LEFT JOIN assignments a  ON CONVERT(c.courseCode USING utf8mb4) COLLATE utf8mb4_0900_ai_ci = CONVERT(a.courseCode USING utf8mb4) COLLATE utf8mb4_0900_ai_ci
                LEFT JOIN gdb_solutions gs ON CONVERT(c.courseCode USING utf8mb4) COLLATE utf8mb4_0900_ai_ci = CONVERT(gs.courseCode USING utf8mb4) COLLATE utf8mb4_0900_ai_ci
                ${whereClause}
                GROUP BY c.courseId
                ORDER BY question_count DESC, c.courseCode
            `, params);
            return rows;
        });
    }
}

module.exports = Course;