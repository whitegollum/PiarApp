#!/bin/bash
# Script para migrar el esquema de la base de datos
# Uso: ./migrate_schema.sh [--dry-run] [--force]

cd "$(dirname "$0")/.."

echo "===================================="
echo "Migracion de Esquema de Base de Datos"
echo "===================================="
echo ""

python scripts/migrate_schema.py "$@"
