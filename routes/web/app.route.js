// app.routes.js
const express = require('express');
const router = express.Router();
const AppController = require('../../controllers/app.controller');
const { authenticate } = require('../../middlewares/authenticate');
const { authorize } = require('../../middlewares/authorize');

// ── Authentication-protected admin CMS routes ──────────────────────
// All routes require an authenticated admin user.

// Dashboard
router.get('/', authenticate, authorize('admin'), AppController.dashboard);

// ── Courses CRUD ───────────────────────────────────────────────────
router.get('/courses', authenticate, authorize('admin'), AppController.adminCourses);
router.get('/courses/new', authenticate, authorize('admin'), AppController.adminCourseNew);
router.post('/courses', authenticate, authorize('admin'), AppController.adminCourseCreate);
router.get('/courses/:id/edit', authenticate, authorize('admin'), AppController.adminCourseEdit);
router.post('/courses/:id', authenticate, authorize('admin'), AppController.adminCourseUpdate);
router.post('/courses/:id/delete', authenticate, authorize('admin'), AppController.adminCourseDelete);

// ── Quizzes CRUD ───────────────────────────────────────────────────
router.get('/quizzes', authenticate, authorize('admin'), AppController.adminQuizzes);
router.get('/quizzes/new', authenticate, authorize('admin'), AppController.adminQuizNew);
router.post('/quizzes', authenticate, authorize('admin'), AppController.adminQuizCreate);
router.get('/quizzes/:id/edit', authenticate, authorize('admin'), AppController.adminQuizEdit);
router.post('/quizzes/:id', authenticate, authorize('admin'), AppController.adminQuizUpdate);
router.post('/quizzes/:id/delete', authenticate, authorize('admin'), AppController.adminQuizDelete);

// ── Quiz Questions CRUD ────────────────────────────────────────────
router.get('/quizzes/:quizId/questions/new', authenticate, authorize('admin'), AppController.adminQuestionNew);
router.post('/quizzes/:quizId/questions', authenticate, authorize('admin'), AppController.adminQuestionCreate);
router.get('/questions/:questionId/edit', authenticate, authorize('admin'), AppController.adminQuestionEdit);
router.post('/questions/:questionId', authenticate, authorize('admin'), AppController.adminQuestionUpdate);
router.post('/questions/:questionId/delete', authenticate, authorize('admin'), AppController.adminQuestionDelete);

// ── Assignments CRUD ───────────────────────────────────────────────
router.get('/assignments', authenticate, authorize('admin'), AppController.adminAssignments);
router.get('/assignments/new', authenticate, authorize('admin'), AppController.adminAssignmentNew);
router.post('/assignments', authenticate, authorize('admin'), AppController.adminAssignmentCreate);
router.get('/assignments/:id/edit', authenticate, authorize('admin'), AppController.adminAssignmentEdit);
router.post('/assignments/:id', authenticate, authorize('admin'), AppController.adminAssignmentUpdate);
router.post('/assignments/:id/delete', authenticate, authorize('admin'), AppController.adminAssignmentDelete);

// ── GDB Solutions CRUD ─────────────────────────────────────────────
router.get('/gdb-solutions', authenticate, authorize('admin'), AppController.adminGdbSolutions);
router.get('/gdb-solutions/new', authenticate, authorize('admin'), AppController.adminGdbSolutionNew);
router.post('/gdb-solutions', authenticate, authorize('admin'), AppController.adminGdbSolutionCreate);
router.get('/gdb-solutions/:id/edit', authenticate, authorize('admin'), AppController.adminGdbSolutionEdit);
router.post('/gdb-solutions/:id', authenticate, authorize('admin'), AppController.adminGdbSolutionUpdate);
router.post('/gdb-solutions/:id/delete', authenticate, authorize('admin'), AppController.adminGdbSolutionDelete);

// ── Past Papers CRUD ───────────────────────────────────────────────
router.get('/pastpapers', authenticate, authorize('admin'), AppController.adminPastPapers);
router.get('/pastpapers/new', authenticate, authorize('admin'), AppController.adminPastPaperNew);
router.post('/pastpapers', authenticate, authorize('admin'), AppController.adminPastPaperCreate);
router.get('/pastpapers/:id/edit', authenticate, authorize('admin'), AppController.adminPastPaperEdit);
router.post('/pastpapers/:id', authenticate, authorize('admin'), AppController.adminPastPaperUpdate);
router.post('/pastpapers/:id/delete', authenticate, authorize('admin'), AppController.adminPastPaperDelete);

module.exports = router;