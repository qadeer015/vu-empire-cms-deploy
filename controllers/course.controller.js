const CourseService = require('../services/course.service');

class CourseController {

    static async getAll(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 25;
            const data = await CourseService.getAll({ page, limit });
            res.status(200).json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    static async getCourse(req, res) {
        try {
            const data = await CourseService.getCourse(req.params.courseCode);
            res.status(200).json({ success: true, data });
        } catch (err) {
            res.status(404).json({ success: false, message: err.message });
        }
    }

    static async createCourse(req, res) {
        try {
            const data = await CourseService.createMultipleRecords(req.body);
            res.status(201).json({ success: true, data });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    static async updateCourse(req, res) {
        try {
            const data = await CourseService.updateCourse(req.params.courseCode, req.body);
            res.status(200).json({ success: true, data });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    static async deleteCourse(req, res) {
        try {
            await CourseService.deleteCourse(req.params.courseCode);
            res.status(200).json({ success: true, message: 'Course deleted' });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }

    static async getGroupedAll(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;
            const data = await CourseService.getGroupedAll(limit, offset);
            res.status(200).json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    static async getGroupedPublic(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;
            const data = await CourseService.getGroupedPublic(limit, offset);
            res.status(200).json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    static async search(req, res) {
        try {
            const query = req.query.q;
            if (!query || !query.trim()) {
                return res.status(400).json({ success: false, message: 'Search query is required' });
            }
            const limit = parseInt(req.query.limit) || 25;
            const data = await CourseService.search(query.trim(), limit);
            res.status(200).json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    static async downloadPDF(req, res) {
        try {
            await CourseService.streamHandout(req.params.courseCode, res);
        } catch (err) {
            res.status(404).json({ success: false, message: err.message });
        }
    }
}

module.exports = CourseController;