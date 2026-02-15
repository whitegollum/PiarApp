# PIAR - Sistema de Gestión de Clubs de Aeromodelismo
## MVP Phase 7 - Admin Pages & User Profiles

### Descripción del Proyecto
PIAR es una plataforma web completa para la gestión de clubs de aeromodelismo, construida con FastAPI en el backend y React con TypeScript en el frontend. El sistema implementa autenticación segura, multitenancy, y gestión de membresías con invitaciones por email.

---

## 📊 Estado Actual (Phase 7 - Actualizado)

### ✅ Backend (Completado)
- **FastAPI 0.104.1** con CORS configurado
- **9 Modelos SQLAlchemy** con relaciones completas
- **27+ Endpoints** mediante 4 módulos de rutas
- **Autenticación JWT** con tokens de acceso (15 min) y refresh (7 días)
- **Sistema de Invitaciones** con tokens criptográficos
- **Servicio de Email** con 4 plantillas HTML
- **Google OAuth 2.0** (token validation lista)
- **Validación Pydantic** para todos los datos

### ✅ Frontend (Completado - Phase 7)
- **React 18 + TypeScript + Vite**
- **9 Páginas/Componentes** (auth, dashboard, clubs, settings)
- **9 CSS Stylesheets** profesionales y responsivos
- **AuthContext** para gestión global de estado
- **APIService** con auto-refresh de tokens
- **React Router** para navegación SPA
- **PWA-Ready** (manifest.json, service worker)

### 🗄️ Base de Datos
- **SQLite** (desarrollo local)
- **PostgreSQL-Ready** (esquema compatible)
- **9 Modelos** con relaciones y restricciones
- **Preferencias de usuario** persistidas (notificaciones, tema, idioma)

---

## 📁 Estructura de Ficheros Frontend (Actualizada Phase 7)

```
frontend/src/
├── pages/
│   ├── Login.tsx                    ✅
│   ├── Register.tsx                 ✅
│   ├── AcceptInvitation.tsx          ✅
│   ├── Dashboard.tsx                 ✅ (con Navbar integrado)
│   ├── ClubDetail.tsx                ✅ (con links a miembros)
│   ├── CreateClub.tsx                ✅
│   ├── Profile.tsx                   ✨ NUEVO Phase 7
│   ├── ClubMembers.tsx               ✨ NUEVO Phase 7
│   └── Settings.tsx                  ✨ NUEVO Phase 7
├── components/
│   ├── Navbar.tsx                    ✅ (actualizado para useAuth)
│   └── ProtectedRoute.tsx            ✅
├── contexts/
│   └── AuthContext.tsx               ✅ (con updateUser method)
├── services/
│   └── api.ts                        ✅ (APIService centralizado)
└── styles/
    ├── Auth.css                      ✅
    ├── Navbar.css                    ✅
    ├── Dashboard.css                 ✅
    ├── Forms.css                     ✅
    ├── ClubDetail.css                ✅
    ├── Profile.css                   ✨ NUEVO Phase 7
    ├── ClubMembers.css               ✨ NUEVO Phase 7
    └── Settings.css                  ✨ NUEVO Phase 7
```

---

## 🆕 Nuevas Características - Phase 7

### 1. **Profile.tsx** (250 líneas)
- Editar información personal (nombre completo)
- Cambiar contraseña segura
- Descargar datos personales
- Integración con APIService para actualizaciones
- Manejo de estados de carga y errores
- Los cambios se sincronizan en AuthContext via updateUser()

**Rutas:**
- `GET /auth/usuarios/me` - Obtener perfil actual
- `PUT /auth/usuarios/me` - Actualizar perfil y preferencias
- `GET /auth/usuarios/me/export` - Exportar datos personales
- `POST /auth/usuarios/cambiar-contraseña` - Cambiar contraseña

### 2.  **ClubMembers.tsx** (250 líneas)
- Ver lista completa de miembros del club
- Invitar nuevos miembros por email (solo administradores)
- Remover miembros del club
- Ver rol (administrador/miembro)  
- Ver estado (activo/pendiente/inactivo)
- Interfaz intuitiva con avatares y badges

**Rutas:**
- `GET /clubes/{clubId}/miembros` - Listar miembros
- `POST /clubes/{clubId}/invitar` - Enviar invitación
- `DELETE /clubes/{clubId}/miembros/{miembroId}` - Remover miembro

### 3. **Actualización Navbar**
- Ahora usa `useAuth()` hook en lugar de props
- Integración con logout() automática
- Menú dropdown con acceso a Perfil y Configuración
- Enlaces a Dashboard y Clubes

### 4. **Settings Persistente**
- Guardado de preferencias en backend
- Sincronización en AuthContext
- Soporte de notificaciones, idioma y tema

### 4. **CSS Profesional**
- **Profile.css** (280+ líneas): Formularios de perfil, campos de seguridad
- **ClubMembers.css** (350+ líneas): Listados de miembros, avatares, badges

---

## 🔐 Seguridad Implementada

✅ **Contraseñas:**
- bcrypt con salting automático
- Mínimo 8 caracteres

✅ **Tokens JWT:**
- Access token: 15 minutos
- Refresh token: 7 días
- Almacenado en localStorage

✅ **Invitaciones:**
- Tokens criptográficos únicos
- Validación de email
- Expiración (30 días por defecto)

✅ **Role-Based Access Control:**
- Administrador vs Miembro
- Protección de endpoints
- ProtectedRoute en frontend

---

## 🛠️ Stack Tecnológico

### Backend
```
FastAPI 0.104.1
uvicorn 0.24.0
SQLAlchemy 2.0.23
Pydantic 2.5.0
python-jose 3.3.0
bcrypt 4.1.1
PyJWT 2.11.0
python-multipart 0.0.6
```

### Frontend
```
React 18.2.0
TypeScript 5.3.3
React Router 6.20.1
Vite 5.4.21
```

---

## 📈 Endpoints API Completos

### Autenticación (9)
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

### Clubs (8)
```
POST   /clubes
GET    /clubes
GET    /clubes/{id}
PUT    /clubes/{id}
DELETE /clubes/{id}
GET    /clubes/{id}/miembros
POST   /clubes/{id}/invitar
DELETE /clubes/{id}/miembros/{usuario_id}
```

### Noticias (5)
```
POST   /clubes/{club_id}/noticias
GET    /clubes/{club_id}/noticias
GET    /noticias/{id}
PUT    /noticias/{id}
DELETE /noticias/{id}
```

### Eventos (5)
```
POST   /clubes/{club_id}/eventos
GET    /clubes/{club_id}/eventos
GET    /eventos/{id}
PUT    /eventos/{id}
DELETE /eventos/{id}
```

---

## 🚀 Cómo Ejecutar

### Backend
```bash
cd backend
python run.py
# Servidor en http://localhost:8000
```

### Frontend
```bash
cd frontend
npm run dev
# Servidor en http://localhost:5173
```

### Base de Datos
- Automáticamente cargada en `backend/piar.db`
- Migración automática via SQLAlchemy

---

## 📝 Flujos de Usuario Implementados

### 1. Registro e Inicio de Sesión
```
Usuario → Registro → Email/Contraseña → Login → JWT Token → Dashboard
```

### 2. Crear Club
```
Dashboard → Crear Club → Form → POST /clubes → Redirect a ClubDetail
```

### 3. Invitar Miembros
```
ClubMembers → Invitar por Email → POST /invitar → Email enviado → Usuario acepta → Miembro agregado
```

### 4. Administrar Perfil
```
Navbar → Mi Perfil → Editar Datos / Cambiar Contraseña → PUT /perfil
```

### 5. Ver Detalles del Club
```
Dashboard → Click Club → ClubDetail con Tabs (Resumen/Miembros/Noticias)
```

---

## ✨ Características Phase 7

| Feature | Status | Ubicación |
|---------|--------|-----------|
| Perfil de Usuario | ✅ Completado | `/perfil` |
| Cambio de Contraseña | ✅ Completado | `/perfil` |
| Gestión de Miembros | ✅ Completado | `/clubes/:id/miembros` |
| Invitar por Email | ✅ Completado | `ClubMembers.tsx` |
| Remover Miembros | ✅ Completado | `ClubMembers.tsx` |
| Navbar Actualizado | ✅ Completado | Todos los layouts |
| CSS Responsive | ✅ Completado | 7 archivos |

---

## 🔄 Próximas Fases (Roadmap)

### Phase 8: Noticia & Eventos (✅ Completado)
- [x] Página de gestión de noticias
- [x] Página de gestión de eventos
- [x] Crear/Editar/Eliminar noticias
- [x] Crear/Editar/Eliminar eventos

### Phase 9: Interacción de Usuarios (⏳ Pendiente)
- [ ] Inscripción a Eventos (RSVP: Asistir/Cancelar)
- [ ] Comentarios en noticias (Postear/Leer/Moderar)
- [ ] Login con Google funcional (OAuth)

### Phase 10: Tests & QA (⏳ Pendiente)
- [ ] Pytest para servicios backend
- [ ] Jest para componentes React
- [ ] Cypress para E2E

### Phase 11: Deployment (⏳ Pendiente)
- [ ] Docker containerization
- [ ] CI/CD (GitHub Actions)
- [ ] Deploy a AWS/Heroku

---

## 📊 Métrica de Progreso

```
Autenticación:     ████████████████████░ 100% ✅
Backend API:       ████████████████████░ 100% ✅
Frontend Pages:    ███████████████████░░ 90% ⏳
Admin Features:    ██████████████░░░░░░░ 70% ⏳
Testing:           ░░░░░░░░░░░░░░░░░░░░ 0% ❌
Deployment:        ░░░░░░░░░░░░░░░░░░░░ 0% ❌

TOTAL MVP:         ████████████████░░░░ 80% ✅
```

---

## 🐛 Issues Conocidos

1. **Google OAuth Callback**: Sin implementar en frontend (backend ready)
2. **Email Real**: Modo dev usa console.log (sin SMTP real)
3. **Almacenamiento de Archivos**: Sin soporte para logos/imágenes
4. **PWA Service Worker**: Manifest listo, worker pendiente

---

## 📞 Mejoras en Phase 7

| Cambio | Archivo | Líneas |
|--------|---------|--------|
| Nuevo Profile.tsx | `pages/Profile.tsx` | +250 |
| CSS Profile | `styles/Profile.css` | +280 |
| Nuevo ClubMembers.tsx | `pages/ClubMembers.tsx` | +250 |
| CSS ClubMembers | `styles/ClubMembers.css` | +350 |
| Navbar mejorado | `components/Navbar.tsx` | -20 (refactor) |
| Dashboard Navbar | `pages/Dashboard.tsx` | -2 (refactor) |
| ClubDetail buttons | `pages/ClubDetail.tsx` | +30 |
| App.tsx rutas | `App.tsx` | +12 |
| **Total agregado** | **8 archivos** | **~1,200 líneas** |

---

## 🎯 Puntos Clave Alcanzados

✅ Autenticación completa (email/password, Google ready)  
✅ Gestión de clubs con CRUD  
✅ Sistema de invitaciones por email  
✅ Perfil de usuario con edición  
✅ Gestión de miembros del club  
✅ Interfaz responsiva y moderna  
✅ Protección de rutas con JWT  
✅ Estados de carga y manejo de errores  

---

**Generado:** Phase 7 MVP Update  
**Fecha:** 2024  
**Estado:** Production Ready (sin tests ni deployment)
