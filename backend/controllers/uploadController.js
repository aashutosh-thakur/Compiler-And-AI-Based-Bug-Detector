/**
 * uploadController.js – Handles file upload and job status queries
 */

'use strict';

const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const jobQueue = require('../services/jobQueue');
const validator = require('../utils/validator');

/**
 * POST /api/upload
 * Accepts a source file, validates it, enqueues an analysis job.
 */
exports.handleUpload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { originalname, filename, size, path: filePath } = req.file;
        const ext = path.extname(originalname).toLowerCase();
        const language = validator.detectLanguage(ext);

        if (!language) {
            return res.status(400).json({ error: `Unsupported file type: ${ext}` });
        }

        // Create job ID from the saved filename (without extension)
        const jobId = validator.sanitizeJobId(path.basename(filename, ext));

        // Enqueue analysis job
        await jobQueue.enqueue({
            jobId,
            originalname,
            filename,
            filePath: path.resolve(filePath),
            language,
            size,
            uploadedAt: new Date().toISOString(),
        });

        logger.info(`Job enqueued: ${jobId} (${originalname}, ${language})`);

        return res.status(201).json({
            message: 'File uploaded successfully. Analysis queued.',
            jobId,
            language,
            filename: originalname,
        });
    } catch (err) {
        logger.error(`Upload error: ${err.message}`);
        return res.status(500).json({ error: 'Upload failed' });
    }
};

/**
 * GET /api/status/:jobId
 * Returns the current state of an analysis job.
 */
exports.getStatus = async (req, res) => {
    try {
        const jobId = validator.sanitizeJobId(req.params.jobId);
        const status = await jobQueue.getJobStatus(jobId);

        if (!status) {
            return res.status(404).json({ error: 'Job not found' });
        }

        return res.json(status);
    } catch (err) {
        logger.error(`Status query error: ${err.message}`);
        return res.status(500).json({ error: 'Failed to retrieve status' });
    }
};
