import db from '../config/db.js';

const [rows] = await db.query(`
  SELECT id, status, originalFilename, createdAt
  FROM past_papers
  ORDER BY createdAt DESC
`);

console.log('Past papers:', rows);
const counts = {};
for (const r of rows) {
  counts[r.status] = (counts[r.status] || 0) + 1;
}
console.log('Counts by status:', counts);

process.exit(0);