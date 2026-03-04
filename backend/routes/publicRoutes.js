/**
 * publicRoutes.js – Serves static frontend pages
 */

'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');

const frontendDir = path.join(__dirname, '..', '..', 'frontend');

// Serve HTML pages
router.get('/', (_req, res) => {
    res.sendFile(path.join(frontendDir, 'index.html'));
});

router.get('/upload', (_req, res) => {
    res.sendFile(path.join(frontendDir, 'upload.html'));
});

router.get('/report', (_req, res) => {
    res.sendFile(path.join(frontendDir, 'report.html'));
});

module.exports = router;
