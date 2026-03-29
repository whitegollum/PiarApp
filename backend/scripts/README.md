# Scripts de Base de Datos

Este directorio contiene scripts útiles para gestionar la base de datos de PiarAPP.

## 🚀 Inicio Rápido

### Actualizar la base de datos de forma segura (RECOMENDADO)

```bash
# Método automático con backup incluido
python scripts/safe_migrate.py
```

Este script todo-en-uno hace:
1. ✅ Análisis de cambios (dry-run)
2. ✅ Backup automático
3. ✅ Aplicación de migraciones
4. ✅ Verificación de integridad

---

## safe_migrate.py

**✨ SCRIPT TODO-EN-UNO RECOMENDADO**

Script completo que ejecuta todo el proceso de migración de forma segura y automatizada.

### Uso

```bash
# Modo completo con backup y confirmación
python scripts/safe_migrate.py

# Sin backup (no recomendado)
python scripts/safe_migrate.py --no-backup

# Sin confirmación interactiva
python scripts/safe_migrate.py --force
```

**Windows:**
```cmd
scripts\safe_migrate.bat
```

### ¿Qué hace?

Este script ejecuta automáticamente:
1. **Análisis previo**: Muestra qué cambios se aplicarán
2. **Backup automático**: Guarda copia de seguridad de la BD
3. **Confirmación**: Pide confirmación antes de aplicar (si no usas --force)
4. **Migración**: Aplica los cambios al esquema
5. **Verificación**: Comprueba que todo funcionó correctamente

### Ventajas

- ✅ Proceso guiado paso a paso
- ✅ Backup automático antes de cambios
- ✅ Verificación de integridad después de migrar
- ✅ Mensajes claros y visuales
- ✅ Manejo de errores robusto

---

## migrate_schema.py

**SCRIPT AVANZADO PARA MIGRACIONES**

Script inteligente que compara el esquema actual de la base de datos con los modelos SQLAlchemy y aplica automáticamente las migraciones necesarias sin perder datos existentes.

### Uso

```bash
# Análisis previo (no aplica cambios, solo muestra qué haría)
python scripts/migrate_schema.py --dry-run

# Aplicar migraciones con confirmación interactiva
python scripts/migrate_schema.py

# Aplicar migraciones sin pedir confirmación
python scripts/migrate_schema.py --force
```

**Usando los scripts wrapper:**

En **Windows**:
```cmd
cd backend
scripts\migrate_schema.bat --dry-run
scripts\migrate_schema.bat
```

En **Linux/Mac**:
```bash
cd backend
chmod +x scripts/migrate_schema.sh  # Solo la primera vez
./scripts/migrate_schema.sh --dry-run
./scripts/migrate_schema.sh
```

### Características

- ✅ **Seguro**: No elimina datos existentes, solo agrega/modifica estructura
- ✅ **Inteligente**: Detecta automáticamente tablas y columnas faltantes
- ✅ **Rastreable**: Registra las migraciones aplicadas en `schema_migrations`
- ✅ **Modo dry-run**: Puedes ver los cambios antes de aplicarlos
- ✅ **Aplica archivos SQL**: Lee y ejecuta migraciones pendientes de `/migrations`
- ✅ **Compatible con SQLite y PostgreSQL**

### Cuándo usar este script

- Después de hacer `git pull` y hay cambios en los modelos
- Cuando aparecen errores de columnas faltantes en la BD
- Para aplicar cambios del esquema en producción de forma segura
- Cuando necesitas sincronizar la BD con el código

### Ejemplo de uso típico

```bash
# 1. Hacer backup (siempre!)
cp data/piar.db data/piar.db.backup

# 2. Ver qué cambios se aplicarán
python scripts/migrate_schema.py --dry-run

# 3. Si todo se ve bien, aplicar
python scripts/migrate_schema.py

# 4. Verificar que la aplicación funciona correctamente
python run.py
```

### Qué hace el script

1. **Analiza** el esquema actual de la BD usando SQLAlchemy Inspector
2. **Compara** con los modelos definidos en `/app/models`
3. **Detecta** tablas faltantes, columnas faltantes, y tipos incompatibles
4. **Genera** sentencias SQL `ALTER TABLE` para agregar lo que falta
5. **Aplica** migraciones SQL pendientes de `/migrations`
6. **Registra** las migraciones en la tabla `schema_migrations`
7. **Muestra** un resumen de todas las operaciones realizadas

### Tabla de tracking de migraciones

El script crea automáticamente la tabla `schema_migrations` para rastrear qué migraciones se han aplicado:

```sql
CREATE TABLE schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    migration_name TEXT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);
```

Puedes consultar qué migraciones se han aplicado:

```sql
SELECT * FROM schema_migrations ORDER BY applied_at DESC;
```

---

## backup_db.py

Script para crear backups de la base de datos SQLite.

### Uso

```bash
# Crear backup con timestamp automático
python scripts/backup_db.py

# Especificar nombre del backup
python scripts/backup_db.py --output mi_backup.db

# Listar backups existentes
python scripts/backup_db.py --list
```

### Características

- ✅ Nombrado automático con timestamp
- ✅ Conserva metadatos del archivo original
- ✅ Muestra tamaño y fecha del backup
- ✅ Puede listar backups previos

### Ejemplo

```bash
# Crear backup antes de hacer cambios
python scripts/backup_db.py

# Salida:
# ✅ Backup creado exitosamente:
#    Archivo: data/piar_backup_20260329_143025.db
#    Tamaño: 2048.50 KB
#    Fecha: 2026-03-29 14:30:25

# Listar backups disponibles
python scripts/backup_db.py --list

# Restaurar un backup manualmente si es necesario
# cp data/piar_backup_20260329_143025.db data/piar.db
```

---

## update_smtp_config.py

Script para actualizar la configuración SMTP desde variables de entorno. Útil cuando se despliega por primera vez o cuando se cambia la configuración en `.env` y se necesita actualizar la base de datos.

### Uso

```bash
# Desde el directorio backend
python scripts/update_smtp_config.py
```

Este script:
- Lee las variables de entorno del archivo `.env`
- Actualiza o crea la configuración SMTP en la base de datos
- Muestra el antes y después de la configuración
- **Importante:** Solo actualiza si hay una contraseña configurada en `SMTP_PASSWORD`

**Nota sobre contraseñas de Google:** Las contraseñas de aplicación de Google se muestran con espacios (ej: "jfbh emfw ovco rgvu") pero deben usarse **sin espacios** en el archivo `.env`: `SMTP_PASSWORD=jfbhemfwovcorgvu`

## reset_database.py

Script para limpiar o recrear la base de datos.

### Uso

**Limpiar datos (mantiene estructura):**
```bash
# Desde el directorio backend/scripts
python reset_database.py limpiar

# Sin confirmación (¡usar con precaución!)
python reset_database.py limpiar --yes
```

**Recrear base de datos (elimina y recrea tablas):**
```bash
python reset_database.py recrear
```

### Modos de operación

#### Modo `limpiar`
- Elimina **todos los datos** de todas las tablas
- **Mantiene** la estructura de las tablas
- Resetea los contadores de auto-increment
- Ideal para: desarrollo, testing, resetear datos de prueba

#### Modo `recrear`
- **Elimina completamente** todas las tablas
- **Recrea** las tablas desde cero según los modelos
- Aplica cualquier cambio reciente en los modelos
- Ideal para: aplicar cambios de schema, corregir inconsistencias

### ⚠️ Advertencias

- **ESTOS SCRIPTS SON DESTRUCTIVOS**: Eliminan datos permanentemente
- Siempre haz backup antes de ejecutarlos en producción
- Usa `--yes` solo en scripts automatizados donde estés seguro

### Ejemplos de uso

**Usando el script de Python directamente:**
```bash
# Desarrollo: limpiar datos de prueba
cd backend/scripts
python reset_database.py limpiar --yes

# Producción: con confirmación
python reset_database.py limpiar
# Se te pedirá escribir 'SI' para confirmar

# Aplicar cambios de schema
python reset_database.py recrear
# Se te pedirá escribir 'RECREAR' para confirmar
```

**Usando los scripts wrapper:**

En **Windows**:
```cmd
cd backend\scripts
reset_db.bat limpiar
```

En **Linux/Mac**:
```bash
cd backend/scripts
chmod +x reset_db.sh  # Solo la primera vez
./reset_db.sh limpiar
```

### Backup antes de limpiar

```bash
# SQLite: copiar archivo
cp backend/data/piar.db backend/data/piar.db.backup

# O usar el script de reset desde el directorio raíz
python -m backend.scripts.reset_database limpiar
```
