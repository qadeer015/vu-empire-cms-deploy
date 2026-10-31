// scripts/db-create.js
// Creates the database (if not exists) and loads the baseline schema from
// config/db/schema.sql. Also ensures the schema_migrations tracking table exists.
// Usage: npm run db:create

require('dotenv').config();
const path = require('path');
const mysql = require('mysql2/promise');
const { createPool, executeFile } = require('./run-sql');

const DB_NAME = process.env.DB_NAME || 'vu_quiz_questions_data';
const SCHEMA_PATH = path.join(__dirname, '..', 'config', 'db', 'schema.sql');

async function main() {
    console.log(`🚀 db:create — ensuring database \`${DB_NAME}\` exists…`);

    // 1. Connect to the MySQL server WITHOUT a database so we can CREATE DATABASE.
    const serverPool = createPool({ database: undefined });
    try {
        await serverPool.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`✅ Database \`${DB_NAME}\` created (or already exists).`);
    } finally {
        await serverPool.end();
    }

    // 2. Connect to the target database and load the baseline schema.
    const db = createPool({ database: DB_NAME });
    try {
        // Ensure the migrations tracking table exists before anything else.
        await db.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                version VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_schema_migrations_version (version)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        const statementCount = await executeFile(db, SCHEMA_PATH);
        console.log(`✅ Schema loaded: ${statementCount} statement(s) from config/db/schema.sql`);
        console.log(`💡 Run "npm run db:migrate" to apply any pending migrations.`);
        console.log(`💡 Run "npm run db:seed" to load seed data for testing.`);
    } finally {
        await db.end();
    }

    process.exit(0);
}

main().catch((err) => {
    console.error('❌ db:create failed:', err.message);
    process.exit(1);
});
