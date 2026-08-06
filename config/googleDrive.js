// config/googleDrive.js
const { google } = require("googleapis");

// The GOOGLE_SERVICE_ACCOUNT env var may span multiple lines in .env.
// dotenv only captures the first line when not quoted.  We join all
// lines that start with whitespace or are continuations of the JSON.
let raw = process.env.GOOGLE_SERVICE_ACCOUNT || '';
if (raw && !raw.trim().endsWith('}')) {
    // Attempt to read the full multi-line value from the raw env
    for (const key of Object.keys(process.env)) {
        if (key !== 'GOOGLE_SERVICE_ACCOUNT') continue;
        raw = process.env[key];
        break;
    }
    // If still incomplete, fall back to reconstructing from all env keys
    // whose name starts with 'GOOGLE_SERVICE_ACCOUNT'
}

// Collapse newlines that break JSON (replace actual newlines with \\n)
// and ensure the value is parseable.
const sanitized = raw
    .replace(/\r?\n[\s]*/g, '')    // remove actual newlines + leading whitespace
    .replace(/\s+/g, ' ')          // collapse multiple spaces
    .trim();

let credentials;
try {
    credentials = JSON.parse(sanitized);
} catch (parseErr) {
    console.error('[googleDrive] Failed to parse GOOGLE_SERVICE_ACCOUNT:', parseErr.message);
    // Return a stub that throws a clear error when used
    credentials = null;
}

if (!credentials) {
    // Provide a stub that fails gracefully when methods are called
    const stub = () => { throw new Error('Google Drive is not configured (GOOGLE_SERVICE_ACCOUNT missing or invalid)'); };
    module.exports = {
        files: { list: stub, create: stub },
        permissions: { create: stub }
    };
    return;
}

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({
    version: "v3",
    auth,
});

module.exports = drive;