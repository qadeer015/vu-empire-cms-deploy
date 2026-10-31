const Assignment = require('../models/Assignment');
const AppError = require('../utils/AppError');

class AssignmentController {
    static async getAll(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const courseId = req.query.courseId || null;

            let result;
            if (courseId) {
                const assignments = await Assignment.getByCourse(courseId);
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
            const { courseId, title, assignment, dueDate, solution, status = 'publish' } = req.body;

            if (!courseId || !title) {
                throw AppError.badRequest('Course and title are required');
            }

            const createdAssignment = await Assignment.create({
                courseId, title, assignment, dueDate, solution, status,
                authorId: req.user.id
            });

            res.status(201).json({ success: true, data: { assignment: createdAssignment } });
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

    /**
     * Upload an assignment/solution file to Cloudinary and return its URL.
     * The caller (frontend) puts the returned URL into the corresponding text field.
     */
    static async upload(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded' });
            }

            const cloudinary = require('cloudinary').v2;
            if (!cloudinary.config().cloud_name) {
                return res.status(500).json({ success: false, message: 'Cloudinary is not configured' });
            }

            const result = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    { resource_type: 'auto', folder: 'vu-empire-cms/assignments' },
                    (err, uploadRes) => (err ? reject(err) : resolve(uploadRes))
                ).end(req.file.buffer);
            });

            return res.status(200).json({
                success: true,
                message: 'File uploaded successfully',
                url: result.secure_url,
                publicId: result.public_id
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message || 'File upload failed' });
        }
    }
}

module.exports = AssignmentController;