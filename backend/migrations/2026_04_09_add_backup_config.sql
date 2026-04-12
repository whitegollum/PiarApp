-- Migración: Agregar configuración de backups automáticos
-- Fecha: 2026-04-09
-- Descripción: Añade columnas para configurar backups automáticos de la base de datos

-- Agregar columnas de configuración de backups a system_config
ALTER TABLE system_config ADD COLUMN backup_automatico_habilitado BOOLEAN DEFAULT 0;
ALTER TABLE system_config ADD COLUMN backup_frecuencia_dias INTEGER DEFAULT 7;
ALTER TABLE system_config ADD COLUMN backup_max_archivos INTEGER DEFAULT 10;
ALTER TABLE system_config ADD COLUMN backup_ultimo_ejecutado DATETIME;

-- Registrar migración
INSERT INTO schema_migrations (migration_name, applied_at, description)
VALUES (
    '2026_04_09_add_backup_config',
    CURRENT_TIMESTAMP,
    'Agregar configuración de backups automáticos a system_config'
);
