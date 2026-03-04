/**
 * pythonAnalyzer.js – Wrappers for Pylint and Bandit
 *
 * Executes Python analysis tools and captures raw output.
 */

'use strict';

const sandboxManager = require('../services/sandboxManager');
const logger = require('../utils/logger');

/**
 * Run Pylint with JSON output.
 *
 * @param {string} filePath - Absolute path to the .py file
 * @returns {object} { tool, raw, exitCode }
 */
exports.runPylint = async (filePath) => {
    try {
        const result = await sandboxManager.runSandboxed('python', [
            '-m', 'pylint',
            '--output-format=json',       // JSON output for parsing
            '--disable=C0114,C0115,C0116', // Disable missing docstring warnings
            filePath,
        ]);

        return {
            tool: 'pylint',
            raw: result.stdout,
            exitCode: result.exitCode,
        };
    } catch (err) {
        logger.error(`Pylint execution failed: ${err.message}`);
        return { tool: 'pylint', raw: '', exitCode: -1, error: err.message };
    }
};

/**
 * Run Bandit with JSON output.
 *
 * @param {string} filePath
 * @returns {object} { tool, raw, exitCode }
 */
exports.runBandit = async (filePath) => {
    try {
        const result = await sandboxManager.runSandboxed('python', [
            '-m', 'bandit',
            '-f', 'json',          // JSON output
            '-ll',                 // Report medium and higher severity
            filePath,
        ]);

        return {
            tool: 'bandit',
            raw: result.stdout,
            exitCode: result.exitCode,
        };
    } catch (err) {
        logger.error(`Bandit execution failed: ${err.message}`);
        return { tool: 'bandit', raw: '', exitCode: -1, error: err.message };
    }
};
