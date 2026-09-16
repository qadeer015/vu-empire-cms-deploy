const Post = require('../models/Post');
const AppError = require('../utils/AppError');
const {
    sendNewPostNotifications,
    sendPostStatusNotification
} = require('../services/post.service');

// ================= CREATE POST =================
exports.createPost = async (req, res, next) => {
    try {
        const { title, content, thumbnail, contentType = 'post' } = req.body;
        const userId = req.user.id;

        if (!title || !content) {
            throw AppError.badRequest('Title and content are required');
        }

        // Validate contentType - only allow new types for posts
        const validTypes = ['event', 'poll', 'document', 'post'];
        const finalContentType = validTypes.includes(contentType) ? contentType : 'post';

        // All posts go through admin review
        const status = 'pending';

        const post = await Post.create({
            userId,
            title,
            content,
            thumbnail,
            status,
            contentType: finalContentType
        });

        // Notify admins + author (non-blocking)
        sendNewPostNotifications(post).catch(err =>
            console.error('Notification error:', err.message)
        );

        res.status(201).json({
            status: 'success',
            data: { post }
        });
    } catch (error) {
        next(error);
    }
};

// ================= LIST POSTS =================
exports.getPosts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const userId = req.query.userId || null;
        const search = req.query.search || '';
        const isAdmin = req.user && String(req.user.role || '').toLowerCase() === 'admin';
        const requesterId = req.user ? req.user.id : null;

        // Decide what statuses to expose.
        // - Admins see all statuses except 'delete' by default; can filter via ?status=
        // - Authors see their own posts in all statuses except 'delete'
        // - Public/anonymous visitors see only 'publish'
        let status = null;
        let includeAllStatuses = false;

        if (req.query.status) {
            // explicit filter, e.g. ?status=pending
            if (['pending', 'publish', 'reject', 'delete'].includes(req.query.status)) {
                status = req.query.status;
                includeAllStatuses = true;
            }
        } else if (isAdmin) {
            // admins see everything (excluding 'delete') by default
            includeAllStatuses = true;
        } else if (requesterId) {
            // author viewing their own list: see all of their own
            includeAllStatuses = true;
            // Force userId to the requester to avoid leakage
            // (Only if userId was not provided in query, or matches requester)
            if (!userId || String(userId) === String(requesterId)) {
                // ok
            }
        }

        const result = await Post.getAll({
            page,
            limit,
            userId,
            search,
            status,
            includeAllStatuses
        });

        // For non-admins/non-authors, filter out non-publish and 'delete' rows
        if (!isAdmin && (!userId || String(userId) !== String(requesterId))) {
            result.posts = result.posts.filter(p =>
                p.status === 'publish'
            );
            result.pagination.total = result.posts.length;
            result.pagination.pages = Math.max(1, Math.ceil(result.posts.length / limit));
        } else if (!isAdmin && userId && String(userId) === String(requesterId)) {
            // author viewing own: hide 'delete' status
            result.posts = result.posts.filter(p => p.status !== 'delete');
            result.pagination.total = result.posts.length;
            result.pagination.pages = Math.max(1, Math.ceil(result.posts.length / limit));
        } else if (isAdmin) {
            // admins: hide 'delete' status from default listing
            result.posts = result.posts.filter(p => p.status !== 'delete');
            result.pagination.total = result.posts.length;
            result.pagination.pages = Math.max(1, Math.ceil(result.posts.length / limit));
        }

        res.status(200).json({
            status: 'success',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// ================= GET SINGLE POST BY SLUG =================
exports.getPostBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const post = await Post.findBySlug(slug);
        if (!post) {
            throw AppError.notFound('Post');
        }

        // Visibility:
        // - published posts: visible to everyone
        // - pending/rejected posts: visible only to the author or admin
        // - deleted posts: visible only to admin
        const isAdmin = req.user && String(req.user.role || '').toLowerCase() === 'admin';
        const isAuthor = req.user && String(req.user.id) === String(post.userId);

        if (post.status === 'delete' && !isAdmin) {
            throw AppError.notFound('Post');
        }
        if ((post.status === 'pending' || post.status === 'reject') && !isAuthor && !isAdmin) {
            throw AppError.notFound('Post');
        }
        
        res.status(200).json({
            status: 'success',
            data: { post }
        });
    } catch (error) {
        next(error);
    }
};

// ================= UPDATE POST =================
exports.updatePost = async (req, res, next) => {
    try {
        const { id } = req.params;
        const post = await Post.findById(id);
        if (!post) {
            throw AppError.notFound('Post');
        }

        const isAdmin = String(req.user.role || '').toLowerCase() === 'admin';
        const isAuthor = String(req.user.id) === String(post.userId);

        // Author can edit only while the post is 'pending' or 'reject'
        // (so they can revise after a rejection).
        // Admin can edit at any time.
        if (isAuthor && !isAdmin) {
            if (post.status === 'publish') {
                throw AppError.forbidden('You cannot edit a post after it has been published. You may only delete it.');
            }
            if (post.status === 'delete') {
                throw AppError.forbidden('You cannot edit a deleted post.');
            }
        } else if (!isAuthor && !isAdmin) {
            throw AppError.forbidden('You are not authorized to update this post');
        }

        // When the author edits a rejected post, transition it back to 'pending'
        // so it can be re-reviewed.
        const { title, content, thumbnail } = req.body;
        const updates = { title, content, thumbnail };

        // Re-slug only if title is being changed
        const updatedPost = await Post.update(id, updates);

        if (isAuthor && !isAdmin && post.status === 'reject') {
            // Reset to pending for re-review
            await Post.updateStatus(id, {
                status: 'pending',
                rejectReason: null,
                reviewedBy: null
            });
            // notify admins of re-submission
            sendNewPostNotifications(await Post.findById(id)).catch(err =>
                console.error('Re-submission notification error:', err.message)
            );
            return res.status(200).json({
                status: 'success',
                data: { post: await Post.findById(id) }
            });
        }

        res.status(200).json({
            status: 'success',
            data: { post: updatedPost }
        });
    } catch (error) {
        next(error);
    }
};

// ================= ADMIN REVIEW (publish / reject) =================
exports.reviewPost = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, rejectReason } = req.body;

        const post = await Post.findById(id);
        if (!post) {
            throw AppError.notFound('Post');
        }

        if (post.status === 'delete') {
            throw AppError.badRequest('Cannot review a deleted post');
        }

        const updated = await Post.updateStatus(id, {
            status,
            rejectReason: status === 'reject' ? rejectReason : null,
            reviewedBy: req.user.id
        });

        // Notify the author of the decision
        sendPostStatusNotification(updated, status).catch(err =>
            console.error('Status notification error:', err.message)
        );

        res.status(200).json({
            status: 'success',
            data: { post: updated }
        });
    } catch (error) {
        next(error);
    }
};

// ================= ADMIN: GET PENDING / ALL POSTS =================
exports.getPostsForReview = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status || 'pending';

        const result = await Post.getByStatus(status, { page, limit });
        res.status(200).json({
            status: 'success',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// ================= RECORD VIEW =================
exports.recordView = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const post = await Post.findBySlug(slug);
        if (!post) {
            throw AppError.notFound('Post');
        }

        const userId = req.user ? req.user.id : null;
        const ipAddress = req.ip || req.connection.remoteAddress || null;

        await Post.recordView(post.id, userId, ipAddress);
        const viewCount = await Post.getViewCount(post.id);
        console.log(`Recorded view for post ${post.id}. Total views: ${viewCount}`);
        res.status(200).json({
            status: 'success',
            data: { viewCount }
        });
    } catch (error) {
        next(error);
    }
};

// ================= TOGGLE REACTION =================
exports.toggleReaction = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const { type } = req.body;

        if (!['like', 'heart', 'laugh', 'anger'].includes(type)) {
            throw AppError.badRequest('Invalid reaction type');
        }

        const post = await Post.findBySlug(slug);
        if (!post) {
            throw AppError.notFound('Post');
        }

        const userId = req.user.id;
        const counts = await Post.toggleReaction(post.id, userId, type);
        const userReaction = await Post.getUserReaction(post.id, userId);

        res.status(200).json({
            status: 'success',
            data: { counts, userReaction }
        });
    } catch (error) {
        next(error);
    }
};

// ================= GET REACTIONS =================
exports.getReactions = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const post = await Post.findBySlug(slug);
        if (!post) {
            throw AppError.notFound('Post');
        }

        const counts = await Post.getReactionCounts(post.id);
        let userReaction = null;
        if (req.user) {
            userReaction = await Post.getUserReaction(post.id, req.user.id);
        }

        res.status(200).json({
            status: 'success',
            data: { counts, userReaction }
        });
    } catch (error) {
        next(error);
    }
};

// ================= POLL VOTES =================

/**
 * Cast a vote on a poll post (authenticated)
 * POST /api/posts/:slug/poll/vote
 */
exports.castPollVote = async (req, res, next) => {
    try {
        const { slug } = req.params;
        const { optionIndex } = req.body;
        const userId = req.user.id;

        if (optionIndex === undefined || optionIndex === null || optionIndex < 0) {
            throw AppError.badRequest('Valid optionIndex is required');
        }

        const post = await Post.findBySlug(slug);
        if (!post) {
            throw AppError.notFound('Post');
        }

        // Check it's actually a poll
        if (post.content_type !== 'poll') {
            throw AppError.badRequest('This post is not a poll');
        }

        // Parse available options from content
        let pollData = null;
        try { pollData = JSON.parse(post.content); } catch (e) {}
        if (!pollData || !pollData.options || optionIndex >= pollData.options.length) {
            throw AppError.badRequest('Invalid option index');
        }

        const results = await Post.castPollVote(post.id, userId, optionIndex);

        res.status(200).json({
            status: 'success',
            data: {
                optionIndex,
                totalVotes: results.totalVotes,
                results: results.results,
                userVote: optionIndex
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get poll results (public)
 * GET /api/posts/:slug/poll/results
 */
exports.getPollResults = async (req, res, next) => {
    try {
        const { slug } = req.params;

        const post = await Post.findBySlug(slug);
        if (!post) {
            throw AppError.notFound('Post');
        }

        if (post.content_type !== 'poll') {
            throw AppError.badRequest('This post is not a poll');
        }

        const results = await Post.getPollResults(post.id);
        let userVote = null;
        if (req.user) {
            userVote = await Post.getUserPollVote(post.id, req.user.id);
        }

        res.status(200).json({
            status: 'success',
            data: {
                totalVotes: results.totalVotes,
                results: results.results,
                userVote
            }
        });
    } catch (error) {
        next(error);
    }
};
exports.deletePost = async (req, res, next) => {
    try {
        const { id } = req.params;
        const post = await Post.findById(id);
        if (!post) {
            throw AppError.notFound('Post');
        }

        const isAdmin = String(req.user.role || '').toLowerCase() === 'admin';
        const isAuthor = String(req.user.id) === String(post.userId);

        if (!isAuthor && !isAdmin) {
            throw AppError.forbidden('You are not authorized to delete this post');
        }

        // Soft delete: set status to 'delete' so the row is hidden from public views.
        await Post.softDelete(id);
        res.status(200).json({
            status: 'success',
            data: null,
            message: 'Post deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
