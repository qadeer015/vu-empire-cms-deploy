// models/Quiz.js
const db = require('../config/db');
const cache = require('../services/cacheService');
const TTL = require('../config/cacheTTL');

class Quiz {
    // ── Cache invalidation helpers ─────────────────────────────────
    static async _invalidateQuizCaches(quizId) {
        if (quizId) await cache.del(`quiz:${quizId}`);
        await cache.delByPattern('quizzes:*');
        await cache.delByPattern('quizTree:*');
        await cache.delByPattern('dashboard:*');
    }

    static async findByCourseAndTitle(courseId, title) {
        const cacheKey = `quiz:course:${courseId}:title:${title}`;
        return cache.remember(cacheKey, TTL.QUIZZES, async () => {
            const [rows] = await db.query(
                'SELECT * FROM quizzes WHERE courseId = ? AND title = ?',
                [courseId, title]
            );
            return rows[0] || null;
        });
    }

    static async create({ courseId, title, type = 'quiz' }) {
        const [result] = await db.query(
            'INSERT INTO quizzes (courseId, title, type) VALUES (?, ?, ?)',
            [courseId, title, type]
        );
        await this._invalidateQuizCaches(result.insertId);
        return { quizId: result.insertId, courseId, title, type };
    }

    static async findById(quizId) {
        const cacheKey = `quiz:${quizId}`;
        return cache.remember(cacheKey, TTL.QUIZZES, async () => {
            const [rows] = await db.query(`
            SELECT
                qz.*,
                c.courseCode,
                c.courseName
            FROM quizzes qz
            JOIN courses c
                ON qz.courseId = c.courseId
            WHERE qz.quizId = ?
        `, [quizId]);
            return rows[0] || null;
        });
    }

    static async findByCourse(courseId) {
        const cacheKey = `quizzes:course:${courseId}`;
        return cache.remember(cacheKey, TTL.QUIZZES, async () => {
            const [rows] = await db.query(
                'SELECT * FROM quizzes WHERE courseId = ? ORDER BY quizId',
                [courseId]
            );
            return rows;
        });
    }

    static async findAll({ limit = 50, offset = 0 } = {}) {
        const cacheKey = `quizzes:list:${limit}:${offset}`;
        return cache.remember(cacheKey, TTL.QUIZZES, async () => {
            const [rows] = await db.query(`
                SELECT
                    qz.quizId, qz.title, qz.type, qz.createdAt,
                    c.courseId, c.courseCode, c.courseName,
                    COUNT(q.questionId) AS question_count
                FROM quizzes qz
                JOIN courses c ON qz.courseId = c.courseId
                LEFT JOIN questions q ON q.quizId = qz.quizId
                GROUP BY qz.quizId, qz.title, qz.type, qz.createdAt, c.courseId, c.courseCode, c.courseName
                ORDER BY c.courseCode, qz.quizId
                LIMIT ? OFFSET ?
            `, [parseInt(limit), parseInt(offset)]);
            return rows;
        });
    }

    static async countAll() {
        const cacheKey = 'quizzes:count';
        return cache.remember(cacheKey, TTL.QUIZZES, async () => {
            const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM quizzes');
            return total;
        });
    }

    static async update(quizId, data) {
        const allowed = ['courseId', 'title', 'type'];
        const fields = [];
        const values = [];

        for (const key of allowed) {
            if (data[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(data[key]);
            }
        }
        if (!fields.length) return this.findById(quizId);

        values.push(quizId);
        await db.query(`UPDATE quizzes SET ${fields.join(', ')} WHERE quizId = ?`, values);
        await this._invalidateQuizCaches(quizId);
        return this.findById(quizId);
    }

    static async delete(quizId) {
        const [result] = await db.query('DELETE FROM quizzes WHERE quizId = ?', [quizId]);
        if (result.affectedRows > 0) {
            await this._invalidateQuizCaches(quizId);
        }
        return result.affectedRows > 0;
    }

    static async getCourseQuizTree() {
        const cacheKey = 'quizTree:all';
        return cache.remember(cacheKey, TTL.QUIZ_TREE, async () => {
            const [rows] = await db.query(`
                SELECT
                    c.courseCode,
                    qz.quizId,
                    qz.title       AS quiz_title,
                    q.questionId,
                    q.questionText
                FROM courses c
                JOIN quizzes   qz ON c.courseId   = qz.courseId
                LEFT JOIN questions q  ON q.quizId = qz.quizId
                ORDER BY c.courseCode, qz.quizId
            `);

            const result = {};

            rows.forEach(row => {
                if (!result[row.courseCode]) {
                    result[row.courseCode] = [];
                }

                let quiz = result[row.courseCode].find(q => q.quizId === row.quizId);
                if (!quiz) {
                    quiz = { quizId: row.quizId, quiz_title: row.quiz_title, questions: [] };
                    result[row.courseCode].push(quiz);
                }

                if (row.questionId) {
                    quiz.questions.push({
                        questionId: row.questionId,
                        questionText: row.questionText
                    });
                }
            });

            return result;
        });
    }
}

module.exports = Quiz;