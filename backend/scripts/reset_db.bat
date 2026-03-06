@echo off
REM Script de Windows para limpiar la base de datos de PiarAPP

cd /d "%~dp0"

echo.
echo ========================================
echo   PiarAPP - Limpieza de Base de Datos
echo ========================================
echo.

if "%1"=="" (
    echo Uso: reset_db.bat [limpiar^|recrear]
    echo.
    echo   limpiar  - Elimina todos los datos pero mantiene la estructura
    echo   recrear  - Elimina y recrea completamente la base de datos
    echo.
    exit /b 1
)

if "%1"=="limpiar" (
    python reset_database.py limpiar
    exit /b %ERRORLEVEL%
)

if "%1"=="recrear" (
    python reset_database.py recrear
    exit /b %ERRORLEVEL%
)

echo Error: Accion no valida. Use 'limpiar' o 'recrear'
exit /b 1
