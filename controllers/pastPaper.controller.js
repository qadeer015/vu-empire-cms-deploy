// controllers/pastPaper.controller.js
const PastPaperService = require('../services/pastPaper.service');
const AppError = require('../utils/AppError');

class PastPaperController {
    static async getAll(req, res, next) {
        try {
            const { page, limit, courseId, includeAll, grouped, search, year, semester, type } = req.query;
            const result = await PastPaperService.getAll({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
                courseId: courseId || null,
                includeAll: includeAll === 'true',
                grouped: grouped === 'true',
                filters: {
                    search: search || null,
                    year: year ? parseInt(year) : null,
                    semester: semester || null,
                    type: type || null
                }
            });
            res.status(200).json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    }

    static async getMarketplace(req, res, next) {
        try {
            const { page, limit, grouped, search, year, semester, type } = req.query;
            const result = await PastPaperService.getMarketplace({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
                grouped: grouped === 'true',
                filters: {
                    search: search || null,
                    year: year ? parseInt(year) : null,
                    semester: semester || null,
                    type: type || null
                }
            });
            res.status(200).json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    }

    static async getOne(req, res, next) {
        try {
            const paper = await PastPaperService.getById(req.params.id);
            res.status(200).json({ success: true, data: { paper } });
        } catch (err) {
            next(err);
        }
    }

    static async download(req, res, next) {
        try {
            const paper = await PastPaperService.getById(req.params.id);

            if (!paper) {
                return next(AppError.notFound('Past paper not found'));
            }

            if (!paper.filePath) {
                return next(AppError.badRequest('No file available for this past paper'));
            }

            // Proxy the file through the server to ensure download headers are respected
            try {
                const response = await fetch(paper.filePath);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch file from storage');
                }

                const buffer = Buffer.from(await response.arrayBuffer());
                
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="past-paper-${paper.id}.pdf"`);
                res.setHeader('Content-Length', buffer.length);
                
                res.send(buffer);
            } catch (fetchErr) {
                console.error('Download proxy error:', fetchErr);
                // Fallback: redirect directly
                res.setHeader('Content-Disposition', `attachment; filename="past-paper-${paper.id}.pdf"`);
                res.redirect(paper.filePath);
            }
        } catch (err) {
            next(err);
        }
    }

    static async create(req, res, next) {
        try {
            const allowedStatus = ['pending', 'draft', 'publish'];
            const incomingStatus = (req.body.status || 'pending').toLowerCase();

            if (!allowedStatus.includes(incomingStatus)) {
                return next(AppError.badRequest('Invalid status. Only pending, draft, and publish are allowed.'));
            }

            const data = {
                ...req.body,
                status: incomingStatus,
                authorId: req.user.id
            };

            const paper = await PastPaperService.create(data);

            res.status(201).json({ success: true, data: { paper } });
        } catch (err) {
            next(err);
        }
    }

    static async update(req, res, next) {
        try {
            const existing = await PastPaperService.getById(req.params.id);

            if (!existing) {
                return next(AppError.notFound('Past paper not found'));
            }

            const allowedStatus = ['pending', 'draft', 'publish'];
            if (req.body.status && !allowedStatus.includes(req.body.status.toLowerCase())) {
                return next(AppError.badRequest('Invalid status. Only pending, draft, and publish are allowed.'));
            }

            const paper = await PastPaperService.update(req.params.id, req.body);
            res.status(200).json({ success: true, data: { paper } });
        } catch (err) {
            next(err);
        }
    }

    static async delete(req, res, next) {
        try {
            const existing = await PastPaperService.getById(req.params.id);

            if (!existing) {
                return next(AppError.notFound('Past paper not found'));
            }

            await PastPaperService.delete(req.params.id);
            res.status(200).json({ success: true, message: 'Past paper deleted' });
        } catch (err) {
            next(err);
        }
    }

    static async publish(req, res, next) {
        try {
            const existing = await PastPaperService.getById(req.params.id);

            if (!existing) {
                return next(AppError.notFound('Past paper not found'));
            }

            const paper = await PastPaperService.publish(req.params.id);
            res.status(200).json({ success: true, data: { paper } });
        } catch (err) {
            next(err);
        }
    }

    static async reject(req, res, next) {
        try {
            const existing = await PastPaperService.getById(req.params.id);

            if (!existing) {
                return next(AppError.notFound('Past paper not found'));
            }

            const paper = await PastPaperService.reject(req.params.id);
            res.status(200).json({ success: true, data: { paper } });
        } catch (err) {
            next(err);
        }
    }

    static async search(req, res, next) {
        try {
            const results = await PastPaperService.search(req.query.q, req.query.limit);
            res.status(200).json({ success: true, data: { results } });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Upload a past paper PDF and create a DB record.
     */
    static async upload(req, res, next) {
        try {
            if (!req.file) {
                return next(AppError.badRequest('No PDF file uploaded'));
            }

            const { courseId, year, type, semester, status } = req.body;

            let storageProvider = 'gdrive';
            let storageKey = null;
            let filePath = null;

            // Upload to Cloudinary as fallback (simpler than Google Drive)
            try {
                const cloudinary = require('cloudinary').v2;
                if (cloudinary.config().cloud_name) {
                    const result = await new Promise((resolve, reject) => {
                        cloudinary.uploader.upload_stream(
                            { resource_type: 'auto', folder: 'past-papers' },
                            (err, res) => err ? reject(err) : resolve(res)
                        ).end(req.file.buffer);
                    });

                    storageProvider = 'cloudinary';
                    storageKey = result.public_id;
                    filePath = result.secure_url;
                }
            } catch (cErr) {
                console.error('[upload] Cloudinary upload failed:', cErr.message);
                return next(AppError.badRequest('File upload failed: ' + cErr.message));
            }

            if (!filePath) {
                return next(AppError.badRequest('No file storage configured'));
            }

            // Validate status
            const allowedStatus = ['pending', 'draft', 'publish'];
            const incomingStatus = (status || 'pending').toLowerCase();

            if (!allowedStatus.includes(incomingStatus)) {
                return next(AppError.badRequest('Invalid status. Only pending, draft, and publish are allowed.'));
            }

            // Create DB record
            const paper = await PastPaperService.create({
                courseId,
                year: parseInt(year),
                type: type || null,
                semester: semester || null,
                filePath,
                storageProvider,
                storageKey,
                originalFilename: req.file.originalname,
                fileSize: req.file.size,
                status: incomingStatus,
                authorId: req.user.id
            });

            res.status(201).json({
                success: true,
                data: { paper }
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = PastPaperController;