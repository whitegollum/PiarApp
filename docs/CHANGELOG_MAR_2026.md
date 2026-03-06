# 📝 Changelog - Marzo 2026

## Fase 8.2: Sistema de Productos, Validación y Mejoras de UX

### 🎯 Resumen
Implementación completa del sistema de productos de afiliación, mejoras significativas en validación de formularios, logging detallado para debugging, y nueva sección de contenido reciente por club.

---

## 🛒 Sistema de Productos/Tienda (Afiliación)

### Backend
**Archivos nuevos/modificados:**
- `backend/app/models/producto.py` - Nuevo modelo `ProductoAfiliacion`
- `backend/app/schemas/producto.py` - Schemas Pydantic para validación
- `backend/app/routes/productos.py` - Endpoints CRUD completos

**Endpoints implementados:**
- `GET /api/clubes/{club_id}/productos` - Listar productos (activos para miembros, todos para admin)
- `POST /api/clubes/{club_id}/productos` - Crear producto (solo admin)
- `GET /api/clubes/{club_id}/productos/{producto_id}` - Obtener producto
- `PUT /api/clubes/{club_id}/productos/{producto_id}` - Actualizar producto (solo admin)
- `DELETE /api/clubes/{club_id}/productos/{producto_id}` - Eliminar producto (solo admin)

**Modelo ProductoAfiliacion:**
```python
- id: int
- club_id: int
- nombre: str (max 200 chars)
- descripcion: str (max 1000 chars)
- url_afiliacion: str (max 500 chars)
- imagen_url: str | None
- precio_referencia: float | None
- activo: bool (default True)
- fecha_creacion: datetime
```

### Frontend
**Archivos nuevos:**
- `frontend/src/pages/ProductCatalog.tsx` - Catálogo público de productos
- `frontend/src/pages/ManageProducts.tsx` - Panel de administración
- `frontend/src/pages/CreateProduct.tsx` - Formulario crear producto
- `frontend/src/pages/EditProduct.tsx` - Formulario editar producto
- `frontend/src/services/productService.ts` - Servicio API productos
- `frontend/src/styles/Products.css` - Estilos específicos

**Integración:**
- Tab "Tienda" agregado en `ClubDetail.tsx`
- Enlace "Administrar Productos" en menú dropdown de acciones
- Grid responsivo: 3 columnas desktop → 1 columna móvil
- Cards con imagen, nombre, descripción, precio y botón de afiliación

---

## ✅ Validación Mejorada

### HTML5 Validation
**Formularios actualizados:**
- `CreateNews.tsx` / `EditNews.tsx`:
  - Título: `minLength={5}`, `maxLength={200}`
  - Contenido: `minLength={10}`, `maxLength={10000}`
  
- `CreateEvent.tsx` / `EditEvent.tsx`:
  - Nombre: `minLength={5}`, `maxLength={200}`
  - Descripción: `minLength={10}`, `maxLength={10000}`

**Beneficios:**
- Validación client-side previene envíos inválidos
- Mensajes de error nativos del navegador
- Mejora UX (feedback inmediato)

### Backend Validation Logging
**Archivos modificados:**
- `backend/app/main.py`:
  - Import `RequestValidationError` de FastAPI
  - Configuración `logging.basicConfig` con nivel INFO
  - Exception handler personalizado para validación 422

**Ejemplo de log:**
```
2026-03-06 00:36:33 - app.main - ERROR - Validation error on http://localhost:8000/api/clubes/1/noticias
2026-03-06 00:36:33 - app.main - ERROR - Errors: [{'type': 'string_too_short', 'loc': ('body', 'contenido'), 'msg': 'String should have at least 10 characters', 'input': 'dawdaw', ...}]
```

**Frontend Error Handling:**
- Parseo de arrays de errores de Pydantic
- Traducción de nombres de campos a español
- Mensajes específicos por campo fallido

### Pydantic v2 Compatibility
**Schema fixes:**
- `backend/app/schemas/noticia.py`:
  - Field validator con `mode='before'` para conversión pre-tipo
  - Conversión de empty strings → None para campos opcionales
  - Categoria y imagen_url como `Optional[str]`

**Ejemplo:**
```python
@field_validator('imagen_url', 'categoria', mode='before')
@classmethod
def empty_string_to_none(cls, v):
    if v == "" or v is None:
        return None
    return v
```

---

## 📅 Fix de DateTime en Eventos

**Problema:** Frontend enviaba `2026-03-06`, backend esperaba `2026-03-06T00:00:00`

**Solución:**
- `CreateEvent.tsx` / `EditEvent.tsx`:
  - Combinación de fecha + hora antes de enviar
  - Formato: `fecha_inicio + 'T' + (hora_inicio || '00:00:00')`
  - Default hora fin: `23:59:59` si no se especifica

**Código:**
```typescript
const fechaInicioDatetime = formData.fecha_inicio + 'T' + (formData.hora_inicio || '00:00:00');
const fechaFinDatetime = formData.fecha_fin 
    ? formData.fecha_fin + 'T' + (formData.hora_fin || '23:59:59')
    : null;
```

---

## 🆕 Contenido Reciente del Club

### Backend
**Archivo:** `backend/app/routes/clubes.py`

**Nuevo endpoint:**
- `GET /api/clubes/{club_id}/contenido-reciente`
- Devuelve máximo 3 elementos más recientes del club
- Incluye: última noticia publicada, último evento, último producto activo
- Ordenados por fecha descendente
- Verifica membresía del usuario

**Response schema:**
```python
class RecentContentItem(BaseModel):
    tipo: str  # "noticia", "evento", "producto"
    id: int
    titulo: str
    descripcion: str | None
    fecha: datetime
```

### Frontend
**Archivos modificados:**
- `frontend/src/pages/ClubDetail.tsx`:
  - Nuevo state `contenidoReciente`
  - Fetch en paralelo con otros datos del club
  - Sección "🆕 Novedades Recientes" en tab "Resumen"
  - Cards clicables que navegan a sección correspondiente

**Diseño:**
- Badges de colores por tipo:
  - 📰 Noticia (azul #2196F3)
  - 📅 Evento (verde #4CAF50)
  - 🛒 Producto (naranja #FF9800)
- Grid responsivo con max 3 items
- Descripción truncada a 200 caracteres

**CSS:** `frontend/src/styles/ClubDetail.css`
- Clase `.recent-content-section`
- Hover effects y transiciones
- Responsive: 3 columnas → 1 en móvil

**Nota importante:** 
- ❌ Removida sección de dashboard general (`Dashboard.tsx`)
- ✅ Implementada en club detail (contexto específico del club)

---

## 🧪 Testing

### Tests Unitarios Actualizados
**Archivo:** `backend/tests/test_noticias.py`

**Mejoras:**
- Helper `_set_superadmin()` para crear usuarios con permisos
- Modificado `create_user_and_login()` con parámetro `make_superadmin`
- Ambos tests ahora crean superadmin (necesario para crear clubs)

**Resultados:**
```
tests/test_noticias.py::test_noticias_crud PASSED
tests/test_noticias.py::test_noticias_permissions PASSED
======================== 2 passed in 4.27s =========================
```

### Schema Validation Test
**Archivo:** `backend/test_schema_validation.py` (temporal)

**Casos de prueba:**
1. ✅ Empty string imagen_url → None
2. ✅ Null imagen_url → accepted
3. ✅ Minimal data → defaults applied

**Resultado:** 3/3 tests PASSED

---

## 📊 Impacto en Documentación

### Archivos actualizados:
1. **`docs/DEVELOPMENT_PHASES.md`:**
   - Nueva fase 8.2 documentada
   - Tienda marcada como ✅ Completada
   - Descripción detallada de features

2. **`docs/TESTING_PLAN.md`:**
   - Nuevos casos de prueba: CU-043 a CU-053
   - Módulo 7: Productos y Tienda
   - Módulo 8: Validación y Manejo de Errores
   - Tabla de resumen actualizada

3. **`docs/CHANGELOG_MAR_2026.md`:** (este archivo)
   - Resumen completo de cambios

---

## 🔧 Detalles Técnicos

### Dependencias sin cambios
- No se requirieron nuevas dependencias npm o pip
- Compatible con Pydantic v2.x existente
- Compatible con React 18 y FastAPI actual

### Base de Datos
**Migración pendiente:** 
- Modelo `ProductoAfiliacion` registrado en SQLAlchemy
- Tabla se crea automáticamente en desarrollo (SQLite)
- Para producción: generar migración Alembic explícita

### Performance
- Queries optimizadas con `order_by` y `first()` en lugar de `all()[0]`
- Contenido reciente limita a 3 elementos (no paginación necesaria)
- Fetch paralelo en frontend reduce tiempo de carga

---

## 🐛 Bugs Corregidos

### 1. Error 422 en Noticias
**Síntoma:** Frontend enviaba datos válidos pero backend rechazaba con 422

**Causa raíz:** 
- Campo `contenido` con menos de 10 caracteres llegaba al backend
- No había validación client-side

**Solución:**
- Validación HTML5 con `minLength`
- Exception handler para loggear detalles
- Mensajes traducidos en frontend

### 2. Error 422 en Eventos (datetime)
**Síntoma:** `Input should be a valid datetime, invalid datetime separator, expected T`

**Causa raíz:**
- Input type="date" envía solo fecha: `2026-03-06`
- Backend esperaba ISO datetime: `2026-03-06T00:00:00`

**Solución:**
- Combinación fecha + hora en frontend antes de enviar
- Default hora 00:00:00 si no se especifica

### 3. Cards de Stats Redundantes
**Síntoma:** Cards de Miembros/Noticias/Eventos ocupaban espacio innecesario

**Solución:**
- Removidas del tab "Resumen" de ClubDetail
- Información disponible en pestañas específicas

---

## 📈 Métricas de Código

### Archivos nuevos: 12
- Backend: 3 (producto.py, schemas, routes)
- Frontend: 7 (catalog, manage, create/edit, service, types)
- Docs: 2 (changelog, updates)

### Archivos modificados: 15+
- Backend: main.py, clubes.py, schemas (noticias, eventos)
- Frontend: ClubDetail, CreateNews, EditNews, CreateEvent, EditEvent, Dashboard
- Styles: ClubDetail.css, Products.css
- Docs: DEVELOPMENT_PHASES.md, TESTING_PLAN.md

### Líneas de código agregadas: ~2000+
- Backend: ~400 líneas
- Frontend: ~1200 líneas
- CSS: ~200 líneas
- Docs: ~200 líneas

---

## 🚀 Próximos Pasos

### Pendiente (Fase 9):
- [ ] Migración a PostgreSQL
- [ ] Tests E2E con Cypress/Playwright
- [ ] PWA offline capabilities
- [ ] Notificaciones push
- [ ] Integración pagos (cuotas de socios)

### Mejoras futuras:
- [ ] Soft delete para productos (activo=false vs DELETE hard)
- [ ] Paginación en catálogo de productos (si >50 items)
- [ ] Filtros/búsqueda en catálogo
- [ ] Estadísticas de clicks en enlaces de afiliación
- [ ] Upload de imágenes real (S3/Azure Blob)

---

## 👥 Créditos
**Fase implementada por:** GitHub Copilot Agent
**Fecha:** Marzo 2026
**Versión:** 8.2

---

**Documento generado automáticamente**
*Última actualización: 06/03/2026*
