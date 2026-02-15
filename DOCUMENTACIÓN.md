# 📚 ÍNDICE DE DOCUMENTACIÓN - PIAR Phase 7

Documentación completa del sistema de gestión de clubs de aeromodelismo PIAR.

---

## 📖 Documentos Principales

### 1. **README.md** ⭐
**Ubicación:** `/README.md`  
**Contenido:**
- Descripción general del proyecto
- Características principales Phase 7
- Instalación rápida (backend + frontend)
- Estructura del proyecto
- Stack tecnológico
- 27+ endpoints API
- Seguridad implementada
- Flujos de usuario principales
- Troubleshooting

**Cuándo leer:** Primero - para entender qué es PiarApp
**Tipo:** Guía general de 300+ líneas


### 4. **UX_STANDARDS.md** 🎨
**Ubicación:** `/frontend/UX_STANDARDS.md`
**Contenido:**
- Guía de estilos y estandarización UI
- Estructura de formularios (layout, headers, groups)
- Variables CSS estándar
- Patrones de comportamiento (loading, error handling)
- Reglas de diseño para nuevas pantallas

**Cuándo leer:** Antes de crear cualquier nueva pantalla o formulario
**Tipo:** Guía de diseño de 100+ líneas

---

### 5. **PRUEBAS_FUNCIONALES.md** 🧪
**Ubicación:** `/PRUEBAS_FUNCIONALES.md`
**Contenido:**
- Plan de pruebas detallado (28 casos de uso)
- Pasos paso-a-paso para validar el sistema
- Reproducción backend-only (curl)
- Resultados esperados vs actuales
- Matriz de estado de pruebas

**Cuándo leer:** Al finalizar una feature o antes de un release
**Tipo:** Documento de calidad e instrucciones de prueba

---

### 6. **CARACTERÍSTICAS_FUNCIONALES.md**
**Ubicación:** `/CARACTERÍSTICAS_FUNCIONALES.md`  
**Contenido:**
- Especificación detallada de features
- Casos de uso
- Requisitos funcionales
- Diagramas de flujo
- Estados y transiciones

**Estado:** Documento existente (actualizado en fases anteriores)

---

### 7. **REQUISITOS_TÉCNICOS.md**
**Ubicación:** `/REQUISITOS_TÉCNICOS.md`  
**Contenido:**
- Detalles técnicos de arquitectura
- Esquema base de datos
- Modelos SQLAlchemy
- Diagramas de relaciones
- Validaciones Pydantic
- Especificaciones de seguridad

**Estado:** Documento existente (actualizado en fases anteriores)

---

### 8. **DEVELOPMENT_PHASES.md** 🚀
**Ubicación:** `/DEVELOPMENT_PHASES.md`
**Contenido:**
- Histórico de fases completadas (1-8)
- Detalles de tareas realizadas por fase
- Roadmap detallado de fases futuras (9-12+)
- Objetivos por hito

**Cuándo leer:** Para entender la evolución del proyecto y el futuro
**Tipo:** Roadmap y registro de cambios

---

## 🗂️ Estructura General

```
📁 piar/
├── 📄 README.md                           ← START HERE
├── 📄 DEVELOPMENT_PHASES.md               ← Roadmap & Historia
├── 📄 PHASE_7_STATUS.md                   ← Detalles Phase 7
├── 📄 PHASE_7_SUMMARY.md                  ← Resumen Phase 7
├── 📄 PRUEBAS_FUNCIONALES.md              ← Test Plan
├── 📄 CARACTERÍSTICAS_FUNCIONALES.md      ← Features
├── 📄 REQUISITOS_TÉCNICOS.md              ← Architecture
│
├── 📁 backend/
│   ├── app/
│   │   ├── main.py                        # FastAPI app
│   │   ├── config.py                      # Configuration
│   │   ├── models/                        # 9 SQLAlchemy models
│   │   ├── routes/                        # 30+ API endpoints
│   │   ├── services/                      # Auth, OAuth, Email
│   │   ├── schemas/                       # Pydantic validation
│   │   └── utils/                         # Security utilities
│   ├── requirements.txt                   # Python dependencies
│   ├── run.py                             # Start script
│   └── piar.db                            # SQLite database
│   └── migrations/                         # SQL migrations (SQLite)
│
├── 📁 frontend/
│   ├── UX_STANDARDS.md                    # ✨ NUEVO: Guía de estilos
│   ├── src/
│   │   ├── pages/                         # 13 React pages
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ClubDetail.tsx
│   │   │   ├── CreateClub.tsx
│   │   │   ├── ClubMembers.tsx            # NEW Phase 7
│   │   │   ├── CreateNews.tsx             # NEW Phase 8
│   │   │   ├── EditNews.tsx               # NEW Phase 8
│   │   │   ├── CreateEvent.tsx            # NEW Phase 8
│   │   │   ├── EditEvent.tsx              # NEW Phase 8
│   │   │   ├── Profile.tsx                # NEW Phase 7
│   │   │   ├── Settings.tsx               # NEW Phase 7
│   │   │   └── AcceptInvitation.tsx
│   │   ├── components/
│   │   │   ├── Navbar.tsx                 # Updated Phase 7
│   │   │   ├── NewsList.tsx               # Updated Phase 8
│   │   │   ├── EventList.tsx              # Updated Phase 8
│   │   │   └── ProtectedRoute.tsx
│   │   ├── styles/                        # CSS files including Forms.css
│   │   ├── services/
│   │   │   └── api.ts                     # HTTP client
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx            # Global state
│   │   └── App.tsx                        # Router
│   ├── package.json
│   ├── vite.config.ts
│   ├── .env                               # VITE_API_URL, app metadata
│   └── index.html
│
└── 📁 docs/
    └── 📚 Esta carpeta
```

---

## 🚀 Cómo Usar Esta Documentación

### Para Empezar (5-10 minutos)
1. Lee **README.md** - ¿Qué es PIAR?
2. Lee sección "Instalación Rápida" del README
3. Ejecuta siguiendo los pasos

### Para Entender la Arquitectura (15-20 minutos)
1. Lee **REQUISITOS_TÉCNICOS.md** - Estructura BD
2. Lee **CARACTERÍSTICAS_FUNCIONALES.md** - Features
3. Revisa endpoint list en README.md

### Para Saber Estado Phase 7 (10-15 minutos)
1. Lee **PHASE_7_SUMMARY.md** - Resumen
2. Lee **PHASE_7_STATUS.md** - Detalles
3. Revisa checklist y progreso

### Para Desarrollar (30-60 minutos)
1. Másfondo técnico en requisitos
2. Entiende flujos en características
3. Revisa endpoints en README
4. Comienza desarrollo

---

## 📱 Pantallas Disponibles en Phase 7

### Públicas (Sin Login)
| URL | Descripción |
|-----|-----------|
| `/auth/login` | Login con email/contraseña |
| `/auth/registro` | Registro de nuevo usuario |
| `/auth/aceptar-invitacion` | Aceptar invitación desde email |

### Protegidas (Con Login)
| URL | Descripción |
|-----|-----------|
| `/` | Dashboard principal |
| `/clubes/crear` | Crear nuevo club |
| `/clubes/:id` | Ver detalle del club |
| `/clubes/:id/miembros` | Gestionar miembros |
| `/clubes/:id/noticias/crear` | Publicar noticia (Admin) |
| `/clubes/:id/noticias/:id/editar` | Editar noticia (Admin) |
| `/clubes/:id/eventos/crear` | Crear evento (Admin) |
| `/clubes/:id/eventos/:id/editar` | Editar evento (Admin) |
| `/perfil` | Mi perfil ✨ NEW |
| `/configuracion` | Configuración ✨ NEW |

---

## 📊 Servicios API

### Backend (FastAPI)
- **URL:** http://localhost:8000
- **Docs:** http://localhost:8000/docs (Swagger)
- **ReDoc:** http://localhost:8000/redoc
- **Endpoints:** 27+

### Frontend (Vite)
- **Dev URL:** http://localhost:5174 (o 5173)
- **Build:** `npm run build`
- **Preview:** `npm run preview`

---

## 🛠️ Stack Tecnológico Resumen

### Backend
```
FastAPI 0.104.1 ← Web framework
SQLAlchemy 2.0.23 ← ORM
Pydantic 2.5.0 ← Validation
bcrypt 4.1.1 ← Password hashing
JWT ← Authentication tokens
```

### Frontend
```
React 18.2.0 ← UI library
TypeScript 5.3.3 ← Type safety
Vite 5.4.21 ← Build tool
React Router 6.20 ← SPA routing
CSS3 ← Styling
```

---

## 📈 Progreso MVP (85% Completado)

```
Autenticación:       100% ✅
Backend API:         100% ✅
Frontend UI:         100% ✅
Gestión Usuarios:    100% ✅
Gestión Clubes:      100% ✅
Google OAuth:        50% 🟡
Tests:               0% ⬜
Deployment:          0% ⬜
```

---

## 🔐 Seguridad Implementada

- ✅ JWT tokens (15 min access + 7 day refresh)
- ✅ bcrypt password hashing
- ✅ CORS configurado
- ✅ Pydantic validation
- ✅ Protected routes
- ✅ Email verification ready
- ✅ Email invitations con tokens

---

## 🔄 Próximas Fases

| Phase | Tarea | Estado |
|-------|-------|-----|
| 8 | Noticias & Eventos UI (CRUD) | ✅ Completado |
| 9 | Interacción (Comentarios, RSVP Eventos) | ⏳ Pendiente |
| 10 | Google OAuth + Tests | ⏳ Pendiente |
| 11 | Deployment (Docker, CI/CD) | ⏳ Pendiente |

---


## 📚 Referencias Externas

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev)
- [SQLAlchemy Docs](https://docs.sqlalchemy.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)

---

## 💬 Convenciones de Código

### Backend (Python/FastAPI)
- PEP 8 style
- Type hints en funciones
- Docstrings en clases/funciones
- snake_case para variables

### Frontend (React/TypeScript)
- PascalCase para componentes
- camelCase para variables
- Tipo explícito de props/state
- JSDoc para funciones complejas

---

## 🏁 Siguiente Paso

Para continuar desarrollo (Fase 9):

1. **Inscripción a Eventos:**
   - Backend: Endpoint para registrar asistencia (`POST /eventos/:id/asistir`)
   - Frontend: Botón "Inscribirse" en `EventList` y `EventDetail`
   - Gestión de aforo y listas de espera.

2. **Comentarios en Noticias:**
   - Backend: CRUD de comentarios (`/noticias/:id/comentarios`)
   - Frontend: Componente `CommentSection` en detalle de noticia.

3. **Autenticación con Google (OAuth):**
   - Configurar credenciales en Google Console.
   - Completar implementación en frontend y backend.

---

**Happy Coding! 🚀**

Documentación generada para PIAR - Sistema de Gestión de Clubs de Aeromodelismo
