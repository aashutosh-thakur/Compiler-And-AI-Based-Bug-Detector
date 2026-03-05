/**
 * upload.js – Upload flow, file validation, progress tracking, status polling
 *
 * Compiler & AI Based Bug-Detector
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const zone = $('#upload-zone');
    const fileInput = $('#file-input');
    const fileInfo = $('#file-info');
    const fileName = $('#file-name');
    const fileMeta = $('#file-meta');
    const btnClear = $('#btn-clear');
    const btnUpload = $('#btn-upload');
    const progressWrap = $('#upload-progress');
    const progressBar = $('#progress-bar');
    const progressPct = $('#progress-pct');
    const analysisStatus = $('#analysis-status');
    const statusText = $('#status-text');
    const jobIdDisplay = $('#job-id-display');

    const ALLOWED_EXTS = ['.c', '.cpp', '.h', '.py'];
    const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

    let selectedFile = null;
    let pollTimer = null;

    /* ---------- Drag & Drop ---------- */
    zone.addEventListener('click', () => fileInput.click());

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            handleFile(fileInput.files[0]);
        }
    });

    /* ---------- File Selection ---------- */
    function handleFile(file) {
        const ext = getExt(file.name);

        if (!ALLOWED_EXTS.includes(ext.toLowerCase())) {
            alert(`Unsupported file type: ${ext}\nAllowed: ${ALLOWED_EXTS.join(', ')}`);
            return;
        }

        if (file.size > MAX_SIZE) {
            alert(`File too large (${formatSize(file.size)}). Max: ${formatSize(MAX_SIZE)}`);
            return;
        }

        selectedFile = file;
        fileName.textContent = file.name;
        fileMeta.textContent = `${langFromExt(ext)} · ${formatSize(file.size)}`;

        show(fileInfo);
        btnUpload.disabled = false;
    }

    /* ---------- Clear ---------- */
    btnClear.addEventListener('click', () => {
        selectedFile = null;
        fileInput.value = '';
        hide(fileInfo);
        hide(progressWrap);
        hide(analysisStatus);
        btnUpload.disabled = true;
    });

    /* ---------- Upload ---------- */
    btnUpload.addEventListener('click', async () => {
        if (!selectedFile) return;

        btnUpload.disabled = true;
        show(progressWrap);
        hide(analysisStatus);

        try {
            const result = await apiUpload('/api/upload', selectedFile, (pct) => {
                progressBar.style.width = `${pct}%`;
                progressPct.textContent = `${pct}%`;
            });

            hide(progressWrap);
            show(analysisStatus);
            jobIdDisplay.textContent = `Job ID: ${result.jobId || 'unknown'}`;
            statusText.textContent = 'Queued – waiting for analysis to begin…';

            // Start polling for job status
            if (result.jobId) {
                pollJobStatus(result.jobId);
            }
        } catch (err) {
            hide(progressWrap);
            alert(`Upload failed: ${err.message}`);
            btnUpload.disabled = false;
        }
    });

    /* ---------- Status Polling ---------- */
    function pollJobStatus(jobId) {
        clearInterval(pollTimer);

        pollTimer = setInterval(async () => {
            try {
                const status = await apiFetch(`/api/status/${jobId}`);

                switch (status.state) {
                    case 'queued':
                        statusText.textContent = 'Queued – waiting for a worker…';
                        break;
                    case 'compiling':
                        statusText.textContent = 'Running compiler and static analysis tools…';
                        break;
                    case 'analyzing':
                        statusText.textContent = 'AI classification in progress…';
                        break;
                    case 'generating':
                        statusText.textContent = 'Generating report…';
                        break;
                    case 'completed':
                        clearInterval(pollTimer);
                        statusText.textContent = '✅ Analysis complete!';
                        // Redirect to report page
                        setTimeout(() => {
                            window.location.href = `report.html?jobId=${jobId}`;
                        }, 1200);
                        break;
                    case 'failed':
                        clearInterval(pollTimer);
                        statusText.textContent = `❌ Analysis failed: ${status.error || 'Unknown error'}`;
                        btnUpload.disabled = false;
                        break;
                    default:
                        statusText.textContent = `Status: ${status.state}`;
                }
            } catch (err) {
                console.error('Poll error:', err);
            }
        }, 2000); // Poll every 2 seconds
    }
});
