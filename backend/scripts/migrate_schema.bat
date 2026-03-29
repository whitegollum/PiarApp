@echo off
REM Script para migrar el esquema de la base de datos
REM Uso: migrate_schema.bat [--dry-run] [--force]

cd /d "%~dp0\.."

echo ====================================
echo Migracion de Esquema de Base de Datos
echo ====================================
echo.

python scripts/migrate_schema.py %*
