const Assignment = require('../models/Assignment');
const AppError = require('../utils/AppError');

class AssignmentController {
    static async getAll(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const courseCode = req.query.courseCode || null;

            let result;
            if (courseCode) {
                const assignments = await Assignment.getByCourse(courseCode);
                result = { assignments, pagination: { page, limit, total: assignments.length, pages: 1 } };
            } else {
                const offset = (page - 1) * limit;
                const [assignments, total] = await Promise.all([
                    Assignment.findAll({ limit, offset }),
                    Assignment.countAll()
                ]);
                result = { assignments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
            }

            res.status(200).json({ success: true, data: result });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    static async getOne(req, res) {
        try {
            const assignment = await Assignment.findById(req.params.id);
            if (!assignment) throw AppError.notFound('Assignment');
            res.status(200).json({ success: true, data: { assignment } });
        } catch (err) {
            res.status(err.statusCode || 500).json({ success: false, message: err.message });
        }
    }

    static async create(req, res) {
        try {
            const { courseCode, courseName, title, description, dueDate, filePath, originalFilename, status = 'publish' } = req.body;

            if (!courseCode || !title) {
                throw AppError.badRequest('Course code and title are required');
            }

            const assignment = await Assignment.create({
                courseCode, courseName, title, description, dueDate, filePath, originalFilename, status,
                authorId: req.user.id
            });

            res.status(201).json({ success: true, data: { assignment } });
        } catch (err) {
            res.status(err.statusCode || 500).json({ success: false, message: err.message });
        }
    }

    static async update(req, res) {
        try {
            const assignment = await Assignment.update(req.params.id, req.body);
            res.status(200).json({ success: true, data: { assignment } });
        } catch (err) {
            res.status(err.statusCode || 500).json({ success: false, message: err.message });
        }
    }

    static async delete(req, res) {
        try {
            await Assignment.delete(req.params.id);
            res.status(200).json({ success: true, message: 'Assignment deleted' });
        } catch (err) {
            res.status(err.statusCode || 500).json({ success: false, message: err.message });
        }
    }

    static async search(req, res) {
        try {
            const query = req.query.q;
            if (!query) {
                return res.status(400).json({ success: false, message: 'Search query required' });
            }
            const results = await Assignment.search(query);
            res.status(200).json({ success: true, data: { results } });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
}

module.exports = AssignmentController;