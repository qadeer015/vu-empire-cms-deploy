// services/app.service.js
const App = require('../models/App');
const Course = require('../models/Course');
const Question = require('../models/Question');
const cache = require('./cacheService');
const TTL = require('../config/cacheTTL');

class AppService {
    static async dashboard() {
        const cacheKey = 'dashboard:data:admin';

        return cache.remember(cacheKey, TTL.DASHBOARD, async () => {
            const overallStats = await App.overallStats();
            const dailyStats = await Question.dailyStats();
            const recentQuestions = await Question.recentQuestions();
            const courseStats = await Course.courseStats();
            const adminStats = await App.adminDashboardStats();

            return {
                title: 'VU Empire CMS',
                page: 'dashboard',
                currentYear: new Date().getFullYear(),
                overallStats: overallStats || {},
                dailyStats: dailyStats || [],
                recentQuestions: recentQuestions || [],
                courseStats: courseStats || [],
                adminStats: adminStats || {}
            };
        });
    }

    static async getQuizDetails(quizId) {
        const Quiz = require('../models/Quiz');
        const Question = require('../models/Question');

        const quiz = await Quiz.findById(quizId);
        const questions = await Question.findByQuizId(quizId);

        return {
            quiz,
            questions
        };
    }
}

module.exports = AppService;