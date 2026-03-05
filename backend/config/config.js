/**
 * config.js – Environment-based configuration
 *
 * Reads from .env and exposes a typed config object.
 */

'use strict';

require('dotenv').config();
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');

const config = {
    port: parseInt(process.env.PORT, 10) || 3000,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    uploadDir: path.resolve(projectRoot, process.env.UPLOAD_DIR || 'uploads'),
    reportsDir: path.resolve(projectRoot, process.env.REPORTS_DIR || 'reports'),
    sandboxTimeout: parseInt(process.env.SANDBOX_TIMEOUT, 10) || 60,
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/ai-bug-detector',
    maxFileSize: 2 * 1024 * 1024, // 2 MB
    allowedExts: ['.c', '.cpp', '.cc', '.h', '.hpp', '.py'],
};

module.exports = config;
