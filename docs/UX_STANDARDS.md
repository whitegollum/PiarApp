# Estándares de UX/UI - PiarAPP

Este documento define los lineamientos de diseño y experiencia de usuario para garantizar una consistencia visual y funcional en toda la aplicación.

## 1. Estructura de Páginas de Formulario

Para mantener la consistencia, todas las páginas de creación y edición (formularios) deben seguir esta estructura:

- **Layout**: Usar `<Navbar />` seguido de un contenedor `<main className="form-main">`.
- **Contenedor**: El contenido debe estar dentro de `<div className="form-container">`.
- **Encabezado**:
  - `<h1>` para el título principal.
  - `<p className="subtitle">` para descripciones breves.
- **Formulario**:
  - Etiqueta `<form className="form">`.
  - Campos envueltos en `<div className="form-group">`.
  - Etiquetas `<label>` claras con asterisco (*) para campos obligatorios.
  - Botones de acción en `<div className="form-actions">`.

**Nota:** Las pantallas de administración que incluyan formularios (configuraciones globales, paneles superadmin) deben seguir exactamente esta estructura y reutilizar `Forms.css`.

## 2. Sistema de Estilos (CSS)

La aplicación utiliza **CSS Modules/Global CSS** con variables CSS, no frameworks como Tailwind (aunque esté instalado, no se usa activamente en componentes nuevos para mantener consistencia con el legado).

### Variables Principales (`App.css`)
- `--color-primary`: `#E91E63` (Rosa principal)
- `--color-bg`: `#FFFFFF` (Fondo)
- `--color-card`: `#FFFFFF` (Fondo de tarjetas/formularios)
- `--color-text`: `#1E1E1E` (Texto principal)
- `--color-border`: `#E5E5E5` (Bordes)

### Clases de Utilidad (`Forms.css`)
- `.form-layout`: Wrapper principal.
- `.form-container`: Tarjeta centrada con sombra (max-width: 600px).
- `.btn-primary`: Botón de acción principal.
- `.btn-secondary`: Botón de cancelar/volver.
- `.alert-error`: Mensajes de error.

### Iconos (`lucide-react`)
La aplicación usa **[lucide-react](https://lucide.dev/)** como librería de iconos SVG. Convenciones:
- Importar solo los iconos necesarios: `import { Home, Users } from 'lucide-react'`.
- Tamaño por defecto: `size={22}` en la bottom tab bar, `size={20}` en listas/sheets.
- No usar emojis (ej. `🏠`, `📰`)
- El color se hereda del `color` CSS del padre; no pasar `color` como prop salvo excepciones.

## 3. Comportamiento de Formularios

- **Validación**:
  - HTML5 `required` para validación básica.
  - Validación en el `handleSubmit` para lógica compleja.
  - Mostrar errores en un bloque `.alert-error` al inicio del formulario.
- **Feedback**:
  - Deshabilitar botones de envío (`disabled={loading}`) durante la petición.
  - Cambiar texto del botón a "Guardando..." o "Creando...".
- **Navegación**:
  - Redirigir al listado o detalle tras éxito.
  - Botón "Cancelar" siempre navega atrás (`navigate(-1)`).

  ## 3.1. Botones de OAuth Social

  - Ubicar el botón "Continuar con Google" debajo del formulario principal con separación visual.
  - Mantener el ancho completo del botón para consistencia con `.btn-primary`.
  - Usar texto claro y consistente: "Continuar con Google" (no "Login with Google").

## 4. Listados y Tarjetas

Para mostrar colecciones de datos (Noticias, Eventos, etc.) se aplica un sistema de diseño consistente:

### Estructura general de página de listado

```
header-actions          →  h1 + btn-sm "+ Nuevo"  (flex, nowrap)
tabs (pill-tabs)        →  "Recientes · N" / "Anteriores · N"  (filtro principal)
group-label             →  "ESTA SEMANA", "ESTE MES", "MÁS ADELANTE"  (agrupación temporal)
cards                   →  tarjetas blancas con borde fino, sin fondo coloreado
```

- **Encabezado**: `<div className="header-actions">` con `<h1>` + `<button className="btn btn-primary btn-sm">`.
- **Tabs de filtro**: Pill-shaped tabs (`.event-tab` / `.content-tab`) con estado `.active` (fondo oscuro, texto blanco). Muestran el conteo: `"Próximos · 4"`.
- **Agrupación temporal**: Encabezados `<h3>` con clase `.event-group-label` / `.content-group-label` en mayúsculas, gris claro, tracking amplio (`letter-spacing: 0.08em`).
- **Tarjetas**: Fondo blanco, `border: 1px solid #e5e7eb`, `border-radius: 12px`. Sin fondos de color ni sombras fuertes. Hover sutil: `box-shadow: 0 2px 8px rgba(0,0,0,0.08)`.

### Patrón de tarjeta de contenido

Cada tarjeta sigue una estructura vertical con jerarquía clara:

1. **Título** — `font-weight: 700`, enlazable al detalle. Acciones admin en menú kebab (`⋮`) a la derecha.
2. **Meta** — Fecha, hora, ubicación en texto gris pequeño (`0.8rem`, `color: #9ca3af`) con iconos lucide (`size={14}`).
3. **Indicadores cuantitativos** — Barras de progreso para aforo/capacidad con colores semánticos:
   - `#22c55e` (verde) — "Hay sitio"
   - `#eab308` (amarillo) — "Llenándose"  
   - `#d97706` (ámbar) — "Casi completo"
4. **Contenido** — Extracto de texto, máximo ~120 caracteres con `...`.
5. **CTA principal** — Un solo botón de acción primaria por tarjeta (`"Inscribirme"`, `"Leer más"`). Botón con borde, fondo blanco, hover invierte.
6. **Prueba social** — Fila de avatares inline + `"+ N socios inscritos"` como enlace clicable al detalle.

### Categorías y tipos

- **Ocultar tipos genéricos**: Si el tipo/categoría es genérico (e.g., "Otro", "Social", "General"), no mostrar pill. Solo mostrar cuando aporta señal semántica (e.g., "Solo socios", "Urgente", "Curso").
- **Pill de categoría**: `border-radius: 10px`, `font-size: 0.65rem`, `text-transform: uppercase`, fondo suave con texto contrastado.

### Acciones admin

- **Kebab menu** (`⋮`): Botón `<MoreVertical size={18} />` en la esquina superior derecha de la tarjeta. Menú desplegable con `position: absolute`, `border-radius: 8px`, `box-shadow`. Contiene acciones como "Editar evento", "Editar noticia".
- **No mezclar acciones de admin con acciones de usuario**: Inscribirme (usuario) va como CTA; Editar (admin) va en kebab.

### Densidad visual

- Tarjetas blancas sobre fondo gris (`#f9fafb` o heredado del layout).
- Bordes finos (`1px solid #e5e7eb`), sin `box-shadow` en reposo.
- `border-radius: 12px` para tarjetas.
- Espaciado entre tarjetas: `gap: 0.75rem` dentro de cada grupo.
- Grupos separados por `margin-top: 1rem`.

### CSS de referencia

- **Eventos**: `EventList.css` — tabs `.event-tab`, cards `.event-card-v2`, groups `.event-group-label`
- **Noticias**: `NewsList.css` — tabs `.content-tab`, cards `.news-card-v2`, groups `.content-group-label`

### 4.1 Listado de Miembros (ClubMembers)
- Acciones de administración deben consolidarse en un solo desplegable por usuario.
- El desplegable muestra solo opciones permitidas (por rol/estado y evitando acciones sobre sí mismo).
- En móvil, el avatar va en columna izquierda y el nombre/correo a la derecha.
- El estado (Activo/Pendiente/Inactivo) se muestra como etiqueta compacta bajo el avatar en móvil.

### 4.2 Perfil de Socio
- Mostrar selector de club antes del formulario.
- Mantener campos personales en una sola tarjeta con acciones al final.
- La foto de carnet debe mostrar previsualizacion con placeholder si falta.
- La carga de foto se realiza desde el mismo formulario, no en pantallas separadas.

## 5. Accesibilidad

- Todos los inputs deben tener un `id` y un `label` asociado con `htmlFor`.
- Contraste de colores adecuado (texto oscuro sobre fondo claro).
- Indicadores de foco visibles en inputs y botones.
