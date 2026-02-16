# PiarAPP Backend

Backend de la aplicacion de gestion de clubes de aeromodelismo usando FastAPI.

## Requisitos

- Python 3.10+
- pip o poetry

## Configuración

1. **Crear archivo .env:**
   ```bash
   cp .env.example .env
   ```

2. **Instalar dependencias:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Ejecutar servidor:**
   ```bash
   python -m uvicorn app.main:app --reload
   ```

El servidor estará disponible en `http://localhost:8000`

## API Documentation

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Estructura del Proyecto

```
backend/
├── data/                # Datos persistentes
├── app/
│   ├── models/          # Modelos de SQLAlchemy
│   ├── schemas/         # Schemas de Pydantic
│   ├── routes/          # Endpoints de la API
│   ├── services/        # Lógica de negocio
│   ├── database/        # Configuración de BD
│   ├── middleware/      # Middleware personalizado
│   ├── config.py        # Configuración
│   └── main.py          # Punto de entrada
├── uploads/             # Carpeta para archivos subidos
├── tests/               # Tests unitarios
├── requirements.txt     # Dependencias Python
└── .env.example         # Variables de entorno ejemplo
```

## Estado actual

- Autenticacion JWT y refresh token.
- Google OAuth backend listo.
- Modulos de clubes, miembros, noticias, eventos e invitaciones.
- Perfil de usuario con ver y editar datos, cambio de contrasena.
- Gestión de código de acceso a instalaciones (club_id).

## Proximos pasos

1. Agregar tests unitarios e integracion.
2. Mejorar cobertura de validaciones y errores.
3. Preparar migraciones y despliegue.

## Variables de Entorno

Consultar `.env.example` para la lista completa de variables requeridas.
