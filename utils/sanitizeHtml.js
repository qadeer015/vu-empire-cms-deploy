/**
 * Minimal HTML sanitizer for rendering user-generated rich text
 * (Quill editor output) safely inside admin views.
 *
 * Strategy: tag + attribute whitelist.
 *  - Dangerous tags (script, style, iframe, object, embed, form, ...) are
 *    removed entirely, including their contents.
 *  - Unknown tags are stripped but their inner text is preserved.
 *  - Event handler attributes (on*) are removed.
 *  - Only a whitelist of presentation attributes is kept.
 *  - href/src values pointing to javascript:/vbscript:/data: are removed.
 */
const ALLOWED_TAGS = new Set([
    'p', 'br', 'hr', 'span', 'div',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup', 'mark',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
    'a', 'img', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'video', 'source'
]);

const ALLOWED_ATTRS = new Set([
    'src', 'href', 'alt', 'title', 'width', 'height', 'class',
    'target', 'rel', 'colspan', 'rowspan', 'loading', 'controls', 'poster'
]);

const DANGEROUS = 'script|style|iframe|object|embed|form|noscript|link|meta|base|svg|math';

// Remove dangerous tags together with their content (e.g. <script>...</script>)
const DANGEROUS_BLOCKS = new RegExp('<\\s*(' + DANGEROUS + ')(\\s[^>]*)?>[\\s\\S]*?<\\s*\\/\\s*\\1\\s*>', 'gi');
// Remove dangerous void/self-closing tags (e.g. <meta ...> or <iframe src=... />)
const DANGEROUS_VOID = new RegExp('<\\s*\\/?(?:' + DANGEROUS + ')(?:\\s[^>]*)?\\/?>', 'gi');

/** Escape a string for safe use inside an HTML attribute value. */
function escapeAttr(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/** Strip event handlers and non-whitelisted attributes from a single tag. */
function cleanAttributes(tagBody) {
    return tagBody.replace(/\s([a-zA-Z-]+)(\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g, function (match, name, eqAndValue) {
        const lower = name.toLowerCase();
        if (lower.startsWith('on')) return '';               // event handlers
        if (!ALLOWED_ATTRS.has(lower)) return '';            // unknown attributes
        if (!eqAndValue) return ' ' + lower;                 // boolean attribute (e.g. controls)
        let value = eqAndValue.replace(/^\s*=\s*/, '');
        value = value.replace(/^(['"])(.*)\1$/, '$2');       // unquote
        if (/^\s*(javascript|vbscript|data)\s*:/i.test(value)) return ''; // dangerous URL scheme
        return ' ' + lower + '="' + escapeAttr(value) + '"';
    });
}

/**
 * Sanitize an HTML string. Returns markup that is safe to insert
 * with <%- %> in an EJS template.
 */
function sanitizeHtml(html) {
    if (!html || typeof html !== 'string') return '';
    let out = html;

    // 1. Drop dangerous elements with their contents, then any leftovers
    out = out.replace(DANGEROUS_BLOCKS, '');
    out = out.replace(DANGEROUS_VOID, '');

    // 2. Walk remaining tags: whitelist tag names, clean attributes
    out = out.replace(/<\s*\/?\s*([a-zA-Z][a-zA-Z0-9]*)((?:\s[^<>]*)?)\/?>/g, function (match, tagName, attrs) {
        const lower = tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(lower)) return '';             // strip unknown tag, keep text
        const isClosing = /^<\s*\//.test(match);
        const tagBody = '<' + lower + cleanAttributes(attrs || '') + '>';
        if (isClosing) return '</' + lower + '>';
        // Harden links: force rel="noopener noreferrer nofollow"
        if (lower === 'a') {
            if (/\srel\s*=/i.test(tagBody)) return tagBody.replace(/\srel\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i, ' rel="noopener noreferrer nofollow"');
            return tagBody.replace(/>$/, ' rel="noopener noreferrer nofollow">');
        }
        return tagBody;
    });

    // 3. Strip stray comments and orphaned comment fragments
    out = out.replace(/<\s*!--[\s\S]*?--\s*>/g, '');
    out = out.replace(/<!--|-->|<\\|<\s*$/g, '');

    return out;
}

module.exports = sanitizeHtml;
module.exports.sanitizeHtml = sanitizeHtml;
