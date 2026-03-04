/**
 * cCompiler.js – Wrappers for GCC and Cppcheck
 *
 * Executes C/C++ analysis tools and captures raw output.
 * Includes tool discovery to find executables on Windows (MinGW, MSYS2, etc.)
 */

'use strict';

const path = require('path');
const fs = require('fs');
const sandboxManager = require('../services/sandboxManager');
const logger = require('../utils/logger');

/* ---------- Tool Discovery ---------- */

/**
 * Searches common installation paths for a tool executable.
 * Returns the full path if found, or the bare command name as fallback.
 */
function findTool(name) {
    if (process.platform !== 'win32') return name;

    const exeName = `${name}.exe`;
    const searchPaths = [
        // MinGW
        path.join('C:', 'MinGW', 'bin', exeName),
        // MSYS2
        path.join('C:', 'msys64', 'mingw64', 'bin', exeName),
        path.join('C:', 'msys64', 'ucrt64', 'bin', exeName),
        path.join('C:', 'msys64', 'usr', 'bin', exeName),
        // TDM-GCC
        path.join('C:', 'TDM-GCC-64', 'bin', exeName),
        // Chocolatey
        path.join(process.env.ProgramData || 'C:\\ProgramData', 'chocolatey', 'bin', exeName),
        // Cppcheck default install
        path.join('C:', 'Program Files', 'Cppcheck', exeName),
        path.join('C:', 'Program Files (x86)', 'Cppcheck', exeName),
    ];

    for (const p of searchPaths) {
        if (fs.existsSync(p)) {
            logger.info(`[ToolDiscovery] Found ${name} at: ${p}`);
            return p;
        }
    }

    // Fallback to bare name (relies on PATH)
    return name;
}

// Discover tools once at startup
const GCC_PATH = findTool('gcc');
const GPP_PATH = findTool('g++');
const CPPCHECK_PATH = findTool('cppcheck');

/**
 * Run GCC/G++ with all warnings enabled.
 * Captures stderr (where GCC emits diagnostics).
 *
 * @param {string} filePath - Absolute path to the .c/.cpp file
 * @returns {object} { tool, raw, exitCode }
 */
exports.runGcc = async (filePath) => {
    // Use g++ for C++ files, gcc for C files
    const ext = path.extname(filePath).toLowerCase();
    const isCpp = ['.cpp', '.cc', '.cxx', '.hpp'].includes(ext);
    const compiler = isCpp ? GPP_PATH : GCC_PATH;

    try {
        const args = [
            '-Wall', '-Wextra', '-Wpedantic',
            '-fsyntax-only',   // Don't generate binary, just check syntax
        ];

        // -fanalyzer is only available in GCC 10+; skip for older versions
        // (MinGW GCC 6.3 does not support it)
        // args.push('-fanalyzer');

        args.push(filePath);

        const result = await sandboxManager.runSandboxed(compiler, args);

        return {
            tool: 'gcc',
            raw: result.stderr || result.stdout,
            exitCode: result.exitCode,
        };
    } catch (err) {
        logger.error(`GCC execution failed: ${err.message}`);
        return { tool: 'gcc', raw: '', exitCode: -1, error: err.message };
    }
};

/**
 * Run Cppcheck with XML output for easier parsing.
 *
 * @param {string} filePath
 * @returns {object} { tool, raw, exitCode }
 */
exports.runCppcheck = async (filePath) => {
    try {
        const result = await sandboxManager.runSandboxed(CPPCHECK_PATH, [
            '--enable=all',
            '--inconclusive',
            '--force',
            '--xml',            // XML output for structured parsing
            '--xml-version=2',
            filePath,
        ]);

        return {
            tool: 'cppcheck',
            raw: result.stderr,  // Cppcheck writes XML to stderr
            exitCode: result.exitCode,
        };
    } catch (err) {
        logger.error(`Cppcheck execution failed: ${err.message}`);
        return { tool: 'cppcheck', raw: '', exitCode: -1, error: err.message };
    }
};
