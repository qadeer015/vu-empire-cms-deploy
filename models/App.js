// models/App.js
const db = require('../config/db');
const cache = require('../services/cacheService');
const TTL = require('../config/cacheTTL');

class App {
    static async overallStats() {
        const cacheKey = 'dashboard:overallStats:admin';

        return cache.remember(cacheKey, TTL.DASHBOARD, async () => {
            const [[overallStats]] = await db.query(`
                SELECT
                    COUNT(DISTINCT c.courseId)             AS total_courses,
                    COUNT(q.questionId)                    AS total_questions,
                    COUNT(DISTINCT q.timestamp)            AS days_active,
                    MIN(q.timestamp)                       AS first_question_date,
                    MAX(q.timestamp)                       AS latest_question_date
                FROM courses c
                LEFT JOIN questions q ON c.courseId = q.courseId
            `);
            return overallStats;
        });
    }

    /**
     * Get CMS admin dashboard stats.
     */
    static async adminDashboardStats() {
        const cacheKey = 'dashboard:adminStats';
        return cache.remember(cacheKey, TTL.DASHBOARD, async () => {
            // Content counts
            const [[{ totalCourses }]] = await db.query(`SELECT COUNT(*) AS totalCourses FROM courses`);
            const [[{ totalQuizzes }]] = await db.query(`SELECT COUNT(*) AS totalQuizzes FROM quizzes`);
            const [[{ totalQuestions }]] = await db.query(`SELECT COUNT(*) AS totalQuestions FROM questions`);
            const [[{ totalPastPapers }]] = await db.query(`SELECT COUNT(*) AS totalPastPapers FROM past_papers`);
            const [[{ totalAssignments }]] = await db.query(`SELECT COUNT(*) AS totalAssignments FROM assignments`);
            const [[{ totalGdbSolutions }]] = await db.query(`SELECT COUNT(*) AS totalGdbSolutions FROM gdb_solutions`);

            // New content this month
            const [[{ newCourses }]] = await db.query(`
                SELECT COUNT(*) AS newCourses FROM courses 
                WHERE createdAt >= DATE_FORMAT(NOW(), '%Y-%m-01')
            `);
            const [[{ newQuizzes }]] = await db.query(`
                SELECT COUNT(*) AS newQuizzes FROM quizzes 
                WHERE createdAt >= DATE_FORMAT(NOW(), '%Y-%m-01')
            `);
            const [[{ newQuestions }]] = await db.query(`
                SELECT COUNT(*) AS newQuestions FROM questions 
                WHERE timestamp >= DATE_FORMAT(NOW(), '%Y-%m-01')
            `);

            // Recent submissions count
            const [[{ totalSubmissions }]] = await db.query(`SELECT COUNT(*) AS totalSubmissions FROM quiz_submissions`);

            return {
                totalCourses,
                totalQuizzes,
                totalQuestions,
                totalPastPapers,
                totalAssignments,
                totalGdbSolutions,
                newCourses,
                newQuizzes,
                newQuestions,
                totalSubmissions
            };
        });
    }
}

module.exports = App;