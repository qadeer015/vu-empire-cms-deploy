// middlewares/authenticate.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication middleware - verifies JWT token and loads the user.
 * Only admin users are allowed in this CMS.
 */
const authenticate = async (req, res, next) => {
    const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1] || req.query.token;

    if (!token) {
        if (req.originalUrl.startsWith('/api')) {
            return res.status(401).json({ status: 'error', message: 'Access required! Please log in' });
        }
        return res.redirect('/auth/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);

        // Check if user account still exists and is active
        const user = await User.findById(decoded.id);
        if (!user) {
            res.clearCookie('token');
            return res.status(401).json({ status: 'error', message: 'Account no longer exists' });
        }

        if (user.status === 'deleted') {
            res.clearCookie('token');
            return res.status(403).json({ status: 'error', message: 'Account has been deleted' });
        }

        if (user.status === 'blocked') {
            return res.status(403).json({ status: 'error', message: 'Account has been blocked' });
        }

        req.user = decoded;
        return next();
    } catch (err) {
        res.clearCookie('token');
        if (req.originalUrl.startsWith('/api')) {
            return res.status(401).json({ status: 'error', message: 'Invalid or expired token. Please log in again.' });
        }
        return res.redirect('/auth/login');
    }
};

/**
 * Optional authentication - sets user if authenticated via JWT,
 * but doesn't block if not authenticated.
 */
const optionalAuthenticate = (req, res, next) => {
    const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1] || req.query.token;

    if (token) {
        try {
            const user = jwt.verify(token, process.env.SECRET_KEY);
            req.user = user;
        } catch (err) {
            // Token invalid, continue without error
        }
    }

    next();
};

module.exports = {
    authenticate,
    optionalAuthenticate
};