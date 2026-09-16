// services/post.service.js
const db = require('../config/db');
const { sendEmail } = require('../api/emailService');
const renderTemplate = require('../utils/templateRenderer');

/**
 * Helpers to retrieve admin email addresses and app URL.
 */
const getBaseUrl = () => {
    if (process.env.NODE_ENV === 'production') {
        return 'https://www.vuempire.online';
    }
    return `http://localhost:${process.env.PORT || 8080}`;
};

const getAllAdminEmails = async () => {
    try {
        const [rows] = await db.query(
            `SELECT u.id, s.vuEmail, s.studentName
             FROM users u
             JOIN students s ON u.studentId = s.studentId
             WHERE LOWER(u.role) = 'admin' AND u.status != 'deleted'`
        );
        return rows.map(r => ({ email: r.vuEmail, name: r.studentName }));
    } catch (err) {
        console.error('Error fetching admin emails:', err.message);
        return [];
    }
};

/**
 * Send "new post submitted" notifications to admins AND the author (confirmation).
 */
const sendNewPostNotifications = async (post) => {
    try {
        const baseUrl = getBaseUrl();
        const reviewLink = `${baseUrl}/admin/posts/${post.id}/review`;
        const postLink = `${baseUrl}/posts/${post.slug}`;

        // Admin notification
        const adminRecipients = await getAllAdminEmails();
        // Always include the author as a recipient so they receive a confirmation copy
        const authorRecipient = { email: post.authorEmail, name: post.authorName };

        const recipients = [...adminRecipients, authorRecipient];

        if (recipients.length === 0) return;

        const html = renderTemplate('post-created-admin.html', {
            author_name: post.authorName || 'A user',
            author_email: post.authorEmail || '',
            post_title: post.title,
            submitted_at: new Date(post.createdAt).toLocaleString(),
            review_link: reviewLink,
            year: new Date().getFullYear(),
            app_name: process.env.APP_NAME || 'VU Empire Genie'
        });

        await sendEmail({
            to: recipients.map(r => r.email).join(', '),
            subject: `New Post Awaiting Review: ${post.title}`,
            text: `A new post "${post.title}" has been submitted by ${post.authorName} and is awaiting review.`,
            html
        });
    } catch (err) {
        console.error('Failed to send new-post notifications:', err.message);
    }
};

/**
 * Send the post status update notification (publish/reject) to the author.
 */
const sendPostStatusNotification = async (post, status) => {
    try {
        const baseUrl = getBaseUrl();
        const postLink = `${baseUrl}/posts/${post.slug}`;

        const isPublish = status === 'publish';
        const statusLabel = isPublish ? 'Published' : 'Rejected';
        const statusVerb = isPublish ? 'approved and published' : 'rejected';
        const statusColor = isPublish ? '#10b981' : '#ef4444';

        const rejectReasonBlock = (!isPublish && post.rejectReason)
            ? `<p style="color:#64748b;font-size:13px;margin:10px 0 0 0;"><strong>Reason for rejection:</strong></p>
               <p style="background:#fef2f2;border-left:3px solid #ef4444;padding:10px;color:#7f1d1d;font-size:13px;margin:5px 0 0 0;">${post.rejectReason}</p>`
            : '';

        const html = renderTemplate('post-status-author.html', {
            author_name: post.authorName || 'Author',
            post_title: post.title,
            status_label: statusLabel,
            status_verb: statusVerb,
            status_color: statusColor,
            reviewed_at: new Date().toLocaleString(),
            reject_reason_block: rejectReasonBlock,
            post_link: postLink,
            year: new Date().getFullYear(),
            app_name: process.env.APP_NAME || 'VU Empire Genie'
        });

        await sendEmail({
            to: post.authorEmail,
            subject: `Your post has been ${statusLabel}`,
            text: `Hi ${post.authorName}, your post "${post.title}" has been ${statusVerb}.`,
            html
        });
    } catch (err) {
        console.error('Failed to send post-status notification:', err.message);
    }
};

module.exports = {
    sendNewPostNotifications,
    sendPostStatusNotification,
    getAllAdminEmails,
    getBaseUrl
};
