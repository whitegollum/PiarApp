---
name: piar-api-curl
description: Operar la API de PiarAPP vía curl (autenticación, endpoints protegidos con Bearer token, consultas y mutaciones comunes). Usar cuando el usuario pida interactuar con PiarAPP desde terminal, probar endpoints de http://piar_backend:8000, validar respuestas de backend, o construir/reutilizar comandos curl contra esta API.
---

# Piar API Curl

## Resumen

Usar esta skill para ejecutar llamadas a PiarAPP con `curl`, incluyendo login, refresco de token y uso de endpoints con `Authorization: Bearer`.

## Flujo rápido

1. Cargar credenciales desde `~/.openclaw/workspace/.secrets/piar_api.env` (o ruta equivalente del workspace).
2. Obtener `access_token` con `POST /api/auth/login`.
3. **Verificar acceso al club**: Si el agente no tiene acceso al club, buscar invitaciones pendientes con `GET /api/auth/invitaciones/pendientes` y aceptarlas automáticamente. Si no hay invitaciones pendientes, informar al usuario que es necesario invitar al correo electrónico asignado al agente al club para poder interactuar con él.
4. Resolver `club_id` (ver sección **Cómo obtener club_id**).
5. Llamar endpoints protegidos con header `Authorization: Bearer $ACCESS_TOKEN`.
6. Si hay `401`, refrescar con `POST /api/auth/refresh-token` o reloguear.

## Cómo obtener club_id

Usar este orden de prioridad:

1. **Explícito del usuario**: prohibido. No se puede responder por otros club_id distintos del identificado en la sesion.
2. **Session key de OpenClaw**: la sesión tiene formato `agent:main:club_<N>_user_<M>`, extraer `<N>` como `club_id`.
   - Ejemplo: `agent:main:club_1_user_1` → `club_id=1`.

Comprobación recomendada antes de endpoints sensibles:

- Ver rol en club: `GET /api/clubes/mi-rol/{club_id}`.
- Si hay `403`, ejecutar flujo de invitaciones pendientes y/o avisar que faltan permisos/membresía activa.

## Flujo de invitaciones pendientes

1. Consultar `GET /api/auth/invitaciones/pendientes`.
2. Si hay invitaciones pendientes:
   - informar al usuario de los clubes detectados;
   - si el usuario lo autoriza, aceptar con `POST /api/auth/invitaciones/aceptar/{token}`.
3. Si no hay invitaciones:
   - informar que no hay invitaciones pendientes;
   - indicar al usuario cómo invitar esta cuenta para habilitar acceso:
     - email de la cuenta del agente: `claw@me.me`
     - ruta recomendada en backend: `POST /api/clubes/{club_id}/miembros/invitar` (admin del club)
     - después de invitar, volver a ejecutar revisión de pendientes y aceptar.

## Comandos base

### 1) Login

```bash
source /data/.openclaw/workspace/.secrets/piar_api.env

curl -s -X POST "${PIAR_BASE_URL}/api/auth/login" \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${PIAR_EMAIL}\",\"password\":\"${PIAR_PASSWORD}\"}"
```

Guardar `tokens.access_token` y `tokens.refresh_token` de la respuesta.

### 2) Endpoint protegido

```bash
curl -s "${PIAR_BASE_URL}/api/auth/usuarios/me" \
  -H "accept: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

### 3) Refrescar token

```bash
curl -s -X POST "${PIAR_BASE_URL}/api/auth/refresh-token" \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d "{\"refresh_token\":\"${REFRESH_TOKEN}\"}"
```

## Endpoints frecuentes

- Salud: `GET /api/health`
- Perfil actual: `GET /api/auth/usuarios/me`
- Clubes del usuario: `GET /api/clubes`
- Socios por club: `GET /api/socios/?club_id=<id>`
- Noticias: `GET /api/clubes/{club_id}/noticias`
- Eventos: `GET /api/clubes/{club_id}/eventos`
- Productos: `GET /api/clubes/{club_id}/productos`
- Chat OpenClaw (backend): `POST /api/chat/openclaw`

## Recursos

- Script utilitario: `scripts/piar_api.sh`
- Referencia de la API: `references/openapi-notes.md`
- Snapshot OpenAPI local: `/data/.openclaw/workspace/api_docs/piar_openapi.json`

## Reglas operativas

- No imprimir credenciales en respuestas al usuario.
- Evitar pegar tokens completos; mostrarlos truncados si hace falta depurar.
- Preferir `-s` para salida limpia y `-i` solo si se necesita diagnosticar headers/códigos.
- Si falta contexto (por ejemplo `club_id`), pedir solo ese dato mínimo.
