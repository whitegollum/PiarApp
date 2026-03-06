# Scripts de Base de Datos

Este directorio contiene scripts útiles para gestionar la base de datos de PiarAPP.

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
