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
