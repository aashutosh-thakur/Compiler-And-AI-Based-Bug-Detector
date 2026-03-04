/**
 * reportViewer.js – Fetches report JSON and renders findings, OWASP map, risk score
 *
 * AI Bug Detection System
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const inputJobId = $('#input-job-id');
    const btnLoadReport = $('#btn-load-report');
    const reportContent = $('#report-content');
    const riskGauge = $('#risk-gauge');
    const riskValue = $('#risk-value');
    const riskBadge = $('#risk-badge');
    const reportFile = $('#report-file');
    const reportLang = $('#report-lang');
    const reportJobId = $('#report-job-id');
    const owaspTableBody = $('#owasp-table-body');
    const findingsList = $('#findings-list');
    const btnDownloadDocx = $('#btn-download-docx');
    const btnDownloadJson = $('#btn-download-json');

    // Auto-fill job ID from URL query string
    const urlParams = new URLSearchParams(window.location.search);
    const jobIdFromUrl = urlParams.get('jobId');
    if (jobIdFromUrl) {
        inputJobId.value = jobIdFromUrl;
        loadReport(jobIdFromUrl);
    }

    /* ---------- Load Report ---------- */
    btnLoadReport.addEventListener('click', () => {
        const jobId = inputJobId.value.trim();
        if (!jobId) {
            alert('Please enter a Job ID.');
            return;
        }
        loadReport(jobId);
    });

    async function loadReport(jobId) {
        try {
            const report = await apiFetch(`/api/report/${jobId}`);
            renderReport(report, jobId);
        } catch (err) {
            alert(`Failed to load report: ${err.message}`);
        }
    }

    /* ---------- Render Report ---------- */
    function renderReport(report, jobId) {
        show(reportContent);

        // Risk score
        const score = report.risk_score ?? 0;
        const info = riskGradeInfo(score);

        riskValue.textContent = score;
        riskGauge.className = `risk-gauge ${info.cls}`;
        riskGauge.style.setProperty('--gauge-pct', `${score}%`);
        riskBadge.className = `badge ${info.badge}`;
        riskBadge.textContent = info.grade;

        // File info
        reportFile.textContent = report.file || '—';
        reportLang.textContent = (report.language || '—').toUpperCase();
        reportJobId.textContent = report.job_id || jobId;

        // OWASP summary
        renderOwaspSummary(report.findings || []);

        // Detailed findings
        renderFindings(report.findings || []);

        // Download links
        btnDownloadDocx.href = `${API_BASE}/api/report/${jobId}/download?format=docx`;
        btnDownloadJson.href = `${API_BASE}/api/report/${jobId}/download?format=json`;
    }

    /* ---------- OWASP Summary ---------- */
    function renderOwaspSummary(findings) {
        const groups = {};

        findings.forEach((f) => {
            const cat = f.owasp || 'Unmapped';
            if (!groups[cat]) groups[cat] = { total: 0, severities: {} };
            groups[cat].total++;
            const sev = (f.ai_severity || f.severity || 'low').toLowerCase();
            groups[cat].severities[sev] = (groups[cat].severities[sev] || 0) + 1;
        });

        if (Object.keys(groups).length === 0) {
            owaspTableBody.innerHTML = '<tr><td colspan="3" class="text-muted text-center">No findings</td></tr>';
            return;
        }

        owaspTableBody.innerHTML = Object.entries(groups)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([cat, data]) => {
                const sevBadges = Object.entries(data.severities)
                    .map(([sev, cnt]) => `<span class="badge ${severityBadgeClass(sev)}">${sev}: ${cnt}</span>`)
                    .join(' ');
                return `<tr>
          <td><strong>${cat}</strong></td>
          <td>${data.total}</td>
          <td>${sevBadges}</td>
        </tr>`;
            })
            .join('');
    }

    /* ---------- Detailed Findings ---------- */
    function renderFindings(findings) {
        if (!findings.length) {
            findingsList.innerHTML = '<p class="text-muted">No findings to display.</p>';
            return;
        }

        findingsList.innerHTML = findings.map((f, i) => `
      <div class="card mb-md" style="animation: fadeInUp 0.4s ease-out ${i * 0.05}s both;">
        <div class="flex justify-between items-center mb-md" style="flex-wrap:wrap; gap:0.5rem;">
          <div class="flex items-center gap-sm">
            <span class="badge ${severityBadgeClass(f.ai_severity || f.severity)}">${(f.ai_severity || f.severity || '').toUpperCase()}</span>
            <strong>${f.rule_id || '—'}</strong>
            <span class="text-muted">${f.cwe || ''}</span>
          </div>
          <span class="text-muted font-mono" style="font-size:0.8rem;">Line ${f.line || '?'}${f.column ? ':' + f.column : ''} · ${f.tool || ''}</span>
        </div>

        <p style="margin-bottom:0.75rem;">${f.message || ''}</p>

        ${f.code_snippet ? `<div class="code-block mb-md"><span class="line-num">${f.line || ''}</span>${escapeHtml(f.code_snippet)}</div>` : ''}

        ${f.ai_verdict ? `<p><strong>AI Verdict:</strong> <span class="badge ${f.ai_verdict === 'true_positive' ? 'badge--danger' : 'badge--success'}">${f.ai_verdict}</span></p>` : ''}

        ${f.ai_explanation ? `<p class="text-muted mt-md"><strong>Explanation:</strong> ${f.ai_explanation}</p>` : ''}

        ${f.ai_remediation ? `<p class="mt-md" style="color:var(--success);"><strong>Fix:</strong> ${f.ai_remediation}</p>` : ''}

        ${f.owasp ? `<p class="mt-md text-muted" style="font-size:0.8rem;">OWASP: ${f.owasp}</p>` : ''}
      </div>
    `).join('');
    }

    /* ---------- Utility ---------- */
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});
