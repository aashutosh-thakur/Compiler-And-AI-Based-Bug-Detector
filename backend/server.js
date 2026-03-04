/**
 * server.js – Express entry point
 *
 * AI Bug Detection System
 *
 * Sets up middleware, mounts routes, serves the frontend,
 * and starts the HTTP listener.
 */

'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');
const logger = require('./utils/logger');

// Route modules
const uploadRoutes = require('./routes/uploadRoutes');
const reportRoutes = require('./routes/reportRoutes');
const publicRoutes = require('./routes/publicRoutes');

const app = express();

/* ---------- Middleware ---------- */
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

/* ---------- API Routes ---------- */
app.use('/api', uploadRoutes);
app.use('/api', reportRoutes);
app.use('/', publicRoutes);

/* ---------- Error Handling ---------- */
// 404
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
    logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
});

/* ---------- Start ---------- */
const PORT = config.port;
app.listen(PORT, () => {
    logger.info(`AI Bug Detection server running on http://localhost:${PORT}`);
});

module.exports = app;
