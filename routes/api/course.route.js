// course.routes.js
const express = require('express');
const router = express.Router();
const courseController = require('../../controllers/course.controller');
const {
    getCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    validate
} = require('../../validations/course.validation');
const {
    createLimiter,
    updateLimiter,
    burstLimitMiddleware
} = require('../../middlewares/rateLimiter');
const { authenticate } = require('../../middlewares/authenticate');
const { authorize } = require('../../middlewares/authorize');

// All course routes require admin authentication (CMS manages content)
router.use(authenticate, authorize('admin'));

router.get('/grouped/all', burstLimitMiddleware, courseController.getGroupedAll);
router.get('/grouped/public', burstLimitMiddleware, courseController.getGroupedPublic);
router.get('/search', burstLimitMiddleware, courseController.search);
router.get('/', burstLimitMiddleware, courseController.getAll);
router.get('/:courseCode', burstLimitMiddleware, courseController.getCourse);
router.get('/:courseCode/pdf', burstLimitMiddleware, courseController.downloadPDF);
router.post('/',
    burstLimitMiddleware,
    createLimiter,
    validate(createCourse),
    courseController.createCourse
);

router.patch('/:courseCode',
    burstLimitMiddleware,
    updateLimiter,
    validate(updateCourse),
    courseController.updateCourse
);

router.delete('/:courseCode',
    burstLimitMiddleware,
    courseController.deleteCourse
);

module.exports = router;