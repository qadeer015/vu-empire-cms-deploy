// === api/emailService.js ===
const nodemailer = require("nodemailer");

/**
 * Send email using Brevo (Sendinblue) API when BREVO_API_KEY is present.
 * Falls back to SMTP transporter when API key isn't available.
 */
const sendEmail = async function ({ to, subject, text, html }) {
    // Normalize recipients
    const toList = Array.isArray(to) ? to : (typeof to === 'string' ? [to] : []);

    if (!toList.length) throw new Error('No recipients specified');

    // Use Brevo REST API when API key is available (recommended)
    if (process.env.BREVO_API_KEY) {
        try {
            const senderEmail = process.env.SENDER_EMAIL || process.env.BREVO_SENDER_EMAIL || process.env.BREVO_SMTP_LOGIN || process.env.MAIL_FROM || process.env.FROM_EMAIL;
            if (!senderEmail) {
                const err = new Error('valid sender email required. Set SENDER_EMAIL or BREVO_SENDER_EMAIL env var');
                err.status = 400;
                throw err;
            }
            const sender = { email: senderEmail };
            if (process.env.SENDER_NAME) sender.name = process.env.SENDER_NAME;

            const payload = {
                sender,
                to: toList.map(email => ({ email })),
                subject: subject || '',
                htmlContent: html || undefined,
                textContent: text || undefined
            };

            const res = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': process.env.BREVO_API_KEY
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const body = await res.text();
                const err = new Error('Brevo API error: ' + res.status + ' ' + res.statusText + ' - ' + body);
                err.status = res.status;
                throw err;
            }

            const json = await res.json();
            return json;
        } catch (err) {
            console.error('Error sending email via Brevo API:', err);
            throw err;
        }
    }

    // SMTP fallback (keeps original behavior)
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.BREVO_SMTP_SERVER,
            port: parseInt(process.env.BREVO_SMTP_PORT, 10) || 587,
            secure: String(process.env.BREVO_SMTP_PORT) === '465',
            auth: {
                user: process.env.BREVO_SMTP_LOGIN,
                pass: process.env.BREVO_SMTP_KEY
            }
        });

        const info = await transporter.sendMail({
            from: `"${process.env.SENDER_NAME || 'VU EMPIRE'}" <${process.env.SENDER_EMAIL}>`,
            to: toList.join(','),
            subject,
            text,
            html
        });

        return info;
    } catch (err) {
        console.error('Error sending email via SMTP fallback:', err);
        throw err;
    }
};

module.exports = {
    sendEmail
};