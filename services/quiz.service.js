// services/quiz.service.js
const Course = require('../models/Course');
const Question = require('../models/Question');
const Option = require('../models/Option');
const Quiz = require("../models/Quiz");

const db = require('../config/db');

const normalize = text => text.replace(/\s+/g, ' ').trim();

class QuizService {

    /**
     * Create quiz records with questions and options.
     * Supports bulk insert from the extension data format.
     */
    static async createMultipleQuizRecords(inputData) {
        let records;
        if (inputData && Array.isArray(inputData.questions)) {
            records = inputData.questions;
        } else {
            records = Array.isArray(inputData) ? inputData : [inputData];
        }

        const results = {
            totalRecords: records.length,
            successful: 0,
            failed: 0,
            details: []
        };

        const courseCache = new Map();
        const quizCache = new Map();
        const uniqueCourses = new Map();
        const uniqueQuizzes = new Map();

        for (const rec of records) {
            const formatted = QuizService.parseQuizInfo(rec);
            if (formatted.courseCode && !uniqueCourses.has(formatted.courseCode)) {
                uniqueCourses.set(formatted.courseCode, formatted.courseName);
            }
        }

        const coursePromises = Array.from(uniqueCourses.entries()).map(
            async ([courseCode, courseName]) => {
                let course = await Course.findByCode(courseCode);
                if (!course) {
                    course = await Course.create({ courseCode, courseName });
                }
                courseCache.set(courseCode, course);
                return course;
            }
        );
        await Promise.all(coursePromises);

        for (const rec of records) {
            const formatted = QuizService.parseQuizInfo(rec);
            const course = courseCache.get(formatted.courseCode);
            if (course && formatted.quizTitle) {
                const key = `${course.courseId}::${formatted.quizTitle}`;
                if (!uniqueQuizzes.has(key)) {
                    uniqueQuizzes.set(key, rec.quizType || 'quiz');
                }
            }
        }

        const quizPromises = Array.from(uniqueQuizzes.entries()).map(
            async ([key, quizType]) => {
                const [courseId, quizTitle] = key.split('::');
                let quiz = await Quiz.findByCourseAndTitle(courseId, quizTitle);
                if (!quiz) {
                    quiz = await Quiz.create({ courseId, title: quizTitle, type: quizType });
                }
                quizCache.set(key, quiz);
                return quiz;
            }
        );
        await Promise.all(quizPromises);

        for (let i = 0; i < records.length; i++) {
            const rec = records[i];
            try {
                const formatted = QuizService.parseQuizInfo(rec);
                const course = courseCache.get(formatted.courseCode);
                const quizKey = `${course.courseId}::${formatted.quizTitle}`;
                const quiz = quizCache.get(quizKey);

                if (!course || !quiz) {
                    throw new Error(`Missing required resource for record ${i}`);
                }

                const normalizedQuestion = normalize(rec.question);
                const timestamp = rec.timestamp ? new Date(rec.timestamp) : new Date();

                const [[existing]] = await db.query(
                    `SELECT questionId FROM questions WHERE courseId = ? AND questionText = ? LIMIT 1`,
                    [course.courseId, normalizedQuestion]
                );

                let questionId;
                if (existing) {
                    questionId = existing.questionId;
                } else {
                    const [result] = await db.query(
                        `INSERT INTO questions (courseId, quizId, questionText, explanation, timestamp)
                         VALUES (?, ?, ?, ?, ?)`,
                        [course.courseId, quiz.quizId, normalizedQuestion, rec.explanation || '', timestamp]
                    );
                    questionId = result.insertId;
                }

                // Insert options
                const solution = rec.solution && typeof rec.solution === 'object' ? rec.solution : null;
                const correctLetters = new Set(
                    (solution && Array.isArray(solution.correctAnswers)
                        ? solution.correctAnswers
                        : []
                    ).map(l => String(l).trim().toUpperCase())
                );

                const optionsData = (rec.options || []).map((opt, idx) => {
                    const letter = String(opt.letter || '').trim().toUpperCase();
                    const isCorrect = opt.isCorrect !== undefined
                        ? !!opt.isCorrect
                        : correctLetters.has(letter);
                    return [questionId, opt.letter, opt.text, idx + 1, isCorrect ? 1 : 0];
                });

                if (optionsData.length > 0) {
                    await db.query(
                        `INSERT IGNORE INTO options (questionId, letter, optionText, optionIndex, isCorrect)
                         VALUES ?`,
                        [optionsData]
                    );
                }

                results.successful++;
                results.details.push({
                    recordIndex: i,
                    status: 'created',
                    questionId,
                    quizId: quiz.quizId
                });
            } catch (error) {
                results.failed++;
                results.details.push({
                    recordIndex: i,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        return results;
    }

    static parseQuizInfo(record) {
        const rawString = record.courseName || record.quizTitle || '';
        const pattern = /^([A-Z0-9]+)\s*-\s*([^(]+)\s*\(([^)]+)\)$/i;
        const match = rawString.match(pattern);

        if (match) {
            return {
                courseCode: record.courseCode || match[1].trim(),
                courseName: match[2].trim(),
                quizTitle: match[3].trim()
            };
        }

        return {
            courseCode: record.courseCode,
            courseName: record.courseName,
            quizTitle: record.quizTitle || record.courseName || 'Untitled Quiz'
        };
    }

    static async getQuizDetails(quizId) {
        const quiz = await Quiz.findById(quizId);
        const questions = await Question.findByQuizId(quizId);
        return { quiz, questions };
    }

    static async getCourseQuestions(courseCode) {
        return Question.getCourseQuestions(courseCode);
    }

    static async getQuizQuestions() {
        return Quiz.getCourseQuizTree();
    }

    static async getQuestionBank(courseCode) {
        return courseCode
            ? Question.getCourseQuestions(courseCode)
            : Question.getQuestionBank();
    }

    static async getQuestionStatistics() {
        const cache = require('../services/cacheService');
        const TTL = require('../config/cacheTTL');
        const cacheKey = 'quiz:questionStats';
        return cache.remember(cacheKey, TTL.QUIZZES, async () => {
            const [byCourse] = await db.query(`
                SELECT 
                    c.courseCode,
                    c.courseName,
                    COUNT(q.questionId) as totalQuestions
                FROM courses c
                LEFT JOIN questions q ON c.courseId = q.courseId
                GROUP BY c.courseId
            `);

            const [summary] = await db.query(`
                SELECT 
                    COUNT(*) as totalQuestions,
                    COUNT(DISTINCT courseId) as totalCourses
                FROM questions
            `);

            return {
                summary: summary[0],
                byCourse
            };
        });
    }

    static async searchQuestions(query, courseCode) {
        return Question.search(query, courseCode);
    }
}

module.exports = QuizService;