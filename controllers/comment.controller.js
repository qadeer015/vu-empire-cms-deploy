const Comment = require('../models/Comment');
const Post = require('../models/Post');
const AppError = require('../utils/AppError');

// Create a comment
exports.createComment = async (req, res, next) => {
    try {
        const { postId, content } = req.body;
        const userId = req.user.id;

        // Check if post exists
        const post = await Post.findById(postId);
        if (!post) {
            throw new AppError('Post not found', 404);
        }

        if (!content || content.length > 250) {
            throw new AppError('Content must be between 1 and 250 characters', 400);
        }

        const comment = await Comment.create({ postId, userId, content });
        res.status(201).json({
            status: 'success',
            data: { comment }
        });
    } catch (error) {
        next(error);
    }
};

// Get comments for a post
exports.getCommentsForPost = async (req, res, next) => {
    try {
        const { postId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const post = await Post.findById(postId);
        if (!post) {
            throw new AppError('Post not found', 404);
        }

        const result = await Comment.getByPostId(postId, { page, limit });
        res.status(200).json({
            status: 'success',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

// Update a comment
exports.updateComment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        const comment = await Comment.findById(id);
        if (!comment) {
            throw new AppError('Comment not found', 404);
        }
        if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
            throw new AppError('You are not authorized to update this comment', 403);
        }
        if (!content || content.length > 250) {
            throw new AppError('Content must be between 1 and 250 characters', 400);
        }

        const updatedComment = await Comment.update(id, content);
        res.status(200).json({
            status: 'success',
            data: { comment: updatedComment }
        });
    } catch (error) {
        next(error);
    }
};

// Delete a comment
exports.deleteComment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const comment = await Comment.findById(id);
        if (!comment) {
            throw new AppError('Comment not found', 404);
        }
        if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
            throw new AppError('You are not authorized to delete this comment', 403);
        }
        await Comment.delete(id);
        res.status(204).json({
            status: 'success',
            data: null
        });
    } catch (error) {
        next(error);
    }
};