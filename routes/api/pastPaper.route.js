const express = require('express');
const router = express.Router();
const multer = require('multer');
const pastPaperController = require('../../controllers/pastPaper.controller');
const pastPaperValidation = require('../../validations/pastPaper.validation');
const { authenticate } = require('../../middlewares/authenticate');
const { authorize } = require('../../middlewares/authorize');

// Multer memory storage for PDF uploads
const pdfUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// All past paper routes require admin authentication (CMS manages content)
router.use(authenticate, authorize('admin'));

// ── Marketplace (must be before /:id) ────────────────────────────────
router.get('/marketplace',
    pastPaperValidation.validate(pastPaperValidation.marketplace),
    pastPaperController.getMarketplace
);

// ── Search (must be before /:id) ─────────────────────────────────────
router.get('/search',
    pastPaperValidation.validate(pastPaperValidation.search),
    pastPaperController.search
);

// ── Upload PDF (POST, must be before /:id) ───────────────────────────
router.post('/upload',
    pdfUpload.single('file'),
    pastPaperValidation.validate(pastPaperValidation.upload),
    pastPaperController.upload
);

// ── CRUD routes ──────────────────────────────────────────────────────

// List all with optional courseId filter
router.get('/',
    pastPaperValidation.validate(pastPaperValidation.list),
    pastPaperController.getAll
);

// Get one by ID
router.get('/:id',
    pastPaperValidation.validate(pastPaperValidation.getOne),
    pastPaperController.getOne
);

// Download past paper
router.get('/:id/download', pastPaperController.download);

// Create
router.post('/',
    pastPaperValidation.validate(pastPaperValidation.create),
    pastPaperController.create
);

// Update
router.patch('/:id',
    pastPaperValidation.validate(pastPaperValidation.update),
    pastPaperController.update
);

// Delete
router.delete('/:id',
    pastPaperValidation.validate(pastPaperValidation.delete),
    pastPaperController.delete
);

// Publish
router.patch('/:id/publish', pastPaperController.publish);

// Reject
router.patch('/:id/reject', pastPaperController.reject);

module.exports = router;