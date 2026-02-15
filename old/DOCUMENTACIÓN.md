# DOCUMENTACIÓN DEL PROYECTO

Este documento centraliza el estado actual y las bases del proyecto. Sirve como punto de entrada para equipos y agentes.

---

## Estado actual

### Hecho
- Autenticacion con JWT y refresh token.
- Gestion de clubes, miembros, invitaciones y roles por club.
- Perfil de usuario con edicion de datos, cambio de contrasena y descarga de datos.
- Backend completo para noticias y eventos.
- Frontend para visualizar y editar noticias y eventos.
- Inscripcion a eventos (RSVP) con control de aforo.
- Control de acceso por rol (RBAC) en API y UI.
- Pagina de edicion de clubes.
- Rol de superadministrador.

### Pendiente inmediato
- Integracion completa de Google OAuth en frontend.
- Sistema de comentarios en noticias y eventos.
- Testing automatizado (pytest, React tests, E2E).
- Deployment (Docker, CI/CD).

---

## Bases del proyecto

### Vision funcional
- Plataforma multiclub con aislamiento de datos por club.
- Operativa diaria del club (contenido, eventos, membresia) como foco principal.
- Acceso y permisos gobernados por rol.

### Base tecnica (resumen)
- Backend: FastAPI + SQLAlchemy.
- Frontend: React + TypeScript.
- Autenticacion: JWT y OAuth (Google).
- Datos: SQLite en desarrollo, PostgreSQL en produccion.

---

## Mapa de documentos

| Documento | Enfoque | Cuando usarlo |
|---|---|---|
| [README.md](README.md) | Resumen ejecutivo del producto | Para entender el proyecto en 2 minutos |
| [CARACTERÍSTICAS_FUNCIONALES.md](CARACTERÍSTICAS_FUNCIONALES.md) | Requisitos funcionales | Para implementar features y validar alcance |
| [REQUISITOS_TÉCNICOS.md](REQUISITOS_TÉCNICOS.md) | Arquitectura y modelo de datos | Para cambios estructurales o integraciones |
| [frontend/UX_STANDARDS.md](frontend/UX_STANDARDS.md) | Reglas UX/UI | Para crear o ajustar pantallas |
| [PRUEBAS_FUNCIONALES.md](PRUEBAS_FUNCIONALES.md) | Plan de pruebas | Para verificar releases |
| [DEVELOPMENT_PHASES.md](DEVELOPMENT_PHASES.md) | Roadmap historico | Para contexto de largo plazo |

---

## Guia para agentes

### Antes de tocar codigo
- Revisar alcance funcional en [CARACTERÍSTICAS_FUNCIONALES.md](CARACTERÍSTICAS_FUNCIONALES.md).
- Confirmar reglas de UI en [frontend/UX_STANDARDS.md](frontend/UX_STANDARDS.md).
- Validar impactos de datos en [REQUISITOS_TÉCNICOS.md](REQUISITOS_TÉCNICOS.md).

### Durante el trabajo
- Mantener consistencia con roles y permisos ya definidos.
- Preferir cambios incrementales y faciles de probar.

### Al cerrar una tarea
- Actualizar el estado en esta documentacion.
- Agregar o ajustar pruebas en [PRUEBAS_FUNCIONALES.md](PRUEBAS_FUNCIONALES.md).

---

## Estructura minima del repositorio

```
piarApp/
├── README.md
├── DOCUMENTACIÓN.md
├── CARACTERÍSTICAS_FUNCIONALES.md
├── REQUISITOS_TÉCNICOS.md
├── PRUEBAS_FUNCIONALES.md
├── backend/
└── frontend/
```