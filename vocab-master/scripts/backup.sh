#!/bin/bash
# Database backup script for Vocab Master
# Usage: ./scripts/backup.sh [backup_dir]
#
# Defaults to ./backups/ directory. Creates timestamped SQLite backup
# using the online backup API (safe for concurrent reads).
# Keeps the last 7 daily backups by default.

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
DB_PATH="${DATABASE_PATH:-./backend/data/vocab-master.db}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/vocab-master_${TIMESTAMP}.db"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Verify source database exists
if [ ! -f "$DB_PATH" ]; then
  echo "{\"timestamp\":\"$(date -Iseconds)\",\"level\":\"error\",\"message\":\"Backup failed: database not found\",\"path\":\"$DB_PATH\"}"
  exit 1
fi

# Use sqlite3 .backup command (online backup, safe during writes)
if command -v sqlite3 &> /dev/null; then
  sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"
else
  # Fallback: copy with WAL checkpoint
  cp "$DB_PATH" "$BACKUP_FILE"
  if [ -f "${DB_PATH}-wal" ]; then
    cp "${DB_PATH}-wal" "${BACKUP_FILE}-wal"
  fi
fi

# Verify backup
BACKUP_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat --printf="%s" "$BACKUP_FILE" 2>/dev/null || echo "0")
if [ "$BACKUP_SIZE" -lt 1024 ]; then
  echo "{\"timestamp\":\"$(date -Iseconds)\",\"level\":\"error\",\"message\":\"Backup file too small\",\"size\":$BACKUP_SIZE}"
  rm -f "$BACKUP_FILE"
  exit 1
fi

echo "{\"timestamp\":\"$(date -Iseconds)\",\"level\":\"info\",\"message\":\"Backup completed\",\"file\":\"$BACKUP_FILE\",\"size\":$BACKUP_SIZE}"

# Cleanup old backups
find "$BACKUP_DIR" -name "vocab-master_*.db" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true

# Count remaining backups
REMAINING=$(find "$BACKUP_DIR" -name "vocab-master_*.db" | wc -l)
echo "{\"timestamp\":\"$(date -Iseconds)\",\"level\":\"info\",\"message\":\"Backup retention cleanup done\",\"remaining\":$REMAINING,\"retention_days\":$RETENTION_DAYS}"
