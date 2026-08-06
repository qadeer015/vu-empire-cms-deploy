// services/pastPaper.service.js
const PastPaper = require('../models/PastPaper');
const AppError = require('../utils/AppError');

class PastPaperService {

    /**
     * Get paginated past papers.
     * When courseId is provided, returns papers for that course.
     */
    static async getAll({ page = 1, limit = 20, courseId = null, grouped = false, filters = {} } = {}) {
        const db = require('../config/db');
        const offset = (page - 1) * limit;

        let papers = [];
        let total = 0;

        // Build WHERE conditions
        const conditions = [];
        const params = [];

        if (courseId) {
            conditions.push('pp.courseId = ?');
            params.push(courseId);
        }

        // Apply filters
        if (filters.search) {
            conditions.push(`(c.courseCode LIKE ? OR c.courseName LIKE ? OR pp.year LIKE ?)`);
            params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
        }
        if (filters.year) {
            conditions.push('pp.year = ?');
            params.push(filters.year);
        }
        if (filters.semester) {
            conditions.push('pp.semester = ?');
            params.push(filters.semester);
        }
        if (filters.type) {
            conditions.push('pp.type = ?');
            params.push(filters.type);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        if (grouped) {
            // Count total groups
            const [[{ count }]] = await db.query(
                `SELECT COUNT(DISTINCT pp.courseId) AS count FROM past_papers pp LEFT JOIN courses c ON pp.courseId = c.courseId ${whereClause}`,
                params
            );
            total = count;

            const [rows] = await db.query(
                `SELECT
                    pp.*,
                    c.courseCode,
                    c.courseName
                FROM past_papers pp
                LEFT JOIN courses c ON pp.courseId = c.courseId
                ${whereClause}
                ORDER BY pp.year DESC, pp.createdAt DESC`,
                params
            );

            // Group rows by courseId
            const groupedPapers = [];
            const map = new Map();
            for (const paper of rows) {
                const key = paper.courseId;
                if (!map.has(key)) {
                    const item = {
                        courseId: key,
                        courseCode: paper.courseCode,
                        courseName: paper.courseName,
                        papers: []
                    };
                    map.set(key, item);
                    groupedPapers.push(item);
                }
                map.get(key).papers.push(paper);
            }

            // Apply pagination to groups
            const pages = Math.ceil(total / limit);
            const start = (page - 1) * limit;
            const pagedGroups = groupedPapers.slice(start, start + limit);

            return {
                papers: pagedGroups,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: pages || 1
                }
            };
        } else {
            // Non-grouped with filters and pagination
            const [rows] = await db.query(
                `SELECT
                    pp.*,
                    c.courseCode,
                    c.courseName
                FROM past_papers pp
                LEFT JOIN courses c ON pp.courseId = c.courseId
                ${whereClause}
                ORDER BY pp.createdAt DESC
                LIMIT ?
                OFFSET ?`,
                [...params, parseInt(limit), parseInt(offset)]
            );

            papers = rows;

            const [[{ count }]] = await db.query(
                `SELECT COUNT(*) AS count FROM past_papers pp LEFT JOIN courses c ON pp.courseId = c.courseId ${whereClause}`,
                params
            );
            total = count;

            return {
                papers,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit) || 1
                }
            };
        }
    }

    /**
     * Get marketplace past papers (published only, paginated).
     */
    static async getMarketplace({ page = 1, limit = 20, grouped = false, filters = {} } = {}) {
        const db = require('../config/db');
        const offset = (page - 1) * limit;

        const conditions = ["pp.status='publish'"];
        const params = [];

        if (filters.search) {
            conditions.push(`(c.courseCode LIKE ? OR c.courseName LIKE ? OR pp.year LIKE ?)`);
            params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
        }
        if (filters.year) {
            conditions.push('pp.year = ?');
            params.push(filters.year);
        }
        if (filters.semester) {
            conditions.push('pp.semester = ?');
            params.push(filters.semester);
        }
        if (filters.type) {
            conditions.push('pp.type = ?');
            params.push(filters.type);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        if (grouped) {
            const [[{ count }]] = await db.query(
                `SELECT COUNT(DISTINCT pp.courseId) AS count FROM past_papers pp LEFT JOIN courses c ON pp.courseId = c.courseId ${whereClause}`,
                params
            );
            const total = count;

            const [rows] = await db.query(
                `SELECT
                    pp.*,
                    c.courseCode,
                    c.courseName
                FROM past_papers pp
                LEFT JOIN courses c ON pp.courseId = c.courseId
                ${whereClause}
                ORDER BY pp.year DESC, pp.createdAt DESC`,
                params
            );

            const groupedPapers = [];
            const map = new Map();
            for (const paper of rows) {
                const key = paper.courseId;
                if (!map.has(key)) {
                    const item = {
                        courseId: key,
                        courseCode: paper.courseCode,
                        courseName: paper.courseName,
                        papers: []
                    };
                    map.set(key, item);
                    groupedPapers.push(item);
                }
                map.get(key).papers.push(paper);
            }

            const pages = Math.ceil(total / limit);
            const start = (page - 1) * limit;
            const pagedGroups = groupedPapers.slice(start, start + limit);

            return {
                papers: pagedGroups,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: pages || 1
                }
            };
        } else {
            const [rows] = await db.query(
                `SELECT
                    pp.*,
                    c.courseCode,
                    c.courseName
                FROM past_papers pp
                LEFT JOIN courses c ON pp.courseId = c.courseId
                ${whereClause}
                ORDER BY pp.createdAt DESC
                LIMIT ?
                OFFSET ?`,
                [...params, parseInt(limit), parseInt(offset)]
            );

            const [[{ count }]] = await db.query(
                `SELECT COUNT(*) AS count FROM past_papers pp LEFT JOIN courses c ON pp.courseId = c.courseId ${whereClause}`,
                params
            );

            return {
                papers: rows,
                pagination: {
                    page,
                    limit,
                    total: count,
                    pages: Math.ceil(count / limit) || 1
                }
            };
        }
    }

    /**
     * Get a single past paper by ID.
     */
    static async getById(id) {
        const paper = await PastPaper.findById(id);
        if (!paper) throw AppError.notFound('Past paper');
        return paper;
    }

    /**
     * Create a new past paper.
     */
    static async create(data) {
        const paper = await PastPaper.create(data);
        return paper;
    }

    /**
     * Publish a past paper by setting status to 'publish'.
     */
    static async publish(id) {
        const existing = await PastPaper.findById(id);
        if (!existing) throw AppError.notFound('Past paper');

        const paper = await PastPaper.update(id, { status: 'publish' });
        if (!paper) throw AppError.notFound('Past paper');

        return paper;
    }

    static async reject(id) {
        const existing = await PastPaper.findById(id);
        if (!existing) throw AppError.notFound('Past paper');

        const paper = await PastPaper.update(id, { status: 'reject' });
        if (!paper) throw AppError.notFound('Past paper');

        return paper;
    }

    /**
     * Update a past paper.
     */
    static async update(id, updates) {
        const existing = await PastPaper.findById(id);
        if (!existing) throw AppError.notFound('Past paper');

        const paper = await PastPaper.update(id, updates);
        if (!paper) throw AppError.notFound('Past paper');

        return paper;
    }

    /**
     * Delete a past paper.
     */
    static async delete(id) {
        const existed = await PastPaper.delete(id);
        if (!existed) throw AppError.notFound('Past paper');
        return true;
    }

    /**
     * Search past papers by query string.
     */
    static async search(query, limit = 20) {
        if (!query || !query.trim()) {
            throw AppError.badRequest('Search query is required');
        }
        const results = await PastPaper.search(query.trim(), limit);
        return results;
    }
}

module.exports = PastPaperService;