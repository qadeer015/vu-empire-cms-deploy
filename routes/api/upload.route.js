//routes/upload.route.js
const express = require('express');
const router = express.Router();
const uploadController = require('../../controllers/upload.controller');
const { authenticate } = require('../../middlewares/authenticate');
const { authorize } = require('../../middlewares/authorize');
const { uploadForResource, uploadDocument } = require('../../middlewares/upload');

// All upload routes require admin authentication (CMS manages content)
router.use(authenticate, authorize('admin'));

router.post('/image', uploadForResource('content', { fieldName: 'image', maxSize: 5 * 1024 * 1024 }), uploadController.uploadContentImage);
router.post('/document', uploadDocument('documents', { fieldName: 'document', maxSize: 20 * 1024 * 1024 }), uploadController.uploadDocument);

module.exports = router;
