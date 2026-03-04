/**
 * reportRoutes.js – /api/report/:id routes
 */

'use strict';

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// GET /api/report/:jobId – retrieve report JSON
router.get('/report/:jobId', reportController.getReport);

// GET /api/report/:jobId/download – download .docx or JSON file
router.get('/report/:jobId/download', reportController.downloadReport);

module.exports = router;
