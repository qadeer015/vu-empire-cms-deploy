// controllers/auth.controller.js
const AuthService = require('../services/auth.service');

/* -------------------- LOGIN -------------------- */
const login = async (req, res) => {
    try {
        const result = await AuthService.login(req.body);

        saveCookie(res, result.token);

        res.status(200).json({
            status: 'success',
            ...result
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message
        });
    }
};

/* -------------------- FORGOT PASSWORD -------------------- */
const forgotPassword = async (req, res) => {
    try {
        const result = await AuthService.forgotPassword(req.body.identifier);

        // Intentionally no token returned in response (security)
        res.status(200).json({
            status: 'success',
            ...result
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message
        });
    }
};

/* -------------------- RESET PASSWORD -------------------- */
const resetPassword = async (req, res) => {
    try {
        const result = await AuthService.resetPassword(
            req.query.token,
            req.body.password
        );

        res.status(200).json({
            status: 'success',
            ...result
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message
        });
    }
};

/* -------------------- REFRESH TOKEN -------------------- */
const refreshToken = async (req, res) => {
    try {
        const oldToken = req.cookies.token;
        if (!oldToken) {
            return res.status(401).json({
                status: 'error',
                message: 'No token provided'
            });
        }

        const result = await AuthService.refreshToken(oldToken);

        saveCookie(res, result.token);

        res.status(200).json({
            status: 'success',
            ...result
        });
    } catch (error) {
        res.status(error.statusCode || 401).json({
            status: 'error',
            message: error.message
        });
    }
};

/* -------------------- LOGOUT -------------------- */
const logout = (req, res) => {
    res.clearCookie('token');

    res.status(200).json({
        status: 'success',
        message: 'Logged out successfully'
    });
};

/* -------------------- COOKIE HELPER -------------------- */
function saveCookie(res, token) {
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
}

module.exports = {
    login,
    logout,
    refreshToken,
    forgotPassword,
    resetPassword
};