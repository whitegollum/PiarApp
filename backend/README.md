# PiarAPP Backend

Backend de la aplicacion de gestion de clubes de aeromodelismo usando FastAPI.

## Requisitos

- Python 3.10+
- pip o poetry

## Configuración

1. **Crear archivo .env:**
   ```bash
   cp .env.example .env
   ```

2. **Instalar dependencias:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Ejecutar servidor:**
   ```bash
   python -m uvicorn app.main:app --reload
   ```

El servidor estará disponible en `http://localhost:8000`

## Base de Datos y Migraciones (Alembic)

El esquema se gestiona con **Alembic** y se aplica automáticamente al arrancar la app
(`alembic upgrade head` en el lifespan). En desarrollo se usa SQLite y en producción
PostgreSQL (la misma URL `DATABASE_URL` controla ambos).

```bash
# Aplicar migraciones manualmente (normalmente no hace falta, se aplica al arrancar)
alembic upgrade head

# Crear una nueva migración tras cambiar los modelos
alembic revision --autogenerate -m "descripcion del cambio"

# Ver la revisión actual / historial
alembic current
alembic history
```

Para migrar datos de una SQLite existente a PostgreSQL, usa
`scripts/migrate_sqlite_to_postgres.py` (export/import lógico JSON).

## API Documentation

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Estructura del Proyecto

```
backend/
├── data/                # Datos persistentes
├── app/
│   ├── models/          # Modelos de SQLAlchemy
│   ├── schemas/         # Schemas de Pydantic
│   ├── routes/          # Endpoints de la API
│   ├── services/        # Lógica de negocio
│   ├── database/        # Configuración de BD
│   ├── middleware/      # Middleware personalizado
│   ├── config.py        # Configuración
│   └── main.py          # Punto de entrada
├── uploads/             # Carpeta para archivos subidos
├── tests/               # Tests unitarios
├── requirements.txt     # Dependencias Python
└── .env.example         # Variables de entorno ejemplo
```

## Estado actual

- Autenticacion JWT y refresh token.
- Google OAuth backend listo.
- Modulos de clubes, miembros, noticias, eventos e invitaciones.
- Perfil de usuario con ver y editar datos, cambio de contrasena.
- Gestión de código de acceso a instalaciones (club_id).

## Proximos pasos

1. Agregar tests unitarios e integracion.
2. Mejorar cobertura de validaciones y errores.
3. Preparar migraciones y despliegue.

## Migraciones de Base de Datos

Las migraciones SQL se encuentran en `migrations/` y deben ejecutarse manualmente cuando se actualiza la estructura de la base de datos.

### Scripts de Migración Disponibles

**Actualizar configuración SMTP desde .env:**
```bash
python scripts/update_smtp_config.py
```
Lee las variables `SMTP_*` del archivo `.env` y actualiza la configuración en la base de datos.

**Añadir campo rtsp_url a clubes:**
```bash
python scripts/migrate_add_rtsp_url.py
```
Añade la columna `rtsp_url` a la tabla `clubes` para soporte de cámaras en vivo.

### Migraciones SQL Manuales

Las migraciones están en archivos `.sql` numerados por fecha:
- `2026_02_14_add_usuario_preferences.sql` - Preferencias de usuario
- `2026_03_26_add_club_rtsp_url.sql` - URL de cámara RTSP/HLS

**Ejecutar migración SQL directamente:**
```bash
# Opción 1: SQLite CLI (si está instalado)
sqlite3 data/piar.db < migrations/2026_03_26_add_club_rtsp_url.sql

# Opción 2: Script Python
python -c "import sqlite3; conn = sqlite3.connect('data/piar.db'); conn.executescript(open('migrations/2026_03_26_add_club_rtsp_url.sql').read()); conn.commit()"
```

**Verificar columnas de una tabla:**
```bash
python -c "import sqlite3; conn = sqlite3.connect('data/piar.db'); print([col[1] for col in conn.execute('PRAGMA table_info(clubes)')])"
```

### Orden de Ejecución

1. Instalar dependencias (`pip install -r requirements.txt`)
2. Ejecutar migraciones pendientes en orden cronológico
3. Ejecutar scripts de configuración si es necesario
4. Iniciar servidor

## Variables de Entorno

Consultar `.env.example` para la lista completa de variables requeridas.
