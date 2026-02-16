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
- **Contraseña de Instalaciones:** Backend y Frontend (Vista Socios + Gestión Admin).
- Sistema de comentarios en noticias.
- **Setup Inicial:** Pantalla de bienvenida para crear el primer administrador si no existen usuarios.

### Pendiente inmediato
- Integracion completa de Google OAuth en frontend.
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
| [README.md](../README.md) | Resumen ejecutivo del producto | Para entender el proyecto en 2 minutos |
| [FUNCTIONAL_SPECS.md](FUNCTIONAL_SPECS.md) | Requisitos funcionales | Para implementar features y validar alcance |
| [TECHNICAL_REQUIREMENTS.md](TECHNICAL_REQUIREMENTS.md) | Arquitectura y modelo de datos | Para cambios estructurales o integraciones |
| [frontend/UX_STANDARDS.md](../frontend/UX_STANDARDS.md) | Reglas UX/UI | Para crear o ajustar pantallas |
| [TESTING_PLAN.md](TESTING_PLAN.md) | Plan de pruebas | Para verificar releases |
| [DEVELOPMENT_PHASES.md](DEVELOPMENT_PHASES.md) | Roadmap historico | Para contexto de largo plazo |

---

## Guia para agentes

### Antes de tocar codigo
- Revisar alcance funcional en [FUNCTIONAL_SPECS.md](FUNCTIONAL_SPECS.md).
- Confirmar reglas de UI en [frontend/UX_STANDARDS.md](../frontend/UX_STANDARDS.md).
- Validar impactos de datos en [TECHNICAL_REQUIREMENTS.md](TECHNICAL_REQUIREMENTS.md).

### Durante el trabajo
- Mantener consistencia con roles y permisos ya definidos.
- Preferir cambios incrementales y faciles de probar.

### Al cerrar una tarea
- Actualizar el estado en esta documentacion.
- Actualizar avance en las fases: [DEVELOPMENT_PHASES.md](DEVELOPMENT_PHASES.md)
- Agregar o ajustar pruebas en [TESTING_PLAN.md](TESTING_PLAN.md).

---

## Estructura minima del repositorio

```
piarApp/
├── docs/
│   ├── DOCUMENTATION.md
│   ├── FUNCTIONAL_SPECS.md
│   ├── TECHNICAL_REQUIREMENTS.md
│   ├── TESTING_PLAN.md
│   └── DEVELOPMENT_PHASES.md
├── backend/
│   └── data/
├── frontend/
└── README.md
```