@echo off
REM Atajo rápido para actualizar la base de datos
REM Simplemente ejecuta: update-db.bat

cd /d "%~dp0\.."

echo.
echo ╔═══════════════════════════════════════════════════════════════════╗
echo ║                  ACTUALIZAR BASE DE DATOS                         ║
echo ╚═══════════════════════════════════════════════════════════════════╝
echo.

python scripts\safe_migrate.py
