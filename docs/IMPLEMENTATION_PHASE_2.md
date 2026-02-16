# Implementación del MVP - Fase 2: Autenticación y APIs

Este documento describe la implementación completada en la fase 2 del MVP de PIAR.

## Cambios Realizados

### Backend

#### 1. Endpoints de Autenticación (`app/routes/auth.py`)
Implementación completa del sistema de autenticación:

- **POST /api/auth/login** - Login con email/contraseña
  - Valida credenciales
  - Retorna access_token y refresh_token
  - Actualiza último acceso del usuario

- **POST /api/auth/registro** - Registro de nuevo usuario
  - Valida email único
  - Hasea contraseña con bcrypt
  - Retorna datos del usuario creado

- **POST /api/auth/registrarse-desde-invitacion** - Registro desde invitación
  - Valida token de invitación
  - Verifica email coincide
  - Crea usuario y automáticamente lo agrega al club
  - Retorna tokens de autenticación

- **POST /api/auth/google-login** - Login con Google OAuth
  - Valida token de Google
  - Crea o enlaza usuario existente
  - Retorna tokens de autenticación

- **POST /api/auth/refresh-token** - Refrescar access token
  - Usa refresh_token para generar nuevo access_token
  - Válido por 7 días

- **POST /api/auth/logout** - Logout (manejado en frontend)

- **GET /api/auth/invitaciones/pendientes** - Ver invitaciones pendientes
  - Requiere autenticación
  - Retorna invitaciones sin expirar

- **POST /api/auth/invitaciones/aceptar/{token}** - Aceptar invitación
  - Valida token y expiración
  - Crea membresía en el club
  - Marca invitación como aceptada

- **POST /api/auth/invitaciones/rechazar/{token}** - Rechazar invitación

- **GET /api/auth/usuarios/me** - Datos del usuario actual

- **PUT /api/auth/usuarios/me** - Actualizar perfil de usuario

- **POST /api/auth/usuarios/cambiar-contraseña** - Cambiar contraseña

#### 2. Endpoints de Clubes (`app/routes/clubes.py`)
Gestión de clubs y membresías:

- **POST /api/clubes** - Crear nuevo club
  - Solo usuarios autenticados
  - El creador se convierte en administrador automáticamente
  - Validar slug único

- **GET /api/clubes** - Listar clubes del usuario
  - Retorna solo clubes donde el usuario es miembro activo

- **GET /api/clubes/{club_id}** - Obtener detalles del club
  - Requiere ser miembro

- **PUT /api/clubes/{club_id}** - Actualizar información del club
  - Solo administradores

- **GET /api/clubes/{club_id}/miembros** - Listar miembros activos

- **POST /api/clubes/{club_id}/miembros/invitar** - Invitar miembro
  - Solo administradores
  - Envía email de invitación
  - Token válido 30 días

- **GET /api/clubes/{club_id}/miembros/invitaciones** - Ver invitaciones pendientes
  - Solo administradores

- **DELETE /api/clubes/{club_id}/miembros/{usuario_id}** - Remover miembro
  - Solo administradores
  - No permite removerse a sí mismo

#### 3. Endpoints de Noticias (`app/routes/noticias.py`)
Gestión de noticias del club:

- **POST /api/clubes/{club_id}/noticias** - Crear noticia
  - Solo administradores

- **GET /api/clubes/{club_id}/noticias** - Listar noticias con paginación

- **GET /api/clubes/{club_id}/noticias/{noticia_id}** - Obtener noticia

- **PUT /api/clubes/{club_id}/noticias/{noticia_id}** - Actualizar noticia
  - Solo administrador o autor

- **DELETE /api/clubes/{club_id}/noticias/{noticia_id}** - Eliminar noticia
  - Solo administrador o autor

#### 4. Endpoints de Eventos (`app/routes/eventos.py`)
Gestión de eventos del club:

- **POST /api/clubes/{club_id}/eventos** - Crear evento
  - Solo administradores

- **GET /api/clubes/{club_id}/eventos** - Listar eventos con paginación

- **GET /api/clubes/{club_id}/eventos/{evento_id}** - Obtener evento

- **PUT /api/clubes/{club_id}/eventos/{evento_id}** - Actualizar evento
  - Solo administradores

- **DELETE /api/clubes/{club_id}/eventos/{evento_id}** - Eliminar evento
  - Solo administradores

#### 5. Servicio de Email (`app/services/email_service.py`)
Sistema completo de envío de emails:

- **enviar_invitacion_club()** - Invitación para usuario existente
  - HTML formateado
  - Enlace directo para aceptar invitación

- **enviar_bienvenida_nuevo_usuario()** - Invitación con registro
  - Nueva cuenta + membresía de club
  - Enlace para registrarse directamente con token

- **enviar_verificacion_email()** - Verificación de email

- **enviar_reset_contrasena()** - Reset de contraseña

**Características:**
- Plantillas HTML profesionales
- Soporte para SMTP con TLS
- Sin servidor SMTP configurado = logs en consola (desarrollo)
- Async para no bloquear peticiones

#### 6. Actualización de Configuración
**app/config.py:**
- `SMTP_SENDER` en lugar de `SMTP_FROM`
- `SMTP_USE_TLS` para control de TLS
- `INVITATION_TOKEN_EXPIRY_DAYS` configurables
- Instancia global `settings`

**.env.example:**
- Documentación para todas las variables SMTP
- Comentario indicando que SMTP vacío usa logs en consola

#### 7. Esquemas Pydantic Nuevos
**app/schemas/club.py:**
- ClubCreate, ClubUpdate, ClubResponse
- MiembroClubResponse, InvitacionClubResponse

**app/schemas/usuario.py:**
- UsuarioResponse, UsuarioDetalleResponse

**app/schemas/noticia.py:**
- NoticiaCreate, NoticiaUpdate, NoticiaResponse

**app/schemas/evento.py:**
- EventoCreate, EventoUpdate, EventoResponse

#### 8. Auth Utilities
**app/utils/security.py:**
- Métodos de clase para hash y JWT
- `generate_invitation_token()` con secrets cryptográficos

### Frontend

#### 1. Páginas de Autenticación

**Login.tsx:**
- Formulario profesional con estilos CSS
- Manejo de errores
- Toggle de mostrar/ocultar contraseña
- Opción de Google OAuth (stub)
- Enlaces a registro y recuperar contraseña
- Integración con API backend

**Register.tsx:**
- Formulario de registro completo
- Validación de contraseñas (mínimo 8 caracteres)
- Confirmación de contraseña
- Envío a login después de register exitoso

**AcceptInvitation.tsx:**
- Página especial para aceptar invitaciones
  Get token de URL
- Usuario nuevo registra y acepta invitación en un solo paso
- Integración con endpoint de registro desde invitación

#### 2. Context y Autenticación

**AuthContext.tsx:**
- Context global para estado de autenticación
- Hook `useAuth()` para acceso desde componentes
- Gestión de localStorage para tokens y usuario
- Métodos: login, logout, updateUser, getAccessToken, getRefreshToken

**ProtectedRoute.tsx:**
- Componente para rutas protegidas
- Require autenticación
- Soporte para validación de roles (preparado)
- Loading state mientras se verifica autenticación

#### 3. Servicios

**api.ts:**
- Cliente HTTP centralizado
- Inyección automática de tokens en headers
- Auto-refresh de tokens cuando expiran (401)
- Métodos: get, post, put, delete
- Manejo de errores con redireccionamiento a login

#### 4. Estilos

**Auth.css:**
- Diseño responsivo
- Gradiente profesional
- Tarjetas con sombras
- Botones con estados (hover, disabled)
- Alerts para errores/éxito
- Dividers con texto
- Mobile-first responsive

#### 5. Rutas y App Router

**App.tsx:**
- Estructura completa con AuthProvider
- Rutas públicas: /auth/login, /auth/registro, /auth/aceptar-invitacion
- Rutas protegidas: /
- ProtectedRoute para validar autenticación
- Redireccionamiento de rutas no encontradas

#### 6. Integración

**Frontend URL:**
- Configuración via VITE_API_URL
- Default: http://localhost:8000

## Variables de Entorno (.env.example)

**Obligatorias:**
```
SECRET_KEY=tu-clave-secreta-aqui
GOOGLE_CLIENT_ID=tu-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-google-client-secret
```

**Email (Opcional para desarrollo):**
```
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-contraseña-app
SMTP_USE_TLS=True
```

## Flujos Implementados

### 1. Login Estándar
```
Frontend: Email + Contraseña
         ↓
API: POST /auth/login
         ↓
Backend: Valida credenciales, retorna tokens
         ↓
Frontend: Almacena tokens en localStorage, redirige a /
```

### 2. Registro Nuevo Usuario
```
Frontend: Nombre, Email, Contraseña
         ↓
API: POST /auth/registro
         ↓
Backend: Valida email único, crea usuario
         ↓
Frontend: Redirige a login
```

### 3. Aceptar Invitación (Usuario Nuevo)
```
Email: Clic en enlace con token
         ↓
Frontend: AcceptInvitation con token de URL
         ↓
Usuario: Ingresa nombre, contraseña
         ↓
API: POST /auth/registrarse-desde-invitacion
         ↓
Backend: Valida token, crea usuario + membresía automática
         ↓
Frontend: Almacena tokens, redirige a /
```

### 4. Aceptar Invitación (Usuario Existente)
```
Email: Admin invita usuario existente
         ↓
Backend: Crea invitación, envía email
         ↓
Email: Clic en enlace
         ↓
Frontend: AcceptInvitation
         ↓
API: POST /auth/invitaciones/aceptar/{token}
         ↓
Backend: Crea membresía en club
         ↓
Frontend: Muestra mensaje de éxito
```

### 5. Crear Club
```
Frontend: Nombre, Slug, Descripción
         ↓
API: POST /api/clubes
         ↓
Backend: Valida slug único, crea club, agrega creador como admin
         ↓
Frontend: Redirige a club
```

### 6. Invitar Miembro al Club
```
Frontend: Admin escribe email
         ↓
API: POST /api/clubes/{club_id}/miembros/invitar
         ↓
Backend: Crea invitación, envía email (hay usuario o no)
         ↓
Email: Usuario recibe invitación
         ↓
Ver flujos 3 o 4 según si es usuario nuevo o existente
```

## Seguridad Implementada

✅ Contraseñas hasheadas con bcrypt
✅ JWT con access (15 min) y refresh (7 días) tokens
✅ Invitaciones con tokens criptográficos seguros
✅ CORS configurado
✅ Tokens en Authorization header
✅ Auto-refresh de tokens en frontend
✅ Validación de expiración de invitaciones
✅ Redireccionamiento automático a login si auth falla

## Próximos Pasos

1. **Testing:**
   - Tests unitarios para servicios (pytest)
   - Tests de integración para endpoints
   - Tests para componentes React (Jest)

2. **Google OAuth:**
   - Completar flujo de Google OAuth en frontend
   - Callback endpoint en backend

3. **Más Endpoints:**
   - Votaciones
   - Socios
   - Documentación
   - Productos

4. **Panel de Admin:**
   - Dashboard de club
   - Gestión de miembros
   - Reportes

5. **Mejoras de UX:**
   - Confirmaciones de email
   - Reset de contraseña
   - 2FA (Two-factor authentication)
   - Avatar de usuario

## Notas Técnicas

- **Backend:** FastAPI, SQLAlchemy ORM, Pydantic, bcrypt, python-jose
- **Frontend:** React, TypeScript, Vite, React Router, CSS
- **Base de Datos:** SQLite (dev), PostgreSQL (prod-ready)
- **Autenticación:** JWT + Google OAuth + Invitation Tokens
- **Email:** SMTP (async, sin bloqueo)
- **Multitenancy:** Via club_id, aislamiento por consultas SQL

## Errores Comunes

1. **CORS Error:** Verificar que frontend URL está en CORS_ORIGINS del backend
2. **Token Expirado:** Frontend maneja auto-refresh, si falla redirige a login
3. **Email no Enviado:** Con SMTP vacío, revisar console logs del backend
4. **Invitación Expirada:** Token válido solo 30 días (configurable)

## Comandos Útiles

```bash
# Backend
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# Testing (próximamente)
pytest app/tests/
npm test
```
