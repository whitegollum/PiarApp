# PIAR Frontend - PWA

Frontend Progressive Web App de PIAR usando React + TypeScript + Vite.

## Requisitos

- Node.js 18+
- npm или yarn

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

## Características PWA

- ✅ Instalable en dispositivos (home screen)
- ✅ Funcionamiento offline
- ✅ Sincronización en background
- ✅ Service Worker automático
- ✅ Manifest.json configurado
- ✅ Responsive mobile-first

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

## Próximos Pasos

1. Crear componentes de autenticación
2. Implementar gestión de estado (Redux)
3. Crear servicios API
4. Implementar IndexedDB para datos offline
5. Crear componentes de club, noticias, eventos
6. Agregar tests

## Variables de Entorno

```
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=PIAR
VITE_APP_VERSION=0.1.0
```

## Scripts Disponibles

- `npm run dev` - Iniciar servidor de desarrollo
- `npm run build` - Build para producción
- `npm run preview` - Preview del build
- `npm run lint` - Ejecutar linter
- `npm run type-check` - Verificar tipos TypeScript
