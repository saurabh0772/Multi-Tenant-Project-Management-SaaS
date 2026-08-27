#!/usr/bin/env bash
set -euo pipefail

# MongoDB Restore Script for Multi-Tenant Project Management SaaS
if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <path_to_backup_archive.gz> [mongodb_uri]"
    echo "Example: $0 ./backups/mongodb_backup_20260827_100000.gz mongodb://localhost:27017/project_manager_dev"
    exit 1
fi

ARCHIVE_PATH="$1"
MONGODB_URI="${2:-${MONGODB_URI:-mongodb://localhost:27017/project_manager_dev}}"

if [ ! -f "${ARCHIVE_PATH}" ]; then
    echo "❌ Error: Backup archive file not found at ${ARCHIVE_PATH}"
    exit 1
fi

echo "=========================================================="
echo " ⚠️ WARNING: DESTRUCTIVE DATABASE RESTORE OPERATION"
echo " Target URI: ${MONGODB_URI}"
echo " Archive:    ${ARCHIVE_PATH}"
echo "=========================================================="
read -p "Are you sure you want to overwrite database data? Type 'CONFIRM' to proceed: " CONFIRMATION

if [ "${CONFIRMATION}" != "CONFIRM" ]; then
    echo "Operation aborted by user."
    exit 0
fi

echo "Starting database restoration..."

if command -v mongorestore &> /dev/null; then
    mongorestore --uri="${MONGODB_URI}" --archive="${ARCHIVE_PATH}" --gzip --drop
else
    echo "Using Docker for mongorestore..."
    ARCHIVE_DIR=$(dirname "$(realpath "${ARCHIVE_PATH}")")
    ARCHIVE_FILE=$(basename "${ARCHIVE_PATH}")
    docker run --rm -v "${ARCHIVE_DIR}:/backup" mongo:7.0 \
        mongorestore --uri="${MONGODB_URI}" --archive="/backup/${ARCHIVE_FILE}" --gzip --drop
fi

echo "✅ Database successfully restored from ${ARCHIVE_PATH}"
