// controllers/quiz.controller.js
const QuizService = require('../services/quiz.service');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');

class QuizController {

    static async createMultipleQuizRecords(req, res) {
        try {
            const results = await QuizService.createMultipleQuizRecords(req.body);

            res.status(200).json({
                success: true,
                summary: {
                    total: results.totalRecords,
                    successful: results.successful,
                    failed: results.failed
                },
                details: results.details
            });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    static async getQuiz(req, res) {
        try {
            const data = await Quiz.getCourseQuizTree();
            res.status(200).json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    static async getCourseQuestions(req, res) {
        try {
            const data = await QuizService.getCourseQuestions(req.params.courseCode);
            res.status(200).json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    static async getQuestionBank(req, res) {
        try {
            const data = await QuizService.getQuestionBank(req.query.courseCode);
            res.status(200).json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    static async getQuestionStatistics(req, res) {
        try {
            const stats = await QuizService.getQuestionStatistics();
            res.status(200).json({ success: true, ...stats });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    static async searchQuestions(req, res) {
        try {
            const data = await QuizService.searchQuestions(
                req.query.query,
                req.query.courseCode
            );
            res.status(200).json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    static async getQuizDetails(req, res) {
        try {
            const { quizId } = req.params;
            if (!quizId) {
                return res.status(400).json({
                    success: false,
                    message: "quizId is required"
                });
            }
            const { quiz, questions } = await QuizService.getQuizDetails(quizId);
            res.status(200).json({ success: true, data: { quiz, questions } });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
}

module.exports = QuizController;