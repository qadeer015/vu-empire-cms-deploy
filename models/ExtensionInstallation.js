const db = require("../config/db");

class ExtensionInstallation {

    static async findByInstallationId(
        installationId
    ) {
        const [rows] = await db.execute(
            `
            SELECT *
            FROM extension_installations
            WHERE installation_id = ?
            LIMIT 1
            `,
            [installationId]
        );

        return rows[0] || null;
    }


    static async findByTokenHash(
        tokenHash
    ) {
        const [rows] = await db.execute(
            `
            SELECT *
            FROM extension_installations
            WHERE registration_token_hash = ?
            AND status = 'active'
            LIMIT 1
            `,
            [tokenHash]
        );

        return rows[0] || null;
    }


    static async create({
        installationId,
        registrationTokenHash,
        credentialEncryptionKey
    }) {

        const [result] =
            await db.execute(
                `
                INSERT INTO extension_installations (
                    installation_id,
                    registration_token_hash,
                    credential_encryption_key,
                    key_version
                )
                VALUES (?, ?, ?, 1)
                `,
                [
                    installationId,
                    registrationTokenHash,
                    credentialEncryptionKey
                ]
            );

        return result.insertId;
    }


    static async updateLastSeen(
        id
    ) {
        await db.execute(
            `
            UPDATE extension_installations
            SET last_seen_at = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [id]
        );
    }

    /* ── Admin: pagination / filtering ─────────────────────────────── */

    /**
     * Build a WHERE clause shared by the paginated list and its count.
     *   - search  : partial match on installation_id
     *   - status  : 'active' | 'inactive' (default 'all')
     *   - activity: 'online' (≤ 1 day) | 'dormant' (> 7 days) | 'never'
     */
    static _buildWhere({ search, status, activity } = {}) {
        const conditions = [];
        const params = [];

        if (search && String(search).trim()) {
            conditions.push('installation_id LIKE ?');
            params.push(`%${String(search).trim()}%`);
        }

        if (status && status !== 'all') {
            conditions.push('status = ?');
            params.push(status);
        }

        if (activity === 'online') {
            conditions.push(
                'last_seen_at IS NOT NULL AND last_seen_at >= (NOW() - INTERVAL 1 DAY)'
            );
        } else if (activity === 'dormant') {
            conditions.push(
                '(last_seen_at IS NULL OR last_seen_at < (NOW() - INTERVAL 7 DAY))'
            );
        } else if (activity === 'never') {
            conditions.push('last_seen_at IS NULL');
        }

        return {
            whereClause: conditions.length
                ? 'WHERE ' + conditions.join(' AND ')
                : '',
            params
        };
    }


    static async findAllWithFilters(
        { search, status, activity, limit = 50, offset = 0 } = {}
    ) {
        const { whereClause, params } = this._buildWhere({ search, status, activity });

        const [rows] = await db.query(
            `
            SELECT
                id,
                installation_id,
                status,
                key_version,
                last_seen_at,
                created_at
            FROM extension_installations
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            `,
            [...params, parseInt(limit), parseInt(offset)]
        );

        return rows;
    }


    static async countAllWithFilters(
        { search, status, activity } = {}
    ) {
        const { whereClause, params } = this._buildWhere({ search, status, activity });

        const [rows] = await db.query(
            `
            SELECT COUNT(*) AS total
            FROM extension_installations
            ${whereClause}
            `,
            params
        );

        return Number(rows[0]?.total || 0);
    }


    static async findById(id) {
        const [rows] = await db.execute(
            `
            SELECT
                id,
                installation_id,
                status,
                key_version,
                last_seen_at,
                created_at,
                updated_at
            FROM extension_installations
            WHERE id = ?
            LIMIT 1
            `,
            [id]
        );

        return rows[0] || null;
    }


    /* ── Admin: analytics ─────────────────────────────────────────── */

    /**
     * Aggregate analytics over the installations table.
     *   - summary : headline counts
     *   - byStatus: installs grouped by status
     *   - daily   : registrations + last-seen activity per day (dense series)
     */
    static async getAnalytics(days = 30) {
        const window = parseInt(days, 10) || 30;

        const [summary] = await db.query(`
            SELECT
                COUNT(*) AS total,
                SUM(status = 'active')   AS active,
                SUM(status = 'inactive') AS inactive,
                SUM(
                    last_seen_at IS NOT NULL
                    AND last_seen_at >= (NOW() - INTERVAL 1 DAY)
                ) AS onlineLast24h,
                SUM(
                    last_seen_at IS NOT NULL
                    AND last_seen_at >= (NOW() - INTERVAL 7 DAY)
                ) AS activeLast7d,
                SUM(last_seen_at IS NULL) AS neverSeen,
                SUM(created_at >= (NOW() - INTERVAL 7 DAY))  AS newLast7d,
                SUM(created_at >= (NOW() - INTERVAL 30 DAY)) AS newLast30d
            FROM extension_installations
        `);

        const [byStatus] = await db.query(`
            SELECT status, COUNT(*) AS count
            FROM extension_installations
            GROUP BY status
        `);

        const [registrations] = await db.query(
            `
            SELECT DATE(created_at) AS date, COUNT(*) AS count
            FROM extension_installations
            WHERE created_at >= (CURDATE() - INTERVAL ? DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
            `,
            [window]
        );

        const [activity] = await db.query(
            `
            SELECT DATE(last_seen_at) AS date, COUNT(*) AS count
            FROM extension_installations
            WHERE last_seen_at >= (CURDATE() - INTERVAL ? DAY)
            GROUP BY DATE(last_seen_at)
            ORDER BY date ASC
            `,
            [window]
        );

        const toMap = (rows) => {
            const map = {};
            for (const r of rows) {
                const key = r.date instanceof Date
                    ? r.date.toISOString().slice(0, 10)
                    : String(r.date).slice(0, 10);
                map[key] = Number(r.count || 0);
            }
            return map;
        };

        const regMap = toMap(registrations);
        const actMap = toMap(activity);

        // Dense, zero-filled series so the chart x-axis is continuous.
        const daily = [];
        for (let i = window - 1; i >= 0; i--) {
            const d = new Date();
            d.setUTCHours(0, 0, 0, 0);
            d.setUTCDate(d.getUTCDate() - i);
            const key = d.toISOString().slice(0, 10);
            daily.push({
                date: key,
                registrations: regMap[key] || 0,
                activity: actMap[key] || 0
            });
        }

        const s = summary[0] || {};

        return {
            summary: {
                total: Number(s.total || 0),
                active: Number(s.active || 0),
                inactive: Number(s.inactive || 0),
                onlineLast24h: Number(s.onlineLast24h || 0),
                activeLast7d: Number(s.activeLast7d || 0),
                neverSeen: Number(s.neverSeen || 0),
                newLast7d: Number(s.newLast7d || 0),
                newLast30d: Number(s.newLast30d || 0)
            },
            byStatus: byStatus.map((r) => ({
                status: r.status || 'unknown',
                count: Number(r.count || 0)
            })),
            daily
        };
    }

}

module.exports = ExtensionInstallation;