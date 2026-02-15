# PiarAPP - Sistema de Gestion de Clubes de Aeromodelismo

MVP (Gestion de clubes de aeromodelismo) - Version 0.9.0
Estado: En Desarrollo

Plataforma web para la gestion de clubes de aeromodelismo con autenticacion segura, multitenancy y gestion de membresias.


## El nombre
PiarApp es la aplicación de la Asociación Cerdos Voladores para gestionar su propio campo de vuelo. El nombre lo resume bien: si no te convence, quizá tienes alma de cerdo; y si te encanta, entonces eres un cerdo… que además vuela.



## Características principales

### Autenticación y seguridad
- Registro/login por **email + contraseña**.
- Autenticación con **JWT + refresh token**.
- Contraseñas almacenadas con **bcrypt**.
- Invitaciones por email con **token** de acceso.
- Protección de rutas y acciones por autenticación.
- **RBAC** activo para control de permisos por rol.
- Google OAuth 2.0: **integración en curso** (no cerrar como completado hasta validación end-to-end).

### Gestión de clubes y membresía
- Creación, consulta y edición de clubes.
- Gestión de miembros por club.
- Sistema de invitaciones a club (usuario existente o nuevo).
- Roles actuales: **Superadministrador, Admin y Miembro**.
- Página dedicada para edición/configuración del club.

### Perfil y cuenta de usuario
- Visualización y edición de datos personales.
- Cambio de contraseña.
- Preferencias de usuario persistentes.
- Descarga/exportación de datos personales (**GDPR**).

### Noticias del club
- CRUD completo de noticias con permisos.
- Listado y detalle de noticias.
- Edición restringida a usuarios con permisos de administración.
- Comentarios en noticias: **pendiente/en progreso** (si todavía no está en producción).

### Eventos del club
- CRUD completo de eventos con permisos.
- Listado y detalle de eventos.
- Inscripción a eventos (**RSVP**).
- Control de aforo.
- Gestión de asistentes.
- Lista de espera: marcar como “disponible” solo si ya está implementada en producción; en caso contrario, dejarla como pendiente.

### Estado técnico y despliegue
- Testing automatizado completo (pytest, React tests, E2E): **pendiente/en progreso**.
- Pipeline de deployment (Docker + CI/CD): **pendiente/en progreso**.

### Capacidades previstas (no cerradas)
- Votaciones del club (fase posterior).
- Gestión avanzada de socios (fase posterior).
- Integración Google OAuth completa (frontend + flujo completo) en cierre de fase actual.









## Fases del proyecto

## Fase 1: MVP

### ✅ Completado (capacidades funcionales)

- **Acceso y autenticación de usuarios**
  - Registro e inicio de sesión.
  - Autenticación con **JWT** y **refresh token**.
  - Gestión de perfil con edición de datos y cambio de contraseña.
  - Persistencia de preferencias de usuario.

- **Gestión de clubes y miembros**
  - Creación y administración de clubes.
  - Gestión de miembros por club.
  - Sistema de invitaciones para incorporación de usuarios.
  - Página específica de edición y gestión del club.

- **Roles y permisos**
  - Roles de **Superadministrador**, **Admin** y **Miembro**.
  - **RBAC** aplicado para proteger rutas y acciones de edición.

- **Noticias**
  - Publicación y administración completa (alta, edición, eliminación y consulta).
  - Visualización en listado y detalle.
  - Edición restringida a usuarios con permisos de administración.

- **Eventos**
  - Gestión completa de eventos (alta, edición, eliminación y consulta).
  - Visualización en listado y detalle.
  - Sistema **RSVP** con control de aforo e inscripciones.

- **Cumplimiento y privacidad**
  - Descarga de datos personales del usuario (**GDPR**).

### 🚧 En progreso / pendiente

- Integración final de **Google OAuth**.
- Sistema de **comentarios** en noticias y eventos.
- **Testing** (pytest, tests de React, E2E).
- **Deployment** (Docker, CI/CD).









## Fase 2: Post-MVP — consolidación operativa y escalado

- **Seguridad y cumplimiento (prioridad alta)**
  - Confirmación de email obligatoria en cuentas locales.
  - Endurecimiento del flujo OAuth Google:
    - Vincular y desvincular cuenta Google.
    - Prevención de cuentas duplicadas (email local + Google).
  - Auditoría reforzada:
    - Registro de acceso a datos sensibles (p. ej., visualización de contraseña de instalaciones).
    - Registro de cambios críticos (quién, cuándo, IP y motivo).
  - Refuerzo RGPD:
    - Derecho al olvido por club (tenant-aware).
    - Minimización de datos en tracking de afiliación.

- **Gobierno funcional del club**
  - Flujo completo de membresías:
    - Estados: activo, pendiente y suspendido.
    - Invitaciones con caducidad, reenvío y trazabilidad.
  - Reglas automáticas de elegibilidad:
    - Bloqueo de inscripción a eventos por documentación vencida.
    - Alertas de vencimiento (30 días).
  - Política de contraseña de instalaciones:
    - Cifrado fuerte.
    - Retención limitada del histórico (últimas 3).
    - Doble confirmación para cambios sensibles.

- **Base PWA robusta**
  - Instalación PWA completa (manifest + service worker) y modo standalone.
  - Offline funcional mínimo:
    - Noticias, eventos y perfil cacheados.
    - Formularios en cola con sincronización.
  - Estrategia de caché formal:
    - Cache-first para assets.
    - Network-first para APIs.
    - Versionado y limpieza de caché.
  - Gestión de actualizaciones:
    - Detección de nueva versión.
    - Prompt de actualización al usuario.

- **Operación y calidad de plataforma**
  - CI/CD mínimo de producción:
    - Lint, test unitario, test E2E smoke, build y despliegue.
  - Observabilidad:
    - Logging estructurado.
    - Métricas básicas.
    - Alertas de error.
  - Backups y recuperación:
    - Política de backup/restauración.
    - Prueba periódica de recuperación.
  - Hardening de archivos:
    - Validación fuerte de uploads (foto carnet).
    - Thumbnails seguros.
    - Almacenamiento protegido.






## Fase 3: Expansión funcional de participación y gobierno

- **Sistema de votaciones completo**
  - Creación de votaciones (simple/múltiple), fechas de apertura/cierre y visibilidad.
  - Restricciones: un voto por socio activo y reglas de anonimato.
  - Resultados en tiempo real (configurable) y cierre anticipado por admin.
  - Exportación de resultados y trazabilidad del proceso.

- **Comentarios y moderación**
  - Comentarios en noticias y eventos.
  - Moderación por roles (admin/moderador).
  - Reporte, ocultación y eliminación de contenido.
  - Notificaciones por respuesta/mención.

- **Búsqueda avanzada**
  - Búsqueda full-text en noticias, eventos, socios y documentos.
  - Filtros por club, categoría, estado y fechas.
  - Ordenación por relevancia/recencia.
  - Búsqueda offline básica en contenidos cacheados.

- **Asistencia y reportes de eventos**
  - Gestión de inscritos, lista de espera y validación de requisitos.
  - Confirmación/rechazo de solicitudes (si aplica moderación).
  - Registro de asistencia real y no-shows.
  - Reportes por evento: participación, ocupación, asistencia y cancelaciones.

- **Juntas del club (núcleo)**
  - Convocatoria con orden del día y documentación adjunta.
  - Confirmación de asistencia (RSVP).
  - Votación por mociones con quórum/mayorías configurables.
  - Generación de acta (editable), publicación y consulta del histórico.



## Fase 4: Comunicación multicanal, analítica avanzada e integraciones

- **Notificaciones multicanal**
  - Notificaciones por email para eventos, votaciones, cambios críticos y recordatorios.
  - Push notifications web/móvil (PWA), con gestión de permisos y preferencias.
  - Centro de notificaciones con estado leído/no leído.

- **Estadísticas y cuadros de mando avanzados**
  - KPIs de membresía (altas/bajas/retención), actividad y participación.
  - KPIs de contenido (noticias), eventos (aforo/asistencia) y votaciones.
  - Métricas por club y comparativas temporales.
  - Exportación de informes (CSV/PDF).

- **QR e identidad operativa**
  - QR para check-in en eventos.
  - QR de validación de socio/carnet interno del club.
  - Registro auditable de escaneos y accesos.

- **Integraciones externas**
  - Calendarios (iCal/Google Calendar/Outlook) para eventos y juntas.
  - Redes sociales para difusión de noticias/eventos (publicación controlada).
  - Webhooks/API para automatizaciones con sistemas de terceros.
  - Integración de almacenamiento documental (actas, convocatorias, anexos).

- **Optimización UX y rendimiento**
  - Mejoras de rendimiento en dispositivos antiguos.
  - Estrategias de compresión y lazy loading.
  - Deep links para compartir noticias/eventos.
  - Iteración de UX basada en métricas reales de uso.












## Instalacion rapida

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

pip install -r requirements.txt
python run.py
```

Backend en: http://localhost:8000

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend en: http://localhost:5173












## Estructura del proyecto

```
piarApp/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── requirements.txt
│   └── run.py
│   └── migrations/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── services/
│   │   └── styles/
│   ├── package.json
│   └── vite.config.ts
│   └── .env
├── PRUEBAS_FUNCIONALES.md
├── PHASE_7_STATUS.md
└── REQUISITOS_TÉCNICOS.md
```












## Stack tecnologico

### Backend
```
FastAPI 0.104.1
SQLAlchemy 2.0.23
Pydantic 2.5.0
bcrypt 4.1.1
python-jose 3.3.0
PyJWT 2.11.0
python-multipart
```

### Frontend
```
React 18.2.0
TypeScript 5.3.3
React Router 6.20.1
Vite 5.4.21
Fetch API (via APIService)
```

### Database
```
SQLite (desarrollo)
PostgreSQL (produccion)
```
















## API endpoints (principales)

Base URL: /api

### Autenticacion
```
POST   /auth/login
POST   /auth/registro
POST   /auth/registrarse-desde-invitacion
POST   /auth/google-login
POST   /auth/refresh-token
GET    /auth/usuarios/me
PUT    /auth/usuarios/me
GET    /auth/usuarios/me/export
POST   /auth/usuarios/cambiar-contraseña
```

### Clubes
```
POST   /clubes
GET    /clubes
GET    /clubes/{id}
PUT    /clubes/{id}
DELETE /clubes/{id}
GET    /clubes/{id}/miembros
POST   /clubes/{id}/miembros/invitar
GET    /clubes/{id}/miembros/invitaciones
PUT    /clubes/{id}/miembros/{usuario}/rol
DELETE /clubes/{id}/miembros/{usuario}
```

### Noticias
```
POST   /clubes/{id}/noticias
GET    /clubes/{id}/noticias
GET    /noticias/{id}
PUT    /noticias/{id}
DELETE /noticias/{id}
```

### Eventos
```
POST   /clubes/{id}/eventos
GET    /clubes/{id}/eventos
GET    /eventos/{id}
PUT    /eventos/{id}
DELETE /eventos/{id}
```

















## Seguridad implementada

| Aspecto | Implementacion |
|--------|----------------|
| Contrasenas | bcrypt + salt automatico |
| Access token | JWT 15 minutos |
| Refresh token | JWT 7 dias |
| Almacenamiento | localStorage (frontend) |
| CORS | Configurado para localhost y IP LAN |
| Invitaciones | Tokens criptograficos unicos |
| Roles | Administrador / Miembro |











## Documentacion adicional

- [PHASE_7_STATUS.md](PHASE_7_STATUS.md)
- [CARACTERÍSTICAS_FUNCIONALES.md](CARACTERÍSTICAS_FUNCIONALES.md)
- [REQUISITOS_TÉCNICOS.md](REQUISITOS_TÉCNICOS.md)
- [PRUEBAS_FUNCIONALES.md](PRUEBAS_FUNCIONALES.md)












## Links utiles

| Link | URL |
|------|-----|
| Frontend dev | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| API Docs (ReDoc) | http://localhost:8000/redoc |
| OpenAPI Spec | http://localhost:8000/openapi.json |



















## Licencia

Licensed under the MIT License - ver archivo LICENSE para detalles.

Desarrollado por el equipo PiarAPP

