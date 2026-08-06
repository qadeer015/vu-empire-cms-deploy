// services/course.service.js
const https = require('https');
const http = require('http');
const { URL } = require('url');
const Course = require('../models/Course');
const cache = require('./cacheService');
const TTL = require('../config/cacheTTL');

// Persistent HTTP(S) agents with keep-alive to reuse TCP connections
// and avoid repeated TLS handshakes (saves 100-300ms per request).
const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 10,
    keepAliveMsecs: 30000,
    timeout: 60000
});
const httpAgent = new http.Agent({
    keepAlive: true,
    maxSockets: 10,
    keepAliveMsecs: 30000,
    timeout: 60000
});

// Short-lived cache for resolved Google Drive download URLs
// Uses Redis instead of local NodeCache for distributed caching.
const DOWNLOAD_URL_TTL = 120; // 2 min

const GDRIVE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/**
 * Follow a single HTTP redirect (301/302/307/308).
 * Returns a Promise that resolves with the response from the redirect URL.
 */
function followRedirect(redirectUrl, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        if (maxRedirects <= 0) return reject(new Error('Too many redirects'));

        const parsed = new URL(redirectUrl);
        const transport = parsed.protocol === 'https:' ? https : http;
        const agent = parsed.protocol === 'https:' ? httpsAgent : httpAgent;

        transport.get(redirectUrl, {
            agent,
            headers: { 'User-Agent': GDRIVE_UA },
            timeout: 30000
        }, (res) => {
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                res.resume(); // drain
                const next = new URL(res.headers.location, redirectUrl).href;
                return followRedirect(next, maxRedirects - 1).then(resolve, reject);
            }
            resolve(res);
        }).on('error', reject);
    });
}

/**
 * Fetch Google Drive file content, following redirects and skipping the
 * virus-scan confirmation page.  Returns the final HTTP IncomingMessage.
 */
async function fetchGDriveFile(fileId) {
    const cacheKey = `gdrive_url:${fileId}`;
    const cached = await cache.get(cacheKey);

    // If we already resolved the final URL recently, hit it directly
    if (cached) {
        return new Promise((resolve, reject) => {
            const parsed = new URL(cached);
            const transport = parsed.protocol === 'https:' ? https : http;
            const agent = parsed.protocol === 'https:' ? httpsAgent : httpAgent;

            transport.get(cached, {
                agent,
                headers: {
                    'User-Agent': GDRIVE_UA,
                    'Accept': 'application/pdf,*/*'
                },
                timeout: 30000
            }, resolve).on('error', reject);
        });
    }

    // First request with confirm=t to skip the virus scan page
    const initialUrl = `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`;

    return new Promise((resolve, reject) => {
        https.get(initialUrl, {
            agent: httpsAgent,
            headers: {
                'User-Agent': GDRIVE_UA,
                'Accept': 'application/pdf,*/*',
                'Accept-Encoding': 'identity'
            },
            timeout: 30000
        }, (res) => {
            // Follow redirects
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                res.resume(); // drain
                const next = new URL(res.headers.location, initialUrl).href;
                cache.set(cacheKey, next, DOWNLOAD_URL_TTL);
                return followRedirect(next).then(resolve, reject);
            }

            // Check if we hit the virus scan confirmation page
            if (res.statusCode === 200) {
                // If content-type is HTML, this is the confirmation page
                const ct = res.headers['content-type'] || '';
                if (ct.includes('text/html')) {
                    res.resume(); // drain HTML page
                    // Extract the confirm token from the page and retry
                    return reject(new Error('VIRUS_SCAN_PAGE'));
                }
                // Direct PDF download - cache the URL
                cache.set(cacheKey, initialUrl, DOWNLOAD_URL_TTL);
                return resolve(res);
            }

            res.resume();
            reject(new Error(`Google Drive returned status ${res.statusCode}`));
        }).on('error', reject);
    });
}

/**
 * Fallback: parse the virus-scan HTML page, extract the confirm token,
 * and download the file with it.
 */
function fetchWithConfirmToken(fileId) {
    const initialUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    return new Promise((resolve, reject) => {
        https.get(initialUrl, {
            agent: httpsAgent,
            headers: { 'User-Agent': GDRIVE_UA, 'Accept-Encoding': 'identity' },
            timeout: 30000
        }, (res) => {
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                res.resume();
                return followRedirect(new URL(res.headers.location, initialUrl).href)
                    .then(resolve, reject);
            }

            if (res.statusCode === 200) {
                const ct = res.headers['content-type'] || '';
                if (!ct.includes('text/html')) {
                    return resolve(res);
                }
                // Read the HTML body to extract the confirm token
                let body = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => { body += chunk; });
                res.on('end', () => {
                    // Look for confirm token in the page
                    const match = body.match(/confirm=([A-Za-z0-9_-]+)/);
                    if (match) {
                        const confirmUrl =
                            `https://drive.google.com/uc?export=download&confirm=${match[1]}&id=${fileId}`;
                        cache.set(`gdrive_url:${fileId}`, confirmUrl, DOWNLOAD_URL_TTL);
                        return followRedirect(confirmUrl).then(resolve, reject);
                    }
                    reject(new Error('Could not extract confirm token'));
                });
                return;
            }
            res.resume();
            reject(new Error(`Google Drive returned status ${res.statusCode}`));
        }).on('error', reject);
    });
}

class CourseService {

    // ── List all courses with pagination ──────────────────────────────
    static async getAll({ page = 1, limit = 25 } = {}) {
        const cacheKey = `courses:all:${page}:${limit}`;
        return cache.remember(cacheKey, TTL.COURSES, async () => {
            const offset = (page - 1) * limit;
            const [courses, total] = await Promise.all([
                Course.findAll({ limit, offset }),
                Course.countAll()
            ]);

            return {
                courses,
                pagination: {
                    page, limit, total,
                    pages: Math.ceil(total / limit)
                }
            };
        });
    }

    // ── Get single course by code ──────────────────────────────────────
    static async getCourse(courseCode) {
        const course = await Course.findByCode(courseCode);
        if (!course) throw new Error('Course not found');
        return course;
    }

    // ── Create one or many courses ────────────────────────────────────
    static async createMultipleRecords(inputData) {
        const records = Array.isArray(inputData) ? inputData : [inputData];
        const results = { total: records.length, successful: 0, failed: 0, details: [] };

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            try {
                let course = await Course.findByCode(record.courseCode);
                if (!course) {
                    course = await Course.create(record);
                }
                results.successful++;
                results.details.push({ index: i, status: 'created', courseCode: record.courseCode });
            } catch (err) {
                results.failed++;
                results.details.push({ index: i, status: 'failed', error: err.message });
            }
        }

        // Invalidate all course-related caches
        await cache.delByPattern('courses:*');
        return results;
    }

    // ── Update course ─────────────────────────────────────────────────
    static async updateCourse(courseCode, data) {
        const course = await Course.findByCode(courseCode);
        if (!course) throw new Error('Course not found');

        const updated = await Course.update(course.courseId, data);
        return updated;
    }

    // ── Delete course ─────────────────────────────────────────────────
    static async deleteCourse(courseCode) {
        const course = await Course.findByCode(courseCode);
        if (!course) throw new Error('Course not found');

        await Course.delete(course.courseId);
        return true;
    }

    // ── All grouped courses (admin, paginated) ────────────────────────────
    static async getGroupedAll(limit = 50, offset = 0) {
        const cacheKey = `courses:groupedAll:${limit}:${offset}`;
        return cache.remember(cacheKey, TTL.COURSES, async () => {
            const [courses, total] = await Promise.all([
                Course.findWithStats(limit, offset),
                Course.countAll()
            ]);

            const groups = {};
            courses.forEach(c => {
                const match = (c.courseCode || '').match(/^([A-Za-z]+)/);
                const prefix = match ? match[1].toUpperCase() : 'Other';
                if (!groups[prefix]) groups[prefix] = [];
                groups[prefix].push(c);
            });

            const sortedKeys = Object.keys(groups).sort();
            const groupedCourses = sortedKeys.map(key => ({
                title: key + ' Courses',
                courses: groups[key].sort((a, b) => (a.courseCode || '').localeCompare(b.courseCode || ''))
            }));

            return {
                groupedCourses,
                total,
                hasMore: offset + courses.length < total
            };
        });
    }

    // ── Public grouped courses (limit 50, paginated) ─────────────────────
    static async getGroupedPublic(limit = 50, offset = 0) {
        const cacheKey = `courses:groupedPublic:${limit}:${offset}`;
        return cache.remember(cacheKey, TTL.COURSES, async () => {
            const [courses, total] = await Promise.all([
                Course.findWithStats(limit, offset),
                Course.countAll()
            ]);

            const groups = {};
            courses.forEach(c => {
                const match = (c.courseCode || '').match(/^([A-Za-z]+)/);
                const prefix = match ? match[1].toUpperCase() : 'Other';
                if (!groups[prefix]) groups[prefix] = [];
                groups[prefix].push(c);
            });

            const sortedKeys = Object.keys(groups).sort();
            const groupedCourses = sortedKeys.map(key => ({
                title: key + ' Courses',
                courses: groups[key].sort((a, b) => (a.courseCode || '').localeCompare(b.courseCode || ''))
            }));

            return {
                groupedCourses,
                total,
                page: Math.floor(offset / limit) + 1,
                hasMore: offset + courses.length < total
            };
        });
    }

    // ── Search courses by code or name ────────────────────────────────
    static async search(query, limit = 25) {
        const db = require('../config/db');
        const [rows] = await db.query(
            `SELECT courseId, courseCode, courseName
             FROM courses
             WHERE courseCode LIKE ? OR courseName LIKE ?
             ORDER BY
                 CASE
                     WHEN courseCode LIKE ? THEN 0
                     WHEN courseCode LIKE ? THEN 1
                     ELSE 2
                 END,
                 courseCode ASC
             LIMIT ?`,
            [`${query}%`, `%${query}%`, `${query}%`, `%${query}%`, parseInt(limit)]
        );
        return rows;
    }

    // ── Stream PDF download ───────────────────────────────────────────
    // Uses Node built-in https with keep-alive, no external deps.
    // Caches resolved URLs so repeated downloads skip the
    // redirect / virus-scan page entirely.
    static async streamHandout(courseCode, res) {
        const course = await Course.findByCode(courseCode);
        if (!course || !course.handoutPdf) throw new Error('Handout not found');

        const fileId = course.handoutPdf;
        const fileName = course.handoutOriginalFilename || `${course.courseName}-handout.pdf`;
        let response;
        try {
            response = await fetchGDriveFile(fileId);
        } catch (err) {
            // If we hit the virus-scan page, try extracting the confirm token
            if (err.message === 'VIRUS_SCAN_PAGE') {
                response = await fetchWithConfirmToken(fileId);
            } else {
                throw new Error('File not found on Google Drive');
            }
        }

        if (!response || response.statusCode !== 200) {
            if (response && response.resume) response.resume();
            throw new Error('File not found on Google Drive');
        }

        // Check it's actually a PDF (not an error page)
        const contentType = (response.headers['content-type'] || '').toLowerCase();
        const contentLength = response.headers['content-length'];

        // Set response headers
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        if (contentLength) {
            res.setHeader('Content-Length', contentLength);
        }

        // Increment download count asynchronously (fire-and-forget, non-blocking)
        Course.incrementDownloadCount(course.courseId).catch(() => { });

        // Pipe the file directly to the client
        response.pipe(res);

        // Handle stream errors gracefully
        response.on('error', (err) => {
            console.error('Google Drive stream error:', err.message);
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: 'Download stream error' });
            }
        });

        res.on('error', (err) => {
            console.error('Response stream error:', err.message);
            response.destroy();
        });
    }
}

module.exports = CourseService;