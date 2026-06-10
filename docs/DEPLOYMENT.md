# 🚀 Guía de Despliegue - PIARAPP

Este documento describe cómo construir y ejecutar la aplicación usando Docker y Docker Compose.

## Requisitos previos

- Docker
- Docker Compose

## Estructura de Contenedores

La aplicación se compone de tres servicios orquestados:

1.  **Base de datos (`piar_postgres`)**:
    -   Basado en `postgres:16-alpine`.
    -   Persistencia en el volumen `piar_pgdata` (montado en `/var/lib/postgresql/data`).
    -   `healthcheck` con `pg_isready`; el backend espera a que esté `healthy`.
    -   Sin puerto publicado al host por defecto (solo accesible dentro de `piar-network`).
    -   Red: `piar-network`.

2.  **Backend (`piar_backend`)**:
    -   Basado en `python:3.11-slim`.
    -   Ejecuta Uvicorn en puerto 8000.
    -   Conecta a PostgreSQL vía `DATABASE_URL`. Aplica las migraciones de Alembic
        (`alembic upgrade head`) automáticamente al arrancar.
    -   Volúmenes: `piar_data` (`/app/data`, datos del agente y backups JSON) y
        `piar_uploads` (`/app/uploads`, ficheros subidos).
    -   Incluye agente IA nativo (módulo `app/agent/`).
    -   `depends_on: postgres` con `condition: service_healthy`.
    -   Red: `piar-network`.

3.  **Frontend (`piar_frontend`)**:
    -   Multi-stage build (`node:20-alpine` -> `nginx:alpine`).
    -   Sirve la aplicación React compilada (`dist`).
    -   Actúa como Reverse Proxy para la API (`/api/*` -> `backend:8000`).
    -   Expone el puerto 8587 en el host (mapeado al 80 interno).
    -   Red: `piar-network`.

> **Nota:** En desarrollo local (sin Docker) se usa SQLite por defecto; PostgreSQL es
> el motor de producción/Docker. El mismo código sirve para ambos (la diferencia es
> únicamente `DATABASE_URL`).
>
> **Nota:** El servicio OpenClaw ha sido eliminado. El agente IA está integrado directamente en el backend.

## Ejecución Local con Docker Compose

Antes de levantar los servicios hay que proporcionar los valores de configuración que el backend y el frontend esperan. Estos se editan en `docker-compose.yml` o bien en un fichero `.env` que sea cargado por Compose (ver la sección correspondiente en el propio `docker-compose.yml`).

### Variables de entorno a completar

En `docker-compose.yml` encontrarás un apartado `environment:` para cada servicio. Los campos más importantes son:

- `SECRET_KEY` (backend)
  - Se utiliza para firmar las cookies JWT y otras operaciones criptográficas. Puede generarse con `python -c "import secrets; print(secrets.token_urlsafe())"`.
- `DATABASE_URL` (backend)
  - Cadena de conexión de la base de datos. En Docker/producción apunta a PostgreSQL:
    `postgresql+psycopg2://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}`.
    En desarrollo local (sin Docker) se deja en SQLite: `sqlite:///./data/piar.db`.
- `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` (servicio `postgres`)
  - Credenciales con las que se inicializa el contenedor PostgreSQL. Deben coincidir
    con las que aparecen en `DATABASE_URL`. **Usa una contraseña fuerte en producción.**
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` (backend)
  - Credenciales de OAuth2 para Google. El cliente sólo necesita el `GOOGLE_CLIENT_ID` al compilarse, por ello se pasa como `build-arg` al servicio `frontend` y se escribe en `.env.production` desde el Dockerfile.
  - `GOOGLE_REDIRECT_URI` debe coincidir con la URL registrada en la consola de Google (por ejemplo `http://localhost:3000/oauth-callback`).
- `VITE_GOOGLE_CLIENT_ID` / `VITE_API_URL` (frontend build args)
  - Ajustes de compilación que establece Vite. En el `docker-compose.yml` se declaran bajo `build.args:` para que el `Dockerfile` pueda copiar el valor a un `.env.production` interno.
- `OPENAI_API_KEY` (backend)
  - Clave de API de OpenAI para el agente IA nativo. Sin esta variable el agente no podrá responder (pero el backend arranca igual).

> **Nota:** Si prefieres no hardcodear valores en el YAML puedes utilizar un fichero `.env` en la raíz del proyecto y referenciarlo con `env_file:` en Compose. De ese modo las mismas variables (por ejemplo `SECRET_KEY`, `GOOGLE_CLIENT_ID`, etc.) se heredan automáticamente a los contenedores.

1.  **Construir las imágenes e iniciar los contenedores:**

    ```bash
    git pull origin main
    docker compose down 
    docker compose build
    docker compose up -d
    ```

    Esto descargará las dependencias, compilará el frontend y levantará ambos servicios. El backend aplica automáticamente las migraciones de Alembic (`alembic upgrade head`) al arrancar, por lo que no hace falta ningún paso manual de migración.

2.  **Acceder a la aplicación:**

    -   Frontend: [http://localhost:3000](http://localhost:3000)
    -   API (directo): [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI)

3.  **Ver logs:**

    ```bash
    docker compose logs -f
    ```

4.  **Detener los servicios:**

    ```bash
    docker compose down
    ```

## Migración de datos (SQLite → PostgreSQL)

Si vienes de un despliegue con SQLite y quieres conservar los datos al pasar a PostgreSQL:

1.  Levanta solo la base de datos: `docker compose up -d postgres`.
2.  Ejecuta la migración única (reutiliza el export/import lógico JSON y reinicia las
    secuencias de Postgres):

    ```bash
    cd backend
    DATABASE_URL="postgresql+psycopg2://piar:PASS@localhost:5432/piar" \
        python scripts/migrate_sqlite_to_postgres.py --source sqlite:///./data/piar.db
    ```

    El script aplica Alembic al destino, copia todas las tablas en orden de claves
    foráneas y valida los conteos (origen vs destino).
3.  Cambia `DATABASE_URL` (en el `.env` que usa Compose) a la URL de PostgreSQL y
    levanta el stack completo: `docker compose up -d`.

## Backups

Los backups del panel de administración (y los automáticos del scheduler) son un
**export lógico en JSON** (agnóstico al motor), no una copia del fichero `.db`. Se
guardan en `BACKUP_FOLDER` (`./data/backups` dentro del volumen `piar_data`) y la
restauración recarga los datos sin necesidad de reiniciar el servidor.

## Consideraciones de Producción

-   **Base de Datos:** PostgreSQL es el motor de producción (servicio `postgres`).
    Usa credenciales fuertes en `POSTGRES_PASSWORD` y haz copias de seguridad del
    volumen `piar_pgdata` (además de los backups lógicos JSON).
-   **Secretos:** No incluir `.env` con secretos reales en el control de versiones. Usar secretos gestionados o variables de entorno inyectadas.
-   **SSL/HTTPS:** Configurar un proxy inverso adicional (Nginx/Traefik) con certificados SSL (ej. Let's Encrypt) delante de los contenedores.

## Solución de Problemas

-   **Backend no arranca / espera a la BD:** Comprueba que el servicio `postgres` está
    `healthy` (`docker compose ps`) y que las credenciales de `DATABASE_URL` coinciden
    con `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`.
-   **Error de migraciones (Alembic):** Revisa los logs del backend (`docker compose logs -f backend`);
    el esquema se aplica con `alembic upgrade head` al arrancar.
-   **Frontend no carga:** Asegurar que el build se completó correctamente (`docker-compose build frontend`).
-   **API 404:** Verificar que Nginx está redirigiendo correctamente `/api/` al backend.
