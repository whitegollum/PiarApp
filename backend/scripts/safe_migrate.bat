@echo off
REM Script todo-en-uno para actualizar la BD de forma segura
REM Uso: safe_migrate.bat [--no-backup] [--force]

cd /d "%~dp0\.."

echo.
echo ================================================================================
echo           ACTUALIZACION SEGURA DE BASE DE DATOS
echo ================================================================================
echo.

python scripts/safe_migrate.py %*
