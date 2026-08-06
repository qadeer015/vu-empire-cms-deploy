// quiz.routes.js
const express = require('express');
const router = express.Router();
const QuizController = require('../../controllers/quiz.controller');
const { createQuiz, courseQuestions, search, validate } = require('../../validations/quiz.validation');
const { authenticate } = require('../../middlewares/authenticate');
const { authorize } = require('../../middlewares/authorize');

// All quiz routes require admin authentication (CMS manages content)
router.use(authenticate, authorize('admin'));

// Create
router.post('/save', validate(createQuiz), QuizController.createMultipleQuizRecords);
router.get('/', QuizController.getQuiz);

// Read
router.get('/course/:courseCode',
    validate(courseQuestions),
    QuizController.getCourseQuestions
);

// Get quiz details
router.get('/:quizId/details', QuizController.getQuizDetails);
router.get('/bank', QuizController.getQuestionBank);
router.get('/statistics', QuizController.getQuestionStatistics);
router.get('/search',
    validate(search),
    QuizController.searchQuestions
);

module.exports = router;