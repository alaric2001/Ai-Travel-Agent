#!/bin/bash
# =============================================================
# Database Initialization Script
# Menjalankan migrations lalu seeds secara berurutan
# Dieksekusi otomatis oleh PostgreSQL Docker entrypoint
# =============================================================
set -e

PSQL="psql -v ON_ERROR_STOP=1 --username $POSTGRES_USER --dbname $POSTGRES_DB"

echo "======================================================"
echo "  Initializing Travel Agent Database..."
echo "======================================================"

echo ""
echo ">>> [1/2] Running migrations..."
for f in $(ls /docker-entrypoint-initdb.d/migrations/*.sql | sort); do
    echo "  -> $(basename $f)"
    $PSQL -f "$f"
done

echo ""
echo ">>> [2/2] Running seeds..."
for f in $(ls /docker-entrypoint-initdb.d/seeds/*.sql | sort); do
    echo "  -> $(basename $f)"
    $PSQL -f "$f"
done

echo ""
echo "======================================================"
echo "  Database initialization complete!"
echo "======================================================"
