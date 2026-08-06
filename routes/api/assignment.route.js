const express = require('express');
const router = express.Router();
const assignmentController = require('../../controllers/assignment.controller');
const { authenticate } = require('../../middlewares/authenticate');
const { authorize } = require('../../middlewares/authorize');

// All assignment routes require admin authentication (CMS manages content)
router.use(authenticate, authorize('admin'));

router.get('/', assignmentController.getAll);
router.get('/search', assignmentController.search);
router.get('/:id', assignmentController.getOne);

router.post('/', assignmentController.create);

router.patch('/:id', assignmentController.update);

router.delete('/:id', assignmentController.delete);

module.exports = router;