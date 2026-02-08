# PiarAPP - Sistema de Gestion de Clubes de Aeromodelismo

MVP (Phase 7) - Version 0.7.0
Estado: En progreso

Plataforma web para la gestion de clubes de aeromodelismo con autenticacion segura, multitenancy y gestion de membresias.

---

## Estado actual (Phase 7)

### Completado
- Backend con autenticacion JWT, refresh token, invitaciones y modulos de clubes, noticias y eventos.
- Frontend con login/registro, dashboard, clubes, miembros, perfil y configuracion.
- Perfil de usuario con edicion de datos y cambio de contrasena.
- Gestion de clubes con roles, invitaciones y manejo de miembros.

### En progreso
- Google OAuth callback en frontend (backend listo).
- Testing (pytest, React tests, E2E).
- Deployment (Docker, CI/CD).

---

## Caracteristicas principales

### Autenticacion y seguridad
- Email/Contrasena (8+ caracteres).
- Google OAuth 2.0 (backend listo para integracion).
- JWT con refresh token.
- Contrasenas con bcrypt.
- Invitaciones por email con tokens.
- Rutas protegidas con ProtectedRoute.

### Gestion de clubes
- Crear, ver y editar clubes.
- Gestion de miembros y roles.
- Invitaciones por email.

### Perfil de usuario
- Ver y editar informacion personal.
- Cambiar contrasena.
- Preferencias basicas en configuracion.

### Contenido del club
- Noticias y anuncios (CRUD).
- Eventos (CRUD).
- Votaciones y socios con endpoints listos.

---

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

---

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
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── services/
│   │   └── styles/
│   ├── package.json
│   └── vite.config.ts
├── PRUEBAS_FUNCIONALES.md
├── PHASE_7_STATUS.md
└── REQUISITOS_TÉCNICOS.md
```

---

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
Axios (via APIService)
```

### Database
```
SQLite (desarrollo)
PostgreSQL (produccion)
```

---

## API endpoints (principales)

Base URL: /api

### Autenticacion
```
POST   /auth/login
POST   /auth/registro
POST   /auth/registrarse-desde-invitacion
POST   /auth/google-login
POST   /auth/refresh-token
POST   /auth/logout
GET    /auth/invitaciones/pendientes
POST   /auth/invitaciones/aceptar/{token}
POST   /auth/invitaciones/rechazar/{token}
GET    /auth/usuarios/me
PUT    /auth/usuarios/me
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

---

## Seguridad implementada

| Aspecto | Implementacion |
|--------|----------------|
| Contrasenas | bcrypt + salt automatico |
| Access token | JWT 15 minutos |
| Refresh token | JWT 7 dias |
| Almacenamiento | localStorage (frontend) |
| CORS | Configurado para localhost:5173 |
| Invitaciones | Tokens criptograficos unicos |
| Roles | Administrador / Miembro |

---

## Flujos de usuario principales

### Registro
```mermaid
graph LR
    A[Registro] -> B[Email/Contrasena] -> C[Confirmar] -> D[Login] -> E[Dashboard]
```

### Crear club
```mermaid
graph LR
    A[Dashboard] -> B[Crear club] -> C[Formulario] -> D[Club creado] -> E[Admin automatico]
```

### Invitar miembros
```mermaid
graph LR
    A[Club] -> B[Miembros] -> C[Invitar] -> D[Email] -> E[Usuario acepta] -> F[Unido]
```

### Perfil de usuario
```mermaid
graph LR
    A[Navbar] -> B[Mi perfil] -> C[Editar datos o contrasena] -> D[Guardado]
```

---

## Testing

```bash
cd backend
pytest tests/

cd frontend
npm test
```

---

## Despliegue

```bash
docker-compose build
docker-compose up
```

---

## Solucionar problemas

### Backend no inicia
```bash
python --version
pip install -r requirements.txt
python run.py
```

### Frontend no se conecta
1. Backend corriendo en 8000.
2. CORS configurado en app/main.py.
3. .env correcto en frontend/.env.

---

## Documentacion adicional

- [PHASE_7_STATUS.md](PHASE_7_STATUS.md)
- [CARACTERÍSTICAS_FUNCIONALES.md](CARACTERÍSTICAS_FUNCIONALES.md)
- [REQUISITOS_TÉCNICOS.md](REQUISITOS_TÉCNICOS.md)
- [PRUEBAS_FUNCIONALES.md](PRUEBAS_FUNCIONALES.md)

---

## Links utiles

| Link | URL |
|------|-----|
| Frontend dev | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| API Docs (ReDoc) | http://localhost:8000/redoc |
| OpenAPI Spec | http://localhost:8000/openapi.json |

---

## Proximos pasos

- Completar callback de Google OAuth en frontend.
- Agregar tests basicos en backend y frontend.
- Preparar pipeline de CI/CD y despliegue.

---

## Contribuir

1. Fork el proyecto
2. Crea rama: `git checkout -b feature/AmazingFeature`
3. Commit: `git commit -m 'Add AmazingFeature'`
4. Push: `git push origin feature/AmazingFeature`
5. Abre Pull Request

---

## Licencia

Licensed under the MIT License - ver archivo LICENSE para detalles.

---

## Soporte

- Bugs: abrir issue en GitHub
- Sugerencias: Discussions en GitHub
- Email: contacto@piar.app

---

Ultima actualizacion: 2026 - Phase 7
Version: 0.7.0 - MVP Core Features
Estado: MVP funcional en validacion

Desarrollado por el equipo PiarAPP

