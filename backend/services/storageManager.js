/**
 * storageManager.js – File path management and retention
 */

'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const logger = require('../utils/logger');

const uploadsDir = config.uploadDir;
const reportsDir = config.reportsDir;

// Ensure directories exist
[uploadsDir, reportsDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
    }
});

/**
 * Get the full path to an uploaded file.
 */
exports.getUploadPath = (filename) => {
    return path.join(uploadsDir, filename);
};

/**
 * Get the full path to a report file.
 */
exports.getReportPath = (jobId, ext = '.json') => {
    return path.join(reportsDir, `${jobId}${ext}`);
};

/**
 * Save a report (JSON + .docx).
 */
exports.saveReport = async (jobId, reportData) => {
    const jsonPath = path.join(reportsDir, `${jobId}.json`);
    const docxPath = path.join(reportsDir, `${jobId}.docx`);

    // Save JSON
    fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2), 'utf8');
    logger.info(`Report JSON saved: ${jsonPath}`);

    // Generate .docx via Python reportGenerator
    try {
        const { spawn } = require('child_process');
        const scriptPath = path.join(__dirname, '..', 'report', 'reportGenerator.py');

        await new Promise((resolve) => {
            const proc = spawn('python', [scriptPath, jsonPath, docxPath], {
                timeout: 30000,
            });

            let stderr = '';
            proc.stderr.on('data', (d) => { stderr += d.toString(); });

            proc.on('close', (code) => {
                if (code === 0 && fs.existsSync(docxPath)) {
                    logger.info(`Report DOCX saved: ${docxPath}`);
                } else {
                    logger.warn(`DOCX generation exited code ${code}: ${stderr}`);
                }
                resolve();
            });

            proc.on('error', (err) => {
                logger.warn(`DOCX generation error: ${err.message}`);
                resolve();
            });
        });
    } catch (err) {
        logger.warn(`DOCX generation skipped: ${err.message}`);
    }
};

/**
 * Delete an uploaded file after analysis.
 */
exports.cleanupUpload = (filename) => {
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Cleaned up upload: ${filePath}`);
    }
};

/**
 * Remove old reports beyond a retention period (in days).
 */
exports.purgeOldReports = (retentionDays = 30) => {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const files = fs.readdirSync(reportsDir);

    files.forEach((file) => {
        const filePath = path.join(reportsDir, file);
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs < cutoff) {
            fs.unlinkSync(filePath);
            logger.info(`Purged old report: ${filePath}`);
        }
    });
};
