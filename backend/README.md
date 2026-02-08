# PIAR Backend

Backend de la aplicación de Gestión de Clubs de Aeromodelismo usando FastAPI.

## Requisitos

- Python 3.10+
- pip или poetry

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

## Próximos Pasos

1. Implementar autenticación con JWT
2. Implementar Google OAuth 2.0
3. Implementar sistema de invitaciones
4. Crear servicios para cada módulo
5. Implementar validaciones
6. Agregar tests

## Variables de Entorno

Consultar `.env.example` para la lista completa de variables requeridas.
