/**
 * uploadRoutes.js – /api/upload and /api/status routes
 */

'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const uploadController = require('../controllers/uploadController');

// Configure multer storage
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, config.uploadDir);
    },
    filename: (_req, file, cb) => {
        const jobId = uuidv4();
        const ext = path.extname(file.originalname);
        cb(null, `${jobId}${ext}`);
    },
});

// File filter
const fileFilter = (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (config.allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`File type not allowed: ${ext}`), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: config.maxFileSize },
});

// POST /api/upload – upload a source file for analysis
router.post('/upload', upload.single('file'), uploadController.handleUpload);

// GET /api/status/:jobId – poll analysis job status
router.get('/status/:jobId', uploadController.getStatus);

module.exports = router;
