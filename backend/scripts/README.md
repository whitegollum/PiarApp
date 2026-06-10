# Scripts de Base de Datos

Este directorio contiene scripts útiles para gestionar la base de datos de PiarAPP.

## 🚀 Migraciones de esquema → Alembic

El esquema de la base de datos se gestiona con **Alembic** (no con scripts ad-hoc).
Las migraciones se aplican automáticamente al arrancar la app, pero también puedes
ejecutarlas a mano desde `backend/`:

```bash
alembic upgrade head                                  # aplicar migraciones pendientes
alembic revision --autogenerate -m "descripcion"      # crear migración tras cambiar modelos
alembic current                                       # revisión actual
alembic history                                       # historial
```

Funciona igual en SQLite (desarrollo) y PostgreSQL (producción); el motor lo
determina `DATABASE_URL`.

---

## migrate_sqlite_to_postgres.py

Migración única de datos de una base SQLite existente a PostgreSQL. Reutiliza el
export/import lógico en JSON de `app/services/data_transfer.py` (mismo formato que
los backups del panel de administración) y, en PostgreSQL, reinicia las secuencias.

```bash
# En el entorno ya configurado para Postgres (DATABASE_URL apuntando a Postgres)
cd backend
DATABASE_URL="postgresql+psycopg2://piar:PASS@localhost:5432/piar" \
    python scripts/migrate_sqlite_to_postgres.py --source sqlite:///./data/piar.db
```

Pasos: aplica Alembic al destino, exporta del origen, importa (vaciando) y valida
los conteos por tabla (origen vs destino).

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

> Nota: para backups agnósticos al motor (también PostgreSQL) usa el panel de
> administración (export lógico JSON) o `app/services/data_transfer.py`.

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
