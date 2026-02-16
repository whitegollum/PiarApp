# PiarAPP Frontend - PWA

Frontend Progressive Web App de PiarAPP usando React + TypeScript + Vite.

## Requisitos

- Node.js 18+
- npm o yarn

## Instalación

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Crear archivo .env:**
   ```bash
   cp .env.example .env
   ```

3. **Ejecutar servidor de desarrollo:**
   ```bash
   npm run dev
   ```

La aplicación estará disponible en `http://localhost:5173`

## Build para Producción

```bash
npm run build
```

Esto generará los archivos optimizados en la carpeta `dist/`

## Caracteristicas PWA

- Instalable en dispositivos (home screen)
- Funcionamiento offline
- Sincronizacion en background
- Service Worker automatico
- Manifest.json configurado
- Responsive mobile-first

## Estructura del Proyecto

```
frontend/
├── public/
│   ├── icons/               # Iconos PWA
│   ├── splash-screens/      # Splash screens
│   └── manifest.json        # PWA Manifest
├── src/
│   ├── components/          # Componentes React
│   ├── pages/               # Páginas
│   ├── services/            # Servicios API
│   ├── store/               # Redux/Pinia store
│   ├── hooks/               # Custom hooks
│   ├── types/               # Tipos TypeScript
│   ├── utils/               # Utilidades
│   ├── styles/              # CSS global
│   ├── App.tsx              # Componente raíz
│   └── index.tsx            # Punto de entrada
├── package.json
├── vite.config.ts
├── tsconfig.json
└── .env.example
```

## Estado actual

- Autenticacion completa (login/registro y sesiones).
- Modulos de clubes, miembros, noticias y eventos visibles en UI.
- Perfil con edicion de datos y cambio de contrasena.
- Configuracion con preferencias basicas.
- Vista de Código de Acceso a instalaciones (Socios).
- Gestión de acceso a instalaciones (Admin del club).

## Proximos pasos

1. Completar callback de Google OAuth en frontend.
2. Mejorar offline y sincronizacion.
3. Agregar tests (unitarios y E2E).

## Variables de Entorno

```
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=PiarAPP
VITE_APP_VERSION=0.1.0
```

## Scripts Disponibles

- `npm run dev` - Iniciar servidor de desarrollo
- `npm run build` - Build para producción
- `npm run preview` - Preview del build
- `npm run lint` - Ejecutar linter
- `npm run type-check` - Verificar tipos TypeScript
