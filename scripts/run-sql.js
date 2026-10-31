// scripts/run-sql.js
// Shared helper to execute SQL files against the MySQL database.
// Splits raw SQL into individual statements while respecting quoted strings
// and backtick-quoted identifiers (so semicolins inside text values are safe).

const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config();

function createPool(options = {}) {
    return mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: options.database || process.env.DB_NAME || undefined,
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    });
}

function splitStatements(sql) {
    const statements = [];
    let current = '';

    // State flags
    let inSingle = false;   // '...'
    let inDouble = false;   // "..."
    let inBacktick = false; // `...`
    let inBlockComment = false; /* ... */
    let inLineComment = false;  // -- ... or # ...

    for (let i = 0; i < sql.length; i++) {
        const ch = sql[i];
        const next = sql[i + 1];

        // Inside a line comment: end at newline
        if (inLineComment) {
            if (ch === '\n' || ch === '\r') {
                inLineComment = false;
                current += ch;
            }
            continue;
        }

        // Inside a block comment: end at */
        if (inBlockComment) {
            if (ch === '*' && next === '/') {
                inBlockComment = false;
                current += ch + next;
                i++; // skip '/'
            }
            continue;
        }

        // Inside single-quoted string
        if (inSingle) {
            current += ch;
            if (ch === "'" && next !== "'") {
                inSingle = false;
            } else if (ch === "'" && next === "'") {
                current += next;
                i++; // skip escaped quote
            }
            continue;
        }

        // Inside double-quoted string
        if (inDouble) {
            current += ch;
            if (ch === '"' && next !== '"') {
                inDouble = false;
            } else if (ch === '"' && next === '"') {
                current += next;
                i++;
            }
            continue;
        }

        // Inside backtick-quoted identifier
        if (inBacktick) {
            current += ch;
            if (ch === '`') {
                inBacktick = false;
            }
            continue;
        }

        // Not inside any string/comment: detect comment/string starts
        if (ch === '-' && next === '-') {
            inLineComment = true;
            continue;
        }
        if (ch === '#') {
            inLineComment = true;
            continue;
        }
        if (ch === '/' && next === '*') {
            inBlockComment = true;
            current += ch + next;
            i++; // skip '*'
            continue;
        }
        if (ch === "'") {
            inSingle = true;
            current += ch;
            continue;
        }
        if (ch === '"') {
            inDouble = true;
            current += ch;
            continue;
        }
        if (ch === '`') {
            inBacktick = true;
            current += ch;
            continue;
        }

        // Statement delimiter (only when not inside any string/comment)
        if (ch === ';') {
            statements.push(current.trim());
            current = '';
            continue;
        }

        current += ch;
    }

    const remainder = current.trim();
    if (remainder) statements.push(remainder);

    return statements.filter(Boolean);
}

async function executeFile(target, filePath) {
    const sql = fs.readFileSync(filePath, 'utf8');
    const statements = splitStatements(sql);
    let count = 0;
    for (const stmt of statements) {
        await target.query(stmt);
        count++;
    }
    return count;
}

async function executeStatements(target, statements) {
    let count = 0;
    for (const stmt of statements) {
        const trimmed = stmt.trim();
        if (!trimmed) continue;
        await target.query(trimmed);
        count++;
    }
    return count;
}

module.exports = { createPool, splitStatements, executeFile, executeStatements };
