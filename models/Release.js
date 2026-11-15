const db = require('../config/db');

class Release {
    static async findAll() {
        const [rows] = await db.query(`
            SELECT
                r.id AS releaseId,
                r.version,
                DATE_FORMAT(r.releaseDate, '%Y-%m-%d') AS releasedAt,
                c.type AS changeType,
                c.description
            FROM releases r
            LEFT JOIN release_changelog c ON c.releaseId = r.id
            ORDER BY r.releaseDate DESC, r.id DESC, c.position ASC, c.id ASC
        `);

        return Release.groupRows(rows);
    }

    static async findAllForAdmin() {
        const [rows] = await db.query(`
            SELECT
                r.id AS releaseId,
                r.version,
                DATE_FORMAT(r.releaseDate, '%Y-%m-%d') AS releasedAt,
                c.id AS changeId,
                c.type AS changeType,
                c.description
            FROM releases r
            LEFT JOIN release_changelog c ON c.releaseId = r.id
            ORDER BY r.releaseDate DESC, r.id DESC, c.position ASC, c.id ASC
        `);

        const releases = new Map();
        for (const row of rows) {
            let release = releases.get(row.releaseId);
            if (!release) {
                release = {
                    id: row.releaseId,
                    version: row.version,
                    releasedAt: row.releasedAt,
                    changes: []
                };
                releases.set(row.releaseId, release);
            }

            if (row.changeId) {
                release.changes.push({
                    id: row.changeId,
                    type: row.changeType,
                    description: row.description
                });
            }
        }

        return [...releases.values()];
    }

    static async findById(id) {
        const [rows] = await db.query(`
            SELECT
                r.id AS releaseId,
                r.version,
                DATE_FORMAT(r.releaseDate, '%Y-%m-%d') AS releasedAt,
                c.id AS changeId,
                c.type AS changeType,
                c.description
            FROM releases r
            LEFT JOIN release_changelog c ON c.releaseId = r.id
            WHERE r.id = ?
            ORDER BY c.position ASC, c.id ASC
        `, [id]);

        if (rows.length === 0) return null;

        const release = {
            id: rows[0].releaseId,
            version: rows[0].version,
            releasedAt: rows[0].releasedAt,
            changes: rows.filter((row) => row.changeId).map((row) => ({
                id: row.changeId,
                type: row.changeType,
                description: row.description
            }))
        };
        return release;
    }

    static async create({ version, releasedAt, changes }) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [result] = await connection.query(
                'INSERT INTO releases (version, releaseDate) VALUES (?, ?)',
                [version, releasedAt]
            );
            await Release.insertChanges(connection, result.insertId, changes);
            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async update(id, { version, releasedAt, changes }) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [existing] = await connection.query(
                'SELECT id FROM releases WHERE id = ? FOR UPDATE',
                [id]
            );
            if (existing.length === 0) {
                await connection.rollback();
                return false;
            }

            await connection.query(
                'UPDATE releases SET version = ?, releaseDate = ? WHERE id = ?',
                [version, releasedAt, id]
            );
            await connection.query(
                'DELETE FROM release_changelog WHERE releaseId = ?',
                [id]
            );
            await Release.insertChanges(connection, id, changes);
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async delete(id) {
        const [result] = await db.query('DELETE FROM releases WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }

    static async insertChanges(connection, releaseId, changes) {
        for (const [index, change] of changes.entries()) {
            await connection.query(
                'INSERT INTO release_changelog (releaseId, type, description, position) VALUES (?, ?, ?, ?)',
                [releaseId, change.type, change.description, index + 1]
            );
        }
    }

    static async findLatest() {
        const [rows] = await db.query(`
            SELECT
                r.id AS releaseId,
                r.version,
                DATE_FORMAT(r.releaseDate, '%Y-%m-%d') AS releasedAt,
                c.type AS changeType,
                c.description
            FROM (
                SELECT id, version, releaseDate
                FROM releases
                ORDER BY releaseDate DESC, id DESC
                LIMIT 1
            ) r
            LEFT JOIN release_changelog c ON c.releaseId = r.id
            ORDER BY c.position ASC, c.id ASC
        `);

        return Release.groupRows(rows)[0] || null;
    }

    static groupRows(rows) {
        const releases = new Map();

        for (const row of rows) {
            let release = releases.get(row.releaseId);
            if (!release) {
                release = {
                    version: row.version,
                    releasedAt: row.releasedAt,
                    changes: []
                };
                releases.set(row.releaseId, release);
            }

            if (row.changeType) {
                release.changes.push({
                    type: row.changeType,
                    description: row.description
                });
            }
        }

        return [...releases.values()];
    }
}

module.exports = Release;
