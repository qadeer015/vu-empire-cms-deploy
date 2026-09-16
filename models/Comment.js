const db = require('../config/db');

class Comment {
    // Create a new comment
    static async create(commentData) {
        const { postId, userId, content } = commentData;
        const [result] = await db.query(
            `INSERT INTO comments (postId, userId, content)
             VALUES (?, ?, ?)`,
            [postId, userId, content]
        );
        return this.findById(result.insertId);
    }

    // Find comment by ID with author details
    static async findById(id) {
        const [rows] = await db.query(
            `SELECT c.*, u.id as authorId, u.avatar, s.studentName as authorName
             FROM comments c
             JOIN users u ON c.userId = u.id
             JOIN students s ON u.studentId = s.studentId
             WHERE c.id = ?`,
            [id]
        );
        return rows[0];
    }

    // Get comments for a specific post with pagination
    static async getByPostId(postId, { page = 1, limit = 20 }) {
        const offset = (page - 1) * limit;
        const [rows] = await db.query(
            `SELECT c.*, u.id as authorId, u.avatar, s.studentName as authorName
             FROM comments c
             JOIN users u ON c.userId = u.id
             JOIN students s ON u.studentId = s.studentId
             WHERE c.postId = ?
             ORDER BY c.createdAt ASC
             LIMIT ? OFFSET ?`,
            [postId, parseInt(limit), parseInt(offset)]
        );

        const [countRows] = await db.query(
            'SELECT COUNT(*) as total FROM comments WHERE postId = ?',
            [postId]
        );
        const total = countRows[0].total;

        return {
            comments: rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    // Update comment content
    static async update(id, content) {
        await db.query('UPDATE comments SET content = ? WHERE id = ?', [content, id]);
        return this.findById(id);
    }

    // Delete comment
    static async delete(id) {
        const [result] = await db.query('DELETE FROM comments WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }

    // Check if user is author of comment
    static async isAuthor(commentId, userId) {
        const [rows] = await db.query(
            'SELECT id FROM comments WHERE id = ? AND userId = ?',
            [commentId, userId]
        );
        return rows.length > 0;
    }
}

module.exports = Comment;