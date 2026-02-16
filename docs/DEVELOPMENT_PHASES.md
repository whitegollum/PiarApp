# 🚀 Fases de Desarrollo - PIARAPP

Este documento rastrea el progreso histórico y futuro del desarrollo de la plataforma PIARAPP.

---

## 📊 Resumen de Progreso
| Fase | Nombre | Estado | Fecha Aprox. |
|------|--------|--------|--------------|
| 1-6 | MVP Core (Auth, Clubes, Miembros) | ✅ Completado | Q4 2023 |
| 7 | Perfiles y Gestión Avanzada | ✅ Completado | Q1 2024 |
| 8 | Noticias y Eventos (CRUD + Asistencia API) | ✅ Completado | Feb 2026 |
| 8.1 | Setup Inicial y Comentarios | ✅ Completado | Feb 2026 |
| 9 | Módulos de Club + Social + OAuth UI | ⏳ Pendiente | TBD |
| 10 | Testing y QA | ⏳ Pendiente | TBD |
| 11 | Despliegue y DevOps | ⏳ Pendiente | TBD |
| 12+ | Backlog Futuro (Ideas) | 💡 Ideas | TBD |

---

## ✅ Fases Completadas

### Phase 1-6: MVP Core
**Objetivo:** Establecer la base del sistema, autenticación y gestión básica de clubes.
- [x] Configuración inicial del proyecto (FastAPI + React/Vite).
- [x] **Autenticación (Backend)**: Login, Registro, Refresh Tokens, endpoint `POST /api/auth/google-login`.
- [x] **Sistema de Invitaciones (Fase 2)**: Flujo de invitación por email y aceptación para usuarios nuevos/existentes.
- [x] Base de datos SQLite y modelos SQLAlchemy.
- [x] Gestión de Usuarios (Modelos, Endpoints).
- [x] Gestión de Clubes (Crear, Listar, Ver Detalle).
- [x] Dashboard principal.


### Phase 7: Administración y Perfiles
**Objetivo:** Refinar la experiencia de usuario y potenciar la gestión de miembros.
- [x] **Gestión de Miembros (Frontend):** UI para listar, cambiar roles y expulsar miembros (`ClubMembers.tsx`).
- [x] **Perfil de Usuario:** Visualización y edición de datos personales (`Profile.tsx`).
- [x] **Configuración:** Preferencias de usuario (`Settings.tsx`).
- [x] PWA Manifest básico.
- [x] Mejoras de navegación y responsive design.

### Phase 8: Noticias y Eventos
**Objetivo:** Permitir a los clubes publicar contenido dinámico y gestionar actividades.
#### Backend
- [x] **Modelos:** Creación de tablas `Noticia` y `Evento` con relaciones a Club y Usuario.
- [x] **Schemas:** Definición de Pydantic models para validación de entrada/salida.
- [x] **API Endpoints:** Rutas CRUD completas `/api/clubes/{club_id}/noticias` y `/api/clubes/{club_id}/eventos`.
- [x] **Asistencia (RSVP):** Endpoints implementados para inscripción/cancelación/consulta.
    - `POST /api/clubes/{club_id}/eventos/{evento_id}/asistencia`
    - `GET /api/clubes/{club_id}/eventos/{evento_id}/asistencia`
    - `GET /api/clubes/{club_id}/eventos/{evento_id}/mi-asistencia`

### Phase 8.1: Setup Inicial y Mejoras de UX
**Objetivo:** Mejorar la experiencia de despliegue y la interacción social.
- [x] **Setup Inicial:** Pantalla de bienvenida automática para crear el primer Super Administrador.
    - Detección automática de base de datos vacía.
    - Creación segura del primer usuario.
- [x] **Comentarios:** Sistema de comentarios en noticias.
    - Backend: Modelo `Comentario`, Endpoints CRUD.
    - Frontend: Componente `CommentsSection`.
- [x] **Contraseña de Instalaciones:** Gestión segura de acceso físico.
    - Incluye control de aforo y movimiento a `lista_espera` cuando aplica.
- [x] **Seguridad:** Permisos diferenciados (Admin crea/edita, Miembros ven).

#### Frontend
- [x] **Servicios:** Integración de `NewsService` y `EventService` en `contentService.ts`.
- [x] **UX Standards:** Creación de `frontend/UX_STANDARDS.md` y unificación de estilos de formularios (`Forms.css`).
- [x] **Gestión de Noticias:** 
    - [x] Listado (`NewsList.tsx`) con tarjetas responsivas.
    - [x] Formularios de Creación y Edición (`CreateNews.tsx`, `EditNews.tsx`).
- [x] **Gestión de Eventos:** 
    - [x] Listado (`EventList.tsx`) con fechas y estados.
    - [x] Formularios de Creación y Edición (`CreateEvent.tsx`, `EditEvent.tsx`) con manejo de fechas.
- [x] **Pruebas:** Actualización de casos de prueba funcional (`TESTING_PLAN.md`).

---

## 🚧 Fases Pendientes (Roadmap)

### Phase 9: Interacción Social y Seguridad Extendida
**Objetivo:** Fomentar la participación de los miembros y facilitar el acceso.
- [x] **Inscripción a Eventos (RSVP) - UI + Integración:**
    - [x] Frontend: botón "Inscribirme" / "Cancelar" y lectura de estado (usa endpoints `/api/clubes/{club_id}/eventos/{evento_id}/asistencia`).
    - [x] Frontend: mostrar asistentes (inscritos + lista_espera) donde aplique.
    - [x] UX: estados de carga/errores y manejo de 404 en "mi-asistencia".
- [x] **Comentarios:**
    - [x] Modelos de BD para Comentarios en Noticias.
    - [x] Endpoints CRUD para comentarios.
    - [x] UI: Componente de sección de comentarios.

- [ ] **Socios + Documentación Reglamentaria (MVP funcional pendiente):**
    - [ ] Backend: completar rutas de `socios` (actualmente stub) y modelo/servicios asociados.
    - [ ] Backend: endpoints de foto de carnet (subida/descarga) + validaciones.
    - [ ] Backend: declaración de seguro RC y carnet de piloto (persistencia + auditoría).
    - [ ] Backend: sección de ayuda (documentación/guías) más allá del placeholder.
    - [ ] Frontend: pantallas de socio (perfil ampliado, foto de carnet, documentación).

- [x] **Contraseña de Instalaciones:**
    - [x] Backend: `GET/POST` de contraseña + historial y auditoría.
    - [x] Frontend: vista para socios activos + panel admin para cambios.

- [ ] **Tienda + Ingresos (Afiliación):**
    - [ ] Backend: productos e ingresos (routes existen pero están stub).
    - [ ] Frontend: catálogo básico de productos + panel admin de ingresos.

- [ ] **Google OAuth (UI + Producción):**
    - [ ] Frontend: implementar flujo en `Login.tsx` y `Register.tsx` (ahora es placeholder).
    - [ ] Configuración de credenciales de producción + validaciones de vinculación/desvinculación.

- [ ] **Personalización de club (UI + API):**
    - [ ] Backend: endpoints de personalización (logo/colores/tema) si se mantienen como requisito.
    - [ ] Frontend: UI para gestionar personalización y aplicar tema por club.

- [ ] **PWA Offline (incremental):**
    - [ ] Caché de noticias/eventos/perfil para lectura offline (hoy solo PWA básico).
    - [ ] IndexedDB para almacenamiento local y estrategia de sincronización.
    - [ ] Mejor UX offline (pantalla offline/indicadores) y pull-to-refresh.
    - [ ] Actualización de versión con aviso “Nueva versión disponible”.

### Phase 10: Calidad y Pruebas
**Objetivo:** Asegurar la robustez del código antes de desplegar.
- [ ] **Backend Testing:** Pytest para servicios y rutas críticas.
- [ ] **Frontend Testing:** Jest/Vitest para componentes React.
- [ ] **E2E Testing:** Cypress o Playwright para flujos críticos (Auth, Creación de Club).
- [ ] **Refactorización:** Limpieza de deuda técnica.

### Phase 11: Despliegue y DevOps
**Objetivo:** Llevar la aplicación a un entorno productivo.
- [x] **Docker:** Dockerfile para Backend y Frontend.
- [x] **Orquestación:** Docker Compose para desarrollo local y producción.
- [ ] **Base de Datos:** Migración a PostgreSQL.
- [ ] **CI/CD:** Pipelines de GitHub Actions (Lint, Test, Build).
- [ ] **Hosting:** Despliegue en proveedor Cloud (AWS/Render/Railway).

### Phase 12+: Características Futuras (Ideas)
- [ ] **Galería Multimedia:** Subida real de imágenes (S3/Azure Blob).
- [ ] **Chat en Tiempo Real:** Websockets para chat de club.
- [ ] **Pagos:** Integración con Stripe para cuotas de socios.
- [ ] **Notificaciones Push:** Firebase Cloud Messaging.

#### Backlog adicional (desde notas antiguas)
- [ ] **Notificaciones por email (no solo invitaciones/reset):** avisos de eventos, noticias, juntas.
- [ ] **Exportación de datos:** socios, eventos, asistencia, votaciones.
- [ ] **Dashboard de estadísticas:** actividad del club, participación, asistencia.
- [ ] **QR para eventos:** generación y escaneo (check-in).
- [ ] **Modo oscuro + tema por club:** respetar preferencia del SO.
- [ ] **Deep linking:** URLs compartibles de noticias/eventos.
- [ ] **Búsqueda avanzada/full-text (y opcional offline):** contenidos del club.
- [ ] **Integración calendario del sistema (iCal/sync):** futuro.


---
**Documento Vivo** - Actualizar al completar cada hito.
