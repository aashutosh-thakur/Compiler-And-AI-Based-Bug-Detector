/**
 * reportController.js – Report retrieval and download
 */

'use strict';

const path = require('path');
const fs = require('fs');
const config = require('../config/config');
const logger = require('../utils/logger');
const validator = require('../utils/validator');

const reportsDir = config.reportsDir;

/**
 * GET /api/report/:jobId
 * Returns the canonical JSON report.
 */
exports.getReport = async (req, res) => {
    try {
        const jobId = validator.sanitizeJobId(req.params.jobId);
        if (!jobId) {
            return res.status(400).json({ error: 'Invalid Job ID' });
        }
        const jsonPath = path.join(reportsDir, `${jobId}.json`);

        if (!fs.existsSync(jsonPath)) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        return res.json(data);
    } catch (err) {
        logger.error(`Report retrieval error: ${err.message}`);
        return res.status(500).json({ error: 'Failed to load report' });
    }
};

/**
 * GET /api/report/:jobId/download?format=docx|json
 * Sends the report file for download.
 */
exports.downloadReport = async (req, res) => {
    try {
        const jobId = validator.sanitizeJobId(req.params.jobId);
        if (!jobId) {
            return res.status(400).json({ error: 'Invalid Job ID' });
        }
        const format = (req.query.format || 'json').toLowerCase();
        const ext = format === 'docx' ? '.docx' : '.json';
        const filePath = path.join(reportsDir, `${jobId}${ext}`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: `Report file not found (${format})` });
        }

        const contentType = format === 'docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/json';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="report-${jobId}${ext}"`);
        return res.sendFile(filePath);
    } catch (err) {
        logger.error(`Report download error: ${err.message}`);
        return res.status(500).json({ error: 'Download failed' });
    }
};
