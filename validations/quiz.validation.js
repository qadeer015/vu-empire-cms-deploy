// quiz.validation.js
const validate = require('../middlewares/validate');
const Joi = require('joi');

// A single quiz record. The endpoint accepts either a single object
// (the most common case from the browser extension) or an array of
// records, so the route uses `alternatives().try(...)` below.
//
// We `.unknown(true)` on both the record and the option object so
// extra fields sent by the client (`element`, `radioButton`,
// `sessionId`, `startTime`, `solved`, `url`, …) are silently ignored
// instead of failing validation.
const buildQuizRecordSchema = () => Joi.object({
    courseCode: Joi.string()
        .required()
        .messages({
            'any.required': 'Course code is required'
        }),
    courseName: Joi.string()
        .required()
        .messages({
            'any.required': 'Course name is required'
        }),
    studentId: Joi.string()
        .required()
        .messages({
            'any.required': 'Student ID is required'
        }),
    studentName: Joi.string()
        .required()
        .messages({
            'any.required': 'Student name is required'
        }),
    question: Joi.string()
        .required()
        .messages({
            'any.required': 'Question is required'
        }),

    // Top-level explanation is optional now that `solution.explanation`
    // is the preferred location.
    explanation: Joi.string()
        .allow('', null)
        .optional(),

    // Newer payload: { correctAnswers: ["D"], explanation: "..." }
    solution: Joi.object({
        correctAnswers: Joi.array()
            .items(Joi.string().allow(''))
            .optional()
            .messages({
                'array.base': 'solution.correctAnswers must be an array'
            }),
        explanation: Joi.string()
            .allow('', null)
            .optional()
    }).optional(),

    // NOTE: `url` has been removed from the questions schema and is no
    // longer accepted on the quiz payload. If the client still sends
    // it, it is silently dropped (unknown keys allowed).

    timestamp: Joi.date()
        .required()
        .messages({
            'any.required': 'Timestamp is required',
            'date.base': 'Timestamp must be a valid date'
        }),

    options: Joi.array()
        .items(
            Joi.object({
                letter: Joi.string()
                    .required()
                    .messages({
                        'any.required': 'Option letter is required'
                    }),
                text: Joi.string()
                    .required()
                    .messages({
                        'any.required': 'Option text is required'
                    }),
                index: Joi.number()
                    .required()
                    .messages({
                        'any.required': 'Option index is required',
                        'number.base': 'Option index must be a number'
                    }),
                // Now optional: when the request carries
                // `solution.correctAnswers` the service uses that
                // to mark correct options server-side.
                isCorrect: Joi.boolean()
                    .optional()
                    .messages({
                        'boolean.base': 'isCorrect must be a boolean'
                    })
            }).unknown(true)
        )
        .min(1)
        .required()
        .messages({
            'any.required': 'Options are required',
            'array.min': 'At least one option is required',
            'array.base': 'Options must be an array'
        })
}).unknown(true);

const quizValidation = {
    // Create quiz validation: accept EITHER a single object or an array.
    createQuiz: Joi.alternatives()
        .try(
            Joi.array().items(buildQuizRecordSchema()).min(1).required(),
            buildQuizRecordSchema()
        )
        .required()
        .messages({
            'any.required': 'Quiz data is required',
            'array.min': 'At least one quiz record is required',
            'alternatives.match': 'Quiz data must be a quiz record or an array of quiz records'
        }),

    // Course questions validation
    courseQuestions: Joi.object({
        courseCode: Joi.string()
            .required()
            .messages({
                'any.required': 'Course code is required'
            })
    }),

    submissions: Joi.object({
        studentId: Joi.string().required()
    }),

    pdf: Joi.object({
        studentId: Joi.string().required(),
        quizId: Joi.number().integer().required()
    }),

    // Search validation
    search: Joi.object({
        query: Joi.string()
            .required()
            .messages({
                'any.required': 'Search query is required'
            }),
        courseCode: Joi.string()
            .optional()
            .allow('')
    })
};

module.exports = {
    ...quizValidation,
    validate
};