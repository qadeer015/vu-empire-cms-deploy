const db = require('../config/db');
const slugify = require('slugify');
const cache = require('../services/cacheService');
const TTL = require('../config/cacheTTL');

class Post {
    // Create a new post
    // ── Cache invalidation helpers ─────────────────────────────────
    static async _invalidatePostCaches(id, slug) {
        if (id) await cache.del(`post:${id}`);
        if (slug) await cache.del(`post:slug:${slug}`);
        await cache.delByPattern('posts:*');
        await cache.delByPattern('search:*');
        await cache.delByPattern('dashboard:*');
    }

    /**
     * Create a new post
     */
    static async create(postData) {
        const { userId, title, content, thumbnail, status = 'pending', contentType = 'post' } = postData;
        
        // Only allow new content types
        const validTypes = ['event', 'poll', 'document', 'post'];
        const finalContentType = validTypes.includes(contentType) ? contentType : 'post';
        let slug = slugify(title, { lower: true, strict: true });
        let uniqueSlug = slug;
        let counter = 1;
        while (await this.slugExists(uniqueSlug)) {
            uniqueSlug = `${slug}-${counter++}`;
        }
        slug = uniqueSlug;

        const thumbnailJson = thumbnail
            ? (typeof thumbnail === 'string' ? JSON.stringify(thumbnail) : JSON.stringify(thumbnail))
            : null;

        const [result] = await db.query(
            `INSERT INTO posts (userId, title, slug, content, thumbnail, status, content_type)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, title, slug, content, thumbnailJson, status, contentType]
        );
        // Cache invalidation removed to prevent timeout on post creation
        return this.findById(result.insertId);
    }

    static async slugExists(slug) {
        const [rows] = await db.query('SELECT id FROM posts WHERE slug = ?', [slug]);
        return rows.length > 0;
    }

    static async findById(id) {
        const [rows] = await db.query(
            `SELECT p.*, u.id as authorId, u.role, u.avatar, s.studentName as authorName, s.vuEmail as authorEmail,
                    u.profilePublic as authorProfilePublic,
                    (SELECT r.studentName FROM users ru JOIN students r ON ru.studentId = r.studentId WHERE ru.id = p.reviewedBy) as reviewedByName
             FROM posts p
             JOIN users u ON p.userId = u.id
             JOIN students s ON u.studentId = s.studentId
             WHERE p.id = ?`,
            [id]
        );
        return rows[0] ? this.normalizePost(rows[0]) : null;
    }

    static async findBySlug(slug) {
        const [rows] = await db.query(
            `SELECT p.*, u.id as authorId, u.role, u.avatar, s.studentName as authorName, s.vuEmail as authorEmail,
                    u.profilePublic as authorProfilePublic
             FROM posts p
             JOIN users u ON p.userId = u.id
             JOIN students s ON u.studentId = s.studentId
             WHERE p.slug = ?`,
            [slug]
        );
        return rows[0] ? this.normalizePost(rows[0]) : null;
    }

    static normalizePost(post) {
        if (!post) return post;
        if (post.thumbnail && typeof post.thumbnail === 'string') {
            try {
                post.thumbnail = JSON.parse(post.thumbnail);
            } catch (e) {}
        }
        return post;
    }

    static async getAll({ page = 1, limit = 10, userId = null, search = '', status = null, contentType = null, includeAllStatuses = false }) {
        const offset = (page - 1) * limit;
        let query = `
            SELECT p.*, u.id as authorId, u.role, u.avatar, s.studentName as authorName, s.vuEmail as authorEmail,
                   u.profilePublic as authorProfilePublic,
                   (SELECT COUNT(*) FROM post_views WHERE postId = p.id) as viewCount,
                   (SELECT COUNT(*) FROM post_reactions WHERE postId = p.id) as reactionCount,
                   (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentCount
            FROM posts p
            JOIN users u ON p.userId = u.id
            JOIN students s ON u.studentId = s.studentId
        `;
        const params = [];
        const conditions = [];

        if (userId) {
            conditions.push('p.userId = ?');
            params.push(userId);
        }
        if (search) {
            conditions.push('(p.title LIKE ? OR p.content LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        if (status) {
            conditions.push('p.status = ?');
            params.push(status);
        } else if (!includeAllStatuses) {}
        if (contentType) {
            conditions.push('p.content_type = ?');
            params.push(contentType);
        }

        if (conditions.length) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY p.createdAt DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await db.query(query, params);

        let countQuery = 'SELECT COUNT(*) as total FROM posts p';
        if (conditions.length) {
            countQuery += ' WHERE ' + conditions.join(' AND ');
        }
        const [countRows] = await db.query(countQuery, params.slice(0, -2));
        const total = countRows[0].total;

        return {
            posts: rows.map(r => this.normalizePost(r)),
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        };
    }

    static async update(id, updates) {
        const allowed = ['title', 'content', 'thumbnail', 'content_type'];
        const filtered = {};
        for (const key of allowed) {
            if (updates[key] !== undefined) filtered[key] = updates[key];
        }
        if (Object.keys(filtered).length === 0) return this.findById(id);

        if (filtered.title) {
            let slug = slugify(filtered.title, { lower: true, strict: true });
            let uniqueSlug = slug;
            let counter = 1;
            while (await this.slugExists(uniqueSlug)) {
                const existing = await this.findBySlug(uniqueSlug);
                if (existing && existing.id !== id) {
                    uniqueSlug = `${slug}-${counter++}`;
                } else break;
            }
            filtered.slug = uniqueSlug;
        }

        if (filtered.thumbnail && typeof filtered.thumbnail !== 'string') {
            filtered.thumbnail = JSON.stringify(filtered.thumbnail);
        }

        const fields = [];
        const values = [];
        for (const [key, value] of Object.entries(filtered)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
        values.push(id);

        await db.query(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`, values);
        // Invalidate caches for this post and post lists
        await this._invalidatePostCaches(id, filtered.slug);
        return this.findById(id);
    }

    /**
     * Update post status (publish / reject / pending)
     */
    static async updateStatus(id, { status, rejectReason = null, reviewedBy = null }) {
        const fields = ['status = ?'];
        const values = [status];

        if (rejectReason !== undefined) {
            fields.push('rejectReason = ?');
            values.push(rejectReason);
        }
        if (reviewedBy !== undefined && reviewedBy !== null) {
            fields.push('reviewedBy = ?', 'reviewedAt = NOW()');
            values.push(reviewedBy);
        }

        values.push(id);
        await db.query(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`, values);
        // Cache invalidation removed to prevent timeout
        return this.findById(id);
    }

    static async softDelete(id) {
        await db.query(`UPDATE posts SET status = 'delete' WHERE id = ?`, [id]);
        // Cache invalidation removed to prevent timeout
        return this.findById(id);
    }

    static async delete(id) {
        const [result] = await db.query('DELETE FROM posts WHERE id = ?', [id]);
        // Invalidate caches after hard delete
        await this._invalidatePostCaches(id);
        return result.affectedRows > 0;
    }

    static async getByStatus(status, { page = 1, limit = 20 }) {
        return this.getAll({ page, limit, status, includeAllStatuses: true });
    }

    static async search(query, { page = 1, limit = 10, status = null, includeCourses = true }) {
        const offset = (page - 1) * limit;
        const searchTerm = `%${query}%`;
        
        // Search posts
        const postParams = [searchTerm, searchTerm];
        let postWhere = 'p.title LIKE ? OR p.content LIKE ?';
        if (status) {
            postWhere += ' AND p.status = ?';
            postParams.push(status);
        }
        
        const [postRows] = await db.query(
            `SELECT p.*, u.id as authorId, u.role, u.avatar, s.studentName as authorName, s.vuEmail as authorEmail,
                    'post' as resultType
             FROM posts p
             JOIN users u ON p.userId = u.id
             JOIN students s ON u.studentId = s.studentId
             WHERE ${postWhere}
             ORDER BY p.createdAt DESC
             LIMIT ? OFFSET ?`,
            [...postParams, parseInt(limit), parseInt(offset)]
        );

        const [postCountRows] = await db.query(
            `SELECT COUNT(*) as total FROM posts p WHERE ${postWhere}`,
            postParams
        );
        
        let results = postRows.map(r => this.normalizePost(r));
        let total = postCountRows[0].total;

        // Also search courses if requested
        if (includeCourses) {
            const [courseRows] = await db.query(
                `SELECT courseId, courseCode, courseName, handoutPdf, handoutOriginalFilename, downloadCount, createdAt,
                        'course' as resultType
                 FROM courses
                 WHERE courseCode LIKE ? OR courseName LIKE ?
                 LIMIT ? OFFSET ?`,
                [searchTerm, searchTerm, parseInt(limit), parseInt(offset)]
            );

            const [courseCountRows] = await db.query(
                `SELECT COUNT(*) as total FROM courses WHERE courseCode LIKE ? OR courseName LIKE ?`,
                [searchTerm, searchTerm]
            );

            // Merge results (posts first, then courses)
            results = [...results, ...courseRows];
            total += courseCountRows[0].total;
        }

        return {
            posts: results,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        };
    }

    // ==================== VIEWS ====================

    static async recordView(postId, userId = null, ipAddress = null) {
        const [existing] = await db.query(
            `SELECT id FROM post_views WHERE postId = ? AND (userId = ? OR (userId IS NULL AND ipAddress = ?)) LIMIT 1`,
            [postId, userId, ipAddress]
        );
        if (existing.length > 0) return existing[0].id;

        const [result] = await db.query(
            `INSERT INTO post_views (postId, userId, ipAddress) VALUES (?, ?, ?)`,
            [postId, userId, ipAddress]
        );
        return result.insertId;
    }

    static async getViewCount(postId) {
        const [rows] = await db.query(
            `SELECT COUNT(*) AS count FROM post_views WHERE postId = ?`,
            [postId]
        );
        return rows[0].count;
    }

    // ==================== REACTIONS ====================

    /** Toggle reaction: one per user. If same type clicked, remove. If different, replace. */
    static async toggleReaction(postId, userId, type) {
        const [existing] = await db.query(
            `SELECT id, type FROM post_reactions WHERE postId = ? AND userId = ? LIMIT 1`,
            [postId, userId]
        );

        if (existing.length > 0) {
            if (existing[0].type === type) {
                await db.query(`DELETE FROM post_reactions WHERE id = ?`, [existing[0].id]);
            } else {
                await db.query(`UPDATE post_reactions SET type = ? WHERE id = ?`, [type, existing[0].id]);
            }
        } else {
            await db.query(`INSERT INTO post_reactions (postId, userId, type) VALUES (?, ?, ?)`, [postId, userId, type]);
        }

        return this.getReactionCounts(postId);
    }

    static async getUserReaction(postId, userId) {
        const [rows] = await db.query(
            `SELECT type FROM post_reactions WHERE postId = ? AND userId = ? LIMIT 1`,
            [postId, userId]
        );
        return rows[0] ? rows[0].type : null;
    }

    static async getReactionCounts(postId) {
        const [rows] = await db.query(
            `SELECT type, COUNT(*) AS count FROM post_reactions WHERE postId = ? GROUP BY type`,
            [postId]
        );
        const counts = { like: 0, heart: 0, laugh: 0, anger: 0 };
        rows.forEach(r => { counts[r.type] = r.count; });
        return counts;
    }

    // ==================== POLL VOTES ====================

    /**
     * Cast (or change) a vote on a poll post.
     * One vote per user per poll - if user already voted on a different option, it updates.
     * @param {number} postId
     * @param {number} userId
     * @param {number} optionIndex - zero-based index of the chosen option
     * @returns {Object} { optionIndex, totalVotes, results }
     */
    static async castPollVote(postId, userId, optionIndex) {
        // Use INSERT … ON DUPLICATE KEY UPDATE to handle both new votes and vote changes
        await db.query(
            `INSERT INTO poll_votes (postId, userId, optionIndex)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE optionIndex = VALUES(optionIndex)`,
            [postId, userId, optionIndex]
        );
        const results = await this.getPollResults(postId);
        return results;
    }

    /**
     * Get poll results: vote count per option and total votes
     * @param {number} postId
     * @returns {Object} { totalVotes, results: { [optionIndex]: count } }
     */
    static async getPollResults(postId) {
        const [rows] = await db.query(
            `SELECT optionIndex, COUNT(*) AS count
             FROM poll_votes
             WHERE postId = ?
             GROUP BY optionIndex`,
            [postId]
        );
        const results = {};
        let totalVotes = 0;
        rows.forEach(function (r) {
            results[r.optionIndex] = r.count;
            totalVotes += r.count;
        });
        return { totalVotes, results };
    }

    /**
     * Check if a user has already voted on a poll, and which option they chose
     * @param {number} postId
     * @param {number} userId
     * @returns {number|null} optionIndex or null if not voted
     */
    static async getUserPollVote(postId, userId) {
        const [rows] = await db.query(
            `SELECT optionIndex FROM poll_votes WHERE postId = ? AND userId = ? LIMIT 1`,
            [postId, userId]
        );
        return rows.length > 0 ? rows[0].optionIndex : null;
    }

    /**
     * Get published posts grouped by content type.
     * Returns an object with keys: posts, events, polls, documents
     */
    static async getPublishedGroupedByType() {
        const [rows] = await db.query(
            `SELECT p.*, u.id as authorId, u.role, u.avatar, s.studentName as authorName, s.vuEmail as authorEmail,
                    u.profilePublic as authorProfilePublic,
                    (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentCount
             FROM posts p
             JOIN users u ON p.userId = u.id
             JOIN students s ON u.studentId = s.studentId
             WHERE p.status = 'publish'
             ORDER BY p.createdAt DESC`
        );

        const posts = rows.map(r => this.normalizePost(r));
        const grouped = { posts: [], events: [], polls: [], documents: [] };

        for (const post of posts) {
            switch (post.content_type) {
                case 'event':
                    grouped.events.push(post);
                    break;
                case 'poll':
                    grouped.polls.push(post);
                    break;
                case 'document':
                    grouped.documents.push(post);
                    break;
                default:
                    grouped.posts.push(post);
                    break;
            }
        }

        return grouped;
    }

    /**
     * Get top reacted published posts of a specific content type.
     */
    static async getTopReactedPosts({ limit = 6, contentType = 'post' } = {}) {
        const [rows] = await db.query(
            `SELECT p.*, u.id as authorId, u.role, u.avatar, s.studentName as authorName, s.vuEmail as authorEmail,
                    u.profilePublic as authorProfilePublic,
                    (SELECT COUNT(*) FROM post_reactions WHERE postId = p.id) as reactionCount,
                    (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentCount
             FROM posts p
             JOIN users u ON p.userId = u.id
             JOIN students s ON u.studentId = s.studentId
             WHERE p.status = 'publish' AND p.content_type = ?
             ORDER BY reactionCount DESC, p.createdAt DESC
             LIMIT ?`,
            [contentType, parseInt(limit)]
        );

        return rows.map(r => this.normalizePost(r));
    }

    /**
     * Aggregate analytics for a single post:
     * views (total / unique users / anonymous / last 7 days + daily series),
     * reaction breakdown, comment stats and engagement rate.
     */
    static async getStats(postId) {
        const [viewRows] = await db.query(
            `SELECT COUNT(*) AS totalViews,
                    COUNT(DISTINCT userId) AS uniqueUsers,
                    SUM(CASE WHEN userId IS NULL THEN 1 ELSE 0 END) AS anonymousViews,
                    SUM(CASE WHEN createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS viewsLast7Days
             FROM post_views WHERE postId = ?`,
            [postId]
        );

        const [dailyRows] = await db.query(
            `SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') AS day, COUNT(*) AS count
             FROM post_views
             WHERE postId = ? AND createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
             GROUP BY day
             ORDER BY day ASC`,
            [postId]
        );

        const [reactionRows] = await db.query(
            `SELECT type, COUNT(*) AS count FROM post_reactions WHERE postId = ? GROUP BY type`,
            [postId]
        );

        const [commentRows] = await db.query(
            `SELECT COUNT(*) AS totalComments,
                    SUM(CASE WHEN createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS commentsLast7Days
             FROM comments WHERE postId = ?`,
            [postId]
        );

        const viewRow = viewRows[0] || {};
        const commentRow = commentRows[0] || {};

        // Build a complete 7-day series (fill missing days with 0)
        const daily = [];
        const dayMap = new Map(dailyRows.map(r => [r.day, Number(r.count)]));
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            daily.push({ date: key, count: dayMap.get(key) || 0 });
        }

        const reactions = { like: 0, heart: 0, laugh: 0, anger: 0 };
        reactionRows.forEach(r => { reactions[r.type] = Number(r.count); });

        const totalViews = Number(viewRow.totalViews || 0);
        const totalReactions = reactions.like + reactions.heart + reactions.laugh + reactions.anger;
        const totalComments = Number(commentRow.totalComments || 0);
        const engagements = totalReactions + totalComments;

        return {
            totalViews,
            uniqueUsers: Number(viewRow.uniqueUsers || 0),
            anonymousViews: Number(viewRow.anonymousViews || 0),
            viewsLast7Days: Number(viewRow.viewsLast7Days || 0),
            daily,
            reactions,
            totalReactions,
            totalComments,
            commentsLast7Days: Number(commentRow.commentsLast7Days || 0),
            engagementRate: totalViews > 0 ? Math.round((engagements / totalViews) * 100) : 0
        };
    }

    /**
     * Get author-specific stats: total posts, published, pending, rejected
     */
    static async getAuthorStats(authorId) {
        const [result] = await db.query(`
            SELECT COUNT(*) AS totalPosts,
                   SUM(CASE WHEN status = 'publish' THEN 1 ELSE 0 END) AS publishedPosts,
                   SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingPosts,
                   SUM(CASE WHEN status = 'reject' THEN 1 ELSE 0 END) AS rejectedPosts
            FROM posts
            WHERE userId = ? AND status != 'delete'
        `, [authorId]);
        const row = result[0] || {};
        return {
            totalPosts: row.totalPosts || 0,
            publishedPosts: row.publishedPosts || 0,
            pendingPosts: row.pendingPosts || 0,
            rejectedPosts: row.rejectedPosts || 0
        };
    }

    static async getAggregatedStats() {
        const [result] = await db.query(`
            SELECT COUNT(*) AS totalPosts,
                   SUM(CASE WHEN status = 'publish' THEN 1 ELSE 0 END) AS publishedPosts,
                   SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingPosts,
                   SUM(CASE WHEN status = 'reject' THEN 1 ELSE 0 END) AS rejectedPosts
            FROM posts WHERE status != 'delete'
        `);
        return result[0];
    }
}

module.exports = Post;