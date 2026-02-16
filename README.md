# PiarAPP - Sistema de Gestion de Clubes de Aeromodelismo

Plataforma web para la gestion de clubes de aeromodelismo con foco en membresias, contenido y operacion diaria del club.

## Que es
PiarApp es la aplicacion de la Asociacion Cerdos Voladores para gestionar su campo de vuelo. El nombre lo resume bien: si no te convence, quizas tienes alma de cerdo; y si te encanta, entonces eres un cerdo que ademas vuela.

## Capacidades clave
- Gestion de clubes, miembros e invitaciones con roles.
- Perfil de usuario y cuenta personal con descarga de datos.
- Noticias del club con publicacion y edicion controlada por permisos.
- Eventos con inscripcion (RSVP), aforo y gestion de asistentes.
- Control de acceso por rol para proteger acciones sensibles.

## Documentacion
- Vision, estado y bases del proyecto: [DOCUMENTATION.md](docs/DOCUMENTATION.md)
- Especificacion funcional detallada: [FUNCTIONAL_SPECS.md](docs/FUNCTIONAL_SPECS.md)
- Requisitos tecnicos y arquitectura: [TECHNICAL_REQUIREMENTS.md](docs/TECHNICAL_REQUIREMENTS.md)
- Estandares de UX/UI: [frontend/UX_STANDARDS.md](frontend/UX_STANDARDS.md)
- Plan de pruebas: [TESTING_PLAN.md](docs/TESTING_PLAN.md)
- Roadmap e historial de fases: [DEVELOPMENT_PHASES.md](docs/DEVELOPMENT_PHASES.md)
- Guía de despliegue y Docker: [DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Ejecucion
### Backend
cd backend && pip install -r requirements.txt
python run.py

### Frontend (en otra terminal)
cd frontend && npm install
npm run dev