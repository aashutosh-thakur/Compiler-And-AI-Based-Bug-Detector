/**
 * sanitizer.js – Input sanitization utilities
 *
 * Prevents XSS and path traversal in user-supplied strings.
 */

'use strict';

/**
 * Strip HTML tags from a string.
 * @param {string} str
 * @returns {string}
 */
exports.stripHtml = (str) => {
    return (str || '').replace(/<[^>]*>/g, '');
};

/**
 * Escape HTML entities to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
exports.escapeHtml = (str) => {
    const entities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    };
    return (str || '').replace(/[&<>"']/g, (ch) => entities[ch]);
};

/**
 * Remove null bytes and path traversal sequences.
 * @param {string} str
 * @returns {string}
 */
exports.sanitizePath = (str) => {
    return (str || '')
        .replace(/\0/g, '')          // Null bytes
        .replace(/\.\.\//g, '')      // Unix path traversal
        .replace(/\.\.\\/g, '')      // Windows path traversal
        .trim();
};

/**
 * Truncate a string to a maximum length.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
exports.truncate = (str, maxLen = 500) => {
    if (!str || str.length <= maxLen) return str;
    return str.slice(0, maxLen) + '…';
};
