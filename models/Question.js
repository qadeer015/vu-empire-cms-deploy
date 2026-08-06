//models/Question.js
const db = require('../config/db');
const cache = require('../services/cacheService');
const TTL = require('../config/cacheTTL');

class Question {
    // ── Cache invalidation helpers ─────────────────────────────────
    static async _invalidateQuestionCaches(questionId, courseId, quizId) {
        if (questionId) await cache.del(`question:${questionId}`);
        if (courseId) await cache.delByPattern(`questions:course:${courseId}*`);
        if (quizId) await cache.del(`quiz:${quizId}:questions`);
        await cache.delByPattern('questions:*');
        await cache.delByPattern('questionBank:*');
        await cache.delByPattern('quizTree:*');
        await cache.delByPattern('dashboard:*');
    }

    static async findAll() {
        const cacheKey = 'questions:all';
        return cache.remember(cacheKey, TTL.QUESTIONS, async () => {
            const [rows] = await db.query('SELECT * FROM questions ORDER BY timestamp DESC');
            return rows;
        });
    }

    static async findById(id) {
        const cacheKey = `question:${id}`;
        return cache.remember(cacheKey, TTL.QUESTIONS, async () => {
            const [rows] = await db.query('SELECT * FROM questions WHERE questionId = ?', [id]);
            return rows[0] || null;
        });
    }

    static async findByQuizId(quizId) {
        const cacheKey = `quiz:${quizId}:questions`;
        return cache.remember(cacheKey, TTL.QUESTIONS, async () => {
            const [rows] = await db.query(`
            SELECT
                q.questionId,
                q.quizId,
                q.courseId,
                q.questionText,
                q.explanation,
                q.timestamp,

                c.courseCode,
                c.courseName,

                JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'optionId',    o.optionId,
                        'letter',      o.letter,
                        'optionText',  o.optionText,
                        'optionIndex', o.optionIndex,
                        'isCorrect',   o.isCorrect
                    )
                ) AS options,

                JSON_ARRAYAGG(
                    CASE
                        WHEN o.isCorrect = TRUE THEN
                            JSON_OBJECT(
                                'optionId',   o.optionId,
                                'letter',     o.letter,
                                'optionText', o.optionText
                            )
                    END
                ) AS correctOptions

            FROM questions q

            JOIN courses c
                ON q.courseId = c.courseId

            LEFT JOIN options o
                ON q.questionId = o.questionId

            WHERE q.quizId = ?

            GROUP BY
                q.questionId,
                q.quizId,
                q.courseId,
                q.questionText,
                q.explanation,
                q.timestamp,
                c.courseCode,
                c.courseName

            ORDER BY q.questionId
        `, [quizId]);

            return rows.map(row => ({
                ...row,
                options:
                    typeof row.options === 'string'
                        ? JSON.parse(row.options)
                        : row.options,

                correctOptions:
                    (
                        typeof row.correctOptions === 'string'
                            ? JSON.parse(row.correctOptions)
                            : row.correctOptions
                    ).filter(Boolean)
            }));
        });
    }

    static async findByCourse(courseId) {
        const cacheKey = `questions:course:${courseId}`;
        return cache.remember(cacheKey, TTL.QUESTIONS, async () => {
            const [rows] = await db.query(
                'SELECT * FROM questions WHERE courseId = ? ORDER BY timestamp DESC',
                [courseId]
            );
            return rows;
        });
    }

    static async findByQuestionText(courseId, questionText) {
        const cacheKey = `question:course:${courseId}:text:${encodeURIComponent(questionText)}`;
        return cache.remember(cacheKey, TTL.QUESTIONS, async () => {
            const [rows] = await db.query(
                'SELECT * FROM questions WHERE courseId = ? AND questionText = ?',
                [courseId, questionText]
            );
            return rows[0];
        });
    }

    static async findByCourseAndText(courseId, questionText) {
        const cacheKey = `question:course:${courseId}:text:${encodeURIComponent(questionText)}:first`;
        return cache.remember(cacheKey, TTL.QUESTIONS, async () => {
            const [rows] = await db.query(
                'SELECT * FROM questions WHERE courseId = ? AND questionText = ? LIMIT 1',
                [courseId, questionText]
            );
            return rows[0];
        });
    }

    static async create(questionData, skipCacheInvalidation = false) {
        const { courseId, questionText, explanation, quizId, timestamp } = questionData;
        const [result] = await db.query(
            'INSERT INTO questions (courseId, questionText, explanation, quizId, timestamp) VALUES (?, ?, ?, ?, ?)',
            [courseId, questionText, explanation, quizId, timestamp]
        );
        if (!skipCacheInvalidation) {
            await this._invalidateQuestionCaches(result.insertId, courseId, quizId);
        }
        return { questionId: result.insertId, ...questionData };
    }

    static async update(id, questionData, skipCacheInvalidation = false) {
        const { courseId, questionText, explanation, quizId, timestamp } = questionData;
        const [result] = await db.query(
            `UPDATE questions
             SET courseId = ?, questionText = ?, explanation = ?, quizId = ?, timestamp = ?
             WHERE questionId = ?`,
            [courseId, questionText, explanation, quizId, timestamp, id]
        );
        if (!skipCacheInvalidation) {
            await this._invalidateQuestionCaches(id, courseId, quizId);
        }
        return result.affectedRows > 0;
    }

    static async delete(id) {
        const question = await this.findById(id);
        const [result] = await db.query('DELETE FROM questions WHERE questionId = ?', [id]);
        if (result.affectedRows > 0 && question) {
            await this._invalidateQuestionCaches(id, question.courseId, question.quizId);
        }
        return result.affectedRows > 0;
    }

    static async getQuestionWithOptions(questionId) {
        const cacheKey = `question:${questionId}:withOptions`;
        return cache.remember(cacheKey, TTL.QUESTIONS, async () => {
            const [rows] = await db.query(`
                SELECT
                    q.*,
                    c.courseCode,
                    c.courseName,
                    JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'optionId',    o.optionId,
                            'letter',      o.letter,
                            'optionText',  o.optionText,
                            'optionIndex', o.optionIndex,
                            'isCorrect',   o.isCorrect
                        )
                    ) AS options
                FROM questions q
                JOIN courses c      ON q.courseId   = c.courseId
                LEFT JOIN options o ON q.questionId = o.questionId
                WHERE q.questionId = ?
                GROUP BY q.questionId
            `, [questionId]);
            return rows[0] || null;
        });
    }

    static async getCourseQuestions(courseCode) {
        const cacheKey = `questions:byCode:${courseCode}`;
        return cache.remember(cacheKey, TTL.QUESTIONS, async () => {
            const [rows] = await db.query(`
                SELECT
                    q.*,
                    c.courseCode,
                    c.courseName,
                    JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'letter',     o.letter,
                            'optionText', o.optionText,
                            'isCorrect',  o.isCorrect
                        )
                    ) AS options
                FROM questions q
                JOIN courses c      ON q.courseId   = c.courseId
                LEFT JOIN options o ON q.questionId = o.questionId
                WHERE c.courseCode = ?
                GROUP BY q.questionId
                ORDER BY q.timestamp DESC
            `, [courseCode]);
            return rows;
        });
    }

    static async getQuestionBank() {
        const cacheKey = 'questionBank:all';
        return cache.remember(cacheKey, TTL.QUESTION_BANK, async () => {
            const [rows] = await db.query(
                'SELECT * FROM question_bank_view ORDER BY courseCode, questionAdded DESC'
            );
            return rows;
        });
    }

    static async search(query, courseCode) {
        const cacheKey = `questions:search:${courseCode}:${query}`;
        return cache.remember(cacheKey, TTL.SEARCH, async () => {
            const [rows] = await db.query(`
                SELECT
                    q.questionId,
                    q.questionText,
                    c.courseCode,
                    c.courseName,
                    DATE_FORMAT(q.timestamp, '%Y-%m-%d %H:%i')              AS added_time,
                    GROUP_CONCAT(CASE WHEN o.isCorrect = TRUE THEN o.letter END) AS correct_answers
                FROM questions q
                JOIN courses c      ON q.courseId   = c.courseId
                LEFT JOIN options o ON q.questionId = o.questionId
                WHERE q.questionText LIKE ? AND c.courseCode = ?
                GROUP BY q.questionId, q.questionText, c.courseCode, c.courseName, q.timestamp
                ORDER BY q.timestamp DESC
            `, [`%${query}%`, courseCode]);
            return rows;
        });
    }

    static async recentQuestions() {
        const cacheKey = 'questions:recent:all';

        return cache.remember(cacheKey, TTL.DASHBOARD, async () => {
            const [rows] = await db.query(`
                SELECT
                    q.questionId,
                    q.questionText,
                    LEFT(q.questionText, 100)                               AS question_preview,
                    c.courseCode,
                    c.courseName,
                    DATE_FORMAT(q.timestamp, '%Y-%m-%d %H:%i')             AS added_time,
                    GROUP_CONCAT(DISTINCT CASE WHEN o.isCorrect = TRUE THEN o.letter END) AS correct_answers
                FROM questions q
                JOIN courses c ON q.courseId = c.courseId
                LEFT JOIN options o ON q.questionId = o.questionId
                GROUP BY q.questionId, q.questionText, c.courseCode, c.courseName, q.timestamp
                ORDER BY q.timestamp DESC
                LIMIT 10
            `);
            return rows;
        });
    }

    static async dailyStats() {
        const cacheKey = 'questions:dailyStats:all';

        return cache.remember(cacheKey, TTL.DASHBOARD, async () => {
            const [rows] = await db.query(`
                SELECT
                    DATE(timestamp)  AS date,
                    COUNT(*)         AS question_count
                FROM questions
                WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY DATE(timestamp)
                ORDER BY date
            `);
            return rows;
        });
    }
}

module.exports = Question;