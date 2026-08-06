const validate = require('../middlewares/validate');
const Joi = require('joi');

const pricingValidation = {
    subscribe: Joi.object({
        email: Joi.string()
            .email()
            .required()
            .max(255)
            .messages({
                'string.email': 'Please provide a valid email address',
                'any.required': 'Email is required'
            }),
        plan: Joi.string()
            .valid('basic', 'premium', 'enterprise')
            .required()
            .messages({
                'any.only': 'Plan must be one of: basic, premium, enterprise',
                'any.required': 'Plan is required'
            })
    })
};

module.exports = { ...pricingValidation, validate };