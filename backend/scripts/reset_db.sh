#!/bin/bash
# Script de Unix/Linux para limpiar la base de datos de PiarAPP

cd "$(dirname "$0")"

echo ""
echo "========================================"
echo "  PiarAPP - Limpieza de Base de Datos"
echo "========================================"
echo ""

if [ -z "$1" ]; then
    echo "Uso: ./reset_db.sh [limpiar|recrear]"
    echo ""
    echo "  limpiar  - Elimina todos los datos pero mantiene la estructura"
    echo "  recrear  - Elimina y recrea completamente la base de datos"
    echo ""
    exit 1
fi

if [ "$1" = "limpiar" ]; then
    python3 reset_database.py limpiar
    exit $?
fi

if [ "$1" = "recrear" ]; then
    python3 reset_database.py recrear
    exit $?
fi

echo "Error: Acción no válida. Use 'limpiar' o 'recrear'"
exit 1
