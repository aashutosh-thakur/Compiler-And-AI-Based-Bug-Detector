/**
 * main.js – App boot, API fetch wrappers, shared utilities
 *
 * AI Bug Detection System
 */

'use strict';

/* ---------- Configuration ---------- */
const API_BASE = window.location.origin;

/* ---------- Fetch Helpers ---------- */

/**
 * Wrapper around fetch() with JSON parsing and error handling.
 * @param {string} endpoint  - API path, e.g. '/api/upload'
 * @param {object} options   - Standard fetch options
 * @returns {Promise<object>}
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const defaults = {
    headers: { 'Accept': 'application/json' },
  };

  const response = await fetch(url, { ...defaults, ...options });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Upload a file with progress tracking.
 * @param {string} endpoint
 * @param {File}   file
 * @param {function} onProgress  - Callback receiving (percent: number)
 * @returns {Promise<object>}
 */
function apiUpload(endpoint, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.open('POST', `${API_BASE}${endpoint}`);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve({ raw: xhr.responseText });
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.send(formData);
  });
}

/* ---------- DOM Helpers ---------- */

/**
 * Shortcut for querySelector.
 * @param {string} selector
 * @param {Element} parent
 * @returns {Element|null}
 */
function $(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * Shortcut for querySelectorAll → Array.
 */
function $$(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

/**
 * Show / hide an element by toggling the `hidden` class.
 */
function show(el)  { el?.classList.remove('hidden'); }
function hide(el)  { el?.classList.add('hidden'); }
function toggle(el, visible) { visible ? show(el) : hide(el); }

/* ---------- Formatting Helpers ---------- */

/**
 * Format file size in human-readable form.
 * @param {number} bytes
 * @returns {string}
 */
function formatSize(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Map a language extension to a display name.
 * @param {string} ext
 * @returns {string}
 */
function langFromExt(ext) {
  const map = {
    '.c':   'C',
    '.cpp': 'C++',
    '.h':   'C/C++ Header',
    '.py':  'Python',
  };
  return map[ext.toLowerCase()] || 'Unknown';
}

/**
 * Get file extension including the dot.
 * @param {string} filename
 * @returns {string}
 */
function getExt(filename) {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx) : '';
}

/* ---------- Severity / Risk Helpers ---------- */

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];

function severityBadgeClass(severity) {
  switch ((severity || '').toLowerCase()) {
    case 'critical': return 'badge--danger';
    case 'high':     return 'badge--danger';
    case 'medium':   return 'badge--warning';
    case 'low':      return 'badge--info';
    default:         return 'badge--info';
  }
}

function riskGradeInfo(score) {
  if (score >= 80) return { grade: 'Secure',        cls: 'risk-gauge--secure',  badge: 'badge--success' };
  if (score >= 50) return { grade: 'Moderate Risk',  cls: 'risk-gauge--moderate', badge: 'badge--warning' };
  return                   { grade: 'High Risk',      cls: 'risk-gauge--danger',  badge: 'badge--danger'  };
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  console.log('[AI Bug Detector] main.js loaded');
});
