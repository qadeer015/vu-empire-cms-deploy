// auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../../controllers/auth.controller');
const {
    signin: signinValidation,
    forgotPassword: forgotPasswordValidation,
    resetPassword: resetPasswordValidation,
    validate
} = require('../../validations/auth.validation');
const {
    authLimiter,
    passwordResetLimiter,
    burstLimitMiddleware
} = require('../../middlewares/rateLimiter');

/* -------------------- AUTH ROUTES -------------------- */

// Login
router.post('/login', burstLimitMiddleware, authLimiter, validate(signinValidation), authController.login);

// Token refresh
router.patch('/refresh-token', burstLimitMiddleware, authController.refreshToken);

// Logout
router.delete('/logout', burstLimitMiddleware, authController.logout);

// Password reset
router.post('/forgot-password', burstLimitMiddleware, passwordResetLimiter, validate(forgotPasswordValidation), authController.forgotPassword);
router.patch('/reset-password', burstLimitMiddleware, validate(resetPasswordValidation), authController.resetPassword);

module.exports = router;