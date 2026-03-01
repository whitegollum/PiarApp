# 🚀 Guía de Despliegue - PIARAPP

Este documento describe cómo construir y ejecutar la aplicación usando Docker y Docker Compose.

## Requisitos previos

- Docker
- Docker Compose

## Estructura de Contenedores

La aplicación se compone de dos servicios principales orquestados:

1.  **Backend (`piar_backend`)**:
    -   Basado en `python:3.11-slim`.
    -   Ejecuta Uvicorn en puerto 8000.
    -   Persistencia de datos en volumen SQLite (montado).

2.  **Frontend (`piar_frontend`)**:
    -   Multi-stage build (`node:18-alpine` -> `nginx:alpine`).
    -   Sirve la aplicación React compilada (`dist`).
    -   Actúa como Reverse Proxy para la API (`/api/*` -> `backend:8000`).
    -   Expone el puerto 3000 en el host (mapeado al 80 interno).

## Ejecución Local con Docker Compose

Antes de levantar los servicios hay que proporcionar los valores de configuración que el backend y el frontend esperan. Estos se editan en `docker-compose.yml` o bien en un fichero `.env` que sea cargado por Compose (ver la sección correspondiente en el propio `docker-compose.yml`).

### Variables de entorno a completar

En `docker-compose.yml` encontrarás un apartado `environment:` para cada servicio. Los campos más importantes son:

- `SECRET_KEY` (backend)
  - Se utiliza para firmar las cookies JWT y otras operaciones criptográficas. Puede generarse con `python -c "import secrets; print(secrets.token_urlsafe())"`.
- `DATABASE_URL` (backend)
  - Dirección de la base de datos. En local suele ser `sqlite:///./data.db`; en producción se cambia a la cadena de conexión de PostgreSQL u otro SGBD.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` (backend)
  - Credenciales de OAuth2 para Google. El cliente sólo necesita el `GOOGLE_CLIENT_ID` al compilarse, por ello se pasa como `build-arg` al servicio `frontend` y se escribe en `.env.production` desde el Dockerfile.
  - `GOOGLE_REDIRECT_URI` debe coincidir con la URL registrada en la consola de Google (por ejemplo `http://localhost:3000/oauth-callback`).
- `VITE_GOOGLE_CLIENT_ID` / `VITE_API_URL` (frontend build args)
  - Ajustes de compilación que establece Vite. En el `docker-compose.yml` se declaran bajo `build.args:` para que el `Dockerfile` pueda copiar el valor a un `.env.production` interno.

> **Nota:** Si prefieres no hardcodear valores en el YAML puedes utilizar un fichero `.env` en la raíz del proyecto y referenciarlo con `env_file:` en Compose. De ese modo las mismas variables (por ejemplo `SECRET_KEY`, `GOOGLE_CLIENT_ID`, etc.) se heredan automáticamente a los contenedores.

1.  **Construir las imágenes e iniciar los contenedores:**

    ```bash
    docker compose up --build -d
    ```

    Esto descargará las dependencias, compilará el frontend y levantará ambos servicios.

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

## Consideraciones de Producción

-   **Base de Datos:** Para producción real, se recomienda cambiar SQLite por PostgreSQL. Actualizar `DATABASE_URL` en `docker-compose.yml` y las dependencias en backend.
-   **Secretos:** No incluir `.env` con secretos reales en el control de versiones. Usar secretos gestionados o variables de entorno inyectadas.
-   **SSL/HTTPS:** Configurar un proxy inverso adicional (Nginx/Traefik) con certificados SSL (ej. Let's Encrypt) delante de los contenedores.

## Solución de Problemas

-   **Error de conexión base de datos:** Verificar permisos de escritura en la carpeta montada del volumen.
-   **Frontend no carga:** Asegurar que el build se completó correctamente (`docker-compose build frontend`).
-   **API 404:** Verificar que Nginx está redirigiendo correctamente `/api/` al backend.
