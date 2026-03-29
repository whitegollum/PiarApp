#!/bin/bash
# Atajo rápido para actualizar la base de datos
# Uso: ./update-db.sh

cd "$(dirname "$0")"

echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "                    ACTUALIZAR BASE DE DATOS                        "
echo "════════════════════════════════════════════════════════════════════"
echo ""

python scripts/safe_migrate.py
