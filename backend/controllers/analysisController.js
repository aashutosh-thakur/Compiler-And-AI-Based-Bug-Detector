/**
 * analysisController.js – Orchestrates the analysis pipeline
 *
 * Scatter-Gather pattern: runs compiler + SAST tools in parallel,
 * gathers output, invokes AI classification, generates report.
 */

'use strict';

const path = require('path');
const logger = require('../utils/logger');
const cCompiler = require('../compiler/cCompiler');
const pythonAnalyzer = require('../compiler/pythonAnalyzer');
const outputParser = require('../compiler/outputParser');
const { spawn } = require('child_process');
const config = require('../config/config');

/**
 * Execute the full analysis pipeline for a job.
 * @param {object} job - Job descriptor { jobId, filePath, language, ... }
 * @returns {object} Canonical JSON result with findings and risk score
 */
exports.runAnalysis = async (job) => {
    const { jobId, filePath, language } = job;
    logger.info(`[${jobId}] Starting analysis (${language})`);

    let rawOutputs = [];

    // Phase 1: Scatter-Gather – run tools in parallel
    if (language === 'c' || language === 'cpp') {
        const [gccResult, cppcheckResult] = await Promise.all([
            cCompiler.runGcc(filePath),
            cCompiler.runCppcheck(filePath),
        ]);
        rawOutputs.push(gccResult, cppcheckResult);
    } else if (language === 'python') {
        const [pylintResult, banditResult] = await Promise.all([
            pythonAnalyzer.runPylint(filePath),
            pythonAnalyzer.runBandit(filePath),
        ]);
        rawOutputs.push(pylintResult, banditResult);
    }

    // Phase 2: Normalize outputs to canonical JSON
    const findings = outputParser.normalize(rawOutputs, language);

    // Phase 3: AI classification (calls Python subprocess)
    const aiFindings = await runAiClassification(jobId, findings);

    // Phase 4: Risk scoring (calls Python subprocess)
    const riskResult = await runRiskScoring(aiFindings);

    const result = {
        job_id: jobId,
        file: path.basename(filePath),
        language,
        findings: aiFindings,
        risk_score: riskResult.risk_score || 0,
        risk_grade: riskResult.risk_grade || 'Unknown',
        severity_counts: riskResult.severity_counts || {},
        deduction_formula: riskResult.deduction_formula || '',
    };

    logger.info(`[${jobId}] Analysis complete – Risk Score: ${result.risk_score}`);
    return result;
};

/**
 * Invoke the Python AI severity classifier.
 */
function runAiClassification(jobId, findings) {
    return new Promise((resolve) => {
        const scriptPath = path.join(__dirname, '..', 'ai', 'aiEngine.py');
        const proc = spawn('python', [scriptPath, '--job-id', jobId], {
            timeout: config.sandboxTimeout * 1000,
        });

        let stdout = '';
        let stderr = '';

        proc.stdin.write(JSON.stringify(findings));
        proc.stdin.end();

        proc.stdout.on('data', (data) => { stdout += data.toString(); });
        proc.stderr.on('data', (data) => { stderr += data.toString(); });

        proc.on('close', (code) => {
            if (code !== 0) {
                logger.warn(`[${jobId}] AI classifier exited with code ${code}: ${stderr}`);
                resolve(findings); // Fallback to unclassified findings
            } else {
                try {
                    resolve(JSON.parse(stdout));
                } catch {
                    logger.warn(`[${jobId}] Failed to parse AI output`);
                    resolve(findings);
                }
            }
        });

        proc.on('error', (err) => {
            logger.error(`[${jobId}] AI process error: ${err.message}`);
            resolve(findings);
        });
    });
}

/**
 * Invoke the Python risk scoring engine.
 */
function runRiskScoring(findings) {
    return new Promise((resolve) => {
        const scriptPath = path.join(__dirname, '..', 'ai', 'riskScore.py');
        const proc = spawn('python', [scriptPath]);

        let stdout = '';

        proc.stdin.write(JSON.stringify(findings));
        proc.stdin.end();

        proc.stdout.on('data', (data) => { stdout += data.toString(); });

        proc.on('close', (code) => {
            try {
                resolve(JSON.parse(stdout));
            } catch {
                resolve({ risk_score: 0, risk_grade: 'Unknown', findings });
            }
        });

        proc.on('error', () => {
            resolve({ risk_score: 0, risk_grade: 'Unknown', findings });
        });
    });
}
