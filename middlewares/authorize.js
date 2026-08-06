// middlewares/authorize.js
const isJsonRequest = (req) => {
    return req.xhr
        || req.originalUrl?.startsWith('/api')
        || req.headers.accept?.includes('application/json')
        || req.get('content-type')?.includes('application/json');
};

/**
 * Authorization middleware - only allows admin role.
 * This CMS operates exclusively on the 'admin' user.
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        const wantsJson = isJsonRequest(req);

        if (!req.user) {
            if (wantsJson) {
                return res.status(401).json({
                    success: false,
                    message: 'Access denied. User not authenticated.'
                });
            }
            return res.redirect('/auth/login');
        }

        const userRole = String(req.user.role || 'student').toLowerCase();

        // Only admin is allowed in this CMS
        if (userRole !== 'admin' || (allowedRoles.length > 0 && !allowedRoles.includes('admin'))) {
            if (wantsJson) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Admin privileges required.'
                });
            }
            return res.status(403).render('error', {
                message: 'You do not have permission to access this page.',
                title: 'Access Denied',
                redirect_url: req.get('Referer') || '/'
            });
        }

        next();
    };
};

module.exports = {
    authorize
};