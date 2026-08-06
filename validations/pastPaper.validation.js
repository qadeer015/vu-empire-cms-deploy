// validations/pastPaper.validation.js
const Joi = require('joi');
const validate = require('../middlewares/validate');

const ALLOWED_TYPES = ['midterm', 'finalterm'];
const ALLOWED_SEMESTERS = ['spring', 'fall'];
const ALLOWED_STATUSES = ['draft', 'publish', 'pending'];
const ALLOWED_STORAGE_PROVIDERS = ['gdrive', 'local', 's3', 'cloudinary'];

const pastPaperValidation = {

    // ── Create past paper ──────────────────────────────────────────────
    create: Joi.object({
        courseId: Joi.string().required().messages({
            'any.required': 'Course ID is required',
            'string.empty': 'Course ID cannot be empty'
        }),
        year: Joi.number()
            .integer()
            .min(2000)
            .max(new Date().getFullYear() + 5)
            .optional(),
        type: Joi.string()
            .valid(...ALLOWED_TYPES)
            .optional()
            .messages({
                'any.only': `Type must be one of: ${ALLOWED_TYPES.join(', ')}`
            }),
        semester: Joi.string()
            .valid(...ALLOWED_SEMESTERS)
            .optional()
            .messages({
                'any.only': `Semester must be one of: ${ALLOWED_SEMESTERS.join(', ')}`
            }),
        filePath: Joi.string().required().messages({
            'any.required': 'File path is required',
            'string.empty': 'File path cannot be empty'
        }),
        storageProvider: Joi.string()
            .valid(...ALLOWED_STORAGE_PROVIDERS)
            .default('gdrive')
            .messages({
                'any.only': `Storage provider must be one of: ${ALLOWED_STORAGE_PROVIDERS.join(', ')}`
            }),
        storageKey: Joi.string().allow(null, '').optional(),
        originalFilename: Joi.string().optional(),
        fileSize: Joi.number().integer().min(0).optional(),
        status: Joi.string()
            .valid(...ALLOWED_STATUSES)
            .default('draft')
            .messages({
                'any.only': `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`
            })
    }),

    // ── Update past paper ──────────────────────────────────────────────
    update: Joi.object({
        courseId: Joi.string().optional(),
        year: Joi.number()
            .integer()
            .min(2000)
            .max(new Date().getFullYear() + 5)
            .optional(),
        type: Joi.string()
            .valid(...ALLOWED_TYPES)
            .optional()
            .messages({
                'any.only': `Type must be one of: ${ALLOWED_TYPES.join(', ')}`
            }),
        semester: Joi.string()
            .valid(...ALLOWED_SEMESTERS)
            .optional()
            .messages({
                'any.only': `Semester must be one of: ${ALLOWED_SEMESTERS.join(', ')}`
            }),
        filePath: Joi.string().optional(),
        storageProvider: Joi.string()
            .valid(...ALLOWED_STORAGE_PROVIDERS)
            .optional()
            .messages({
                'any.only': `Storage provider must be one of: ${ALLOWED_STORAGE_PROVIDERS.join(', ')}`
            }),
        storageKey: Joi.string().allow(null, '').optional(),
        originalFilename: Joi.string().optional(),
        fileSize: Joi.number().integer().min(0).optional(),
        status: Joi.string()
            .valid(...ALLOWED_STATUSES)
            .optional()
            .messages({
                'any.only': `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`
            })
    }).min(1).messages({
        'object.min': 'At least one field must be provided for update'
    }),

    // ── Get past paper by ID (params) ──────────────────────────────────
    id: Joi.object({
        id: Joi.number().integer().positive().required().messages({
            'any.required': 'Past paper ID is required',
            'number.base': 'Past paper ID must be a number',
            'number.positive': 'Past paper ID must be a positive integer'
        })
    }),

    // ── List / search query params ─────────────────────────────────────
    list: Joi.object({
        page: Joi.number()
            .integer()
            .min(1)
            .default(1)
            .optional()
            .messages({
                'number.base': 'Page must be a number',
                'number.min': 'Page must be at least 1'
            }),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(20)
            .optional()
            .messages({
                'number.base': 'Limit must be a number',
                'number.min': 'Limit must be at least 1',
                'number.max': 'Limit cannot exceed 100'
            }),
        courseId: Joi.string().optional(),
        includeAll: Joi.string().valid('true', 'false').optional().messages({
            'any.only': 'includeAll must be "true" or "false"'
        }),
        // Group by course mode
        grouped: Joi.string().valid('true', 'false').optional().messages({
            'any.only': 'grouped must be "true" or "false"'
        }),
        // Filters
        search: Joi.string().max(200).optional(),
        year: Joi.number().integer().min(2000).max(new Date().getFullYear() + 5).optional(),
        semester: Joi.string().valid(...ALLOWED_SEMESTERS).optional(),
        type: Joi.string().valid(...ALLOWED_TYPES).optional()
    }),

    // ── Search query params ────────────────────────────────────────────
    search: Joi.object({
        q: Joi.string().min(1).max(200).required().messages({
            'any.required': 'Search query (q) is required',
            'string.empty': 'Search query cannot be empty',
            'string.max': 'Search query cannot exceed 200 characters'
        }),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(20)
            .optional()
    }),

    // ── Marketplace query params ────────────────────────────────────────
    marketplace: Joi.object({
        page: Joi.number()
            .integer()
            .min(1)
            .default(1)
            .optional()
            .messages({
                'number.base': 'Page must be a number',
                'number.min': 'Page must be at least 1'
            }),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(20)
            .optional()
            .messages({
                'number.base': 'Limit must be a number',
                'number.min': 'Limit must be at least 1',
                'number.max': 'Limit cannot exceed 100'
            }),
        // Group by course mode
        grouped: Joi.string().valid('true', 'false').optional().messages({
            'any.only': 'grouped must be "true" or "false"'
        }),
        // Filters
        search: Joi.string().max(200).optional(),
        year: Joi.number().integer().min(2000).max(new Date().getFullYear() + 5).optional(),
        semester: Joi.string().valid(...ALLOWED_SEMESTERS).optional(),
        type: Joi.string().valid(...ALLOWED_TYPES).optional()
    }),

    // ── Upload past paper PDF (multipart) ────────────────────────────────
    upload: Joi.object({
        courseId: Joi.string().required().messages({
            'any.required': 'Course ID is required',
            'string.empty': 'Course ID cannot be empty'
        }),
        year: Joi.number()
            .integer()
            .min(2000)
            .max(new Date().getFullYear() + 5)
            .required()
            .messages({
                'any.required': 'Year is required',
                'number.base': 'Year must be a number'
            }),
        type: Joi.string()
            .valid(...ALLOWED_TYPES)
            .optional()
            .messages({
                'any.only': `Type must be one of: ${ALLOWED_TYPES.join(', ')}`
            }),
        semester: Joi.string()
            .valid(...ALLOWED_SEMESTERS)
            .optional()
            .messages({
                'any.only': `Semester must be one of: ${ALLOWED_SEMESTERS.join(', ')}`
            }),
        status: Joi.string()
            .valid(...ALLOWED_STATUSES)
            .default('publish')
            .messages({
                'any.only': `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`
            })
    })
};

module.exports = {
    create: {
        body: pastPaperValidation.create
    },
    update: {
        body: pastPaperValidation.update,
        params: pastPaperValidation.id
    },
    getOne: {
        params: pastPaperValidation.id
    },
    delete: {
        params: pastPaperValidation.id
    },
    list: {
        query: pastPaperValidation.list
    },
    search: {
        query: pastPaperValidation.search
    },
    marketplace: {
        query: pastPaperValidation.marketplace
    },
    upload: {
        body: pastPaperValidation.upload
    },
    validate
};