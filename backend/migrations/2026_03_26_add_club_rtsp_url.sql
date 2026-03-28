-- Añadir campo rtsp_url a la tabla clubes para almacenar URL de cámara RTSP/HLS
-- Fecha: 2026-03-26

ALTER TABLE clubes ADD COLUMN rtsp_url VARCHAR(500);
