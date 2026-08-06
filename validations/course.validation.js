// course.validation.js
const validate = require('../middlewares/validate');
const Joi = require('joi');

const courseValidation = {
    // Create course validation - accepts both array and single object
    createCourse: Joi.alternatives().try(
        // Array of courses
        Joi.array()
            .items(
                Joi.object({
                    courseCode: Joi.string()
                        .required()
                        .messages({
                            'any.required': 'Course code is required',
                            'string.empty': 'Course code cannot be empty'
                        }),
                    courseName: Joi.string()
                        .required()
                        .messages({
                            'any.required': 'Course name is required',
                            'string.empty': 'Course name cannot be empty'
                        })
                })
            )
            .min(1)
            .messages({
                'array.min': 'At least one course record is required',
                'array.base': 'Course data must be an array'
            }),
        // Single course object
        Joi.object({
            courseCode: Joi.string()
                .required()
                .messages({
                    'any.required': 'Course code is required',
                    'string.empty': 'Course code cannot be empty'
                }),
            courseName: Joi.string()
                .required()
                .messages({
                    'any.required': 'Course name is required',
                    'string.empty': 'Course name cannot be empty'
                })
        })
    ).required()
        .messages({
            'any.required': 'Course data is required'
        }),

    // Update course validation
    updateCourse: Joi.object({
        courseCode: Joi.string()
            .optional(), // courseCode from params, not required in body
        courseName: Joi.string()
            .required()
            .messages({
                'any.required': 'Course name is required',
                'string.empty': 'Course name cannot be empty'
            })
    }),

    // Get course validation (for params)
    getCourse: Joi.object({
        courseCode: Joi.string()
            .optional()
            .pattern(/^[A-Za-z0-9]+$/)
            .messages({
                'string.pattern.base': 'Course code must be alphanumeric'
            })
    }),
};

module.exports = {
    createCourse: courseValidation.createCourse,
    updateCourse: courseValidation.updateCourse,
    deleteCourse: courseValidation.deleteCourse,
    getCourse: courseValidation.getCourse,
    validate
};