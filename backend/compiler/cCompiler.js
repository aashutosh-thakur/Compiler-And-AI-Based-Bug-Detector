/**
 * cCompiler.js – Wrappers for GCC and Cppcheck
 *
 * Executes C/C++ analysis tools and captures raw output.
 * Includes tool discovery to find executables on Windows (MinGW, MSYS2, etc.)
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const logger = require('../utils/logger');
const config = require('../config/config');

/* ---------- Tool Discovery ---------- */

/**
 * Searches common installation paths for a tool executable.
 * Returns { exe, dir } where dir is the directory containing the tool.
 */
function findTool(name) {
    const exeName = process.platform === 'win32' ? `${name}.exe` : name;

    if (process.platform !== 'win32') {
        return { exe: name, dir: null };
    }

    const searchPaths = [
        path.join('C:', 'MinGW', 'bin'),
        path.join('C:', 'msys64', 'mingw64', 'bin'),
        path.join('C:', 'msys64', 'ucrt64', 'bin'),
        path.join('C:', 'msys64', 'usr', 'bin'),
        path.join('C:', 'TDM-GCC-64', 'bin'),
        path.join('C:', 'Program Files', 'Cppcheck'),
        path.join('C:', 'Program Files (x86)', 'Cppcheck'),
    ];

    for (const dir of searchPaths) {
        const fullPath = path.join(dir, exeName);
        if (fs.existsSync(fullPath)) {
            logger.info(`[ToolDiscovery] Found ${name} at: ${fullPath}`);
            return { exe: fullPath, dir };
        }
    }

    return { exe: name, dir: null };
}

// Discover tools once at startup
const GCC_INFO = findTool('gcc');
const GPP_INFO = findTool('g++');
const CPPCHECK_INFO = findTool('cppcheck');

// Collect all discovered tool directories for PATH
const toolDirs = new Set();
if (GCC_INFO.dir) toolDirs.add(GCC_INFO.dir);
if (GPP_INFO.dir) toolDirs.add(GPP_INFO.dir);
if (CPPCHECK_INFO.dir) toolDirs.add(CPPCHECK_INFO.dir);

/**
 * Spawn a tool with proper PATH that includes the tool's own directory.
 * This is critical on Windows where GCC needs its bin dir in PATH to find cc1.exe.
 */
function runTool(command, args) {
    return new Promise((resolve) => {
        const pathSep = process.platform === 'win32' ? ';' : ':';
        const extraPath = [...toolDirs].join(pathSep);
        const fullPath = extraPath
            ? `${extraPath}${pathSep}${process.env.PATH || ''}`
            : process.env.PATH || '';

        const timeout = (config.sandboxTimeout || 60) * 1000;

        logger.info(`[C/C++] Running: ${command} ${args.join(' ')}`);

        const proc = spawn(command, args, {
            timeout,
            env: {
                ...process.env,
                PATH: fullPath,
            },
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => { stdout += data.toString(); });
        proc.stderr.on('data', (data) => { stderr += data.toString(); });

        proc.on('error', (err) => {
            logger.error(`[C/C++] Process error: ${err.message}`);
            resolve({ stdout, stderr, exitCode: -1 });
        });

        proc.on('close', (code) => {
            logger.info(`[C/C++] Exited with code ${code}, stdout[${stdout.length}], stderr[${stderr.length}]`);
            resolve({ stdout, stderr, exitCode: code || 0 });
        });
    });
}

/**
 * Run GCC/G++ with all warnings enabled.
 * Captures stderr (where GCC emits diagnostics).
 */
exports.runGcc = async (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const isCpp = ['.cpp', '.cc', '.cxx', '.hpp'].includes(ext);
    const compiler = isCpp ? GPP_INFO.exe : GCC_INFO.exe;

    try {
        const result = await runTool(compiler, [
            '-Wall', '-Wextra', '-Wpedantic',
            '-fsyntax-only',
            filePath,
        ]);

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
 */
exports.runCppcheck = async (filePath) => {
    try {
        const result = await runTool(CPPCHECK_INFO.exe, [
            '--enable=all',
            '--inconclusive',
            '--force',
            '--xml',
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
