-- Migración: Tareas Comunitarias con Ranking y Premios
-- Fecha: 2026-04-30

CREATE TABLE IF NOT EXISTS tareas_comunitarias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    puntos INTEGER NOT NULL DEFAULT 0,
    categoria VARCHAR(100),
    prioridad VARCHAR(20) NOT NULL DEFAULT 'media',
    fecha_limite DATETIME,
    max_participantes INTEGER,
    estado VARCHAR(20) NOT NULL DEFAULT 'abierta',
    motivo_rechazo TEXT,
    creador_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    FOREIGN KEY (club_id) REFERENCES clubes(id),
    FOREIGN KEY (creador_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_tareas_comunitarias_club_id ON tareas_comunitarias(club_id);
CREATE INDEX IF NOT EXISTS idx_tareas_comunitarias_estado ON tareas_comunitarias(estado);
CREATE INDEX IF NOT EXISTS idx_tareas_comunitarias_creador_id ON tareas_comunitarias(creador_id);

CREATE TABLE IF NOT EXISTS participantes_tarea (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tarea_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    fecha_inscripcion DATETIME DEFAULT CURRENT_TIMESTAMP,
    puntos_otorgados BOOLEAN DEFAULT 0,
    FOREIGN KEY (tarea_id) REFERENCES tareas_comunitarias(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_participantes_tarea_tarea_id ON participantes_tarea(tarea_id);
CREATE INDEX IF NOT EXISTS idx_participantes_tarea_usuario_id ON participantes_tarea(usuario_id);

CREATE TABLE IF NOT EXISTS puntuaciones_usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    tarea_id INTEGER NOT NULL,
    puntos INTEGER NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (club_id) REFERENCES clubes(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (tarea_id) REFERENCES tareas_comunitarias(id)
);

CREATE INDEX IF NOT EXISTS idx_puntuaciones_usuario_club_id ON puntuaciones_usuario(club_id);
CREATE INDEX IF NOT EXISTS idx_puntuaciones_usuario_usuario_id ON puntuaciones_usuario(usuario_id);

CREATE TABLE IF NOT EXISTS periodos_premios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'mensual',
    estado VARCHAR(20) NOT NULL DEFAULT 'activo',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (club_id) REFERENCES clubes(id)
);

CREATE INDEX IF NOT EXISTS idx_periodos_premios_club_id ON periodos_premios(club_id);

CREATE TABLE IF NOT EXISTS premios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    periodo_id INTEGER NOT NULL,
    club_id INTEGER NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    posicion INTEGER NOT NULL,
    usuario_id INTEGER,
    confirmado BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (periodo_id) REFERENCES periodos_premios(id),
    FOREIGN KEY (club_id) REFERENCES clubes(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_premios_periodo_id ON premios(periodo_id);
CREATE INDEX IF NOT EXISTS idx_premios_club_id ON premios(club_id);
