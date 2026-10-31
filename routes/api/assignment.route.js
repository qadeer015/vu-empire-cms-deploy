const express = require('express');
const router = express.Router();
const multer = require('multer');
const assignmentController = require('../../controllers/assignment.controller');
const { authenticate } = require('../../middlewares/authenticate');
const { authorize } = require('../../middlewares/authorize');

// Multer memory storage for assignment/solution file uploads (streamed to Cloudinary)
const assignmentFileUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// All assignment routes require admin authentication (CMS manages content)
router.use(authenticate, authorize('admin'));

router.get('/', assignmentController.getAll);
router.get('/search', assignmentController.search);
router.get('/:id', assignmentController.getOne);

// ── File upload (must be before /:id) ──────────────────────────────────
router.post('/upload', assignmentFileUpload.single('file'), assignmentController.upload);

router.post('/', assignmentController.create);
router.patch('/:id', assignmentController.update);
router.delete('/:id', assignmentController.delete);

module.exports = router;