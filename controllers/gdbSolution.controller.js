const GdbSolution = require('../models/GdbSolution');
const AppError = require('../utils/AppError');

class GdbSolutionController {
    static async getAll(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const courseId = req.query.courseId || null;

            let result;
            if (courseId) {
                const solutions = await GdbSolution.getByCourse(courseId);
                result = { solutions, pagination: { page, limit, total: solutions.length, pages: 1 } };
            } else {
                const offset = (page - 1) * limit;
                const [solutions, total] = await Promise.all([
                    GdbSolution.findAll({ limit, offset }),
                    GdbSolution.countAll()
                ]);
                result = { solutions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
            }

            res.status(200).json({ success: true, data: result });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    static async getOne(req, res) {
        try {
            const solution = await GdbSolution.findById(req.params.id);
            if (!solution) throw AppError.notFound('GDB solution');
            res.status(200).json({ success: true, data: { solution } });
        } catch (err) {
            res.status(err.statusCode || 500).json({ success: false, message: err.message });
        }
    }

    static async create(req, res) {
        try {
            const { courseId, gdbTitle, solution } = req.body;

            if (!courseId || !gdbTitle || !solution) {
                throw AppError.badRequest('Course, GDB title, and solution are required');
            }

            const gdbSolution = await GdbSolution.create({
                courseId, gdbTitle, solution,
                authorId: req.user.id
            });

            res.status(201).json({ success: true, data: { gdbSolution } });
        } catch (err) {
            res.status(err.statusCode || 500).json({ success: false, message: err.message });
        }
    }

    static async update(req, res) {
        try {
            const gdbSolution = await GdbSolution.update(req.params.id, req.body);
            res.status(200).json({ success: true, data: { gdbSolution } });
        } catch (err) {
            res.status(err.statusCode || 500).json({ success: false, message: err.message });
        }
    }

    static async delete(req, res) {
        try {
            await GdbSolution.delete(req.params.id);
            res.status(200).json({ success: true, message: 'GDB solution deleted' });
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
            const results = await GdbSolution.search(query);
            res.status(200).json({ success: true, data: { results } });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
}

module.exports = GdbSolutionController;