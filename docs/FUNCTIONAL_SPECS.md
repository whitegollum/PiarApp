# Especificaciones Funcionales - PiarApp

Este documento describe detalladamente las funcionalidades del sistema


# Especificación Funcional - Plataforma de Gestión de Clubes de Aeromodelismo

## 1.0 Autenticación y Gestión de Clubes

### Autenticación

**Descripción:** Sistema de autenticación con múltiples opciones.

#### Flujo de Instalación Inicial
**Objetivo:** Permitir la configuración del primer administrador del sistema de forma segura y sencilla.

- **Check Automático:** Al cargar la aplicación, se verifica si existen usuarios en la base de datos.
- **Redirección:** Si no hay usuarios, se redirige automáticamente a `/auth/setup-inicial`.
- **Formulario de Setup:**
  - Pide: Nombre Completo, Email, Contraseña (y confirmación).
  - Crea el usuario con rol de **Super Administrador**.
  - Inicia sesión automáticamente.
- **Seguridad:**
  - El endpoint de creación solo funciona si `Count(Usuarios) == 0`.
  - Validación de contraseña segura.

#### Métodos disponibles

- Registro/Login tradicional (email + contraseña)
  - Formulario de registro con email y contraseña
  - Validación de email (confirmación requerida)
  - Creación de cuenta local y gestión de contraseña
- Autenticación federada con Google (OAuth 2.0)
  - Botón "Registrarse/Login con Google"
  - Crear cuenta automáticamente con datos de Google
  - Vincular cuenta Google a cuenta existente local
  - Usar foto de perfil de Google (opcional)
- Recuperación de contraseña por email

#### Opciones de Registro

**Opción 1: Usar Google OAuth**
1. Clic en "Registrarse con Google"
2. Autorizar acceso a datos básicos (nombre, email, foto)
3. Cuenta creada automáticamente
4. Perfil completado con datos de Google

**Opción 2: Registrarse con Email y Contraseña**
1. Clic en "Registrarse"
2. Introducir email y contraseña fuerte
3. Confirmar email por enlace
4. Completar datos de perfil

#### Funcionalidades

- Login seguro con JWT
- Refresh tokens
- Two-Factor Authentication (2FA) opcional
- Cierre de sesión
- Cambio de contraseña
- Perfil de usuario global (información base)
- Vincular/desvincular Google de cuenta existente

#### Validaciones

- Email válido
- Contraseña fuerte (si usa registro local)
- Confirmación de email para cuentas locales
- Verificación de identidad para operaciones críticas
- Prevención de duplicate accounts (Google + email local)

---

### Gestión de Clubes (Multitenancy)

**Descripción:** Soporte para múltiples clubes independientes en la misma plataforma.

#### Creación de Clubs

- Los superadministradores crean clubes
- Datos básicos: nombre, descripción, dirección
- Se asigna automáticamente un administrador propietario
- Cada club obtiene un código/slug único (ej: `club-aero-madrid`)

#### Afiliación a Clubes

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

#### Personalización por Club

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

#### Configuración del Club

- Siempre requieren aprobación
- Duración de membresía estándar
- Cuota de membresía
- Zona horaria del club
- Idioma por defecto

---

### Panel de Control del Club (Admin)

**Descripción:** Administración de la configuración del club.

#### Funcionalidades

- Ver estadísticas del club (miembros, eventos, etc.)
- Gestionar miembros del club
- Gestion de contraseña de acceso
- Gestionar roles y permisos
- Personalizar apariencia del club
- Ver actividad del club
- Configurar notificaciones
- Exportar datos del club
- Auditoría de cambios

---

### Tema Personalizado por Club

**Descripción:** Colores y estilos específicos por club automáticos.

#### Aplicación

- Color primario y secundario del club
- Logo del club como favicon
- Splash screen con colores del club
- Barra de navegación personalizada
- Estilos de botones según club
- CSS variables dinámicas cambian al cambiar de club
- Modo oscuro opcional (respeta preferencia del SO)
- Tema consistente en toda la app

---

## 1.1 Gestión de Socios

### Registro de Socios

**Descripción:** Permite registrar nuevos miembros en el club.

#### Datos a capturar

- Nombre completo
- Email
- Teléfono
- Fecha de nacimiento
- Dirección
- Fecha de alta en el club
- Estado del socio (activo/inactivo)
- Especialidades (aviones, helicópteros, drones, etc.)

#### Validaciones

- Email único en el sistema
- Campos obligatorios completos
- Mayoría de edad (opcional según normativa)

---

### Actualización de Datos de Socios

**Descripción:** Permite modificar la información de un socio existente.

#### Funcionalidades

- Editar perfil personal
- Actualizar datos de contacto
- Cambiar especialidades
- Actualizar estado del socio
- Cambiar contraseña
- Historial de cambios (auditoría)

#### Permisos

- Los socios pueden actualizar sus propios datos
- Los administradores pueden actualizar datos de cualquier socio

---

### Foto de Carnet de Socio

**Descripción:** Permite a los socios subir y gestionar su foto de carnet.

#### Funcionalidades

- Subir foto de carnet (JPG, PNG)
- Cambiar foto existente
- Visualizar foto en el perfil
- Descargar foto de carnet (solo socio propietario y administradores)
- Formato recomendado: 200x240px mínimo
- Tamaño máximo: 5MB

#### Validaciones

- Validar formato de imagen
- Validar tamaño
- Verificar que sea una foto de rostro (opcional - validación manual)

#### Almacenamiento

- Guardar en carpeta segura del servidor
- Nombre de archivo: `{socio_id}_{timestamp}.{ext}`
- Generar thumbnail para listados

---

### Listado y Búsqueda de Socios

**Descripción:** Visualizar y buscar socios del club.

#### Funcionalidades

- Listar todos los socios activos
- Búsqueda por nombre
- Búsqueda por especialidad
- Búsqueda por estado
- Filtros combinados
- Exportar listado (CSV/Excel)

---

### Declaración Responsable de Seguro y Carnet de Piloto

**Descripción:** Los socios declaran bajo su responsabilidad tener seguro y carnet de piloto vigente.

#### Datos a capturar

- Declaración de tener seguro RC (responsabilidad civil) vigente
- Fecha de vigencia del seguro
- Aseguradora (opcional - para referencia)
- Declaración de tener carnet de piloto vigente
- Tipo de carnet (básico, avanzado, profesional, etc.)
- Número de carnet (opcional)
- Fecha de vencimiento del carnet
- Aceptación de términos y responsabilidades

#### Validaciones

- Ambas declaraciones deben estar aceptadas para volar
- Alertas si las fechas de vigencia están próximas a vencer
- No permitir vuelo si alguna documentación está vencida

#### Auditoría

- Registro de fecha de declaración
- Histórico de cambios
- Alertas automáticas 30 días antes del vencimiento

---

### Sección de Ayuda sobre Seguro y Carnet de Piloto

**Descripción:** Información para socios sobre cómo obtener y renovar documentación.

#### Contenido

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

---

## 1.3 Contraseña de Acceso a Instalaciones

### Ver Contraseña de Acceso

**Descripción:** Los socios pueden consultar la contraseña actual para acceder a las instalaciones.

#### Funcionalidades

- Visualizar contraseña actual (solo para socios activos)
- Mostrar/ocultar contraseña en pantalla
- Indicador de fecha del último cambio
- Notificación automática cuando la contraseña cambia

#### Permisos

- Solo socios activos pueden ver la contraseña
- Socios inactivos no tienen acceso
- Los administradores siempre ven la contraseña actual

---

### Gestionar Contraseña de Instalaciones

**Descripción:** Los administradores pueden cambiar la contraseña de acceso periódicamente.

#### Funcionalidades

- Cambiar contraseña actual
- Crear comentario/nota sobre el cambio (ej: "Cambio mensual enero")
- Programar alertas para cambio de contraseña

#### Auditoría

- Registrar quién cambió la contraseña y cuándo
- Almacenar historial completo de cambios

#### Notificaciones

- Notificación en la app

---

## 1.4 Noticias y Anuncios

### Crear Noticias

**Descripción:** Los administradores pueden publicar noticias y anuncios.

#### Datos a capturar

- Título
- Contenido
- Categoría (evento, anuncio, resultado, otro)
- Imagen/Multimedia (opcional)
- Fecha de publicación
- Estado (borrador/publicada/archivada)
- Autor

#### Funcionalidades

- Guardar como borrador
- Programar publicación
- Destacar noticias importantes

---

### Visualizar Noticias

**Descripción:** Los socios pueden ver las noticias publicadas.

#### Funcionalidades

- Timeline de noticias ordenadas por fecha (newest first)
- Filtrar por categoría
- Búsqueda de noticias
- Marcar como favorita
- Comentarios en noticias
- Notificaciones de nuevas noticias

---

### Gestionar Noticias

**Descripción:** Permite a administradores gestionar noticias.

#### Funcionalidades

- Editar noticia publicada
- Archivar noticias
- Eliminar noticias
- Cambiar visibilidad (público/solo socios)

---

## 1.5 Eventos Programados

### Crear Eventos

**Descripción:** Administradores pueden crear y programar eventos del club.

#### Datos a capturar

- Nombre del evento
- Descripción detallada
- Tipo de evento (volar en grupo, competición, formación, social, otro)
- Fecha inicio
- Duración
- Hora inicio
- Ubicación/Lugar
- Imagen/Banner
- Requisitos (carnet vigente, seguro, especialidad mínima, etc.)
- Contacto responsable del evento

#### Funcionalidades

- Estado (no iniciado, en curso, finalizado, cancelado)
- Publicar o guardar como borrador
- Permitir comentarios
- Archivos/recursos del evento (PDF, videos, etc.)

---

### Visualizar Eventos

**Descripción:** Los socios ven calendario de eventos próximos.

#### Funcionalidades

- Calendario visual (mes, semana, día)
- Listado de próximos eventos
- Búsqueda por tipo/categoría
- Ver detalles del evento

---

### Participar en Eventos

**Descripción:** Los socios se apuntan/desapuntan de eventos.

#### Funcionalidades

- Registrarse en evento
- Cancelar registro
- Lista de participantes (visible según configuración)
- Validación de requisitos antes de apuntarse
- Notificaciones de cambios en evento
- Exportar archivo iCal para calendario personal
- Recordatorio automático antes del evento (24h, 48h)

---

### Gestionar Participantes

**Descripción:** Administrador gestiona participantes de evento.

#### Funcionalidades

- Ver lista de inscritos
- Confirmar/rechazar inscripción (si es moderada)
- Desbanear socio si es necesario
- Registrar asistencia real
- Exportar lista de participantes
- Enviar comunicados a inscritos

---

## 1.6 Juntas del Club

### Convocar Junta

**Descripción:** Los administradores convocan juntas del club.

#### Datos a capturar

- Título/Asunto de la junta
- Descripción/Orden del día
- Fecha y hora programada
- Ubicación (presencial/virtual/híbrida)
- Convocatoria (documento PDF/Word adjunto)

#### Funcionalidades

- Escribir orden del día
- Adjuntar convocatoria (documento oficial)
- Programar recordatorios automáticos
- Solicitar confirmación de asistencia (RSVP)

---

### Notificación de Junta

**Descripción:** Socios reciben notificación de junta convocada.

#### Funcionalidades

- Email con convocatoria y orden del día
- Notificación en la app
- Ícono/badges en secciones relevantes
- Recordatorio automático (semana antes, día antes)
- Enlace directo a detalles de la junta
- Opción de confirmar asistencia (RSVP)

---

### Votación en Junta

**Descripción:** Sistema de votación durante/después de la junta.

#### Funcionalidades

- Crear votación específica para junta
- Votación obligatoria antes de finalizar junta
- Temas a votar (mociones, decisiones, etc.)
- Tipo de votación (simple Sí/No, múltiples opciones)
- Plazo de votación
- Quórum requerido (ej: 60% de asistencia)
- Requisito de mayoría (ej: 2/3 de votos)
- Resultados visibles solo después de cerrar votación

#### Restricciones

- Solo socios activos pueden votar
- Un voto por socio por moción
- Opción anónima disponible

---

### Acta de Junta

**Descripción:** Documento que resume decisiones y acuerdos.

#### Datos a capturar

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

#### Generación automática

- Propuesta de acta generada automáticamente
- Admin puede editar antes de finalizar
- Resumen de votaciones incluido automáticamente

#### Funcionalidades

- Descargar acta en PDF
- Descargar acta en Word (editable)
- Enviar acta a todos los socios por email
- Publicar acta en apartado de documentos del club
- Marcar acta como aprobada en siguiente junta
- Adjuntar fotos/documentos adicionales

---

### Histórico de Juntas

**Descripción:** Registro completo de todas las juntas celebradas.

#### Funcionalidades

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

#### Acceso

- Todos los socios pueden ver histórico
- Solo admins pueden editar/eliminar registros
- Auditoría de cambios en actas

---

### Calendario de Juntas

**Descripción:** Vista de calendario con juntas programadas.

#### Funcionalidades

- Visualización en calendario (mes/semana)
- Próximas juntas destacadas
- Indicador de votación pendiente
- Sincronización con calendario personal (iCal)
- Notificación cuando faltan días para junta
- Estado visual (convocada, en curso, finalizada)

---

## 1.7 Tienda/Productos del Club

### Publicar Productos

**Descripción:** Administradores publican productos recomendados con código de referencia.

#### Datos a capturar

- Nombre del producto
- Descripción
- Imagen del producto
- Plataforma (Amazon, AliExpress, otra)
- Código de referencia/Enlace afiliado
- Precio aproximado
- Categoría (accesorios, repuestos, herramientas, otro)
- Por qué es recomendado (descripción de utilidad)

#### Funcionalidades

- Guardar como borrador
- Publicar producto
- Editar producto publicado
- Archivar/dejar de promocionar
- Ver estadísticas de clicks
- Seguimiento de ingresos por referencia (si plataforma lo permite)

---

### Visualizar Tienda

**Descripción:** Los socios ven productos disponibles.

#### Funcionalidades

- Catálogo de productos activos
- Filtrar por categoría
- Filtrar por plataforma (Amazon, AliExpress, etc.)
- Búsqueda por nombre
- Ver detalles del producto
- Enlace directo a tienda (código de referencia incluido)
- Compartir producto
- Guardar producto como favorito
- Indicador de popularidad ("X socios interesados")

---

## 1.8 Sistema de Votaciones

### Crear Votaciones

**Descripción:** Los administradores pueden crear votaciones y encuestas.

#### Datos a capturar

- Título de la votación
- Descripción/Contexto
- Opciones de voto (múltiples)
- Tipo de votación (simple, múltiple)
- Fecha de inicio
- Fecha de fin
- Visible/oculta

#### Validaciones

- Mínimo 2 opciones
- Fechas coherentes

---

### Participar en Votaciones

**Descripción:** Los socios pueden participar en votaciones.

#### Funcionalidades

- Visualizar votaciones activas
- Emitir voto (una sola vez por votación)
- Ver resultados en tiempo real (si está habilitado)
- Historial personal de votaciones

#### Restricciones

- Solo socios activos pueden votar
- Un voto por socio por votación
- No permitir cambio de voto (según configuración)

---

### Gestionar y Ver Resultados

**Descripción:** Administradores visualizan y cierran votaciones.

#### Funcionalidades

- Ver participación en tiempo real
- Ver resultados detallados (gráficos)
- Editar votación (si no ha comenzado)
- Cerrar votación anticipadamente
- Exportar resultados
- Resultados anónimos (sin saber quién votó qué)

---

## 1.9 Control de Acceso y Permisos

### Roles Globales (para toda la plataforma)

- **Superadministrador:** gestionar clubes, usuarios globales
- **Usuario regular:** puede crear/unirse a múltiples clubes

### Roles por Club (específicos de cada club)

- **Propietario/Administrador:** acceso total al club
- **Editor de noticias:** crear/editar noticias
- **Moderador:** gestionar comentarios y participantes
- **Gestor de eventos:** crear/editar eventos
- **Tesorero:** gestionar ingresos y finanzas
- **Socio activo:** acceso completo a funcionalidades
- **Socio inactivo:** acceso limitado
- **Visitante:** solo lectura de contenido público

### Niveles de Acceso

- Por club (cada usuario tiene rol diferente por club)
- Por sección (algunos roles pueden tener acceso limitado a secciones)
- Herencia de permisos (padre-hijo para subroles)

---

## 1.10 Notificaciones

### Tipos de notificaciones

- Nueva noticia publicada
- Nueva votación abierta
- Votación por cerrar (recordatorio)
- Respuestas a comentarios
- Cambios en datos de perfil

---

## 1.11 Gestión de Tareas Comunes

### Crear Tareas

**Descripción:** Los administradores pueden crear y listar tareas comunes que necesitan ser realizadas en el club o instalaciones.

#### Datos a capturar

- Nombre de la tarea (ej: "Limpiar zona de despegue")
- Descripción detallada (ej: "Se necesita desbrozar la parte delantera y retirar escombros.")
- Prioridad (Baja, Media, Alta, Crítica)
- Categoría (Mantenimiento, Mejora, Limpieza, Evento, Otro)
- Ubicación (ej: "Pista Principal", "Taller", "Área social")
- Materiales/Herramientas necesarias (lista opcional)
- Fecha límite sugerida (opcional)

#### Funcionalidades

- Guardar como borrador
- Publicar/Activar tarea
- Editar tarea (solo admin)
- Archivar tarea completada/cancelada

---

### Visualizar y Asignar Tareas

**Descripción:** Los socios pueden visualizar las tareas activas y solicitar ser asignados a su ejecución, especificando la fecha y los colaboradores.

#### Funcionalidades para Socios

- Listado de tareas activas pendientes de asignación
- Filtro por prioridad/categoría

**Solicitud de Asignación:**
1. El socio selecciona la tarea
2. Indica la fecha de ejecución orientativa
3. Añade a los colaboradores que ayudarán (deben ser socios activos)
4. Restricción: el equipo (solicitante + colaboradores) no puede superar las cuatro (4) personas en total
5. Envío de la solicitud a administración

#### Funcionalidades para Administradores

- Listado de tareas con estado (Pendiente de Asignación, Asignada, En Curso, Finalizada)
- Ver solicitudes de asignación
- Aprobar/Rechazar la solicitud de asignación
- Asignar la tarea directamente a un socio
- Modificar la fecha de ejecución de una tarea asignada

---

### Seguimiento de Tareas

**Descripción:** Herramientas para seguir el progreso de las tareas asignadas.

#### Funcionalidades

- Estado de la tarea (Asignada, En Curso, Completada)
- Socio responsable y lista de colaboradores
- Campo de comentarios/actualizaciones de progreso
- Alerta si la fecha de ejecución se acerca y la tarea no está marcada como "En Curso"

#### Notificaciones

- Al socio responsable: tarea asignada/aprobada
- A los colaboradores: invitación/confirmación de participación en la tarea
- A los administradores: solicitud de asignación recibida

---

## 1.12 Auditoría, seguridad y cumplimiento

### Auditoría

- Registro de cambios en datos sensibles (roles, membresías, contraseña de instalaciones, actas, configuraciones críticas).
- Trazabilidad de acciones administrativas.

### Seguridad

- Comunicación cifrada extremo cliente-servidor.
- Contraseñas no almacenadas en texto plano.
- Tokens y credenciales protegidas.
- Validación de permisos en cada operación.

### RGPD

- Descarga de datos personales.
- Políticas de minimización y privacidad.
- Derecho al olvido conforme normativa aplicable.
- Separación de datos por club en el tratamiento funcional.

