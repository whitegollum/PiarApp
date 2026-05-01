-- Migración: Canales de vuelo - Coordinación de frecuencias
-- Fecha: 2026-05-01

CREATE TABLE IF NOT EXISTS canal_ocupaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    canal_numero INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    en_vuelo BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (club_id) REFERENCES clubes(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_canal_ocupaciones_club ON canal_ocupaciones(club_id);
CREATE INDEX IF NOT EXISTS idx_canal_ocupaciones_canal ON canal_ocupaciones(club_id, canal_numero);
CREATE INDEX IF NOT EXISTS idx_canal_ocupaciones_usuario ON canal_ocupaciones(usuario_id);
