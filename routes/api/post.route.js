const express = require('express');
const router = express.Router();
const postController = require('../../controllers/post.controller');
const { authorize } = require('../../middlewares/authorize');
const { authenticate } = require('../../middlewares/authenticate');
const validate = require('../../middlewares/validate');
const postValidation = require('../../validations/post.validation');

router.route('/')
    .get(postController.getPosts)
    .post(authenticate, authorize('admin', 'author'), validate(postValidation.create), postController.createPost);

// Admin review queue
router.get('/review/pending',
    authenticate,
    authorize('admin'),
    postController.getPostsForReview
);

// Admin review action (publish / reject)
router.post('/:id/review',
    authenticate,
    authorize('admin'),
    validate(postValidation.review),
    postController.reviewPost
);

router.route('/:id')
    .patch(authenticate, authorize('admin', 'author'), validate(postValidation.update), postController.updatePost)
    .delete(authenticate, authorize('admin', 'author'), postController.deletePost);

router.route('/:slug')
    .get(postController.getPostBySlug);

// ===== VIEWS & REACTIONS =====

// Record a view (public)
router.post('/:slug/view', postController.recordView);

// Get reactions for a post (public)
router.get('/:slug/reactions', postController.getReactions);

// Toggle a reaction (authenticated)
router.post('/:slug/reactions',
    authenticate,
    postController.toggleReaction
);

// ===== POLL VOTES =====

// Get poll results (public)
router.get('/:slug/poll/results', postController.getPollResults);

// Cast a vote on a poll (authenticated)
router.post('/:slug/poll/vote',
    authenticate,
    postController.castPollVote
);

module.exports = router;
