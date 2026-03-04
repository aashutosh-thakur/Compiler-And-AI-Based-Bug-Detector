/**
 * validator.js – Input validation helpers
 */

'use strict';

const path = require('path');
const config = require('../config/config');

/**
 * Detect the programming language from file extension.
 * @param {string} ext - File extension (e.g. '.c', '.py')
 * @returns {string|null} Language identifier or null
 */
exports.detectLanguage = (ext) => {
    const map = {
        '.c': 'c',
        '.cpp': 'cpp',
        '.cc': 'cpp',
        '.h': 'c',
        '.hpp': 'cpp',
        '.py': 'python',
    };
    return map[ext.toLowerCase()] || null;
};

/**
 * Validate that a filename has an allowed extension.
 * @param {string} filename
 * @returns {boolean}
 */
exports.isAllowedFile = (filename) => {
    const ext = path.extname(filename).toLowerCase();
    return config.allowedExts.includes(ext);
};

/**
 * Validate file size is within limits.
 * @param {number} size - File size in bytes
 * @returns {boolean}
 */
exports.isValidSize = (size) => {
    return size > 0 && size <= config.maxFileSize;
};

/**
 * Sanitize a job ID to prevent path traversal.
 * @param {string} id
 * @returns {string}
 */
exports.sanitizeJobId = (id) => {
    return (id || '').replace(/[^a-zA-Z0-9\-_]/g, '');
};
