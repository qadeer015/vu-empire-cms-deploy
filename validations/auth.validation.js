// auth.validation.js
const validate = require('../middlewares/validate');
const Joi = require('joi');

const authValidation = {
    // Signin validation
    signin: Joi.object({
        identifier: Joi.string()
                    .required()
                    .messages({
                        'any.required': 'Please provide Student ID or Email'
                    }),
        password: Joi.string().required()
    }),

    // Forgot password validation
    forgotPassword: Joi.object({
        identifier: Joi.string()
            .required()
            .messages({
                'any.required': 'Please provide Student ID or Email'
            })
    }),

    // Reset password validation
    resetPassword: Joi.object({
        token: Joi.string().required(),
        password: Joi.string()
            .min(6)
            .required()
            .messages({
                'string.min': 'Password must be at least 6 characters long',
                'any.required': 'Password is required'
            })
    }),

    // Refresh token validation
    refreshToken: Joi.object({
        token: Joi.string().optional()
    })
};

module.exports = {
    ...authValidation,
    validate
};