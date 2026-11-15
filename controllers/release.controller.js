const Release = require('../models/Release');
const CHANGE_TYPES = ['feature', 'improve', 'fix'];

function renderAdmin(res, view, data = {}) {
    return res.render(view, {
        title: 'Release Changelog',
        sidebar: true,
        isGenie: true,
        page: 'releases',
        currentPage: 'releases',
        breadcrumbs: [
            { label: 'Home', href: '/' },
            { label: 'Release Changelog', href: '/releases' },
            ...(data.mode ? [{ label: data.mode === 'new' ? 'New Release' : 'Edit Release', href: '' }] : [])
        ],
        ...data
    });
}

function normalizeReleaseInput(body) {
    const version = typeof body.version === 'string' ? body.version.trim() : '';
    const releasedAt = typeof body.releasedAt === 'string' ? body.releasedAt.trim() : '';
    const types = Array.isArray(body.changeType)
        ? body.changeType
        : body.changeType ? [body.changeType] : [];
    const descriptions = Array.isArray(body.description)
        ? body.description
        : body.description ? [body.description] : [];
    const errors = [];

    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version) || version.length > 32) {
        errors.push('Enter a valid version, such as 1.0.9.');
    }

    const date = new Date(`${releasedAt}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(releasedAt) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== releasedAt) {
        errors.push('Enter a valid release date.');
    }

    if (types.length !== descriptions.length) {
        errors.push('Each changelog entry must have a type and description.');
    }

    const changes = [];
    for (let index = 0; index < Math.max(types.length, descriptions.length); index += 1) {
        const type = typeof types[index] === 'string' ? types[index].trim() : '';
        const description = typeof descriptions[index] === 'string' ? descriptions[index].trim() : '';

        if (!description) continue;
        if (!CHANGE_TYPES.includes(type)) {
            errors.push(`Choose a valid type for changelog entry ${index + 1}.`);
        }
        if (!description || description.length > 500) {
            errors.push(`Changelog entry ${index + 1} needs a description of 1 to 500 characters.`);
        }
        if (description) {
            changes.push({
                type: CHANGE_TYPES.includes(type) ? type : 'feature',
                description
            });
        }
    }

    return {
        value: { version, releasedAt, changes },
        errors
    };
}

function renderForm(res, { mode, release = null, errors = [], status = 200 }) {
    return res.status(status).render('releases/form', {
        title: mode === 'new' ? 'New Release' : 'Edit Release',
        sidebar: true,
        isGenie: true,
        page: 'releases',
        currentPage: 'releases',
        mode,
        release: release || {},
        errors,
        breadcrumbs: [
            { label: 'Home', href: '/' },
            { label: 'Release Changelog', href: '/releases' },
            { label: mode === 'new' ? 'New Release' : 'Edit Release', href: '' }
        ]
    });
}

class ReleaseController {
    static async adminList(req, res) {
        try {
            const releases = await Release.findAllForAdmin();
            return renderAdmin(res, 'releases/index', { releases });
        } catch (error) {
            console.error('[Release] Unable to load admin changelog:', error);
            return res.status(500).render('error', {
                title: 'Server Error',
                message: 'Unable to load the release changelog.',
                error: null,
                redirect_url: '/',
                header: false,
                footer: false
            });
        }
    }

    static adminNew(req, res) {
        return renderForm(res, { mode: 'new' });
    }

    static async adminEdit(req, res) {
        try {
            const release = await Release.findById(req.params.id);
            if (!release) return res.redirect('/releases');
            return renderForm(res, { mode: 'edit', release });
        } catch (error) {
            console.error('[Release] Unable to load release editor:', error);
            return res.status(500).render('error', {
                title: 'Server Error',
                message: 'Unable to load the release.',
                error: null,
                redirect_url: '/releases',
                header: false,
                footer: false
            });
        }
    }

    static async adminCreate(req, res) {
        const { value, errors } = normalizeReleaseInput(req.body);
        if (errors.length) {
            return renderForm(res, {
                mode: 'new',
                release: { ...value, id: null },
                errors,
                status: 400
            });
        }

        try {
            await Release.create(value);
            return res.redirect('/releases');
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return renderForm(res, {
                    mode: 'new',
                    release: { ...value, id: null },
                    errors: [`Release ${value.version} already exists.`],
                    status: 409
                });
            }
            console.error('[Release] Unable to create release:', error);
            return res.status(500).render('error', {
                title: 'Server Error',
                message: 'Unable to create the release.',
                error: null,
                redirect_url: '/releases',
                header: false,
                footer: false
            });
        }
    }

    static async adminUpdate(req, res) {
        const { value, errors } = normalizeReleaseInput(req.body);
        let release = { ...value, id: req.params.id };

        if (errors.length) {
            return renderForm(res, { mode: 'edit', release, errors, status: 400 });
        }

        try {
            await Release.update(req.params.id, value);
            return res.redirect('/releases');
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return renderForm(res, {
                    mode: 'edit',
                    release,
                    errors: [`Release ${value.version} already exists.`],
                    status: 409
                });
            }
            console.error('[Release] Unable to update release:', error);
            return res.status(500).render('error', {
                title: 'Server Error',
                message: 'Unable to update the release.',
                error: null,
                redirect_url: '/releases',
                header: false,
                footer: false
            });
        }
    }

    static async adminDelete(req, res) {
        try {
            await Release.delete(req.params.id);
            return res.redirect('/releases');
        } catch (error) {
            console.error('[Release] Unable to delete release:', error);
            return res.status(500).render('error', {
                title: 'Server Error',
                message: 'Unable to delete the release.',
                error: null,
                redirect_url: '/releases',
                header: false,
                footer: false
            });
        }
    }

    static async list(req, res) {
        try {
            const releases = await Release.findAll();
            return res.json({ success: true, data: releases });
        } catch (error) {
            console.error('[Release] Unable to load changelog:', error);
            return res.status(500).json({
                success: false,
                message: 'Unable to load the changelog.'
            });
        }
    }

    static async latest(req, res) {
        try {
            const release = await Release.findLatest();
            return res.json({ success: true, data: release });
        } catch (error) {
            console.error('[Release] Unable to load latest release:', error);
            return res.status(500).json({
                success: false,
                message: 'Unable to load the latest release.'
            });
        }
    }
}

module.exports = ReleaseController;
