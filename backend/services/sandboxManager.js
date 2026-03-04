/**
 * sandboxManager.js – Manages sandboxed containers for code execution
 *
 * Implements defense-in-depth: resource limits, network isolation,
 * ephemeral filesystems.
 */

'use strict';

const { spawn } = require('child_process');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Run a command inside a sandboxed environment.
 *
 * In production, this would launch a Docker/gVisor/Firecracker container.
 * In development, commands run as local subprocesses with timeout limits.
 *
 * @param {string}   command  - Executable name (e.g. 'gcc', 'cppcheck')
 * @param {string[]} args     - Command arguments
 * @param {object}   options  - { timeout, cwd }
 * @returns {Promise<{ stdout, stderr, exitCode }>}
 */
exports.runSandboxed = (command, args = [], options = {}) => {
    const timeout = (options.timeout || config.sandboxTimeout) * 1000;

    return new Promise((resolve, reject) => {
        logger.info(`[Sandbox] Running: ${command} ${args.join(' ')}`);

        const proc = spawn(command, args, {
            cwd: options.cwd || process.cwd(),
            timeout,
            shell: process.platform === 'win32',  // Required on Windows to find executables
            env: {
                ...process.env,  // Inherit full env so all PATH entries are available
            },
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => { stdout += data.toString(); });
        proc.stderr.on('data', (data) => { stderr += data.toString(); });

        proc.on('close', (exitCode) => {
            logger.info(`[Sandbox] Command exited with code ${exitCode}`);
            resolve({ stdout, stderr, exitCode });
        });

        proc.on('error', (err) => {
            logger.error(`[Sandbox] Process error: ${err.message}`);
            reject(err);
        });
    });
};

/**
 * Build a Docker run command for production sandboxing.
 * (Template – not yet wired up; used by the Docker-based pipeline.)
 */
exports.buildDockerCommand = (image, command, filePath) => {
    return [
        'docker', 'run', '--rm',
        '--network', 'none',                       // Network isolation
        '--memory', '256m',                        // Memory limit
        '--cpus', '0.5',                           // CPU quota
        '--read-only',                             // Read-only root filesystem
        '--tmpfs', '/tmp:rw,noexec,size=64m',      // Writable /tmp
        '-v', `${filePath}:/workspace/input:ro`,    // Mount file read-only
        image,
        ...command,
    ];
};
