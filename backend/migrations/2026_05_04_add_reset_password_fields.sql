-- Migración: Añadir campos para reset de contraseña
-- Fecha: 2026-05-04

ALTER TABLE usuarios ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL;
ALTER TABLE usuarios ADD COLUMN reset_token_expires DATETIME DEFAULT NULL;
CREATE INDEX idx_usuarios_reset_token ON usuarios(reset_token);
