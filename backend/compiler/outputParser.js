/**
 * outputParser.js – Normalizes raw tool outputs to canonical JSON schema
 *
 * Handles GCC stderr, Cppcheck XML, Pylint JSON, and Bandit JSON.
 */

'use strict';

const logger = require('../utils/logger');

// CWE → OWASP Top 10 mapping (subset)
const CWE_TO_OWASP = {
    'CWE-89': 'A03: Injection',
    'CWE-79': 'A03: Injection',
    'CWE-78': 'A03: Injection',
    'CWE-352': 'A01: Broken Access Control',
    'CWE-22': 'A01: Broken Access Control',
    'CWE-287': 'A07: Identification and Authentication Failures',
    'CWE-798': 'A02: Cryptographic Failures',
    'CWE-327': 'A02: Cryptographic Failures',
    'CWE-476': 'A06: Vulnerable and Outdated Components',
    'CWE-120': 'A06: Vulnerable and Outdated Components',
    'CWE-119': 'A06: Vulnerable and Outdated Components',
    'CWE-502': 'A08: Software and Data Integrity Failures',
    'CWE-611': 'A05: Security Misconfiguration',
    'CWE-918': 'A10: Server-Side Request Forgery',
};

/**
 * Normalize an array of raw tool outputs into canonical findings.
 *
 * @param {object[]} rawOutputs - Array of { tool, raw, exitCode }
 * @param {string}   language   - 'c', 'cpp', or 'python'
 * @returns {object[]} Normalized findings array
 */
exports.normalize = (rawOutputs, language) => {
    const findings = [];

    for (const output of rawOutputs) {
        try {
            switch (output.tool) {
                case 'gcc':
                    findings.push(...parseGcc(output.raw));
                    break;
                case 'cppcheck':
                    findings.push(...parseCppcheck(output.raw));
                    break;
                case 'pylint':
                    findings.push(...parsePylint(output.raw));
                    break;
                case 'bandit':
                    findings.push(...parseBandit(output.raw));
                    break;
                default:
                    logger.warn(`Unknown tool: ${output.tool}`);
            }
        } catch (err) {
            logger.error(`Failed to parse ${output.tool} output: ${err.message}`);
        }
    }

    return findings;
};

/**
 * Parse GCC stderr output.
 * Format: file:line:col: warning/error: message [-Wflag]
 */
function parseGcc(raw) {
    const findings = [];
    const regex = /^(.+?):(\d+):(\d+):\s+(warning|error|note):\s+(.+?)(?:\s+\[(-W[\w-]+)\])?$/gm;
    let match;

    while ((match = regex.exec(raw)) !== null) {
        const severity = match[4] === 'error' ? 'high' :
            match[4] === 'warning' ? 'medium' : 'low';

        findings.push({
            tool: 'gcc',
            rule_id: match[6] || match[4],
            cwe: null,
            owasp: null,
            severity,
            line: parseInt(match[2], 10),
            column: parseInt(match[3], 10),
            message: match[5].trim(),
        });
    }

    return findings;
}

/**
 * Parse Cppcheck XML output (version 2).
 */
function parseCppcheck(raw) {
    const findings = [];

    // Parse each <error> block individually, extracting its nested <location>
    // This avoids the misalignment bug of two independent regex cursors.
    const errorBlockRegex = /<error\s+id="([^"]+)"\s+severity="([^"]+)"\s+msg="([^"]+)"(?:\s+cwe="(\d+)")?[^>]*>[\s\S]*?(?:<\/error>|<error\s|$)/g;
    const locRegex = /<location\s+file="([^"]+)"\s+line="(\d+)"(?:\s+column="(\d+)")?/;

    let blockMatch;
    while ((blockMatch = errorBlockRegex.exec(raw)) !== null) {
        const errorBlock = blockMatch[0];
        const cwe = blockMatch[4] ? `CWE-${blockMatch[4]}` : null;
        const owasp = cwe ? (CWE_TO_OWASP[cwe] || null) : null;

        // Find the location within THIS specific error block
        const locMatch = locRegex.exec(errorBlock);

        findings.push({
            tool: 'cppcheck',
            rule_id: blockMatch[1],
            cwe,
            owasp,
            severity: mapCppcheckSeverity(blockMatch[2]),
            line: locMatch ? parseInt(locMatch[2], 10) : null,
            column: locMatch && locMatch[3] ? parseInt(locMatch[3], 10) : null,
            message: blockMatch[3],
        });
    }

    return findings;
}

/**
 * Parse Pylint JSON output.
 */
function parsePylint(raw) {
    const findings = [];

    try {
        const items = JSON.parse(raw);
        for (const item of items) {
            findings.push({
                tool: 'pylint',
                rule_id: item['message-id'] || item.symbol || 'unknown',
                cwe: null,
                owasp: null,
                severity: mapPylintType(item.type),
                line: item.line || null,
                column: item.column || null,
                message: item.message || '',
            });
        }
    } catch {
        logger.warn('Pylint output is not valid JSON');
    }

    return findings;
}

/**
 * Parse Bandit JSON output.
 */
function parseBandit(raw) {
    const findings = [];

    try {
        const data = JSON.parse(raw);
        const results = data.results || [];

        for (const item of results) {
            const cwe = item.issue_cwe ? `CWE-${item.issue_cwe.id}` : null;
            const owasp = cwe ? (CWE_TO_OWASP[cwe] || null) : null;

            findings.push({
                tool: 'bandit',
                rule_id: item.test_id || item.test_name || 'unknown',
                cwe,
                owasp,
                severity: (item.issue_severity || 'low').toLowerCase(),
                line: item.line_number || null,
                column: null,
                message: item.issue_text || '',
                code_snippet: item.code || null,
            });
        }
    } catch {
        logger.warn('Bandit output is not valid JSON');
    }

    return findings;
}

/* ---------- Severity Adapters ---------- */

function mapCppcheckSeverity(sev) {
    const map = { error: 'high', warning: 'medium', style: 'low', performance: 'low', information: 'low' };
    return map[sev] || 'low';
}

function mapPylintType(type) {
    const map = { error: 'high', warning: 'medium', convention: 'low', refactor: 'low', fatal: 'critical' };
    return map[type] || 'low';
}
