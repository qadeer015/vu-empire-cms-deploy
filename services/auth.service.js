// services/auth.service.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const { sendEmail } = require("../api/emailService");
const renderTemplate = require("../utils/templateRenderer");

class AuthService {

    /* -------------------- LOGIN -------------------- */
    static async login({ identifier, password }) {
        const user = await User.findByIdentifier(identifier);

        // Unified error → prevents user enumeration
        if (!user) {
            throw new AppError('Invalid Student ID/VU Email or password', 401);
        }

        if (user.status === 'blocked') {
            throw new AppError('Account blocked. Contact support.', 403);
        }

        if (user.status === 'deleted') {
            throw new AppError('Account deleted. Contact support.', 403);
        }

        // Only admin can access the CMS
        if (user.role !== 'admin') {
            throw new AppError('Access denied. Admin privileges required.', 403);
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new AppError('Invalid Student ID/VU Email or password', 401);
        }

        const token = this.generateToken(user);

        await User.updateLastLogin(user.id);

        return {
            user: {
                id: user.id,
                studentId: user.studentId,
                name: user.studentName,
                vuEmail: user.vuEmail,
                role: user.role,
                avatar: user.avatar
            },
            token,
            message: 'Signed in successfully'
        };
    }

    /* -------------------- FORGOT PASSWORD -------------------- */
    static async forgotPassword(identifier) {
        const user = await User.findByIdentifier(identifier);
        // Silent success → security best practice
        if (!user) {
            return { message: 'If an account exists, a reset link was sent.' };
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
        const emailHtml = renderTemplate('forgot-password.html', {
            user_name: user.studentName,
            year: new Date().getFullYear(),
            reset_link: `${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://${process.env.NODE_ENV === 'production' ? 'vuempire.online' : 'localhost:8080'}/auth/reset-password?token=${resetToken}`,
            app_name: process.env.APP_NAME || 'VU Empire CMS'
        });

        await User.setResetToken(identifier, resetToken, resetTokenExpiry);

        await sendEmail({
            to: user.vuEmail,
            subject: 'Password Reset Request',
            text: '',
            html: emailHtml
        });

        return {
            message: 'Password reset email sent. Check your gmail inbox.'
        };
    }

    /* -------------------- RESET PASSWORD -------------------- */
    static async resetPassword(token, newPassword) {
        const user = await User.findByResetToken(token);

        if (!user) {
            throw new AppError('Invalid or expired reset token', 400);
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.updatePassword(user.id, hashedPassword);

        return {
            message: 'Password reset successfully'
        };
    }

    /* -------------------- REFRESH TOKEN -------------------- */
    static async refreshToken(oldToken) {
        let decoded;

        try {
            decoded = jwt.verify(oldToken, process.env.SECRET_KEY, {
                ignoreExpiration: true
            });
        } catch {
            throw new AppError('Invalid token', 401);
        }

        const user = await User.findById(decoded.id);
        if (!user) {
            throw new AppError('User no longer exists', 401);
        }

        const newToken = this.generateToken(user);

        return {
            token: newToken,
            user: {
                id: user.id,
                studentId: user.studentId,
                name: user.studentName,
                vuEmail: user.vuEmail,
                role: user.role,
                avatar: user.avatar
            },
            message: 'Token refreshed successfully'
        };
    }

    /* -------------------- TOKEN HELPERS -------------------- */
    static generateToken(user) {
        return jwt.sign(
            {
                name: user.studentName,
                id: user.id,
                avatar: user.avatar,
                vuEmail: user.vuEmail,
                studentId: user.studentId,
                role: user.role
            },
            process.env.SECRET_KEY,
            {
                expiresIn: process.env.JWT_EXPIRY || '7d',
                issuer: process.env.JWT_ISSUER || 'VU Empire CMS'
            }
        );
    }

    static verifyToken(token) {
        try {
            return jwt.verify(token, process.env.SECRET_KEY);
        } catch {
            throw new AppError('Invalid token', 401);
        }
    }
}

module.exports = AuthService;