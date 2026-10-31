const ExtensionInstallation =
    require("../models/ExtensionInstallation");

const {
    generateRegistrationToken,
    hashRegistrationToken
} = require("../utils/installationToken");


class ExtInstallationController {

    static async register(req, res) {

        try {

            const {
                installationId,
                credentialEncryptionKey
            } = req.body;


            /*
             * Validate input
             */
            if (
                typeof installationId !== "string" ||
                !installationId.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "installationId is required."
                });
            }


            if (
                typeof credentialEncryptionKey !==
                "string" ||
                !credentialEncryptionKey.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "credentialEncryptionKey is required."
                });
            }


            /*
             * Basic installation ID validation
             */
            if (
                installationId.length > 64
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Invalid installationId."
                });
            }


            /*
             * Make sure the supplied key
             * is actually a 256-bit key.
             */
            let keyBuffer;

            try {

                keyBuffer =
                    Buffer.from(
                        credentialEncryptionKey,
                        "base64"
                    );

            } catch {

                return res.status(400).json({
                    success: false,
                    error:
                        "Invalid encryption key."
                });
            }


            if (keyBuffer.length !== 32) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Encryption key must be 256-bit."
                });
            }


            /*
             * Check whether installation
             * already exists.
             */
            const existing =
                await ExtensionInstallation
                    .findByInstallationId(
                        installationId
                    );


            if (existing) {

                /*
                 * Don't generate a second token
                 * for an existing installation.
                 */
                return res.json({
                    success: true,

                    installationId,

                    registrationToken:
                        null,

                    alreadyRegistered: true
                });
            }


            /*
             * Generate authentication token.
             */
            const registrationToken =
                generateRegistrationToken();

            const tokenHash =
                hashRegistrationToken(
                    registrationToken
                );


            /*
             * Register installation.
             */
            await ExtensionInstallation.create({

                installationId,

                registrationTokenHash:
                    tokenHash,

                credentialEncryptionKey
            });


            return res.status(201).json({

                success: true,

                installationId,

                registrationToken,

                alreadyRegistered: false
            });

        } catch (error) {

            console.error(
                "[Installation] Registration failed:",
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    "Unable to register installation."
            });
        }
    }

    /* ── Admin: web page (list + analytics dashboard) ──────────────── */

    static async page(req, res) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = 50;
            const offset = (page - 1) * limit;
            const search = req.query.q || '';
            const status = req.query.status || 'all';
            const activity = req.query.activity || 'all';

            const [installations, total, analytics] = await Promise.all([
                ExtensionInstallation.findAllWithFilters({ search, status, activity, limit, offset }),
                ExtensionInstallation.countAllWithFilters({ search, status, activity }),
                ExtensionInstallation.getAnalytics(30)
            ]);

            return res.render('ext-installations/index', {
                title: 'Extension Installations',
                sidebar: true,
                isGenie: true,
                page: 'ext-installations',
                currentPage: 'ext-installations',
                breadcrumbs: [
                    { label: 'Home', href: '/' },
                    { label: 'Extension Installations', href: '/ext-installations' }
                ],
                user: req.user,
                installations,
                total,
                q: search,
                status,
                activity,
                analytics,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) }
            });
        } catch (err) {
            console.error('[Installation] Admin page failed:', err);
            return res.status(500).render('error', {
                title: 'Server Error',
                message: err.message,
                error: null,
                redirect_url: '/',
                header: false,
                footer: false
            });
        }
    }


    /* ── Admin: JSON APIs ─────────────────────────────────────────── */

    /**
     * GET /api/ext-installations
     * Paginated list with optional filters: q, status, activity, page.
     */
    static async list(req, res) {
        try {
            const page = parseInt(req.query.page, 10) || 1;
            const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
            const offset = (page - 1) * limit;
            const search = req.query.q || '';
            const status = req.query.status || 'all';
            const activity = req.query.activity || 'all';

            const [installations, total] = await Promise.all([
                ExtensionInstallation.findAllWithFilters({ search, status, activity, limit, offset }),
                ExtensionInstallation.countAllWithFilters({ search, status, activity })
            ]);

            return res.json({
                success: true,
                data: installations,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) }
            });
        } catch (error) {
            console.error('[Installation] List failed:', error);
            return res.status(500).json({
                success: false,
                error: 'Unable to load installations.'
            });
        }
    }


    /**
     * GET /api/ext-installations/analytics?days=30
     * Installation analytics: headline counts, by-status breakdown,
     * and a dense daily series of registrations + last-seen activity.
     */
    static async analytics(req, res) {
        try {
            const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 7), 365);
            const data = await ExtensionInstallation.getAnalytics(days);

            return res.json({ success: true, data });
        } catch (error) {
            console.error('[Installation] Analytics failed:', error);
            return res.status(500).json({
                success: false,
                error: 'Unable to load installations analytics.'
            });
        }
    }


    /**
     * GET /api/ext-installations/:id
     * Single installation detail (no secrets exposed).
     */
    static async detail(req, res) {
        try {
            const installation = await ExtensionInstallation.findById(req.params.id);

            if (!installation) {
                return res.status(404).json({
                    success: false,
                    error: 'Installation not found.'
                });
            }

            return res.json({ success: true, data: installation });
        } catch (error) {
            console.error('[Installation] Detail failed:', error);
            return res.status(500).json({
                success: false,
                error: 'Unable to load installation.'
            });
        }
    }



}

module.exports =
    ExtInstallationController;