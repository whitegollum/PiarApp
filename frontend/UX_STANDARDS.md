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

## 4. Listados y Tarjetas

Para mostrar colecciones de datos (Noticias, Eventos):
- Usar Grid Layout responsive.
- Tarjetas con sombra suave y border-radius consistente (12px).
- Imágenes con `object-fit: cover`.
- Fechas formateadas consistentemente (`new Date().toLocaleDateString()`).

## 5. Accesibilidad

- Todos los inputs deben tener un `id` y un `label` asociado con `htmlFor`.
- Contraste de colores adecuado (texto oscuro sobre fondo claro).
- Indicadores de foco visibles en inputs y botones.
