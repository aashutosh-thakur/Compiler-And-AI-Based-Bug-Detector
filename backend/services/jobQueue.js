/**
 * jobQueue.js – Job enqueue/dequeue
 *
 * Uses in-memory queue by default.
 * Set USE_REDIS=true in .env to enable Bull/Redis.
 */

'use strict';

const config = require('../config/config');
const logger = require('../utils/logger');

// In-memory job store (always available)
const jobStore = new Map();

let analysisQueue = null;
let useRedis = false;

// Only attempt Redis/Bull if explicitly enabled
if (process.env.USE_REDIS === 'true') {
    try {
        const Bull = require('bull');
        analysisQueue = new Bull('analysis', config.redisUrl, {
            defaultJobOptions: {
                attempts: 2,
                timeout: config.sandboxTimeout * 1000,
                removeOnComplete: 100,
                removeOnFail: 50,
            },
        });

        analysisQueue.on('ready', () => {
            useRedis = true;
            logger.info('Bull queue connected to Redis');
        });

        analysisQueue.on('error', (err) => {
            logger.warn(`Bull queue error: ${err.message}. Using in-memory fallback.`);
            useRedis = false;
        });
    } catch (err) {
        logger.warn(`Bull queue unavailable: ${err.message}. Using in-memory fallback.`);
    }
} else {
    logger.info('Running with in-memory job queue (set USE_REDIS=true to enable Redis)');
}

/**
 * Enqueue a new analysis job.
 */
exports.enqueue = async (jobData) => {
    // Store in memory
    jobStore.set(jobData.jobId, {
        state: 'queued',
        createdAt: new Date().toISOString(),
        ...jobData,
    });

    if (useRedis && analysisQueue) {
        await analysisQueue.add(jobData);
    } else {
        // Run analysis inline (async, non-blocking)
        setImmediate(async () => {
            try {
                // Lazy-load to avoid circular dependency at startup
                const analysisController = require('../controllers/analysisController');
                const storageManager = require('./storageManager');

                updateJobState(jobData.jobId, 'compiling');
                const result = await analysisController.runAnalysis(jobData);

                updateJobState(jobData.jobId, 'generating');
                await storageManager.saveReport(jobData.jobId, result);

                updateJobState(jobData.jobId, 'completed');
                logger.info(`[InMemory] Job ${jobData.jobId} completed successfully`);
            } catch (err) {
                logger.error(`[InMemory] Job ${jobData.jobId} failed: ${err.message}`);
                updateJobState(jobData.jobId, 'failed', err.message);
            }
        });
    }
};

/**
 * Get the current status of a job.
 */
exports.getJobStatus = async (jobId) => {
    return jobStore.get(jobId) || null;
};

/**
 * Update job state in the in-memory store.
 */
function updateJobState(jobId, state, error = null) {
    const job = jobStore.get(jobId);
    if (job) {
        job.state = state;
        job.updatedAt = new Date().toISOString();
        if (error) job.error = error;
    }
}
