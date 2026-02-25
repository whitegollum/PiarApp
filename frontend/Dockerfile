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
# Variables en build time para Vite
ARG VITE_API_URL
ARG VITE_APP_NAME
ARG VITE_APP_VERSION
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GOOGLE_REDIRECT_URI

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_NAME=${VITE_APP_NAME}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV VITE_GOOGLE_REDIRECT_URI=${VITE_GOOGLE_REDIRECT_URI}

RUN printf "VITE_API_URL=%s\nVITE_APP_NAME=%s\nVITE_APP_VERSION=%s\nVITE_GOOGLE_CLIENT_ID=%s\nVITE_GOOGLE_REDIRECT_URI=%s\n" \
	"$VITE_API_URL" \
	"$VITE_APP_NAME" \
	"$VITE_APP_VERSION" \
	"$VITE_GOOGLE_CLIENT_ID" \
	"$VITE_GOOGLE_REDIRECT_URI" \
	> .env.production

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
