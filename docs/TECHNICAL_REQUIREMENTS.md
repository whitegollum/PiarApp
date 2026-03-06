# Requisitos Técnicos - Sistema de Gestión de Clubs de Aeromodelismo

## 1. Stack Tecnológico

### Lenguaje de Programación
- **Lenguaje Principal**: Python 3.10+
- **Justificación**: Desarrollo rápido, excelentes frameworks web, buena comunidad

### Backend
- **Framework**: FastAPI (✅)
  - **FastAPI**: Más moderno, mejor rendimiento, validación automática con Pydantic
  - **Nota**: Flask queda descartado en este repo (la API actual es FastAPI).
- **ASGI Server**: Uvicorn (para FastAPI) o Gunicorn (para Flask)

### Frontend (PWA - Progressive Web App)
- **Arquitectura**: Progressive Web App (PWA) con capacidades de aplicación nativa
- **Framework**: React 18+ con TypeScript
  - **React**: mejor ecosistema, más librerías, mejor rendimiento
- **Styling**: CSS Modules / Custom CSS (Diseño propio)
- **Estado Global**: React Context API
- **PWA Features**:
  - Service Worker para funcionamiento offline
  - Web App Manifest (install en home screen)
  - HTTPS obligatorio
  - Responsive design (móvil-first)
  - Cache-first strategy para assets estáticos
  - IndexedDB para almacenamiento local de datos
- **Herramientas**:
  - Build: Vite (mejor rendimiento que Create React App)
  - PWA: vite-plugin-pwa (integración service worker)
  - Testing: Vitest + React Testing Library
- **Nota**: API REST consumida desde PWA y futuros clientes móviles (iOS/Android)

### Base de Datos (Versión 1 - Ágil / Versión 2 - Definitiva)

#### Fase Actual - Backend Ágil (MVP)
- **Almacenamiento**: JSON Files / SQLite
- **ORM**: SQLAlchemy (flexible, preparado para migración)
- **Ventajas**:
  - Sin instalación de servidor DB
  - Rápido para desarrollo
  - Fácil de testear
  - Portabilidad

#### Fase 2 - Base de Datos Relacional
- **Opciones**:
  - PostgreSQL (recomendado - mejor para escalabilidad)
  - MySQL 8.0+
- **Razones**:
  - Mejor rendimiento con muchos datos
  - Escalabilidad
  - Seguridad mejorada
  - Transacciones ACID

### Other Components
- **Autenticación**: JWT (JSON Web Tokens) ou sesiones seguras
- **OAuth 2.0**: Google Login integrado
- **Hash de contraseñas**: Bcrypt o Argon2
- **Validación**: Pydantic (automático en FastAPI)
- **Logging**: Python logging module / Serilog
- **Testing**: Pytest para tests unitarios e integración
- **API Documentation**: Swagger/OpenAPI (automático en FastAPI)

### Integración IA (OpenClaw)

- **Protocolo**: WebSocket (Protocolo nativo de OpenClaw/Gateway).
- **Cliente**: `websockets` (Python async) para el backend proxy.
- **Arquitectura**:
  - **Frontend**: Conecta al backend de PiarApp vía HTTP (REST) para enviar mensajes (`POST /api/chat/openclaw`).
  - **Backend**: Actúa como proxy. Recibe el mensaje REST, mantiene una conexión WebSocket persistente o bajo demanda con el servidor OpenClaw, y devuelve la respuesta.
  - **Autenticación**: El backend se autentica contra OpenClaw usando `OPENCLAW_API_KEY` o `OPENCLAW_PASSWORD` (modo Gateway).
- **Configuración**:
  - `OPENCLAW_API_URL`: URL base del servicio de chat.
  - `OPENCLAW_AUTH_MODE`: `password` o `api_key`.
  - `OPENCLAW_PASSWORD` / `OPENCLAW_API_KEY`: Credenciales.

### Implementaciones relevantes (fases previas)

**Servicio de Email (backend) (✅)**
- Ubicación: `app/services/email_service.py`
- Funciones:
  - `enviar_invitacion_club(email, token, club_nombre)`: invitación para usuario existente (link a aceptar invitación)
  - `enviar_bienvenida_nuevo_usuario(email, nombre, club_nombre, token)`: invitación + registro
  - `enviar_verificacion_email(email, token)`: verificación de email
  - `enviar_reset_contrasena(email, token)`: reset de contraseña
- Características:
  - Plantillas HTML (MIME multipart) y envío SMTP opcional con TLS
  - Async: el envío SMTP se ejecuta en executor para no bloquear requests
  - Desarrollo: si `SMTP_SERVER` está vacío, escribe logs en consola y continúa
- Nota de alineación Frontend/URLs:
  - El servicio genera enlaces a rutas tipo `/auth/registrarse-desde-invitacion`, `/auth/verificar-email`, `/auth/reset-contrasena`.
  - En el frontend actual están implementadas `/auth/login`, `/auth/registro` y `/auth/aceptar-invitacion` (las demás rutas requieren implementación si se quieren usar los enlaces tal cual).

**Configuración (backend) (✅)**
- Ubicación: `app/config.py`
- Variables relevantes:
  - SMTP: `SMTP_SERVER`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SENDER`, `SMTP_SENDER_NAME`, `SMTP_USE_TLS`
  - Invitaciones: `INVITATION_TOKEN_EXPIRY_DAYS`
  - Frontend: `FRONTEND_URL`
  - Instancia global: `settings` (Pydantic Settings)
  - Nota: estos valores se usan como fallback si no hay configuracion SMTP persistente en `system_config`.

**Configuración SMTP Administrable (✅)**
- Tabla: `system_config` (modelo `SystemConfig`)
- Uso: configuración SMTP persistente definida por superadmin desde UI
- Campo adicional: `frontend_url` para generar links correctos en emails
- Endpoints:
  - `GET /api/admin/config/email`
  - `PUT /api/admin/config/email`
  - `POST /api/admin/config/test-email`
- El servicio de email utiliza estos valores si existen; en desarrollo hace log si no hay servidor configurado.

**Schemas Pydantic (backend) (✅)**
- `app/schemas/club.py`: `ClubCreate`, `ClubUpdate`, `ClubResponse`, `MiembroClubResponse`, `InvitacionClubResponse`
- `app/schemas/usuario.py`: `UsuarioResponse`, `UsuarioDetalleResponse`
- `app/schemas/noticia.py`: `NoticiaCreate`, `NoticiaUpdate`, `NoticiaResponse`
- `app/schemas/evento.py`: `EventoCreate`, `EventoUpdate`, `EventoResponse`

**Auth Utilities (backend) (✅)**
- Ubicación: `app/utils/security.py`
- Incluye hash/verify de password (bcrypt) y helpers JWT (access/refresh) + generación de tokens de invitación con `secrets`.

**Frontend - Autenticación (parcial ✅ / ⏳)**
- Páginas implementadas:
  - `/auth/login`: login con email/password + UI (show/hide password) + Google OAuth stub
  - `/auth/registro`: registro con validación mínima (>= 8 chars + confirmación) + Google OAuth stub
  - `/auth/aceptar-invitacion`: alta desde invitación (usa `POST /api/auth/registrarse-desde-invitacion`)
- Infraestructura:
  - `AuthContext`: estado global, persistencia en localStorage y refresh automático vía `APIService`
  - `ProtectedRoute`: protege rutas y deja soporte de roles preparado
  - `APIService`: cliente HTTP centralizado con `skipAuth` y auto-refresh en 401
- Pendiente (si se quiere completar el flujo end-to-end): rutas UI para verificación de email y recuperación/reset de contraseña.

**Frontend - Rutas SPA disponibles (Phase 7 / estado actual)**

Públicas (sin login):
- `/auth/login`
- `/auth/registro`
- `/auth/aceptar-invitacion`

Protegidas (con login):
- `/` (Dashboard)
- `/clubes/crear`
- `/clubes/:clubId` (Detalle)
- `/clubes/:clubId/editar`
- `/clubes/:clubId/miembros`
- `/clubes/:clubId/noticias`
- `/clubes/:clubId/noticias/crear`
- `/clubes/:clubId/noticias/:noticiaId/editar`
- `/clubes/:clubId/eventos`
- `/clubes/:clubId/eventos/crear`
- `/clubes/:clubId/eventos/:eventoId/editar`
- `/perfil`
- `/configuracion`
- `/admin/clubes`
- `/admin`
- `/admin/email`

## 3. Especificación de API (Implementada)

### Autenticación (`app/routes/auth.py`)
- **POST /api/auth/login**: Login con email/contraseña. Retorna access_token y refresh_token.
- **POST /api/auth/registro**: Registro de nuevo usuario. Valida email único.
- **POST /api/auth/registrarse-desde-invitacion**: Registro validando token de invitación y agregando al club.
- **POST /api/auth/google-login**: Login con Google OAuth (token de acceso a userinfo).
- **POST /api/auth/google-oauth**: Login con Google OAuth usando code flow (backend intercambia `code` por tokens).
- **POST /api/auth/refresh-token**: Generar nuevo access_token usando refresh_token (validez 7 días).
- **POST /api/auth/logout**: Logout (en MVP se gestiona eliminando tokens en frontend).
- **GET /api/auth/invitaciones/pendientes**: Ver invitaciones pendientes del usuario.
- **GET /api/auth/invitaciones/{token}**: Obtener datos de invitación para pantalla pública.
- **POST /api/auth/invitaciones/aceptar/{token}**: Aceptar invitación y crear membresía.
- **GET /api/auth/usuarios/me**: Datos del usuario actual.
- **PUT /api/auth/usuarios/me**: Actualizar perfil.
- **GET /api/auth/usuarios/me/export**: Exportar datos personales del usuario (base para RGPD).
- **POST /api/auth/usuarios/cambiar-contraseña**: Cambio de credenciales.

### Convenciones de Autenticación (implementado)
- **Campo de password normalizado**: los requests de auth usan `password` (no `contraseña`) en JSON.
  - Se acepta vía Pydantic con `populate_by_name=True` para evitar inconsistencias de naming.
- **Cliente HTTP centralizado en frontend**: `APIService` encapsula `Authorization: Bearer <access_token>`, `skipAuth` para endpoints públicos y auto-refresh en 401.
- **OAuth Code Flow**: requiere `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REDIRECT_URI` configurados en backend.
- **Frontend OAuth**: requiere `VITE_GOOGLE_CLIENT_ID` y `VITE_GOOGLE_REDIRECT_URI` para iniciar el flujo desde Login/Registro.

### Gestión de Clubes (`app/routes/clubes.py`)
- **POST /api/clubes**: Crear nuevo club (usuario se hace admin).
- **GET /api/clubes**: Listar clubes donde el usuario es miembro activo.
- **GET /api/clubes/{club_id}**: Detalles del club (requiere ser miembro).
- **PUT /api/clubes/{club_id}**: Actualizar club (solo admin).
  - Campo adicional: `ayuda_documentacion_md` (Markdown con ayuda por club).
- **GET /api/clubes/{club_id}/miembros**: Listar miembros activos.
  - Query opcional: `include_inactivos=true` (solo admins; otros usuarios siguen viendo solo activos).
- **POST /api/clubes/{club_id}/miembros/invitar**: Invitar miembro por email (solo admin).
- **PUT /api/clubes/{club_id}/miembros/{usuario_id}/estado**: Cambiar estado de miembro (`activo` | `inactivo`) (solo admin).
- **DELETE /api/clubes/{club_id}/miembros/{usuario_id}**: Eliminar miembro del club (solo admin).

### Administracion (Superadmin)
- **GET /api/admin/config/email**: Obtener configuracion SMTP.
- **PUT /api/admin/config/email**: Actualizar configuracion SMTP.
- **POST /api/admin/config/test-email**: Enviar email de prueba.

### Noticias y Eventos
- **Noticias (`app/routes/noticias.py`)**: CRUD completo. Admin crea/edita/borra. Miembros leen.
- **Eventos (`app/routes/eventos.py`)**: CRUD completo. Admin gestión.

## 4. Flujos Clave del Sistema

### Login Estándar
1. **Frontend**: Usuario introduce Email + Contraseña.
2. **API**: `POST /api/auth/login`. backend valida hash.
3. **Respuesta**: Retorna tokens JWT (Access + Refresh).
4. **Cliente**: Almacena en localStorage/Context y redirige.

### URLs de Desarrollo (referencia)
| Servicio | Puerto | URL |
|---|---:|---|
| Backend (FastAPI) | 8000 | http://localhost:8000/api |
| Docs API (Swagger) | 8000 | http://localhost:8000/docs |
| Docs API (ReDoc) | 8000 | http://localhost:8000/redoc |
| OpenAPI JSON | 8000 | http://localhost:8000/openapi.json |
| Frontend (Vite) | 5173 (por defecto) | http://localhost:5173 |

Notas:
- Si el puerto 5173 está ocupado, Vite puede levantar en 5174/5175 (CORS ya permite 5173/5174/5175).

### Verificación rápida de Autenticación (curl)

Login:
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@email.com",
    "password": "password123"
  }'
```

Registro:
```bash
curl -X POST http://localhost:8000/api/auth/registro \
  -H "Content-Type: application/json" \
  -d '{
    "nombre_completo": "Test User",
    "email": "test@email.com",
    "password": "password123"
  }'
```

### Aceptar Invitación (Usuario Nuevo)
1. **Email**: Usuario recibe enlace con token.
2. **Frontend**: Página `AcceptInvitation` captura token.
3. **Usuario**: Completa formulario de registro.
4. **API**: `POST /api/auth/registrarse-desde-invitacion`.
5. **Backend**: Valida token, crea usuario, crea membresía club.
6. **Resultado**: Usuario logueado y miembro del club en un paso.

---

## 5. Arquitectura de la Aplicación


### Estructura de Carpetas - Sistema Recomendado

```
piarApp/
├── docs/                   # Documentación del proyecto
│   ├── DEPLOYMENT.md
│   ├── DEVELOPMENT_PHASES.md
│   ├── DOCUMENTATION.md
│   ├── FUNCTIONAL_SPECS.md
│   ├── TECHNICAL_REQUIREMENTS.md
│   └── TESTING_PLAN.md
├── backend/
│   ├── data/               # Datos persistentes (SQLite)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # Punto de entrada
│   │   ├── config.py               # Configuración
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── usuario.py          # Modelo Usuario global
│   │   │   ├── club.py             # Modelo Club
│   │   │   ├── miembro_club.py     # Modelo relación Usuario-Club
│   │   │   ├── invitacion.py       # Modelo Invitación a Club
│   │   │   ├── socio.py            # Modelo Socio (específico por club)
│   │   │   ├── noticia.py          # Modelo Noticia
│   │   │   ├── votacion.py         # Modelo Votación
│   │   │   ├── contraseña_instalaciones.py  # Contraseña de acceso
│   │   │   ├── documentacion_reglamentaria.py # Documentación de carnet y seguro
│   │   │   ├── evento.py           # Modelo Evento
│   │   │   ├── participante_evento.py # Participantes en eventos
│   │   │   └── producto.py         # Modelo Producto
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── socio_schema.py     # Validación de Socio
│   │   │   ├── noticia_schema.py   # Validación de Noticia
│   │   │   └── votacion_schema.py  # Validación de Votación
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py             # Rutas de autenticación (local, Google, invitaciones)
│   │   │   ├── clubes.py           # Rutas de gestión de clubes
│   │   │   ├── invitaciones.py     # Rutas de invitaciones a clubes
│   │   │   ├── socios.py           # Rutas de socios (incluye foto)
│   │   │   ├── noticias.py         # Rutas de noticias
│   │   │   ├── votaciones.py       # Rutas de votaciones
│   │   │   ├── usuarios.py         # Rutas de usuarios
│   │   │   ├── instalaciones.py    # Rutas de contraseña de instalaciones
│   │   │   ├── documentacion.py    # Rutas de declaración de documentación
│   │   │   ├── eventos.py          # Rutas de eventos
│   │   │   └── productos.py        # Rutas de tienda y productos
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py     # Lógica de autenticación (local y OAuth)
│   │   │   ├── google_oauth_service.py # Integración con Google OAuth
│   │   │   ├── invitacion_service.py # Lógica de invitaciones a clubes
│   │   │   ├── club_service.py     # Lógica de clubes
│   │   │   ├── socio_service.py    # Lógica de socios
│   │   │   ├── noticia_service.py  # Lógica de noticias
│   │   │   ├── votacion_service.py # Lógica de votaciones
│   │   │   ├── file_service.py     # Manejo de archivos (fotos)
│   │   │   ├── evento_service.py   # Lógica de eventos
│   │   │   └── producto_service.py # Lógica de productos
│   │   ├── database/
│   │   │   ├── __init__.py
│   │   │   └── db.py               # Configuración DB
│   │   └── middleware/
│   │       ├── __init__.py
│   │       └── auth_middleware.py  # Middleware de autenticación
│   ├── uploads/
│   │   └── carnet_photos/          # Carpeta para fotos de carnet
│   ├── tests/
│   │   ├── test_socios.py
│   │   ├── test_noticias.py
│   │   └── test_votaciones.py
│   ├── requirements.txt            # Dependencias Python
│   ├── .env.example                # Variables de entorno ejemplo
│   └── README.md
├── frontend/
│   ├── public/
│   │   ├── index.html              # Index HTML principal
│   │   ├── manifest.json           # PWA Manifest
│   │   ├── sw.js                   # Service Worker (generado)
│   │   ├── icons/
│   │   │   ├── icon-192x192.png
│   │   │   ├── icon-512x512.png
│   │   │   ├── icon-maskable.png
│   │   │   └── apple-touch-icon.png
│   │   ├── splash-screens/         # Splash screens para PWA
│   │   │   ├── splash-640x1136.png
│   │   │   └── splash-750x1334.png
│   │   └── robots.txt
│   ├── src/
│   │   ├── index.tsx               # Punto de entrada (React)
│   │   ├── App.tsx                 # Componente raíz
│   │   ├── App.css
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── RegisterForm.tsx
│   │   │   │   └── GoogleAuthButton.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── ... (otros componentes)
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── ClubList.tsx
│   │   │   ├── ClubDetail.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── ClubMembers.tsx
│   │   │   └── ... (otras rutas)
│   │   ├── services/
│   │   │   ├── api.ts              # Cliente API centralizado
│   │   │   └── ...
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx     # Estado global de autenticación
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── ...
│   │   ├── utils/
│   │   │   └── ...
│   │   ├── types/
│   │   │   └── ...
│   │   ├── styles/                 # Archivos CSS por componente
│   │   │   ├── Auth.css
│   │   │   ├── Dashboard.css
│   │   │   ├── Navbar.css
│   │   │   ├── Profile.css
│   │   │   ├── Settings.css
│   │   │   ├── ClubMembers.css
│   │   │   └── ...
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts              # Configuración Vite + PWA
│   ├── .env.example
│   └── README.md
├── docker-compose.yml              # Orquestación de contenedores
└── README.md
```

### Patrones de Diseño
- **MVC (Model-View-Controller)**: Para estructura clara
- **Repository Pattern**: Para acceso a datos (facilita migración a BD)
- **Service Layer**: Lógica de negocio separada
- **Dependency Injection**: Para testabilidad

---

## 3. Base de Datos - Diseño Preliminar

### Fase 1 - Ágil (SQLite / JSON)

**Tablas/Colecciones principales**:

#### Tablas Globales (para toda la plataforma)

```
USUARIOS
├── id (PK)
├── email (UNIQUE)
├── nombre_completo
├── contraseña (hash - nullable si solo OAuth)
├── foto_perfil_url
├── google_id (para Google OAuth)
├── google_email
├── google_photo_url
├── 2fa_habilitado (boolean)
├── 2fa_secret (encriptado)
├── email_verificado (boolean)
├── fecha_creación
├── último_login
└── activo (boolean)

CLUBES
├── id (PK)
├── nombre
├── slug (único - URL-safe identifier)
├── descripción
├── logo_url
├── color_primario (HEX - ej: #FF6B35)
├── color_secundario (HEX)
├── color_acento (HEX)
├── pais
├── region
├── latitud (float, nullable)
├── longitud (float, nullable)
├── email_contacto
├── teléfono
├── sitio_web
├── redes_sociales (JSON - facebook, instagram, etc.)
├── creador_id (FK a USUARIOS)
├── es_público (boolean)
├── requiere_aprobación (boolean)
├── permite_autoregistro (boolean)
├── zona_horaria
├── idioma_por_defecto
├── estado (activo/inactivo/suspendido)
├── fecha_creación
├── última_actualización
├── settings (JSON - configuración adicional)
└── favicon_url

MIEMBRO_CLUB
├── id (PK)
├── usuario_id (FK a USUARIOS)
├── club_id (FK a CLUBES)
├── rol (propietario/admin/editor/moderador/gestor_eventos/tesorero/socio/visitante)
├── estado (activo/pendiente/suspendido)
├── fecha_inscripción
├── fecha_aprobación
├── aprobado_por_id (FK a USUARIOS)
└── fecha_último_acceso

TOKEN_GOOGLE
├── id (PK)
├── usuario_id (FK a USUARIOS)
├── access_token (encriptado)
├── refresh_token (encriptado)
├── expires_at (timestamp)
├── scope
├── token_type
└── fecha_actualización

INVITACIONES
├── id (PK)
├── club_id (FK a CLUBES)
├── email (string - email invitado)
├── usuario_id (FK a USUARIOS - nullable si aún no se registra)
├── rol (socio/editor/moderador/admin)
├── token (string único - para validación de enlace de invitación)
├── estado (pendiente/aceptada/rechazada/expirada)
├── creado_por_id (FK a USUARIOS - quién hizo la invitación)
├── fecha_creación
├── fecha_vencimiento (30 días después de creación)
├── fecha_aceptación (null si aún no acepta)
└── nombre_completo (opcional - propuesto por admin)

### Tablas Específicas del Club

SOCIOS
├── id (PK)
├── club_id (FK a CLUBES - tenant isolation)
├── usuario_id (FK a USUARIOS)
├── nombre
├── email
├── teléfono
├── fecha_nacimiento
├── dirección
├── fecha_alta
├── estado (activo/inactivo)
├── especialidades (JSON array)
├── foto_carnet_path (URL/path a foto)
├── foto_carnet_fecha_subida (fecha)
````

NOTIFICACIONES
├── id (PK)
├── club_id (FK a CLUBES)
├── socio_id (FK a SOCIOS)
├── tipo (noticia/votación/comentario/evento/producto)
├── mensaje
├── leída (boolean)
└── fecha_creación

NOTICIAS
├── id (PK)
├── título
├── contenido
├── categoría
├── autor_id (FK a USUARIOS)
├── fecha_publicación
├── fecha_creación
├── estado (borrador/publicada/archivada)
├── imagen_url
├── visible_para (público/socios)
└── archivada_fecha

COMENTARIOS_NOTICIA
├── id (PK)
├── noticia_id (FK)
├── autor_id (FK a USUARIOS)
├── contenido
├── fecha_creación
└── moderado

VOTACIONES
├── id (PK)
├── título
├── descripción
├── tipo (simple/múltiple)
├── creador_id (FK a USUARIOS)
├── fecha_inicio
├── fecha_fin
├── estado (abierta/cerrada)
├── visible (true/false)
└── fecha_creación

OPCIONES_VOTACION
├── id (PK)
├── votacion_id (FK)
├── texto_opción
├── orden
└── votos_count

VOTOS
├── id (PK)
├── votacion_id (FK)
├── socio_id (FK)
├── opcion_id (FK)
└── fecha_voto

NOTIFICACIONES
├── id (PK)
├── club_id (FK a CLUBES)
├── socio_id (FK a SOCIOS)
├── tipo (noticia/votación/comentario/evento/producto)
├── mensaje
├── leída (boolean)
└── fecha_creación

AUDITORÍA
├── id (PK)
├── club_id (FK a CLUBES)
├── usuario_id (FK a USUARIOS)
├── acción
├── tabla_afectada
├── registro_id (ID del registro afectado)
├── valores_anteriores (JSON)
├── valores_nuevos (JSON)
├── fecha
└── ip_origen

CONTRASEÑA_INSTALACIONES
├── id (PK)
├── club_id (FK a CLUBES)
├── contraseña_actual (hash/encriptada)
├── fecha_cambio (timestamp)
├── administrador_id (FK a USUARIOS)
├── motivo_descripción (texto)
├── ip_administrador
├── activa (booleano)
└── fecha_próximo_cambio_programado (opcional)

HISTORIAL_CONTRASEÑA_INSTALACIONES
├── id (PK)
├── contraseña (hash/encriptada)
├── fecha_cambio
├── fecha_vencimiento (cuando dejó de ser válida)
├── administrador_id (FK)
└── detalles (JSON)

DOCUMENTACION_REGLAMENTARIA
├── id (PK)
├── usuario_id (FK a USUARIOS)
├── rc_numero
├── rc_fecha_emision
├── rc_fecha_vencimiento
├── rc_archivo (BLOB)
├── rc_archivo_nombre
├── rc_archivo_mime
├── carnet_numero
├── carnet_fecha_emision
├── carnet_fecha_vencimiento
├── carnet_archivo (BLOB)
├── carnet_archivo_nombre
├── carnet_archivo_mime
├── fecha_creacion
└── fecha_actualizacion

EVENTOS
├── id (PK)
├── nombre
├── descripción
├── tipo (volar_grupo/competición/formación/social/otro)
├── fecha_inicio
├── fecha_fin
├── hora_inicio
├── hora_fin
├── ubicación
├── imagen_url
├── requisitos (JSON - carnet_vigente, seguro, etc.)
├── aforo_máximo (integer, nullable)
├── contacto_responsable_id (FK a USUARIOS)
├── estado (no_iniciado/en_curso/finalizado/cancelado)
├── fecha_creación
├── permite_comentarios (boolean)
└── última_actualización

PARTICIPANTES_EVENTO
├── id (PK)
├── evento_id (FK a EVENTOS)
├── socio_id (FK a SOCIOS)
├── fecha_inscripción
├── estado (inscrito/confirmado/rechazado/asistió/no_asistió)
├── confirmado_por_admin (boolean)
├── presente (boolean)
└── observaciones

PRODUCTOS
├── id (PK)
├── nombre
├── descripción
├── imagen_url
├── plataforma (Amazon/AliExpress/otra)
├── codigo_referencia (string - el link afiliado)
├── precio_aproximado (decimal)
├── categoría (accesorios/repuestos/herramientas/otro)
├── por_que_recomendado (text)
├── estado (borrador/publicado/archivado)
├── creado_por_id (FK a USUARIOS)
├── fecha_creación
├── clicks_generados (counter)
├── última_actualización
└── activo (boolean)

INGRESOS_AFILIACION
├── id (PK)
├── producto_id (FK a PRODUCTOS)
├── plataforma (Amazon/AliExpress)
├── fecha_transacción
├── monto_ingreso (decimal)
├── referencia_transacción (string, opcional)
├── estado (registrado/confirmado/pagado)
└── notas (text, opcional)

ARCHIVOS_EVENTO
├── id (PK)
├── evento_id (FK a EVENTOS)
├── tipo (pdf/video/imagen/documento)
├── nombre_archivo
├── ruta_archivo
├── fecha_subida
└── subido_por_id (FK a USUARIOS)

JUNTAS
├── id (PK)
├── club_id (FK a CLUBES - tenant isolation)
├── titulo (string)
├── descripcion (text - orden del día)
├── convocatoria_archivo (ruta a PDF/documento)
├── fecha_programada (datetime)
├── ubicacion (string)
├── tipo (presencial/virtual/hibrida)
├── enlace_videoconferencia (URL, opcional)
├── quorum_minimo (integer - porcentaje)
├── mayoria_requerida (integer - porcentaje para aprobación)
├── plazo_minimo_convocatoria (integer - días)
├── estado (convocada/en_curso/finalizada/suspendida/cancelada)
├── fecha_cancelacion (timestamp, opcional)
├── motivo_cancelacion (text, opcional)
├── creada_por_id (FK a USUARIOS)
├── fecha_creacion (timestamp)
└── ultima_actualizacion (timestamp)

CONVOCATORIA_PENDIENTE
├── id (PK)
├── junta_id (FK a JUNTAS)
├── socio_id (FK a SOCIOS)
├── email_enviado (boolean)
├── confirmacion_asistencia (boolean, nullable)
├── fecha_confirmacion (timestamp, nullable)
└── notificacion_enviada (boolean)

ACTA_JUNTA
├── id (PK)
├── junta_id (FK a JUNTAS - única)
├── documento_path (ruta a PDF generado)
├── fecha_realizacion (timestamp)
├── asistentes_count (integer)
├── ausentes_justificados_count (integer)
├── ausentes_injustificados_count (integer)
├── quorum_alcanzado (boolean)
├── porcentaje_asistencia (decimal)
├── orden_del_dia_tratado (text)
├── decisiones (text)
├── proxima_junta_fecha (date, opcional)
├── estado (borrador/aprobada/archivada)
├── generada_por_id (FK a USUARIOS)
├── fecha_generacion (timestamp)
├── aprobada_en_junta_id (FK a JUNTAS, opcional - junta donde se aprobó el acta)
├── aprobada_por_id (FK a USUARIOS, opcional)
└── fecha_aprobacion (timestamp, opcional)

VOTACION_JUNTA
├── id (PK)
├── junta_id (FK a JUNTAS)
├── titulo (string)
├── descripcion (text)
├── tipo (si_no/multiple)
├── quorum_requerido (integer - número de votos)
├── mayoria_requerida (integer - porcentaje)
├── estado (abierta/cerrada)
├── anonima (boolean)
├── fecha_inicio (timestamp)
├── fecha_cierre (timestamp, nullable)
└── creada_por_id (FK a USUARIOS)

OPCIONES_VOTACION_JUNTA
├── id (PK)
├── votacion_junta_id (FK a VOTACION_JUNTA)
├── texto_opcion (string)
├── orden (integer)
└── votos_count (integer)

VOTOS_JUNTA
├── id (PK)
├── votacion_junta_id (FK)
├── socio_id (FK a SOCIOS)
├── opcion_id (FK a OPCIONES_VOTACION_JUNTA)
└── fecha_voto (timestamp)

DOCUMENTOS_JUNTA
├── id (PK)
├── junta_id (FK a JUNTAS)
├── tipo (convocatoria/acta/otro)
├── nombre_archivo
├── ruta_archivo
├── fecha_subida
├── descripcion (text, opcional)
└── subido_por_id (FK a USUARIOS)
```

### Fase 2 - Producción (PostgreSQL)
- Misma estructura relacional
- Índices en campos frecuentemente consultados
- Constraints más estrictos
- Vistas para reportes complejos
- Trigger para auditoría automática
- Función para calcular ingresos totales
- Vista para eventos próximos

---

## 3.5 Endpoints de API Principales (Referencia)

> Nota: esta sección combina endpoints **implementados hoy** y endpoints **planificados** (futuros). Para evitar confusiones, cada endpoint lleva un estado.

**Leyenda de estado**:
- **[IMPLEMENTADO]** existe en `backend/app/routes/*` y está montado en `app/main.py`.
- **[PARCIAL]** existe pero es stub/MVP (respuesta fija o “- implementar”).
- **[PLANIFICADO]** aparece como objetivo funcional, pero no hay ruta en el backend actual.

### Autenticación y Usuarios
- **[IMPLEMENTADO]** `POST /api/auth/registro` - Registrarse con email y contraseña
  - Body: email, password, nombre
  - Retorna: mensaje de confirmación
- **[IMPLEMENTADO]** `POST /api/auth/login` - Login con email y contraseña
  - Body: email, password
  - Retorna: access_token, refresh_token, usuario
- **[IMPLEMENTADO]** `POST /api/auth/google-login` - Login con Google OAuth (token de Google)
  - Body: google_token (token de Google)
  - Retorna: access_token, refresh_token, usuario
- **[PLANIFICADO]** `POST /api/auth/google-callback` - Callback de Google (si fuese necesario)
- **[IMPLEMENTADO]** `POST /api/auth/registrarse-desde-invitacion` - Registrarse con token de invitación
  - Body: email, password, nombre, invitacion_token
  - Retorna: usuario creado, access_token, automaticamente vinculado a membresía
  - Validación: email debe coincidir con el de la invitación
- **[IMPLEMENTADO]** `POST /api/auth/invitaciones/aceptar/{token}` - Aceptar invitación a club
  - Body: (vacío si usuario ya está autenticado)
  - Retorna: confirmación, datos del club
  - Funcionalidad: Valida token, agrega usuario a MIEMBRO_CLUB, marca invitación como aceptada
- **[IMPLEMENTADO]** `POST /api/auth/invitaciones/rechazar/{token}` - Rechazar invitación
- **[IMPLEMENTADO]** `GET /api/auth/invitaciones/pendientes` - Ver invitaciones pendientes del usuario
  - Retorna: lista de invitaciones con club_id, clubname, rol, estado
- **[IMPLEMENTADO]** `POST /api/auth/logout` - Cerrar sesión
- **[IMPLEMENTADO]** `POST /api/auth/refresh-token` - Refrescar token
- **[IMPLEMENTADO]** `POST /api/auth/usuarios/cambiar-contraseña` - Cambiar contraseña (requiere auth)
  - Body (actual): contraseña_actual, contraseña_nueva
- **[PLANIFICADO]** `POST /api/auth/recuperar-contraseña` - Solicitar reset de contraseña
- **[PLANIFICADO]** `POST /api/auth/resetear-contraseña` - Resetear contraseña con token
- **[IMPLEMENTADO]** `GET /api/auth/usuarios/me` - Obtener datos del usuario actual
- **[IMPLEMENTADO]** `PUT /api/auth/usuarios/me` - Actualizar perfil del usuario actual
- **[IMPLEMENTADO]** `GET /api/auth/usuarios/me/export` - Exportar datos personales (base RGPD)
- **[PLANIFICADO]** `POST /api/usuarios/vincular-google` - Vincular Google a cuenta existente
- **[PLANIFICADO]** `DELETE /api/usuarios/desvincular-google` - Desvincular Google

### Gestión de Clubes
- **[IMPLEMENTADO]** `POST /api/clubes` - Crear nuevo club (requiere superadmin en implementación actual)
- **[IMPLEMENTADO]** `GET /api/clubes` - Listar clubes del usuario actual
- **[IMPLEMENTADO]** `GET /api/clubes/{club_id}` - Obtener detalles del club
- **[IMPLEMENTADO]** `PUT /api/clubes/{club_id}` - Actualizar club (admin del club)
- **[PLANIFICADO]** `POST /api/clubes/{club_id}/personalización` - Actualizar logo/colores/tema (no implementado)
- **[IMPLEMENTADO]** `GET /api/clubes/mi-rol/{club_id}` - Obtener mi rol en el club
- **[IMPLEMENTADO]** `GET /api/clubes/{club_id}/miembros` - Listar miembros del club
- **[IMPLEMENTADO]** `POST /api/clubes/{club_id}/miembros/invitar` - Invitar usuario por email (admin)
  - Body: email, rol (socio/editor/moderador/admin), nombre (opcional)
  - Funcionalidad: Si email registrado → invitación directa. Si no → email con link de registro
  - Retorna: invitación con ID, token, estado
- **[IMPLEMENTADO]** `GET /api/clubes/{club_id}/miembros/invitaciones` - Ver invitaciones pendientes (admin)
  - Query params: estado (pendiente/aceptada/expirada), ordenar_por
  - Retorna: lista de invitaciones con estados
- **[PLANIFICADO]** `POST /api/clubes/{club_id}/miembros/invitaciones/{invitacion_id}/reenviar` - Reenviar invitación
- **[IMPLEMENTADO]** `DELETE /api/clubes/{club_id}/miembros/{usuario_id}` - Remover miembro
- **[IMPLEMENTADO]** `PUT /api/clubes/{club_id}/miembros/{usuario_id}/rol` - Cambiar rol de miembro

### Socios
- **[IMPLEMENTADO]** `GET /api/socios/?club_id={id}` - Listar socios de un club
- **[IMPLEMENTADO]** `POST /api/socios/` - Registrar nuevo socio
- **[IMPLEMENTADO]** `GET /api/socios/{id}` - Obtener perfil de socio
- **[IMPLEMENTADO]** `PUT /api/socios/{id}` - Actualizar perfil de socio
- **[IMPLEMENTADO]** `POST /api/socios/{id}/foto` - Subir foto de carnet
- **[IMPLEMENTADO]** `GET /api/socios/{id}/foto` - Descargar foto de carnet

### Documentación / Seguro y Carnet
- **[IMPLEMENTADO]** `GET /api/documentacion/ayuda` - Ver guías
- **[IMPLEMENTADO]** `GET /api/documentacion/me` - Ver mi documentación
- **[IMPLEMENTADO]** `POST /api/documentacion/me` - Crear/Actualizar documentación
- **[IMPLEMENTADO]** `GET /api/documentacion/me/rc` - Descargar seguro RC
- **[IMPLEMENTADO]** `GET /api/documentacion/me/carnet` - Descargar carnet piloto

### Contraseña de Instalaciones
- **[IMPLEMENTADO]** `GET /api/clubes/{club_id}/instalacion/password` - Ver contraseña actual (Miembros)
- **[IMPLEMENTADO]** `POST /api/clubes/{club_id}/instalacion/password` - Cambiar contraseña (Admin)
- **[IMPLEMENTADO]** `GET /api/clubes/{club_id}/instalacion/history` - Ver historial (Admin)

### Eventos
- **[IMPLEMENTADO]** `POST /api/clubes/{club_id}/eventos` - Crear evento (admin del club)
- **[IMPLEMENTADO]** `GET /api/clubes/{club_id}/eventos` - Listar eventos del club
- **[IMPLEMENTADO]** `GET /api/clubes/{club_id}/eventos/{evento_id}` - Obtener detalles del evento
- **[IMPLEMENTADO]** `PUT /api/clubes/{club_id}/eventos/{evento_id}` - Editar evento (admin del club)
- **[IMPLEMENTADO]** `DELETE /api/clubes/{club_id}/eventos/{evento_id}` - Eliminar evento (admin del club)
- **[IMPLEMENTADO]** `POST /api/clubes/{club_id}/eventos/{evento_id}/asistencia` - Registrar/actualizar asistencia (RSVP)
- **[IMPLEMENTADO]** `GET /api/clubes/{club_id}/eventos/{evento_id}/asistencia` - Listar asistentes (miembros activos)
- **[IMPLEMENTADO]** `GET /api/clubes/{club_id}/eventos/{evento_id}/mi-asistencia` - Ver mi estado de asistencia

### Juntas del Club
- **[PLANIFICADO]** (Sección completa) No hay rutas de juntas en el backend actual.
- `POST /api/clubes/{club_id}/juntas` - Convocar nueva junta (admin)
  - Body: titulo, descripcion, fecha_programada, ubicacion, tipo, enlace_videoconferencia, quorum_minimo, mayoria_requerida
  - File upload: convocatoria (PDF/documento)
  - Retorna: junta creada con ID
- `GET /api/clubes/{club_id}/juntas` - Listar juntas del club
  - Query params: estado, ordenar_por (fecha), filtro_periodo
  - Retorna: lista de juntas con estado y próximas destacadas
- `GET /api/clubes/{club_id}/juntas/{junta_id}` - Obtener detalles de junta
  - Retorna: convocatoria, orden del día, estado, votaciones pendientes
- `PUT /api/clubes/{club_id}/juntas/{junta_id}` - Editar junta (antes de realizarla, admin)
  - Body: titulo, descripcion, fecha_programada, ubicacion, etc.
- `DELETE /api/clubes/{club_id}/juntas/{junta_id}` - Cancelar junta (admin)
  - Body: motivo_cancelacion
  - Notifica a todos los socios
- `GET /api/clubes/{club_id}/juntas/{junta_id}/convocatoria` - Descargar convocatoria
- `POST /api/clubes/{club_id}/juntas/{junta_id}/confirmar-asistencia` - Confirmar asistencia (socio)
  - Body: asistencia (true/false)
- `GET /api/clubes/{club_id}/juntas/{junta_id}/asistentes` - Ver asistentes confirmados (admin, después de junta)
- `POST /api/clubes/{club_id}/juntas/{junta_id}/finalizar` - Marcar junta como finalizada (admin)
  - Genera acta automática basada en votaciones
- `GET /api/clubes/{club_id}/juntas/{junta_id}/acta` - Ver acta de junta (después de finalizada)
  - Retorna: documento acta generado o enlace para descargar
- `POST /api/clubes/{club_id}/juntas/{junta_id}/acta/descargar` - Descargar acta en PDF
- `PUT /api/clubes/{club_id}/juntas/{junta_id}/acta` - Editar acta antes de aprobarla (admin)
  - Body: cambios a decisiones, próxima fecha, etc.
- `POST /api/clubes/{club_id}/juntas/{junta_id}/acta/enviar-email` - Enviar acta por email a socios (admin)
- `POST /api/clubes/{club_id}/juntas/{junta_id}/votaciones` - Crear votación para junta
  - Body: titulo, descripcion, opciones, tipo, quorum_requerido, mayoria_requerida
- `GET /api/clubes/{club_id}/juntas/{junta_id}/votaciones` - Listar votaciones de junta
- `POST /api/clubes/{club_id}/juntas/{junta_id}/votaciones/{votacion_id}/votar` - Emitir voto (socio)
  - Body: opcion_id
- `GET /api/clubes/{club_id}/juntas/{junta_id}/votaciones/{votacion_id}/resultados` - Ver resultados votación
- `POST /api/clubes/{club_id}/juntas/{junta_id}/votaciones/{votacion_id}/cerrar` - Cerrar votación (admin)
- `GET /api/clubes/{club_id}/juntas/historico` - Listar histórico completo de juntas
  - Query params: filtro_año, filtro_estado, ordenar_por
  - Retorna: lista con resumen ejecutivo de cada junta

### Productos/Tienda (Actualizado Marzo 2026)
- **[IMPLEMENTADO]** `GET /api/clubes/{club_id}/productos` - Listar productos activos del club
  - Requiere: Usuario autenticado y miembro del club
  - Retorna: Lista de ProductoAfiliacion (solo activos para socios, todos para admins)
  - Response: `[{id, nombre, descripcion, imagen_url, plataforma, url_afiliacion, precio_referencia, activo, fecha_creacion}]`
- **[IMPLEMENTADO]** `POST /api/clubes/{club_id}/productos` - Crear producto (admin)
  - Requiere: Usuario admin del club
  - Body: `{nombre (str, 5-200 chars), descripcion (str, 10-5000 chars), imagen_url (str, optional), plataforma (str, 3-100 chars), url_afiliacion (str, required), precio_referencia (float, optional), activo (bool, default true)}`
  - Validación: minLength/maxLength en frontend + backend, URL válida
  - Retorna: Producto creado con ID
- **[IMPLEMENTADO]** `GET /api/clubes/{club_id}/productos/{producto_id}` - Ver detalles producto
  - Requiere: Usuario miembro del club
  - Retorna: ProductoAfiliacion completo
- **[IMPLEMENTADO]** `PUT /api/clubes/{club_id}/productos/{producto_id}` - Editar producto (admin)
  - Requiere: Usuario admin del club
  - Body: Mismos campos que POST (todos opcionales excepto nombre)
  - Validación: Mismas reglas que creación
  - Retorna: Producto actualizado
- **[IMPLEMENTADO]** `DELETE /api/clubes/{club_id}/productos/{producto_id}` - Eliminar producto (admin)
  - Requiere: Usuario admin del club
  - Retorna: Confirmación de eliminación (soft delete marca activo=false)
- **[PLANIFICADO]** `GET /api/clubes/{club_id}/productos/{producto_id}/stats` - Ver estadísticas de clicks (admin)
- **[PLANIFICADO]** `GET /api/clubes/{club_id}/ingresos/dashboard` - Ver estadísticas globales (admin)
- **[PLANIFICADO]** `GET /api/clubes/{club_id}/ingresos/por-producto` - Ingresos por producto (admin)

### Noticias
- **[IMPLEMENTADO]** `POST /api/clubes/{club_id}/noticias` - Crear noticia (admin del club)
- **[IMPLEMENTADO]** `GET /api/clubes/{club_id}/noticias` - Listar noticias del club
- **[IMPLEMENTADO]** `GET /api/clubes/{club_id}/noticias/{noticia_id}` - Obtener detalle
- **[IMPLEMENTADO]** `PUT /api/clubes/{club_id}/noticias/{noticia_id}` - Editar noticia (admin o autor)
- **[IMPLEMENTADO]** `DELETE /api/clubes/{club_id}/noticias/{noticia_id}` - Eliminar noticia (admin o autor)

### Contenido Reciente del Club (Nuevo - Marzo 2026)
- **[IMPLEMENTADO]** `GET /api/clubes/{club_id}/contenido-reciente` - Obtener contenido reciente del club
  - Requiere: Usuario autenticado y miembro del club
  - Retorna: Array con máximo 3 items más recientes (noticias, eventos, productos)
  - Response: `[{tipo: "noticia"|"evento"|"producto", id, titulo, descripcion, fecha, imagen_url}]`
  - Funcionalidad: 
    * Combina últimas noticias, eventos y productos del club
    * Ordenados por fecha de creación descendente
    * Filtra solo productos activos para socios
    * Incluye badge con color por tipo
  - Uso: Sección "🆕 Novedades Recientes" en página de detalle del club

### Votaciones
- **[PARCIAL]** `GET /api/votaciones/` - Listar votaciones (stub)
- **[PLANIFICADO]** `POST /api/votaciones` - Crear votación (admin)
- **[PLANIFICADO]** `POST /api/votaciones/{id}/votar` - Emitir voto
- **[PLANIFICADO]** `GET /api/votaciones/{id}/resultados` - Ver resultados

---

## 4. Seguridad

### Requisitos de Seguridad
- [x] Contraseñas hasheadas (bcrypt via passlib)
- [ ] HTTPS en producción (SSL/TLS)
- [x] CORS configurado correctamente (lista de origins para dev)
- [x] SQL Injection prevention (usar ORM)
- [ ] CSRF tokens en formularios
- [ ] Rate limiting en endpoints
- [x] Input validation en todas las entradas (Pydantic)
- [ ] Output encoding en respuestas
- [ ] Audit logging de cambios sensibles
- [ ] RGPD compliance (derecho al olvido, exportación datos)

### Autenticación
- **Método**: JWT + Refresh Tokens
- **Expiración**: Access token (15-60 min), Refresh token (7 días)
- **Almacenamiento actual (MVP)**: localStorage (access_token, refresh_token)
- **Mejora recomendada**: migrar a cookies HttpOnly + SameSite en frontend para reducir riesgo de XSS.

### HTTPS y Certificados (PWA)
- **Requerimiento HTTPS**:
  - OBLIGATORIO en producción (Service Worker solo funciona con HTTPS)
  - Certificado SSL/TLS válido requerido
  - Certificados auto-firmados aceptables en localhost
  - Let's Encrypt para certificados gratuitos en producción
- **Configuración de seguridad**:
  - HSTS header habilitado
  - Redirect automático HTTP → HTTPS
  - TLS 1.2+ requerido
- **Desarrollo local**:
  - HTTP permitido en localhost (sin restricciones)
  - HTTPS opcional con certificados auto-firmados

---

## 5. Requisitos de Rendimiento

### Backend
- **Tiempo de respuesta API**: < 500ms en operaciones normales
- **Concurrencia**: Mínimo 50 usuarios simultáneos (escalable)
- **Disponibilidad**: 99% uptime
- **Backups**: Automáticos diarios

### PWA Frontend
- **Tiempo de carga inicial**: < 2 segundos en 4G
- **Time to Interactive (TTI)**: < 3 segundos
- **Lighthouse score**: > 90
- **Optimizaciones**:
  - Cache-first para assets estáticos (JS, CSS, imágenes)
  - Network-first para datos dinámicos (APIs)
  - Minificación de assets
  - Compresión gzip de respuestas
  - Lazy loading de imágenes
  - Service Worker precarga assets críticos
- **Full-text search offline**:
  - Índice de búsqueda almacenado localmente en IndexedDB
  - Búsqueda instantánea sin conexión

---

## 6. Testing

### Estrategia de Testing
- **Unit Tests**: Funciones y métodos individuales (>80% cobertura)
- **Integration Tests**: Endpoints y flujos completos
- **Test Data**: Fixtures con datos de prueba

### Marcos de Testing
- **pytest**: Framework principal
- **pytest-cov**: Coverage de código
- **httpx**: Testing de endpoints FastAPI
- **Mock**: Mockear dependencias

---

## 7. Despliegue y DevOps

### Fase 1 - Desarrollo Local
- Desarrollo en máquina local
- SQLite para BD
- Hot reload habilitado

### Fase 2 - Testing/Staging
- Servidor Linux (Ubuntu 22.04)
- PostgreSQL en contenedor Docker
- CI/CD con GitHub Actions ou GitLab CI

### Fase 3 - Producción
- **Hosting**: AWS, Google Cloud ou servidor dedicado
- **Containerización**: Docker + Docker Compose ou Kubernetes
- **Servidor Web**: Nginx reverse proxy
- **Base de datos**: PostgreSQL managed service
- **Caché**: Redis (opcional, para sesiones y caché)

### Docker/Compose Stack
```yaml
services:
  backend:
    build: ./backend
    ports: 8000:8000
    environment:
      - DATABASE_URL=postgresql://...
  postgres:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
  nginx:
    image: nginx:latest
    ports: 80:80, 443:443
```

---

## 8. Dependencias Python (requirements.txt - Actual)

```
# Web Framework
fastapi==0.104.1
uvicorn[standard]==0.24.0

# Database
sqlalchemy==2.0.23
alembic==1.12.1

# Data Validation
pydantic==2.5.0
pydantic-settings==2.1.0
email-validator==2.1.0

# Authentication
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
bcrypt==4.0.1
pyjwt==2.11.0

# Files & Config
aiofiles==23.2.1
pillow==10.1.0
python-dotenv==1.0.0
PyYAML==6.0.1

# Testing
pytest==8.2.2
httpx==0.26.0
```

---

## 8.1 Dependencias Frontend - NPM (package.json)

```json
{
  "name": "piarapp-pwa",
  "version": "0.1.0",
  "type": "module",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.2",
    "dexie": "^3.2.4"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8",
    "vite-plugin-pwa": "^0.16.5",
    "typescript": "^5.2.2",
    "vitest": "^1.6.0",
    "jsdom": "^24.0.0",
    "@testing-library/react": "^14.3.1",
    "@testing-library/jest-dom": "^6.4.5",
    "@types/react": "^18.2.37",
    "@types/node": "^20.10.0"
  }
}
```

**Librerías PWA clave**:
- `vite-plugin-pwa`: Plugin Vite para PWA (genera manifest, service worker, etc.)
- `dexie`: Wrapper de IndexedDB para almacenamiento offline

---

## 9. Variables de Entorno (.env)

```
# Database
DATABASE_URL=sqlite:///./test.db  # Fase 1
# DATABASE_URL=postgresql://user:password@localhost/piar_db  # Fase 2

# Security
SECRET_KEY=tu_clave_secreta_super_segura_aqui
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# App
APP_NAME="PIAR - Club de Aeromodelismo"
DEBUG=True  # False en producción
ENVIRONMENT=development  # development, staging, production

# Upload Files
UPLOAD_DIR=./uploads/carnet_photos
MAX_FILE_SIZE=5242880  # 5MB en bytes
ALLOWED_EXTENSIONS=jpg,jpeg,png

# Email
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SENDER_EMAIL=noreply@piarclub.com
SENDER_PASSWORD=tu_contraseña

# Google OAuth
GOOGLE_CLIENT_ID=tu_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google-callback
# GOOGLE_REDIRECT_URI=https://tudominio.com/api/auth/google-callback  # Para producción

# Seguridad de Contraseña de Instalaciones
ENCRYPTION_KEY=tu_clave_encriptacion_segura

# Frontend (dev)
FRONTEND_URL=http://localhost:5173

# CORS (debe ser una lista JSON)
CORS_ORIGINS=["http://localhost:5173","http://localhost:5174","http://localhost:5175","http://127.0.0.1:5173","http://127.0.0.1:5174","http://127.0.0.1:5175"]

# Frontend URL para OAuth callbacks (si se implementa flujo de callback en UI)
FRONTEND_GOOGLE_CALLBACK_URL=http://localhost:5173/auth/google-callback
# FRONTEND_GOOGLE_CALLBACK_URL=https://tudominio.com/auth/google-callback  # Para producción

# PWA Configuration
PWA_NAME=PIAR - Club de Aeromodelismo
PWA_SHORT_NAME=PIAR
PWA_DESCRIPTION=Gestión de clubes de aeromodelismo con características de PWA
PWA_THEME_COLOR=#FF6B35  # Color principal del tema
PWA_BACKGROUND_COLOR=#FFFFFF
PWA_DISPLAY=standalone  # Mostrar como app nativa (standalone, fullscreen, minimal-ui, browser)
PWA_START_URL=/
PWA_SCOPE=/
PWA_ORIENTATION=portrait-primary

# Service Worker Cache Strategy
SERVICE_WORKER_CACHE_VERSION=v1
PWA_OFFLINE_PAGE=/offline.html

# Analytics (Opcional - para PWA)
GOOGLE_ANALYTICS_ID=

# Frontend (Vite) - ejemplo
# VITE_API_URL=http://localhost:8000/api  # default si no se define
```

