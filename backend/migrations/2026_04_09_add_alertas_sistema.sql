-- Migración: Sistema de Alertas
-- Fecha: 2026-04-09
-- Descripción: Agregar tabla de alertas y configuración de alertas en clubes

-- 1. Agregar campos de configuración de alertas a la tabla clubes
ALTER TABLE clubes ADD COLUMN alertas_documentacion_enabled BOOLEAN DEFAULT 1;
ALTER TABLE clubes ADD COLUMN alertas_dias_aviso_previo INTEGER DEFAULT 30;
ALTER TABLE clubes ADD COLUMN alertas_dias_critico INTEGER DEFAULT 60;

-- 2. Crear tabla de alertas
CREATE TABLE IF NOT EXISTS alertas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    
    -- Tipo y categoría
    tipo VARCHAR(50) NOT NULL,
    subtipo VARCHAR(50),
    severidad VARCHAR(20) NOT NULL DEFAULT 'warning',
    
    -- Información
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha_referencia DATETIME,
    
    -- Estado
    estado VARCHAR(20) NOT NULL DEFAULT 'activa',
    
    -- Tracking notificaciones
    notificado_admin BOOLEAN DEFAULT 0,
    fecha_notificacion_admin DATETIME,
    notificado_usuario BOOLEAN DEFAULT 0,
    fecha_notificacion_usuario DATETIME,
    ultimo_email_enviado DATETIME,
    
    -- Auditoría
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME,
    fecha_resolucion DATETIME,
    resuelto_por_id INTEGER,
    
    -- Foreign Keys
    FOREIGN KEY (club_id) REFERENCES clubes(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (resuelto_por_id) REFERENCES usuarios(id)
);

-- 3. Crear índices para mejorar el rendimiento
CREATE INDEX idx_alertas_club_id ON alertas(club_id);
CREATE INDEX idx_alertas_usuario_id ON alertas(usuario_id);
CREATE INDEX idx_alertas_tipo ON alertas(tipo);
CREATE INDEX idx_alertas_estado ON alertas(estado);
CREATE INDEX idx_alertas_severidad ON alertas(severidad);
CREATE INDEX idx_alertas_club_estado ON alertas(club_id, estado);
