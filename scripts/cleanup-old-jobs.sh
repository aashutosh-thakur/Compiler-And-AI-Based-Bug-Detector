#!/bin/bash
# ==============================================================
# cleanup-old-jobs.sh – Remove old uploads and reports
#
# Usage: ./scripts/cleanup-old-jobs.sh [RETENTION_DAYS]
# Default retention: 30 days
# ==============================================================

set -euo pipefail

RETENTION_DAYS="${1:-30}"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UPLOADS_DIR="${PROJECT_ROOT}/uploads"
REPORTS_DIR="${PROJECT_ROOT}/reports"

echo "🧹 Cleaning up files older than ${RETENTION_DAYS} days..."
echo "   Uploads: ${UPLOADS_DIR}"
echo "   Reports: ${REPORTS_DIR}"
echo ""

# Clean uploads
if [ -d "$UPLOADS_DIR" ]; then
  UPLOAD_COUNT=$(find "$UPLOADS_DIR" -type f -mtime "+${RETENTION_DAYS}" | wc -l)
  find "$UPLOADS_DIR" -type f -mtime "+${RETENTION_DAYS}" -delete
  echo "   ✅ Removed ${UPLOAD_COUNT} old upload(s)"
else
  echo "   ⚠️  Uploads directory not found"
fi

# Clean reports
if [ -d "$REPORTS_DIR" ]; then
  REPORT_COUNT=$(find "$REPORTS_DIR" -type f -mtime "+${RETENTION_DAYS}" | wc -l)
  find "$REPORTS_DIR" -type f -mtime "+${RETENTION_DAYS}" -delete
  echo "   ✅ Removed ${REPORT_COUNT} old report(s)"
else
  echo "   ⚠️  Reports directory not found"
fi

echo ""
echo "🎉 Cleanup complete!"
