# 📋 Plan de Pruebas Funcionales

## 📊 RESUMEN DE PRUEBAS

| ID | Caso de Uso | Status | Resultado |
|----|----|--------|-----------|
| CU-001 | Registro nuevo usuario | 🟢 | OK |
| CU-002 | Login válido | 🟢 | OK |
| CU-003 | Login inválido | 🟢 | OK |
| CU-004 | Logout | 🟢 | OK |
| CU-005 | Rutas protegidas | 🟢 | OK |
| CU-006 | Crear club | 🟢 | OK |
| CU-007 | Listar clubes | 🟢 | OK |
| CU-008 | Detalle club | 🟢 | OK |
| CU-009 | Editar club | 🟢 | OK |
| CU-010 | Invitar miembro | 🟢 | OK |
| CU-011 | Listar miembros | 🟢 | OK |
| CU-012 | Remover miembro | 🟢 | OK |
| CU-013 | Ver rol en club | 🟢 | OK |
| CU-014 | Ver perfil | 🟢 | OK |
| CU-015 | Editar perfil | 🟢 | OK |
| CU-016 | Cambiar contraseña | 🟢 | OK |
| CU-017 | Ver noticias | 🟢 | OK |
| CU-018 | Crear noticia | 🟢 | OK |
| CU-019 | Error conexión | 🟢 | OK |
| CU-020 | Validación vacíos | 🟢 | OK |
| CU-021 | Email duplicado | 🟢 | OK |
| CU-022 | Token expirado | ⏳ | [Por completar] |
| CU-023 | Editar noticia | 🟢 | OK |
| CU-024 | Eliminar noticia | 🟢 | OK |
| CU-025 | Crear evento | 🟢 | OK |
| CU-026 | Listar eventos | 🟢 | OK |
| CU-027 | Editar evento | 🟢 | OK |
| CU-028 | Eliminar evento | 🟢 | OK |
| CU-029 | Ver contraseña instalación (Miembro) | 🟢 | OK |
| CU-030 | Actualizar contraseña instalación (Admin) | 🟢 | OK |
| CU-031 | Configuracion SMTP (Superadmin) | 🟢 | OK |
| CU-032 | Enviar email de prueba (Superadmin) | 🟢 | OK |
| CU-033 | Bloqueo admin SMTP (No superadmin) | 🟢 | OK |
| CU-034 | Landing invitacion muestra email | 🟢 | OK |


## 🔐 MÓDULO 1: AUTENTICACIÓN

### CU-001: Registro de Usuario Nuevo
**Módulo:** Autenticación  
**Descripción:** Un usuario sin cuenta se registra en la plataforma  
**Precondiciones:** 
- Aplicación frontend corriendo
- No estar autenticado
- Email no registrado anteriormente

**Pasos:**
1. Ir a http://localhost:5175
2. Hacer click en "Registrarse"
3. Completar formulario:
   - Nombre completo: "Test User 001"
   - Email: "testuser001@example.com"
   - Contraseña: "TestPass123"
   - Confirmar contraseña: "TestPass123"
4. Hacer click en botón "Registrarse"
5. Esperar confirmación

**Resultado Esperado:**
- ✅ Formulario valida datos
- ✅ No permite contraseña < 8 caracteres
- ✅ No permite emails inválidos
- ✅ No permite contraseñas no coincidentes
- ✅ Registro exitoso → Redirige a login
- ✅ Mensaje de éxito: "Registro exitoso. Por favor inicia sesión."

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Registro exitoso completado
**Notas:** Registro funciona correctamente. Usuario creado y puede iniciar sesión.

---

### CU-002: Login con Credenciales Válidas
**Módulo:** Autenticación  
**Descripción:** Usuario registrado inicia sesión correctamente  
**Precondiciones:**
- Usuario registrado: test@example.com / Password123
- Estar en página login

**Pasos:**
1. Ir a http://localhost:5175/auth/login
2. Completar formulario:
   - Email: "test@example.com"
   - Contraseña: "Password123"
3. Hacer click en "Iniciar Sesión"
4. Esperar redirección

**Resultado Esperado:**
- ✅ Login exitoso
- ✅ Redirige a Dashboard (http://localhost:5175/)
- ✅ Token JWT guardado en localStorage
- ✅ Navbar muestra nombre del usuario
- ✅ Logout button visible

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Login exitoso, redirige a Dashboard
**Notas:** Token JWT guardado correctamente, usuario se muestra en navbar

---

### CU-003: Login con Credenciales Inválidas
**Módulo:** Autenticación  
**Descripción:** Sistema rechaza credenciales incorrectas  
**Precondiciones:**
- Estar en página login

**Pasos:**
1. Ir a http://localhost:5175/auth/login
2. Completar formulario:
   - Email: "test@example.com"
   - Contraseña: "PasswordIncorrecto"
3. Hacer click en "Iniciar Sesión"

**Resultado Esperado:**
- ✅ Login falla
- ✅ Muestra mensaje de error: "Email o contraseña inválidos"
- ✅ Permanece en página login
- ✅ No guarda token

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Login rechazado correctamente, mensaje de error mostrado
**Notas:** Validación de credenciales funciona correctamente

---

### CU-004: Logout
**Módulo:** Autenticación  
**Descripción:** Usuario cierra sesión correctamente  
**Precondiciones:**
- Usuario autenticado
- Estar en Dashboard

**Pasos:**
1. Estar logueado en Dashboard
2. Hacer click en Navbar → avatar/nombre usuario
3. Hacer click en "Logout"
4. Confirmar si se pide

**Resultado Esperado:**
- ✅ Logout exitoso
- ✅ Redirige a login (http://localhost:5175/auth/login)
- ✅ Token eliminado de localStorage
- ✅ No puede acceder a rutas protegidas

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Logout exitoso, redirige a login, token eliminado
**Notas:** Cierre de sesión funciona correctamente

---

### CU-005: Protección de Rutas Autenticadas
**Módulo:** Autenticación  
**Descripción:** Usuario no autenticado no puede acceder a rutas protegidas  
**Precondiciones:**
- No estar autenticado
- Token localStorage vacío

**Pasos:**
1. Limpiar localStorage (F12 → Applications → localStorage → Eliminar)
2. Intentar acceder a http://localhost:5175/
3. Intenta acceder a http://localhost:5175/clubes/crear
4. Intenta acceder a http://localhost:5175/perfil

**Resultado Esperado:**
- ✅ Redirige a login automáticamente
- ✅ No muestra contenido protegido
- ✅ Mensaje de acceso denegado (si aplica)

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Rutas protegidas redirigen a login correctamente
**Notas:** Protección de acceso funciona sin errores

---

## 🏢 MÓDULO 2: GESTIÓN DE CLUBES

### CU-006: Crear Nuevo Club
**Módulo:** Clubes  
**Descripción:** Usuario autenticado crea un nuevo club  
**Precondiciones:**
- Usuario autenticado
- Estar en Dashboard
- Backend corriendo

**Pasos:**
1. Hacer login con: test@example.com / Password123
2. En Dashboard, hacer click en botón "Crear Club"
3. Completar formulario:
   - Nombre: "Mi Primer Club"
   - Slug: "mi-primer-club"
   - Descripción: "Club de prueba para aeromodelismo"
4. Hacer click en "Crear Club"
5. Esperar respuesta

**Resultado Esperado:**
- ✅ Club creado exitosamente
- ✅ Redirige a página de detalle del club
- ✅ Usuario aparece como creador/administrador
- ✅ Club visible en listado de clubes del usuario
- ✅ Puede invitar miembros
- ✅ Muestra nombre del club en Navbar

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Club creado exitosamente, miembros cargan sin errores
**Notas:** Schema de MiembroClubResponse arreglado, usuario se serializa correctamente

---

### CU-007: Listar Clubes de Usuario
**Módulo:** Clubes  
**Descripción:** Usuario ve lista de clubs a los que pertenece  
**Precondiciones:**
- Usuario autenticado
- Usuario tiene al menos 1 club

**Pasos:**
1. Hacer login
2. Ver Dashboard
3. Observar sección de "Mis Clubes"
4. Hacer click en tarjeta de club

**Resultado Esperado:**
- ✅ Lista todos los clubes del usuario
- ✅ Muestra nombre, descripción, logo
- ✅ Muestra rol del usuario en cada club
- ✅ Click en club abre detalle del mismo

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Lista de clubes muestra correctamente el club creado
**Notas:** Click en club redirige a detalle sin errores

---

### CU-008: Ver Detalle del Club
**Módulo:** Clubes  
**Descripción:** Usuario ve información completa del club  
**Precondiciones:**
- Usuario autenticado
- Club creado (desde CU-006)
- Estar en página de club

**Pasos:**
1. Desde Dashboard, hacer click en el club creado
2. Observar página de detalle
3. Hacer scroll para ver todas las secciones
4. Revisar tabs: Resumen, Miembros, Noticias

**Resultado Esperado:**
- ✅ Muestra nombre, descripción, logo
- ✅ Muestra información de contacto (si existe)
- ✅ Tabs funcionales (Resumen/Miembros/Noticias)
- ✅ Botón para invitar miembros (se ve si es admin)
- ✅ Botón para editar club (si es admin)

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Club detalle carga correctamente, tabs funcionan, datos visibles
**Notas:** Miembros se cargan correctamente con información de usuario anidada

---

### CU-009: Editar Club (Admin)
**Módulo:** Clubes  
**Descripción:** Administrador edita información del club  
**Precondiciones:**
- Usuario es administrador del club
- Estar en página detalle del club

**Pasos:**
1. En detalle del club, hacer click en botón "Editar"
2. Modificar campo descripción: "Descripción actualizada"
3. Modificar color primario: #FF0000 (rojo)
4. Hacer click "Guardar Cambios"

**Resultado Esperado:**
- ✅ Cambios guardados exitosamente
- ✅ Página se actualiza con nuevos datos
- ✅ Mensaje de éxito
- ✅ Los cambios persisten al recargar

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Cambios guardados y persistidos correctamente
**Notas:** 

---

## 👥 MÓDULO 3: GESTIÓN DE MIEMBROS

### CU-010: Invitar Miembro por Email
**Módulo:** Miembros  
**Descripción:** Administrador invita nuevo miembro al club por email  
**Precondiciones:**
- Usuario es admin del club
- Estar en página ClubMembers
- Backend en ejecución

**Pasos:**
1. En detalle del club → Click en "Miembros"
2. Click en botón "Invitar Miembro"
3. Completar formulario:
   - Email: "juan@example.com"
   - Rol: "Socio"
4. Click en "Enviar Invitación"
5. Esperar confirmación

**Backend-only (sin frontend) - Reproducción rápida:**
1. Login admin y tomar token:
    ```bash
    curl -X POST http://localhost:8000/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"admin@piar.com","password":"Admin123456"}'
    ```
    Guarda `access_token` como `ADMIN_TOKEN`.
2. Invitar usuario al club (reemplaza `CLUB_ID`):
    ```bash
    curl -X POST http://localhost:8000/api/clubes/CLUB_ID/miembros/invitar \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer ADMIN_TOKEN" \
       -d '{"email":"juan@example.com","rol":"miembro"}'
    ```
3. Ver invitaciones pendientes del club (admin):
    ```bash
    curl -X GET http://localhost:8000/api/clubes/CLUB_ID/miembros/invitaciones \
       -H "Authorization: Bearer ADMIN_TOKEN"
    ```
4. Login del usuario invitado y ver invitaciones pendientes:
    ```bash
    curl -X POST http://localhost:8000/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"juan@example.com","password":"Juan123456"}'
    ```
    Guarda `access_token` como `USER_TOKEN`.
    ```bash
    curl -X GET http://localhost:8000/api/auth/invitaciones/pendientes \
       -H "Authorization: Bearer USER_TOKEN"
    ```

**Resultado Esperado:**
- ✅ Invitación enviada exitosamente
- ✅ Mensaje: "Invitación enviada a juan@example.com"
- ✅ Miembro aparece en lista con estado "Pendiente"
- ✅ Usuario recibe notificación (simulada en backend)

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Invitación enviada y visible como pendiente
**Notas:** 

---

### CU-011: Listelistas de Miembros del Club
**Módulo:** Miembros  
**Descripción:** Ver todos los miembros del club con sus roles y estado  
**Precondiciones:**
- Usuario es miembro del club
- Club tiene múltiples miembros
- Estar en página ClubMembers

**Pasos:**
1. En detalle del club → Click en "Miembros"
2. Observar tabla de miembros
3. Revisar columnas: Nombre, Email, Rol, Estado
4. Hacer scroll si hay muchos miembros

**Resultado Esperado:**
- ✅ Muestra lista completa de miembros
- ✅ Incluye nombre, email, rol, estado
- ✅ Muestra avatares o iniciales
- ✅ Paginación si hay > 10 miembros
- ✅ Administrador ve opciones: editar rol, remover

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Lista de miembros correcta
**Notas:** 

---

### CU-012: Remover Miembro del Club (Admin)
**Módulo:** Miembros  
**Descripción:** Administrador remueve un miembro del club  
**Precondiciones:**
- Usuario es admin del club
- Club tiene al menos 2 miembros
- Estar en página ClubMembers

**Pasos:**
1. En ClubMembers, encontrar miembro a remover
2. Click en botón "Remover" o ⋮ menú
3. Confirmar eliminación
4. Esperar confirmación

**Backend-only (sin frontend) - Reproducción rápida:**
1. Login admin y tomar token:
    ```bash
    curl -X POST http://localhost:8000/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"admin@piar.com","password":"Admin123456"}'
    ```
    Guarda `access_token` como `ADMIN_TOKEN`.
2. Crear usuario de prueba:
    ```bash
    curl -X POST http://localhost:8000/api/auth/registro \
       -H "Content-Type: application/json" \
       -d '{"nombre_completo":"Test Remover","email":"test-remover@example.com","password":"TestPass123"}'
    ```
    Guarda el `id` como `TEST_USER_ID`.
3. Invitar usuario al club (reemplaza `CLUB_ID`):
    ```bash
    curl -X POST http://localhost:8000/api/clubes/CLUB_ID/miembros/invitar \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer ADMIN_TOKEN" \
       -d '{"email":"test-remover@example.com","rol":"miembro"}'
    ```
    Guarda `token` de invitación como `INV_TOKEN`.
4. Login con el usuario de prueba y tomar token:
    ```bash
    curl -X POST http://localhost:8000/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"test-remover@example.com","password":"TestPass123"}'
    ```
    Guarda `access_token` como `TEST_TOKEN`.
5. Aceptar invitación con el usuario de prueba:
    ```bash
    curl -X POST http://localhost:8000/api/auth/invitaciones/aceptar/INV_TOKEN \
       -H "Authorization: Bearer TEST_TOKEN"
    ```
6. Remover miembro con admin:
    ```bash
    curl -X DELETE http://localhost:8000/api/clubes/CLUB_ID/miembros/TEST_USER_ID \
       -H "Authorization: Bearer ADMIN_TOKEN"
    ```
7. Verificar en miembros:
    ```bash
    curl -X GET http://localhost:8000/api/clubes/CLUB_ID/miembros \
       -H "Authorization: Bearer ADMIN_TOKEN"
    ```

**Limpieza (sin endpoint de borrado):**
- El miembro queda en estado `inactivo`. Si necesitas borrar el usuario, elimina en SQLite (`backend/data/piar.db`):
   ```sql
   DELETE FROM invitaciones WHERE email = 'test-remover@example.com';
   DELETE FROM miembro_club WHERE usuario_id = TEST_USER_ID;
   DELETE FROM usuarios WHERE email = 'test-remover@example.com';
   ```

**Resultado Esperado:**
- ✅ Miembro removido exitosamente
- ✅ Desaparece de lista
- ✅ Mensaje de éxito
- ✅ Miembro ya no tiene acceso al club

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Backend y frontend OK, la lista se actualiza sin recargar
**Notas:** 

---

### CU-013: Ver Rol de Usuario en Club
**Módulo:** Miembros  
**Descripción:** Diferentes usuarios tienen diferentes roles  
**Precondiciones:**
- Club con múltiples miembros
- Miembros con roles diferentes

**Pasos:**
1. Ver lista de miembros
2. Identificar roles: Administrador, Socio, etc.
3. Revisar permisos según rol
4. Cambiar rol de un miembro (si es admin)

**Backend-only (sin frontend) - Reproducción rápida:**
1. Login admin y tomar token:
    ```bash
    curl -X POST http://localhost:8000/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"admin@piar.com","password":"Admin123456"}'
    ```
    Guarda `access_token` como `ADMIN_TOKEN`.
2. Listar miembros y roles del club (reemplaza `CLUB_ID`):
    ```bash
    curl -X GET http://localhost:8000/api/clubes/CLUB_ID/miembros \
       -H "Authorization: Bearer ADMIN_TOKEN"
    ```
3. Cambiar rol (reemplaza `USUARIO_ID`):
   ```bash
   curl -X PUT http://localhost:8000/api/clubes/CLUB_ID/miembros/USUARIO_ID/rol \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ADMIN_TOKEN" \
      -d '{"rol":"miembro"}'
   ```
4. Verificar rol actualizado:
   ```bash
   curl -X GET http://localhost:8000/api/clubes/CLUB_ID/miembros \
      -H "Authorization: Bearer ADMIN_TOKEN"
   ```

**Resultado Esperado:**
- ✅ Se muestran roles correctamente
- ✅ Roles limitados por permisos
- ✅ Admin puede cambiar roles
- ✅ No-admin no ve opciones de edición

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Rol actualizado via endpoint y reflejado en listado
**Notas:** 

---

## 👤 MÓDULO 4: PERFIL DE USUARIO

### CU-014: Ver Perfil Personal
**Módulo:** Perfil  
**Descripción:** Usuario ve su información de perfil  
**Precondiciones:**
- Usuario autenticado
- Estar en Dashboard

**Pasos:**
1. Hacer click en Navbar → Avatar/Nombre
2. Click en "Mi Perfil"
3. Observar información mostrada

**Backend-only (sin frontend) - Reproducción rápida:**
1. Login usuario y tomar token:
    ```bash
    curl -X POST http://localhost:8000/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com","password":"Password123"}'
    ```
    Guarda `access_token` como `USER_TOKEN`.
2. Ver perfil:
    ```bash
    curl -X GET http://localhost:8000/api/auth/usuarios/me \
       -H "Authorization: Bearer USER_TOKEN"
    ```
3. Ver clubes del usuario:
    ```bash
    curl -X GET http://localhost:8000/api/clubes \
       -H "Authorization: Bearer USER_TOKEN"
    ```

**Resultado Esperado:**
- ✅ Muestra nombre completo
- ✅ Muestra email
- ✅ Muestra fecha de creación de cuenta
- ✅ Muestra clubs a los que pertenece
- ✅ Botones: Editar perfil, Cambiar contraseña

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Backend y frontend OK (perfil, clubes, fecha y cuenta visibles)
**Notas:** Backend-only OK: `/auth/usuarios/me` y `/clubes`. Frontend OK: fecha de creacion, clubes y seccion cuenta visibles; edicion solo tras "Editar Perfil".

---

### CU-015: Editar Información Personal
**Módulo:** Perfil  
**Descripción:** Usuario actualiza su información personal  
**Precondiciones:**
- Usuario en página de perfil
- Usuario autenticado

**Pasos:**
1. En perfil, click en "Editar Perfil"
2. Modificar nombre completo: "Nombre Actualizado"
3. Click en "Guardar Cambios"
4. Observar confirmación

**Backend-only (sin frontend) - Reproducción rápida:**
1. Login usuario y tomar token:
    ```bash
    curl -X POST http://localhost:8000/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com","password":"Password123"}'
    ```
    Guarda `access_token` como `USER_TOKEN`.
2. Actualizar nombre:
    ```bash
    curl -X PUT http://localhost:8000/api/auth/usuarios/me \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer USER_TOKEN" \
       -d '{"nombre_completo":"Nombre Actualizado"}'
    ```
3. Verificar:
    ```bash
    curl -X GET http://localhost:8000/api/auth/usuarios/me \
       -H "Authorization: Bearer USER_TOKEN"
    ```

**Resultado Esperado:**
- ✅ Cambios guardados exitosamente
- ✅ Navbar se actualiza con nuevo nombre
- ✅ Mensaje de éxito
- ✅ Cambios persisten tras recargar

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Backend y frontend OK: nombre actualizado y visible en UI
**Notas:** Backend OK y frontend OK (edicion con boton "Editar Perfil").

---

### CU-016: Cambiar Contraseña
**Módulo:** Perfil  
**Descripción:** Usuario cambia su contraseña de forma segura  
**Precondiciones:**
- Usuario en página de perfil
- Usuario autenticado

**Pasos:**
1. En perfil, click en "Cambiar Contraseña"
2. Llenar formulario:
   - Contraseña actual: "Password123"
   - Nueva contraseña: "NewPass12345"
   - Confirmar: "NewPass12345"
3. Click en "Cambiar Contraseña"

**Backend-only (sin frontend) - Reproducción rápida:**
1. Login usuario y tomar token:
   ```bash
   curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Password123"}'
   ```
   Guarda `access_token` como `USER_TOKEN`.
2. Cambiar contraseña:
   ```bash
   curl -X POST http://localhost:8000/api/auth/usuarios/cambiar-contraseña \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer USER_TOKEN" \
     -d '{"contraseña_actual":"Password123","contraseña_nueva":"NewPass12345"}'
   ```
3. Login con la nueva contraseña:
   ```bash
   curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"NewPass12345"}'
   ```

**Resultado Esperado:**
- ✅ Valida contraseña actual
- ✅ Rechaza contraseña corta (< 8 caracteres)
- ✅ Rechaza contraseñas no coincidentes
- ✅ Cambio guardado exitosamente
- ✅ Mensaje: "Contraseña actualizada"
- ✅ Usuario puede loguearse con nueva contraseña

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Backend y frontend OK: cambio de contraseña con validaciones
**Notas:** Frontend OK; requiere recargar para actualizar todo el estado.

---

## 📰 MÓDULO 5: NOTICIAS

### CU-017: Ver Noticias del Club
**Módulo:** Noticias  
**Descripción:** Usuario ve noticias publicadas en el club  
**Precondiciones:**
- Usuario es miembro del club
- Club tiene al menos 1 noticia
- Estar en detalle del club

**Pasos:**
1. En detalle del club → Click en tab "Noticias"
2. Observar lista de noticias
3. Hacer click en una noticia

**Backend-only (sin frontend) - Reproducción rápida:**
1. Login usuario miembro y tomar token:
    ```bash
    curl -X POST http://localhost:8000/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"juan@example.com","password":"Juan123456"}'
    ```
    Guarda `access_token` como `USER_TOKEN`.
2. Listar noticias del club (reemplaza `CLUB_ID`):
    ```bash
    curl -X GET http://localhost:8000/api/clubes/CLUB_ID/noticias \
       -H "Authorization: Bearer USER_TOKEN"
    ```
3. Obtener una noticia (reemplaza `NOTICIA_ID`):
    ```bash
    curl -X GET http://localhost:8000/api/clubes/CLUB_ID/noticias/NOTICIA_ID \
       -H "Authorization: Bearer USER_TOKEN"
    ```

**Resultado Esperado:**
- ✅ Muestra lista de noticias
- ✅ Ordenadas por fecha (más recientes primero)
- ✅ Muestra título, fecha, autor
- ✅ Click abre detalle de la noticia

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Backend y frontend OK: noticias visibles en club 5
**Notas:** Validado con maria@example.com; 5 noticias de prueba visibles en UI.

---

### CU-018: Crear Noticia (Admin)
**Módulo:** Noticias  
**Descripción:** Administrador crea nueva noticia en el club  
**Precondiciones:**
- Usuario es admin del club
- Backend corriendo

**Pasos:**
1. En detalle del club → Click en "Crear Noticia" (si es admin)
2. Completar formulario:
   - Título: "Primer Anuncio"
   - Contenido: "Este es el primer anuncio del club"
3. Click en "Publicar"

**Backend-only (sin frontend) - Reproducción rápida:**
1. Login admin y tomar token:
   ```bash
   curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@piar.com","password":"Admin123456"}'
   ```
   Guarda `access_token` como `ADMIN_TOKEN`.
2. Crear noticia (reemplaza `CLUB_ID`):
   ```bash
   curl -X POST http://localhost:8000/api/clubes/CLUB_ID/noticias \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer ADMIN_TOKEN" \
     -d '{"titulo":"Primer Anuncio","contenido":"Este es el primer anuncio del club"}'
   ```
3. Listar noticias para verificar:
   ```bash
   curl -X GET http://localhost:8000/api/clubes/CLUB_ID/noticias \
     -H "Authorization: Bearer ADMIN_TOKEN"
   ```

**Resultado Esperado:**
- ✅ Noticia creada exitosamente
- ✅ Aparece en lista de noticias
- ✅ Se muestra con autor y fecha
- ✅ Otros miembros pueden verla

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Backend y frontend OK: noticia creada y visible en UI
**Notas:** Validado en club 5.

---

## 🎯 MÓDULO 6: CASOS EDGE / ERRORES

### CU-019: Manejar Error de Conexión
**Módulo:** General / Errores  
**Descripción:** Sistema maneja correctamente errores de conexión  
**Precondiciones:**
- Backend detenido
- Usuario intenta hacer login

**Pasos:**
1. Detener backend (Ctrl+C en terminal)
2. Ir a login
3. Intentar hacer login
4. Esperar timeout

**Backend-only (sin frontend) - Reproducción rápida:**
1. Detener backend.
2. Intentar login:
    ```bash
    curl -X POST http://localhost:8000/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com","password":"Password123"}'
    ```
    Debe fallar por conexion.

**Resultado Esperado:**
- ✅ Se muestra mensaje de error
- ✅ Mensaje: "Error de conexión" o similar
- ✅ No se congela la UI
- ✅ Usuario puede reintentar

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Backend y frontend OK: error de conexion mostrado
**Notas:** UI muestra mensaje de error y no se congela.

---

### CU-020: Validación de Campos Vacíos
**Módulo:** General / Validación  
**Descripción:** Formularios requieren todos los campos obligatorios  
**Precondiciones:**
- Estar en formulario de registro o login

**Pasos:**
1. Ir a registro
2. Dejar campos vacíos
3. Click en "Registrarse"

**Backend-only (sin frontend) - Reproducción rápida:**
1. Enviar registro sin campos:
    ```bash
    curl -X POST http://localhost:8000/api/auth/registro \
       -H "Content-Type: application/json" \
       -d '{}'
    ```
    Debe responder 422 (validacion).

**Resultado Esperado:**
- ✅ Muestra error de validación
- ✅ Resalta campos requeridos
- ✅ No permite submit vacío

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Backend y frontend OK: validacion de campos vacios
**Notas:** UI muestra errores y resalta campos requeridos.

---

### CU-021: Email Duplicado en Registro
**Módulo:** Validación  
**Descripción:** No permite registrarse con email ya usado  
**Precondiciones:**
- Email "test@example.com" ya registrado

**Pasos:**
1. Ir a registro
2. Intentar registrarse con: test@example.com
3. Click "Registrarse"

**Backend-only (sin frontend) - Reproducción rápida:**
1. Intentar registrar email existente:
    ```bash
    curl -X POST http://localhost:8000/api/auth/registro \
       -H "Content-Type: application/json" \
       -d '{"nombre_completo":"Duplicado","email":"test@example.com","password":"Password123"}'
    ```
    Debe responder 400 con "El email ya esta registrado".

**Resultado Esperado:**
- ✅ Muestra error
- ✅ Mensaje: "Email ya registrado"
- ✅ No crea cuenta duplicada

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Backend y frontend OK: email duplicado bloqueado.
**Notas:** UI muestra error y no permite crear duplicado.

---

### CU-022: Token Expirado
**Módulo:** Autenticación / Seguridad  
**Descripción:** Sistema maneja correctamente tokens expirados  
**Precondiciones:**
- Usuario autenticado
- Token en localStorage válido

**Pasos:**
1. Estar logueado
2. Esperar > 15 minutos (o simular expiración)
3. Intentar acceder a endpoint protegido
4. Sistema intenta refresh automático

**Backend-only (sin frontend) - Reproducción rápida:**
1. Login y guardar tokens:
    ```bash
    curl -X POST http://localhost:8000/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com","password":"Password123"}'
    ```
    Guarda `access_token` como `ACCESS_TOKEN` y `refresh_token` como `REFRESH_TOKEN`.
2. Esperar a que expire el access token (15 min) y probar endpoint protegido:
    ```bash
    curl -X GET http://localhost:8000/api/clubes \
       -H "Authorization: Bearer ACCESS_TOKEN"
    ```
    Debe responder 401.
3. Refrescar token:
    ```bash
    curl -X POST http://localhost:8000/api/auth/refresh-token \
       -H "Content-Type: application/json" \
       -d '{"refresh_token":"REFRESH_TOKEN"}'
    ```
4. Reintentar con el nuevo access token.

**Resultado Esperado:**
- ✅ Si refresh token válido: Obtiene nuevo access token
- ✅ Usuario permanece logueado
- ✅ Si refresh también expirado: Redirige a login

**Status:** ⏳ Pendiente  
**Resultado Actual:** [Usuario reporta aquí]
**Notas:** 

---

### CU-023: Editar Noticia (Admin)
**Módulo:** Noticias  
**Descripción:** Administrador edita una noticia existente  
**Precondiciones:**
- Usuario es administrador del club
- Noticia creada previamente

**Pasos:**
1. En listado de noticias, hacer click en botón "Editar" (lápiz)
2. Modificar título o contenido
3. Hacer click "Guardar Cambios"

**Resultado Esperado:**
- ✅ Cambios guardados exitosamente
- ✅ Redirección al listado
- ✅ Noticia muestra datos actualizados

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Edición de noticias funcionando correctamente
**Notas:** Formulario precarga correctamente los datos

---

### CU-024: Eliminar Noticia (Admin)
**Módulo:** Noticias  
**Descripción:** Administrador elimina una noticia  
**Precondiciones:**
- Usuario es administrador del club
- Noticia creada previamente

**Pasos:**
1. En formulario de edición de noticia
2. Hacer click en botón "Eliminar" (rojo)
3. Confirmar en el diálogo del navegador

**Resultado Esperado:**
- ✅ Noticia eliminada exitosamente
- ✅ Desaparece del listado de noticias

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Eliminación funcionando con confirmación
**Notas:**

---

## 📅 MÓDULO 7: EVENTOS

### CU-025: Crear Evento (Admin)
**Módulo:** Eventos  
**Descripción:** Administrador crea un nuevo evento  
**Precondiciones:**
- Usuario es administrador del club
- En sección de Eventos

**Pasos:**
1. Hacer click en "Crear Evento"
2. Completar formulario (Nombre, Fechas, Descripción, Tipo)
3. Hacer click en "Crear Evento"

**Resultado Esperado:**
- ✅ Evento creado exitosamente
- ✅ Redirige al listado de eventos
- ✅ Evento visible con sus detalles

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Creación de eventos funcionando, valida campos obligatorios
**Notas:**

---

### CU-026: Listar Eventos del Club
**Módulo:** Eventos  
**Descripción:** Miembros ven los eventos programados  
**Precondiciones:**
- Usuario es miembro del club
- Existen eventos creados

**Pasos:**
1. Ir a la pestaña/sección "Eventos" del club
2. Observar el listado de tarjetas de eventos

**Resultado Esperado:**
- ✅ Se muestran los eventos del club
- ✅ Información visible: Título, Fecha, Descripción corta
- ✅ Botones de acción visibles según rol

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Listado carga correctamente
**Notas:**

---

### CU-027: Editar Evento (Admin)
**Módulo:** Eventos  
**Descripción:** Administrador modifica un evento  
**Precondiciones:**
- Usuario es administrador
- Existe evento

**Pasos:**
1. En tarjeta de evento, click en botón "Editar" (lápiz)
2. Modificar fechas o descripción
3. Guardar cambios

**Resultado Esperado:**
- ✅ Información actualizada
- ✅ Persiste tras recargar

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Edición de eventos funcionando (fechas se parsean bien)
**Notas:**

---

### CU-028: Eliminar Evento (Admin)
**Módulo:** Eventos  
**Descripción:** Administrador cancela/elimina un evento  
**Precondiciones:**
- Usuario es administrador

**Pasos:**
1. En formulario de edición de evento
2. Click en botón "Eliminar"
3. Confirmar

**Resultado Esperado:**
- ✅ Evento eliminado
- ✅ Desaparece de la lista

**Status:** 🟢 OK  
**Resultado Actual:** ✅ Borrado de eventos funcionando correctamente

---

### CU-029: Ver Contraseña de Instalaciones (Miembro)
**Módulo:** Instalaciones (ClubDetail)
**Descripción:** Un miembro activo visualiza el código de acceso a las instalaciones
**Precondiciones:**
- Usuario logueado como miembro activo del club
- Existe una contraseña de instalación activa

**Pasos:**
1. Navegar al detalle del club
2. Buscar la sección "Código de Acceso"
3. Verificar que se muestre el código

**Resultado Esperado:**
- ✅ Se muestra el código (ej: "1234")
- ✅ Se muestra la descripción (ej: "Puerta Principal")
- ✅ Se oculta si no es miembro activo (Error 403 manejado o sección no visible)

**Status:** 🟢 OK
**Resultado Actual:** ✅ Funcionalidad verificada. Miembros ven el código, no miembros no.

---

### CU-030: Actualizar Contraseña de Instalaciones (Admin)
**Módulo:** Instalaciones (ClubEdit)
**Descripción:** Un administrador cambia el código de acceso
**Precondiciones:**
- Usuario logueado como administrador del club

**Pasos:**
1. Navegar a "Editar Club"
2. Ir a la sección "Gestión de Acceso a Instalaciones"
3. Ingresar nuevo código y descripción
4. Click en "Actualizar Contraseña"

**Resultado Esperado:**
- ✅ Se actualiza la contraseña actual
- ✅ Se muestra mensaje de éxito
- ✅ El historial refleja el cambio
- ✅ La nueva contraseña es visible inmediatamente para los miembros

**Status:** 🟢 OK
**Resultado Actual:** ✅ Cambio de contraseña e historial funcionando correctamente.

**Notas:**

---

## 🛡️ MÓDULO 9: ADMINISTRACION (SUPERADMIN)

### CU-031: Configuracion SMTP (Superadmin)
**Módulo:** Administracion
**Descripción:** Superadmin visualiza y guarda configuracion SMTP
**Precondiciones:**
- Usuario superadmin autenticado

**Pasos:**
1. Ir a `/admin/email`
2. Completar servidor, puerto, remitente y URL del frontend
3. Guardar cambios

**Resultado Esperado:**
- ✅ Se muestra la configuracion actual
- ✅ Guardado exitoso
- ✅ Mensaje de confirmacion
- ✅ Los emails usan la URL configurada

**Status:** 🟢 OK
**Resultado Actual:** ✅ Configuracion guardada correctamente.

---

### CU-032: Enviar email de prueba (Superadmin)
**Módulo:** Administracion
**Descripción:** Superadmin envia email de prueba desde panel SMTP
**Precondiciones:**
- Usuario superadmin autenticado

**Pasos:**
1. Ir a `/admin/email`
2. Ingresar email de destino
3. Click en "Enviar prueba"

**Resultado Esperado:**
- ✅ Solicitud enviada
- ✅ Mensaje de exito o aviso de configuracion no definida

**Status:** 🟢 OK
**Resultado Actual:** ✅ Endpoint responde con mensaje de exito.

---

### CU-033: Bloqueo admin SMTP (No superadmin)
**Módulo:** Administracion
**Descripción:** Usuario no superadmin no puede acceder a configuracion SMTP
**Precondiciones:**
- Usuario autenticado sin rol superadmin

**Pasos:**
1. Intentar acceder a `/api/admin/config/email`

**Resultado Esperado:**
- ✅ API retorna 403

**Status:** 🟢 OK
**Resultado Actual:** ✅ Acceso bloqueado correctamente.

---

### CU-034: Landing invitacion muestra email
**Módulo:** Miembros / Invitaciones
**Descripción:** La pantalla de invitacion muestra el email correcto del invitado
**Precondiciones:**
- Invitacion pendiente valida con token

**Pasos:**
1. Abrir enlace de invitacion (`/auth/aceptar-invitacion?token=...`)

**Resultado Esperado:**
- ✅ El email mostrado coincide con el email de la invitacion
- ✅ El nombre del club se muestra correctamente

**Status:** 🟢 OK
**Resultado Actual:** ✅ Datos cargados desde el backend.
