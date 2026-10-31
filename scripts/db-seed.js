// scripts/db-seed.js
// Loads seed data from config/db/seed.sql into the database.
// Usage: npm run db:seed

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { executeFile } = require('./run-sql');

const SEED_PATH = path.join(__dirname, '..', 'config', 'db', 'seed.sql');

async function main() {
    if (!fs.existsSync(SEED_PATH)) {
        console.error('❌ config/db/seed.sql not found');
        process.exit(1);
    }

    const statementCount = await executeFile(db, SEED_PATH);
    console.log(`✅ Seed data loaded: ${statementCount} statement(s) from config/db/seed.sql`);
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ db:seed failed:', err.message);
    process.exit(1);
});
