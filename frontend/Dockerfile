# Stage 1: Build the frontend
FROM node:20-alpine AS build

WORKDIR /app

# Copiar configuración de dependencias y lock files
COPY package.json package-lock.json ./

# Instalar dependencias
RUN npm install

# Copiar el código fuente
COPY . .

# Construir la aplicación para producción
# Establecer variable de entorno para la construcción (para que use paths relativos o proxy)
ENV VITE_API_URL=/api
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Eliminar configuración por defecto de nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar nuestra configuración personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos construidos desde el stage anterior
COPY --from=build /app/dist /usr/share/nginx/html

# Exponer el puerto
EXPOSE 80

# Iniciar Nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]
