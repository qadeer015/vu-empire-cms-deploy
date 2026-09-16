const express = require('express');
const router = express.Router();
const commentController = require('../../controllers/comment.controller');
const { authorize } = require('../../middlewares/authorize');
const { authenticate } = require('../../middlewares/authenticate');
const validate = require('../../middlewares/validate');
const commentValidation = require('../../validations/comment.validation');

router.route('/')
    .post(authenticate, authorize('student', 'admin'), validate(commentValidation.create), commentController.createComment);

router.route('/post/:postId')
    .get(commentController.getCommentsForPost);

router.route('/:id')
    .patch(authenticate, authorize('admin','student'), validate(commentValidation.update), commentController.updateComment)
    .delete(authenticate, authorize('admin','student'), commentController.deleteComment);

module.exports = router;