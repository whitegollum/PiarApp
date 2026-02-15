# Sistema de Gestión de Clubs de Aeromodelismo

## 1. Características Funcionales

### 1.0 Autenticación y Gestión de Clubes

#### Autenticación
- **Descripción**: Sistema de autenticación con múltiples opciones
- **Métodos disponibles**:
  - Registro/Login tradicional (email + contraseña)
    - Formulario de registro con email y contraseña
    - Validación de email (confirmación requerida)
    - Creación de cuenta local y gestión de contraseña
  - Autenticación federada con Google (OAuth 2.0)
    - Botón "Registrarse/Login con Google"
    - Crear cuenta automaticamente con datos de Google
    - Vincular cuenta Google a cuenta existente local
    - Usar foto de perfil de Google (opcional)
  - Recuperación de contraseña por email
- **Opciones de Registro**:
  - Opción 1: Usar Google OAuth
    - Clic en "Registrarse con Google"
    - Autorizar acceso a datos básicos (nombre, email, foto)
    - Cuenta creada automáticamente
    - Perfil completado con datos de Google
  - Opción 2: Registrarse con Email y Contraseña
    - Clic en "Registrarse"
    - Introducir email y contraseña fuerte
    - Confirmar email por enlace
    - Completar datos de perfil
- **Funcionalidades**:
  - Login seguro con JWT
  - Refresh tokens
  - Two-Factor Authentication (2FA) opcional
  - Cierre de sesión
  - Cambio de contraseña
  - Perfil de usuario global (información base)
  - Vincular/desvincular Google de cuenta existente
- **Validaciones**:
  - Email válido
  - Contraseña fuerte (si usa registro local)
  - Confirmación de email para cuentas locales
  - Verificación de identidad para operaciones críticas
  - Prevención de duplicate accounts (google + email local)

#### Gestión de Clubes (Multitenancy)
- **Descripción**: Soporte para múltiples clubes independientes en la misma plataforma
- **Creación de Clubs**:
  - Los superadministradores crean clubes
  - Datos básicos: nombre, descripción, dirección
  - Se asigna automáticamente un administrador propietario
  - Cada club obtiene un código/slug único (ej: "club-aero-madrid")
- **Afiliación a Clubes**:
  - Un usuario puede ser miembro de múltiples clubes
  - Roles diferentes por club (admin, editor, moderador, socio)
  - Estado de membresía (activo, pendiente aprobación, suspendido)
  - **Solo los administradores pueden añadir usuarios al club**
  - Los usuarios NO pueden buscar ni explorar clubes por su cuenta
  - Los usuarios NO pueden solicitar unirse a clubes
  - Si el usuario está registrado: admin lo añade directamente
  - Si el usuario NO está registrado: recibe email de invitación para registrarse
  - Sistema valida que la invitación sea válida y única
  - Abandono de club (auto-gestión)
- **Personalización por Club**:
  - Logo/Imagen del club
  - Colores principales (navbar, botones, temas)
  - Nombre personalizado
  - Descripción y bienvenida
  - Datos de contacto (email, teléfono)
  - Redes sociales vinculadas
  - URL personalizada (subdomain o ruta específica)
  - Dominios personalizados (futuro)
  - Bandera/Banners personalizados
  - Footer personalizado
  - Favicon personalizado
- **Configuración del Club**:
  - Siempre requieren aprobación
  - Duración de membresía estándar
  - Cuota de membresía
  - Zona horaria del club
  - Idioma por defecto

#### Panel de Control del Club (Admin)
- **Descripción**: Administración de la configuración del club
- **Funcionalidades**:
  - Ver estadísticas del club (miembros, eventos, etc.)
  - Gestionar miembros del club
  - Gestion de contraseña de acceso
  - Gestionar roles y permisos
  - Personalizar apariencia del club
  - Ver actividad del club
  - Configurar notificaciones
  - Exportar datos del club
  - Auditoría de cambios

### 1.05 Características PWA (Progressive Web App)

#### Instalación como Aplicación
- **Descripción**: La aplicación puede instalarse como app nativa en dispositivos móviles y escritorio
- **Funcionalidades**:
  - Prompt de instalación automático en navegador (iOS, Android, Windows, macOS)
  - Opción "Agregar a pantalla de inicio" (iOS)
  - Opción "Instalar" en Chrome/Edge
  - Icono personalizado en home screen
  - Nombre de app cortado configurable por club
  - Splash screen personalizado con logo del club
  - Apertura a pantalla completa sin barras del navegador (modo standalone)
  - Orientación preferida: vertical (portrait)
- **Ventajas**:
  - Acceso rápido desde home screen
  - Experiencia similar a app nativa
  - Menor consumo de memoria que navegador
  - Acceso sin pasar por App Store/Google Play

#### Funcionamiento Offline
- **Descripción**: La aplicación funciona parcialmente sin conexión a internet
- **Datos disponibles offline**:
  - Noticias y eventos cacheados
  - Perfil del usuario
  - Información básica del club
  - Formularios guardados en IndexedDB
  - Historial de votaciones
- **Funcionalidades offline**:
  - Lectura de noticias y eventos descargados
  - Ver perfil personal
  - Rellenar formularios (se sincronizan al conectar)
  - Ver contraseña de instalaciones (si fue cacheada)
  - Pantalla "Estás offline" con información útil
- **Sincronización automática**:
  - Cuando se recupera conexión, los formularios pendientes se sincronizan
  - Se notifica al usuario si hay cambios en datos críticos
  - Caché se actualiza periódicamente en background
- **Estrategia de caché**:
  - Cache-first para assets estáticos (JS, CSS, imágenes)
  - Network-first para datos dinámicos (APIs)
  - IndexedDB para datos complejos (noticias, eventos, perfil)
  - Límite de almacenamiento: 50MB por club

#### Rendimiento y Optimización
- **Descripción**: Aplicación rápida y optimizada para móviles
- **Experiencia del usuario**:
  - Carga rápida (< 2 segundos en conexión 4G)
  - Búsqueda offline de noticias y eventos
  - Sin lags ni esperas en operaciones comunes
  - Funciona suavemente en dispositivos antiguos

#### Actualizaciones de la Aplicación
- **Descripción**: Las nuevas versiones se descargan automáticamente
- **Proceso**:
  - Service Worker detecta nuevas versiones
  - Descarga en background sin interrumpir
  - Notificación al usuario: "Nueva versión disponible"
  - Opción "Actualizar ahora" o "Más tarde"
  - Actualización inmediata sin cerrar app
  - Cambio de versión transparente
- **Push Notifications** (futuro):
  - Notificaciones push en escritorio y móvil
  - Permiso solicitado al instalar app
  - Notificaciones de: nuevas noticias, votaciones, cambios de contraseña, eventos próximos

#### Seguridad de Datos
- **Descripción**: Comunicación segura y privada
- **Características**:
  - Todo se comunica encriptado con el servidor
  - Tokens de sesión seguros
  - No hay almacenamiento de contraseñas locales
  - Datos sincronizados de forma segura

#### Interfaz Responsiva
- **Descripción**: Diseño optimizado para todos los dispositivos
- **Características**:
  - Diseño mobile-first
  - Funciona en portrait y landscape
  - Soporte para tablets con UI adaptable
  - Gesto de "swipe" para navegar entre clubes
  - Gesto "pull-to-refresh" para actualizar datos
  - Carga rápida (< 2 segundos en conexión 4G)
  - Búsqueda offline de noticias/eventos
  - Búsqueda instantánea sin esperas

#### Tema Personalizado por Club
- **Descripción**: Colors y estilos específicos por club automáticos
- **Aplicación**:
  - Color primario y secundario del club
  - Logo del club como favicon
  - Splash screen con colores del club
  - Barra de navegación personalizada
  - Estilos de botones según club
  - CSS variables dinámicas cambian al cambiar de club
  - Modo oscuro opcional (respeta preferencia del SO)
  - Tema consistente en toda la app

### 1.1 Gestión de Socios

#### Registro de Socios
- **Descripción**: Permite registrar nuevos miembros en el club
- **Datos a capturar**:
  - Nombre completo
  - Email
  - Teléfono
  - Fecha de nacimiento
  - Dirección
  - Fecha de alta en el club
  - Estado del socio (activo/inactivo)
  - Especialidades (aviones, helicópteros, drones, etc.)
- **Validaciones**:
  - Email único en el sistema
  - Campos obligatorios completos
  - Mayoría de edad (opcional según normativa)

#### Actualización de Datos de Socios
- **Descripción**: Permite modificar la información de un socio existente
- **Funcionalidades**:
  - Editar perfil personal
  - Actualizar datos de contacto
  - Cambiar especialidades
  - Actualizar estado del socio
  - Cambiar contraseña
  - Historial de cambios (auditoría)
- **Permisos**:
  - Los socios pueden actualizar sus propios datos
  - Los administradores pueden actualizar datos de cualquier socio

#### Foto de Carnet de Socio
- **Descripción**: Permite a los socios subir y gestionar su foto de carnet
- **Funcionalidades**:
  - Subir foto de carnet (JPG, PNG)
  - Cambiar foto existente
  - Visualizar foto en el perfil
  - Descargar foto de carnet (solo socio propietario y administradores)
  - Formato recomendado: 200x240px mínimo
  - Tamaño máximo: 5MB
- **Validaciones**:
  - Validar formato de imagen
  - Validar tamaño
  - Verificar que sea una foto de rostro (opcional - validación manual)
- **Almacenamiento**:
  - Guardar en carpeta segura del servidor
  - Nombre de archivo: {socio_id}_{timestamp}.{ext}
  - Generar thumbnail para listados

#### Listado y Búsqueda de Socios
- **Descripción**: Visualizar y buscar socios del club
- **Funcionalidades**:
  - Listar todos los socios activos
  - Búsqueda por nombre
  - Búsqueda por especialidad
  - Búsqueda por estado
  - Filtros combinados
  - Exportar listado (CSV/Excel)

#### Declaración Responsable de Seguro y Carnet de Piloto
- **Descripción**: Los socios declaran bajo su responsabilidad tener seguro y carnet de piloto vigente
- **Datos a capturar**:
  - Declaración de tener seguro RC (responsabilidad civil) vigente
  - Fecha de vigencia del seguro
  - Aseguradora (opcional - para referencia)
  - Declaración de tener carnet de piloto vigente
  - Tipo de carnet (básico, avanzado, profesional, etc.)
  - Número de carnet (opcional)
  - Fecha de vencimiento del carnet
  - Aceptación de términos y responsabilidades
- **Validaciones**:
  - Ambas declaraciones deben estar aceptadas para volar
  - Alertas si las fechas de vigencia están próximas a vencer
  - No permitir vuelo si alguna documentación está vencida
- **Auditoría**:
  - Registro de fecha de declaración
  - Histórico de cambios
  - Alertas automáticas 30 días antes del vencimiento

#### Sección de Ayuda sobre Seguro y Carnet de Piloto
- **Descripción**: Información para socios sobre cómo obtener y renovar documentación
- **Contenido**:
  - Guía: Cómo obtener carnet de piloto
    - Requisitos legales
    - Pasos a seguir
    - Instituciones/organismos competentes
    - Costos estimados
    - Links externos útiles
  - Guía: Cómo obtener seguro de responsabilidad civil
    - Tipos de seguros disponibles
    - Aseguradoras recomendadas
    - Costos aproximados
    - Coberturas principales
    - Proceso de contratación
  - Reglas del club
  - FAQ (Preguntas frecuentes)
  - Videos tutoriales (opcional)
  - Contacto de administrador para dudas

### 1.3 Contraseña de Acceso a Instalaciones

#### Ver Contraseña de Acceso
- **Descripción**: Los socios pueden consultar la contraseña actual para acceder a las instalaciones
- **Funcionalidades**:
  - Visualizar contraseña actual (solo para socios activos)
  - Mostrar/ocultar contraseña en pantalla
  - Indicador de fecha del último cambio
  - Notificación automática cuando la contraseña cambia
- **Permisos**:
  - Solo socios activos pueden ver la contraseña
  - Socios inactivos no tienen acceso
  - Los administradores siempre ven la contraseña actual

#### Gestionar Contraseña de Instalaciones
- **Descripción**: Los administradores pueden cambiar la contraseña de acceso periódicamente
- **Funcionalidades**:
  - Cambiar contraseña actual
  - Crear comentario/nota sobre el cambio (ej: "Cambio mensual enero")
  - Programar alertas para cambio de contraseña
- **Auditoría**:
  - Registrar quién cambió la contraseña y cuándo
  - Almacenar historial completo de cambios
- **Notificaciones**:
  - Notificación en la app

### 1.4 Noticias y Anuncios

#### Crear Noticias
- **Descripción**: Los administradores pueden publicar noticias y anuncios
- **Datos a capturar**:
  - Título
  - Contenido
  - Categoría (evento, anuncio, resultado, otro)
  - Imagen/Multimedia (opcional)
  - Fecha de publicación
  - Estado (borrador/publicada/archivada)
  - Autor
- **Funcionalidades**:
  - Guardar como borrador
  - Programar publicación
  - Destacar noticias importantes

#### Visualizar Noticias
- **Descripción**: Los socios pueden ver las noticias publicadas
- **Funcionalidades**:
  - Timeline de noticias ordenadas por fecha (newest first)
  - Filtrar por categoría
  - Búsqueda de noticias
  - Marcar como favorita
  - Comentarios en noticias
  - Notificaciones de nuevas noticias

#### Gestionar Noticias
- **Descripción**: Permite a administradores gestionar noticias
- **Funcionalidades**:
  - Editar noticia publicada
  - Archivar noticias
  - Eliminar noticias
  - Cambiar visibilidad (público/solo socios)

### 1.5 Eventos Programados

#### Crear Eventos
- **Descripción**: Administradores pueden crear y programar eventos del club
- **Datos a capturar**:
  - Nombre del evento
  - Descripción detallada
  - Tipo de evento (volar en grupo, competición, formación, social, otro)
  - Fecha inicio
  - duración
  - Hora inicio
  - Ubicación/Lugar
  - Imagen/Banner
  - Requisitos (carnet vigente, seguro, especialidad mínima, etc.)
  - Contacto responsable del evento
- **Funcionalidades**:
  - Estado (no iniciado, en curso, finalizado, cancelado)
  - Publicar o como borrador
  - Permitir comentarios
  - Archivos/recursos del evento (PDF, videos, etc.)

#### Visualizar Eventos
- **Descripción**: Los socios ven calendario de eventos próximos
- **Funcionalidades**:
  - Calendario visual (mes, semana, día)
  - Listado de próximos eventos
  - Búsqueda por tipo/categoría
  - Ver detalles del evento

#### Participar en Eventos
- **Descripción**: Los socios se apuntan/desapuntan de eventos
- **Funcionalidades**:
  - Registrarse en evento
  - Cancelar registro
  - Lista de participantes (visible según configuración)
  - Validación de requisitos antes de apuntarse
  - Notificaciones de cambios en evento
  - Exportar archivo iCal para calendario personal
  - Recordatorio automático antes del evento (24h, 48h)

#### Gestionar Participantes
- **Descripción**: Administrador gestiona participantes de evento
- **Funcionalidades**:
  - Ver lista de inscritos
  - Confirmar/rechazar inscripción (si es moderada)
  - Desbanear socio si es necesario
  - Registrar asistencia real
  - Exportar lista de participantes
  - Enviar comunicados a inscritos

### 1.6 Juntas del Club

#### Convocar Junta
- **Descripción**: Los administradores convocan juntas del club
- **Datos a capturar**:
  - Título/Asunto de la junta
  - Descripción/Orden del día
  - Fecha y hora programada
  - Ubicación (presencial/virtual/híbrida)
  - Convocatoria (documento PDF/Word adjunto)
- **Funcionalidades**:
  - Escribir orden del día
  - Adjuntar convocatoria (documento oficial)
  - Programar recordatorios automáticos
  - Solicitar confirmación de asistencia (RSVP)

#### Notificación de Junta
- **Descripción**: Socios reciben notificación de junta convocada
- **Funcionalidades**:
  - Email con convocatoria y orden del día
  - Notificación en la app
  - Ícono/badges en secciones relevantes
  - Recordatorio automatico (semana antes, día antes)
  - Enlace directo a detalles de la junta
  - Opción de confirmar asistencia (RSVP)

#### Votación en Junta
- **Descripción**: Sistema de votación durante/después de la junta
- **Funcionalidades**:
  - Crear votación específica para junta
  - Votación obligatoria antes de finalizar junta
  - Temas a votar (mociones, decisiones, etc.)
  - Tipo de votación (simple Si/No, múltiple opciones)
  - Plazo de votación
  - Quórum requerido (ej: 60% de asistencia)
  - Requisito de mayoría (ej: 2/3 de votos)
  - Resultados visibles solo después de cerrar votación
- **Restricciones**:
  - Solo socios activos pueden votar
  - Un voto por socio por moción
  - Opción anónima disponible

#### Acta de Junta
- **Descripción**: Documento que resume decisiones y acuerdos
- **Datos a capturar**:
  - Fecha y hora de realización
  - Asistentes (lista)
  - Ausentes justificados/injustificados
  - Quórum alcanzado (número y porcentaje)
  - Orden del día tratado
  - Decisiones adoptadas
  - Votaciones realizadas y resultados
  - Acuerdos tomados
  - Próxima fecha de junta (si se define)
  - Firma/aprobación del acta
- **Generación automática**:
  - Propuesta de acta generada automáticamente
  - Admin puede editar antes de finalizar
  - Resumen de votaciones incluido automáticamente
- **Funcionalidades**:
  - Descargar acta en PDF
  - Descargar acta en Word (editable)
  - Enviar acta a todos los socios por email
  - Publicar acta en apartado de documentos del club
  - Marcar acta como aprobada en siguiente junta
  - Adjuntar fotos/documentos adicionales

#### Histórico de Juntas
- **Descripción**: Registro completo de todas las juntas celebradas
- **Funcionalidades**:
  - Listar juntas por fecha (más recientes primero)
  - Filtrar por estado (convocada, realizada, suspendida)
  - Filtrar por año o período
  - Ver convocatoria original
  - Ver acta finalizada
  - Ver listado de votaciones y resultados
  - Ver asistentes confirmados
  - Descargar documentos (convocatoria, acta)
  - Buscar juntas por palabra clave (orden del día)
  - Estadísticas (asistencia media, votaciones más debatidas)
- **Acceso**:
  - Todos los socios pueden ver histórico
  - Solo admins pueden editar/eliminar registros
  - Auditoría de cambios en actas

#### Calendario de Juntas
- **Descripción**: Vista de calendario con juntas programadas
- **Funcionalidades**:
  - Visualización en calendario (mes/semana)
  - Próximas juntas destacadas
  - Indicador de votación pendiente
  - Sincronización con calendario personal (iCal)
  - Notificación cuando faltan días para junta
  - Estado visual (convocada, en curso, finalizada)

### 1.7 Tienda/Productos del Club

#### Publicar Productos
- **Descripción**: Administradores publican productos recomendados con código de referencia
- **Datos a capturar**:
  - Nombre del producto
  - Descripción
  - Imagen del producto
  - Plataforma (Amazon, AliExpress, otra)
  - Código de referencia/Enlace afiliado
  - Precio aproximado
  - Categoría (accesorios, repuestos, herramientas, otro)
  - Por qué es recomendado (descripción de utilidad)
- **Funcionalidades**:
  - Guardar como borrador
  - Publicar producto
  - Editar producto publicado
  - Archivar/dejar de promocionar
  - Ver estadísticas de clicks
  - Seguimiento de ingresos por referencia (si plataforma lo permite)

#### Visualizar Tienda
- **Descripción**: Los socios ven productos disponibles
- **Funcionalidades**:
  - Catálogo de productos activos
  - Filtrar por categoría
  - Filtrar por plataforma (Amazon, AliExpress, etc.)
  - Búsqueda por nombre
  - Ver detalles del producto
  - Enlace directo a tienda (código de referencia incluido)
  - Compartir producto
  - Guardar producto como favorito
  - Indicador de popularidad ("X socios interesados")

### 1.8 Sistema de Votaciones

#### Crear Votaciones
- **Descripción**: Los administradores pueden crear votaciones y encuestas
- **Datos a capturar**:
  - Título de la votación
  - Descripción/Contexto
  - Opciones de voto (múltiples)
  - Tipo de votación (simple, múltiple)
  - Fecha de inicio
  - Fecha de fin
  - Visible/oculta
- **Validaciones**:
  - Mínimo 2 opciones
  - Fechas coherentes

#### Participar en Votaciones
- **Descripción**: Los socios pueden participar en votaciones
- **Funcionalidades**:
  - Visualizar votaciones activas
  - Emitir voto (una sola vez por votación)
  - Ver resultados en tiempo real (si está habilitado)
  - Historial personal de votaciones
- **Restricciones**:
  - Solo socios activos pueden votar
  - Un voto por socio por votación
  - No permitir cambio de voto (según configuración)

#### Gestionar y Ver Resultados
- **Descripción**: Administradores visualizan y cierran votaciones
- **Funcionalidades**:
  - Ver participación en tiempo real
  - Ver resultados detallados (gráficos)
  - Editar votación (si no ha comenzado)
  - Cerrar votación anticipadamente
  - Exportar resultados
  - Resultados anónimos (sin saber quién votó qué)

### 1.9 Control de Acceso y Permisos

- **Roles Globales** (para toda la plataforma):
  - Superadministrador: gestionar clubes, usuarios globales
  - Usuario regular: puede crear/unirse a múltiples clubes
  
- **Roles por Club** (específicos de cada club):
  - Propietario/Administrador: acceso total al club
  - Editor de noticias: crear/editar noticias
  - Moderador: gestionar comentarios y participantes
  - Gestor de eventos: crear/editar eventos
  - Tesorero: gestionar ingresos y finanzas
  - Socio activo: acceso completo a funcionalidades
  - Socio inactivo: acceso limitado
  - Visitante: solo lectura de contenido público
- **Niveles de Acceso**:
  - Por club (cada usuario tiene rol diferente por club)
  - Por sección (algunos roles pueden tener acceso limitado a secciones)
  - Herencia de permisos (padre-hijo para subrolles)

### 1.10 Notificaciones

- **Tipos de notificaciones**:
  - Nueva noticia publicada
  - Nueva votación abierta
  - Votación por cerrar (recordatorio)
  - Respuestas a comentarios
  - Cambios en datos de perfil

### 1.11 Gestión de Tareas Comunes

#### Crear Tareas
- **Descripción**: Los administradores pueden crear y listar tareas comunes que necesitan ser realizadas en el club o instalaciones.
- **Datos a capturar**:
  - Nombre de la tarea (ej: "Limpiar zona de despegue")
  - Descripción detallada (ej: "Se necesita desbrozar la parte delantera y retirar escombros.")
  - Prioridad (Baja, Media, Alta, Crítica)
  - Categoría (Mantenimiento, Mejora, Limpieza, Evento, Otro)
  - Ubicación (ej: "Pista Principal", "Taller", "Área social")
  - Materiales/Herramientas necesarias (lista opcional)
  - Fecha límite sugerida (opcional)
- **Funcionalidades**:
  - Guardar como borrador
  - Publicar/Activar tarea
  - Editar tarea (solo admin)
  - Archivar tarea completada/cancelada

#### Visualizar y Asignar Tareas
- **Descripción**: Los socios pueden visualizar las tareas activas y solicitar ser asignados a su ejecución, especificando la fecha y los colaboradores.
- **Funcionalidades para Socios**:
  - Listado de tareas activas pendientes de asignación.
  - Filtro por prioridad/categoría.
  - **Solicitud de Asignación**:
    - El socio selecciona la tarea.
    - Indica la fecha de ejecución orientativa.
    - Añade a los colaboradores que ayudarán (deben ser socios activos).
    - **Restricción**: El equipo (solicitante + colaboradores) no puede superar las cuatro (4) personas en total.
    - Envío de la solicitud a administración.
- **Funcionalidades para Administradores**:
  - Listado de tareas con estado (Pendiente de Asignación, Asignada, En Curso, Finalizada).
  - Ver solicitudes de asignación.
  - Aprobar/Rechazar la solicitud de asignación.
  - Asignar la tarea directamente a un socio.
  - Modificar la fecha de ejecución de una tarea asignada.

#### Seguimiento de Tareas
- **Descripción**: Herramientas para seguir el progreso de las tareas asignadas.
- **Funcionalidades**:
  - Estado de la tarea (Asignada, En Curso, Completada).
  - Socio responsable y lista de colaboradores.
  - Campo de comentarios/actualizaciones de progreso.
  - Alerta si la fecha de ejecución se acerca y la tarea no está marcada como "En Curso".
- **Notificaciones**:
  - Al socio responsable: Tarea asignada/aprobada.
  - A los colaboradores: Invitación/Confirmación de participación en la tarea.
  - A los administradores: Solicitud de asignación recibida.


---

## 2. Casos de Uso Principales

| Caso de Uso | Actor | Descripción |
|------------|-------|-------------|
| Invitar usuario al club | Admin | Admin invita usuario (registrado o no) al club por email |
| Registrarse desde invitación | Nuevo usuario invitado | Usuario se registra en la plataforma mediante enlace de invitación |
| Login con Email/Contraseña | Usuario registrado | Usuario accede con email y contraseña |
| Login con Google | Usuario registrado | Usuario accede con su cuenta Google |
| Crear club | Superadmin | Crear un nuevo club en la plataforma |
| Personalizar club | Admin de club | Configurar logo, colores, nombre del club |
| Aceptar invitación a club | Usuario | Usuario acepta invitación y se une como miembro del club |
| Gestionar miembros | Admin | Ver y gestionar los miembros del club |
| Cambiar rol de usuario | Admin | Asignar rol a usuario dentro del club |
| Actualizar perfil | Socio | El socio modifica sus datos personales |
| Subir foto de carnet | Socio | El socio sube su foto de carnet |
| Declarar seguro y carnet vigente | Socio | El socio declara tener seguro y carnet de piloto vigentes |
| Ver ayuda de documentación | Socio | Consultar guías sobre cómo obtener carnet y seguro |
| Ver contraseña de instalaciones | Socio | El socio consulta la contraseña de acceso actual |
| Cambiar contraseña de instalaciones | Admin | Cambiar la contraseña de acceso periódicamente |
| Ver historial de contraseñas | Admin | Consultar cambios previos de contraseña |
| Publicar noticia | Admin | Crear y publicar una noticia para todos |
| Comentar noticia | Socio | Interactuar comentando en una noticia |
| Crear evento | Admin | Crear un evento del club |
| Participar en evento | Socio | El socio se registra en un evento |
| Ver calendario de eventos | Socio | Consultar próximos eventos programados |
| Publicar producto | Admin | Promocionar producto con enlace de referencia |
| Ver tienda de productos | Socio | Consultar productos recomendados del club |
| Comprar por referencia | Socio | Comprar producto vía enlace de afiliado |
| Ver ingresos de afiliación | Admin | Seguimiento de ingresos generados |
| Crear votación | Admin | Crear una votación sobre un tema |
| Participar en votación | Socio | El socio emite su voto |
| Consultar resultados votación | Admin | Ver resultados finales de una votación |
| Buscar socios | Admin | Consultar información de otros socios |
| Convocar junta del club | Admin | Admin convoca junta con fecha, orden del día y convocatoria |
| Confirmar asistencia a junta | Socio | El socio confirma que asistirá a la junta |
| Ver detalles de junta | Socio | El socio visualiza orden del día y convocatoria |
| Votar en junta | Socio | El socio emite su voto en mociones/decisiones de la junta |
| Ver acta de junta | Socio | El socio consulta el acta con decisiones y votaciones |
| Ver histórico de juntas | Socio | El socio consulta todas las juntas pasadas y actas |

---

## 3. Flujos de Información

### Flujo de Registro - Iniciado por Admin con Invitación por Email
1. Admin del club accede a "Gestión de Miembros"
2. Clic en "Invitar Usuario"
3. Ingresa email del usuario a invitar
4. Selecciona rol (socio, editor, moderador, admin)
5. Sistema verifica si el email existe:
   - **Si NO existe en USUARIOS**:
     - Genera token de invitación con vencimiento (30 días)
     - Envía email: "Fuiste invitado a [Club] - Regístrate aquí"
     - Usuario recibe email con enlace seguro
     - Usuario hace clic en enlace → formulario de registro con email prefijado
     - Completa registro (password) y confirma
     - Sistema crea usuario y lo vincula automáticamente a membresía
     - Usuario entra al club directamente
   - **Si EXISTE en USUARIOS**:
     - Envía email: "Invitación para unirte a [Club]"
     - Usuario acepta invitación
     - Se vincula a MIEMBRO_CLUB con rol especificado
6. Admin ve estado de invitación (pendiente, aceptada, expirada)
7. Puede reenviar si no fue aceptada dentro de 30 días

### Flujo de Login - Usuario Registrado
- **Opción 1: Login con Email/Contraseña**:
  1. Usuario va a página de login
  2. Introduce email y contraseña
  3. Sistema valida credenciales
  4. Genera JWT si es correcto
  5. Usuario logueado y ve clic en "Mis Clubes" (sus membresías)
  
- **Opción 2: Login con Google**:
  1. Usuario clic en "Login con Google"
  2. Si ya está logueado en Google: automático
  3. Si no: Google login dialog
  4. Sistema valida/vincula usuario
  5. Genera JWT
  6. Usuario logueado y ve sus clubes
  7. Próximos logins: solo clic en "Google" (sin volver a autorizar)



### Flujo de Autenticación Federada con Google
1. Usuario hace clic en "Login con Google"
2. Es redirigido a Google OAuth 2.0
3. Usuario autoriza acceso a datos (primera vez)
4. Google devuelve token con datos del usuario
5. Sistema verifica si usuario existe:
   - Si NO existe: ERROR (usuario debe ser invitado primero por admin)
   - Si existe: Vincula/valida cuenta Google a usuario existente
6. Sistema genera JWT y refresh token
7. Usuario es redirigido al dashboard
8. Próximos logins: solo clic en "Google" (sin volver a autorizar)

### Flujo de Creación y Personalización de Club
1. Superadministrador accede a panel de administración
2. Clic en "Crear Nuevo Club"
3. Introduce datos básicos (nombre, descripción, país)
4. Sistema genera código/slug del club
5. Asigna administrador propietario (puede ser él mismo)
6. Club creado en estado "inactivo"
7. Admin propietario accede a "Configuración del Club"
8. Sube logo
9. Selecciona colores (primario, secundario, acentos)
10. Personaliza nombre, descripción, contacto
11. Configura opciones (público/privado, autoregistro, etc.)
12. Club pasa a estado "activo" y visible

### Flujo de Invitación a Club por Email
1. Administrador del club accede a "Gestión de Miembros"
2. Clic en "Invitar Usuario"
3. Ingresa dirección de email del usuario
4. Selecciona rol inicial (socio, editor, moderador)
5. Sistema valida:
   - Si email "usuario@ejemplo.com" existe en USUARIOS:
     - Envía email de invitación a unirse
     - El usuario acepta y se añade a MIEMBRO_CLUB
   - Si email NO existe en USUARIOS:
     - Genera token de invitación con vencimiento (30 días)
     - Envía email con enlace: "Fuiste invitado al club, regístrate aquí"
     - Usuario hace clic en enlace, regresa a valores predefinidos
     - Usuario completa registro con email y contraseña
     - Sistema automáticamente lo vincula a membresía pendiente
     - User es redirigido al club como nuevo miembro
6. Administrador ve estado de invitación (pendiente, aceptada, expirada)
7. Puede reenviar invitación si no fue aceptada
8. Una vez aceptada, usuario tiene acceso al club

### Flujo de Publicación de Noticia
1. Administrador crea noticia en borrador
2. Opcionalmente programa publicación
3. Noticia se publica automáticamente
4. Sistema notifica a socios interesados
5. Socios pueden comentar y reaccionar

### Flujo de Votación
1. Administrador crea votación con opciones
2. Votación se abre en fecha programada
3. Socios ven votación activa y participan
4. Sistema acumula votos
5. En fecha de cierre, votación se cierra
6. Resultados disponibles para consulta

### Flujo de Cambio de Contraseña de Instalaciones
1. Administrador accede a panel de administración
2. Ingresa a "Gestión de Contraseña de Instalaciones"
3. Genera o escribe nueva contraseña
4. Añade motivo/descripción del cambio
5. Confirma el cambio
6. Sistema encripta y almacena contraseña
7. Sistema almacena en historial anterior
9. Envía notificación en la app
10. Socios pueden ver nueva contraseña en su panel accediendo a "Ver Contraseña"

### Flujo de Declaración de Seguro y Carnet de Piloto
1. Socio completa o actualiza su perfil
2. Accede a sección "Documentación Reglamentaria"
3. Ve sección de ayuda (guías de carnet y seguro)
4. Marca checkbox de "Declaro bajo mi responsabilidad tener seguro RC vigente"
5. Indica fecha de vencimiento del seguro
6. Marca checkbox de "Declaro bajo mi responsabilidad tener carnet de piloto vigente"
7. Indica tipo y fecha de vencimiento del carnet
8. Confirma la declaración
9. Sistema registra fecha de declaración
10. Sistema genera alertas 30 días antes de vencimiento
11. Sistema notifica si documentación se vence

### Flujo de Eventos
1. Administrador crea evento con detalles
2. Define requisitos (carnet vigente, seguro, etc.)
3. Abre inscripciones
4. Socios ven evento en calendario
5. Socios se registran (sistema valida requisitos)
6. Administrador confirma inscripciones si es necesario
7. Sistema envía recordatorios (24h antes)
8. Evento se realiza
9. Administrador registra asistencia
10. Sistema envía encuesta de satisfacción (opcional)

### Flujo de Compra de Productos Afiliados
1. Administrador publica producto con código de referencia
2. Socios acceden a sección "Tienda del Club"
3. Ven productos recomendados por categoría
4. Hacen clic en producto para ver detalles
5. Clic en "Comprar en Amazon" o "Comprar en AliExpress"
6. Se abre enlace con código de referencia incluido
7. Socio compra en tienda externa
8. Plataforma registra transacción (cuando disponible)
9. Ingresos se acumulan en tesorería del club
10. Administrador ve reportes de ingresos por producto/plataforma

---

## 4. Restricciones y Consideraciones

- La aplicación debe ser **responsiva** (funciona en móvil y escritorio)
- Los datos de votación deben ser **anónimos** (privacidad)
- El sistema debe **auditar** cambios de datos sensibles
- **Escalabilidad**: preparado para crecer (múltiples clubs en futuro)
- **Seguridad**: contraseñas encriptadas, autenticación segura
- **RGPD**: cumplimiento de normativa de protección de datos
- **Foto de Carnet**: 
  - Almacenar en carpeta protegida del servidor
  - Usar nombres de archivo aleatorios en el servidor
  - Validar que sea imagen real (sin archivos maliciosos)
  - Respetar privacidad (no mostrar en listados públicos)
- **Contraseña de Instalaciones**:
  - Debe estar **encriptada** en base de datos (nunca en texto plano)
  - Solo administradores pueden cambiarla
  - Auditar todos los cambios (quién, cuándo, IP, motivo)
  - Registrar acceso a la contraseña (quién la vio y cuándo)
  - No guardar historial permanente de contraseñas anteriores (solo últimas 3)
  - Cambios sensibles deben requerir confirmación en dos pasos
- **Declaración de Documentación**:
  - Las declaraciones son bajo responsabilidad del socio (no validación oficial)
  - Sistema debe alertar sobre vencimientos
  - Carnet vencido = impedimento para volar
  - Historial de declaraciones debe ser auditable
- **Eventos**:
  - Solo socios activos con documentación vigente pueden participar
  - Validación automática de requisitos antes de inscripción
  - Cancelación de evento debe notificarse a todos los inscritos
  - Aforo máximo debe ser controlado
  - Historial de asistencia para estadísticas
- **Tienda/Productos de Afiliación**:
  - Los ingresos son propiedad del club (no reparto individual)
  - Transparencia en códigos de referencia
  - Los productos deben ser útiles para aeromodelismo
  - Prohibido venta directa (solo referencia a terceros)
  - RGPD: El click en enlaces de afiliación no debe rastrear datos personales
  - Auditoría de ingresos generados por cada producto
- **Multitenancy (Múltiples Clubes)**:
  - Datos completamente segregados por club
  - Usuarios pueden pertenencer a varios clubes (roles independientes)
  - Todas las búsquedas y listados filtrados por club actual
  - Cada club tiene su propio dominio/ruta de acceso
  - Auditoría de creación y cambios de clubs (quién, cuándo)
  - Personalización independiente por club (logos, colores, etc.)
  - No mezclar datos de usuarios entre clubes
  - Superadministrador es el único que ve todos los clubes
- **Autenticación Federada (Google)**:
  - Usar OAuth 2.0 seguro
  - Almacenar tokens Google de forma segura
  - Permitir vincular/desvincular Google de cuenta local
  - Sincronizar nombre y foto de perfil desde Google (opcional)
  - No almacenar contraseña Google localmente
  - Logout debe invalidar JWT local (no afecta a Google)
- **Seguridad de Datos de Club**:
  - Tenant isolation: Usuario de club A NO puede ver datos de club B
  - Validar club en cada request (header o JWT payload)
  - Encriptar datos sensibles por club
  - Backups separados por club (futuro)
  - GDPR: Derecho al olvido debe aplicarse por club, no global

---

## 5. Priorización de Fases

### MVP (Fase 1 - Mínimo viable)

**Backend**:
- [ ] Registro y login de socios (email + Google OAuth)
- [ ] Gestión de socios (perfil, foto de carnet, documentación)
- [ ] Declaración de seguro y carnet de piloto vigente
- [ ] Ver/cambiar contraseña de instalaciones
- [ ] Gestión básica de noticias
- [ ] Calendario básico de eventos + inscripción
- [ ] Tienda con productos (vista básica)
- [ ] Dashboard de ingresos (admin)
- [ ] Sección de ayuda sobre documentación
- [ ] Sistema de notificaciones básico

**Frontend PWA**:
- [ ] Instalación como PWA (manifest.json, service worker)
- [ ] Splash screens personalizados por club
- [ ] Login/Register con email y Google
- [ ] Dashboard responsive mobile-first
- [ ] Gestión de perfil + upload de foto de carnet
- [ ] Visualización de noticias y eventos offline
- [ ] Inscripción a eventos (offline-capable)
- [ ] Tema personalizado por club (colores, logo, favicon)
- [ ] Funcionamiento offline (cache-first strategy)
- [ ] IndexedDB para almacenamiento local
- [ ] Service Worker con sincronización background
- [ ] Pull-to-refresh para actualizar datos
- [ ] Orientación responsive (portrait/landscape)

### Fase 2

**Backend**:
- [ ] Sistema de votaciones completo
- [ ] Comentarios en noticias y eventos
- [ ] Búsqueda avanzada
- [ ] Gestión de asistencia en eventos
- [ ] Reportes de eventos

**Frontend PWA**:
- [ ] Votaciones offline + sincronización
- [ ] Comentarios en tiempo real
- [ ] Búsqueda full-text offline
- [ ] Gesto swipe para navegación entre clubes
- [ ] Mejor UX offline (indicadores de estado)
- [ ] Caché inteligente (limpiar datos antiguos)
- [ ] Actualización automática de versión
- [ ] Notificación de nuevas versiones disponibles

### Fase 3

**Backend**:
- [ ] Notificaciones por email
- [ ] Exportación de datos
- [ ] Dashboard con estadísticas
- [ ] Integración con redes sociales
- [ ] QR para eventos

**Frontend PWA**:
- [ ] Push notifications (desktop y móvil)
- [ ] Notificaciones locales offline
- [ ] Modo oscuro con tema personalizado
- [ ] Actualizaciones push sin recargar
- [ ] Compresión de imágenes para reducir datos
- [ ] Deep linking (compartir URLs de eventos/noticias)
- [ ] QR scanner nativo
- [ ] Integración con calendario del sistema (futuro)

---

## 5. Priorización de Fases

### MVP (Fase 1 - Mínimo viable)
- [ ] Registro y login de socios
- [ ] Panel de control básico
- [ ] Gestión de socios (perfil y foto de carnet)
- [ ] Declaración de seguro y carnet de piloto vigente
- [ ] Sección de ayuda sobre documentación
- [ ] Ver contraseña de instalaciones
- [ ] Cambiar contraseña de instalaciones (admin)
- [ ] Gestión de noticias simple
- [ ] Calendario básico de eventos
- [ ] Inscripción a eventos
- [ ] Tienda con productos (vista básica)
- [ ] Dashboard de ingresos (admin)

### Fase 2
- [ ] Sistema de votaciones completo
- [ ] Comentarios en noticias y eventos
- [ ] Búsqueda avanzada
- [ ] Gestión de asistencia en eventos
- [ ] Reportes de eventos

### Fase 3
- [ ] Notificaciones por email
- [ ] Exportación de datos
- [ ] Dashboard con estadísticas
- [ ] Integración con redes sociales
- [ ] QR para eventos
