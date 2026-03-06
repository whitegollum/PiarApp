# PiarAPP - Sistema de Gestion de Clubes de Aeromodelismo

Plataforma web para la gestion de clubes de aeromodelismo con foco en membresias, contenido y operacion diaria del club.

## Que es
PiarApp es la aplicacion de la Asociacion Cerdos Voladores para gestionar su campo de vuelo. El nombre lo resume bien: si no te convence, quizas tienes alma de cerdo; y si te encanta, entonces eres un cerdo que ademas vuela.

## Capacidades clave
- Gestión de clubes, miembros e invitaciones con roles.
- Administración de miembros con activación/desactivación y acciones centralizadas.
- Perfil de usuario y cuenta personal con descarga de datos.
- Perfil de socio ampliado con datos personales y foto de carnet.
- Noticias del club con publicación y edición controlada por permisos.
- Eventos con inscripción (RSVP), aforo y gestión de asistentes.
- **Productos de afiliación:** Catálogo y panel admin de productos con enlaces externos.
- **Novedades recientes:** Sección en cada club mostrando últimas noticias, eventos y productos.
- Control de acceso por rol para proteger acciones sensibles.
- Panel superadmin con configuración SMTP y URL base para emails de invitación.
- Federación con Google (login/registro con OAuth code flow).
- **Validación mejorada:** HTML5 + backend con logging detallado de errores 422.
- **Asistente IA:** Integración con OpenClaw para chat contextual por club.

## Documentación
- Vision, estado y bases del proyecto: [DOCUMENTATION.md](docs/DOCUMENTATION.md)
- Especificacion funcional detallada: [FUNCTIONAL_SPECS.md](docs/FUNCTIONAL_SPECS.md)
- Requisitos tecnicos y arquitectura: [TECHNICAL_REQUIREMENTS.md](docs/TECHNICAL_REQUIREMENTS.md)
- Estandares de UX/UI: [frontend/UX_STANDARDS.md](frontend/UX_STANDARDS.md)
- Plan de pruebas: [TESTING_PLAN.md](docs/TESTING_PLAN.md)
- Roadmap e historial de fases: [DEVELOPMENT_PHASES.md](docs/DEVELOPMENT_PHASES.md)
- Guía de despliegue y Docker: [DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Changelog Marzo 2026:** [CHANGELOG_MAR_2026.md](docs/CHANGELOG_MAR_2026.md)

## Últimas actualizaciones (Marzo 2026)
### ✨ Fase 8.2 - Productos, Validación y UX
- 🛒 **Sistema completo de productos de afiliación** (backend CRUD + frontend catálogo + panel admin)
- 🆕 **Sección de novedades recientes** por club (últimas noticias, eventos, productos)
- ✅ **Validación HTML5** en formularios (minLength, maxLength) + logging backend detallado
- 📅 **Fix datetime eventos**: combinación de fecha + hora en formato ISO
- 🧪 **Tests actualizados**: noticias CRUD + permisos (2/2 PASSED)
- 📝 **Documentación completa** de cambios y casos de prueba

Ver detalles completos en [CHANGELOG_MAR_2026.md](docs/CHANGELOG_MAR_2026.md)

## Ejecucion
### Backend
cd backend && pip install -r requirements.txt
python run.py

### Frontend (en otra terminal)
cd frontend && npm install
npm run dev