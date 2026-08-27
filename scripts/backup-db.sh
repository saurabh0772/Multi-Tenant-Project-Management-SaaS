#!/usr/bin/env bash
set -euo pipefail

# MongoDB Backup Script for Multi-Tenant Project Management SaaS
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/project_manager_dev}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ARCHIVE_NAME="mongodb_backup_${TIMESTAMP}.gz"
ARCHIVE_PATH="${BACKUP_DIR}/${ARCHIVE_NAME}"

echo "=========================================="
echo " Starting MongoDB Database Backup"
echo " Time: $(date)"
echo " Output Archive: ${ARCHIVE_PATH}"
echo "=========================================="

mkdir -p "${BACKUP_DIR}"

if command -v mongodump &> /dev/null; then
    mongodump --uri="${MONGODB_URI}" --archive="${ARCHIVE_PATH}" --gzip
else
    echo "Using Docker for mongodump..."
    docker run --rm -v "$(pwd)/${BACKUP_DIR}:/backup" mongo:7.0 \
        mongodump --uri="${MONGODB_URI}" --archive="/backup/${ARCHIVE_NAME}" --gzip
fi

echo "✅ Backup successfully created at ${ARCHIVE_PATH}"
echo "File Size: $(du -h "${ARCHIVE_PATH}" | cut -f1)"
