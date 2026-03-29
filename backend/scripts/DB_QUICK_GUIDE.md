# Guía Rápida: Actualización de Base de Datos

## 🎯 ¿Cuándo actualizar la base de datos?

Necesitas actualizar el esquema cuando:
- Hiciste `git pull` y hay cambios en los modelos
- Aparecen errores como "table X has no column named Y"
- Agregaste nuevos campos a los modelos SQLAlchemy
- Hay cambios en la estructura de tablas

## 🚀 Método Recomendado (Todo-en-Uno)

### Paso 1: Ejecutar safe_migrate

```bash
# Ubicación: backend/
python scripts/safe_migrate.py
```

O en Windows:
```cmd
scripts\safe_migrate.bat
```

**¿Qué hace?**
1. ✅ Analiza qué cambios se aplicarán
2. ✅ Crea un backup automático
3. ✅ Pide confirmación
4. ✅ Aplica las migraciones
5. ✅ Verifica que todo funcionó

### Paso 2: Reiniciar la aplicación

```bash
python run.py
```

## 📋 Métodos Alternativos

### Método Manual (Control Total)

```bash
# 1. Ver qué cambios se harán (sin aplicar)
python scripts/migrate_schema.py --dry-run

# 2. Crear backup manualmente
python scripts/backup_db.py

# 3. Aplicar migraciones
python scripts/migrate_schema.py

# 4. Verificar
python run.py
```

### Método sin Backup (Solo desarrollo)

```bash
python scripts/safe_migrate.py --no-backup --force
```

⚠️ **No recomendado para producción**

## 🔍 Comandos Útiles

### Ver qué migraciones se han aplicado

```bash
# Opción 1: Desde SQLite CLI
sqlite3 data/piar.db "SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 10;"

# Opción 2: Desde Python
python -c "from app.database.db import engine; from sqlalchemy import text; 
conn = engine.connect(); 
result = conn.execute(text('SELECT * FROM schema_migrations ORDER BY applied_at DESC')); 
[print(row) for row in result]"
```

### Listar backups disponibles

```bash
python scripts/backup_db.py --list
```

### Restaurar un backup

```bash
# Ver backups disponibles
python scripts/backup_db.py --list

# Restaurar (reemplazar archivo actual)
# Windows
copy data\piar_backup_20260329_143025.db data\piar.db

# Linux/Mac
cp data/piar_backup_20260329_143025.db data/piar.db
```

## 🆘 Solución de Problemas

### Error: "no such column"

```bash
# El esquema está desactualizado
python scripts/safe_migrate.py
```

### Error: "table already exists"

```bash
# Ver estado actual
python scripts/migrate_schema.py --dry-run

# Si el esquema está bien, no hagas nada
# Si hay conflicto, considera reset_database.py (⚠️ pierde datos)
```

### La migración falló a la mitad

```bash
# 1. Listar backups
python scripts/backup_db.py --list

# 2. Restaurar el último backup
cp data/piar_backup_XXXXXX.db data/piar.db

# 3. Reportar el error para investigar
```

### Quiero empezar de cero (⚠️ PIERDE TODOS LOS DATOS)

```bash
# Solo desarrollo!
python scripts/reset_database.py recrear
```

## 📊 Flujo de Trabajo Recomendado

### En Desarrollo

```bash
# Antes de empezar a trabajar
git pull
python scripts/safe_migrate.py --force

# Trabajar normalmente
# ...

# Antes de hacer commit con cambios en modelos
python scripts/migrate_schema.py --dry-run  # Verificar cambios
```

### En Producción

```bash
# 1. Hacer backup manual adicional
cp data/piar.db data/piar.db.pre-deploy-$(date +%Y%m%d)

# 2. Actualizar código
git pull

# 3. Aplicar migraciones con confirmación
python scripts/safe_migrate.py

# 4. Verificar aplicación
python run.py &
# Probar endpoints críticos

# 5. Si hay problemas, restaurar
# cp data/piar.db.pre-deploy-XXXXXX data/piar.db
# git checkout main~1  # volver al commit anterior
```

## 💡 Tips

1. **Siempre haz backup en producción**: Aunque `safe_migrate.py` lo hace automáticamente, haz uno adicional manualmente para estar seguro.

2. **Usa dry-run primero**: Antes de aplicar cambios importantes, ejecuta `--dry-run` para ver qué se hará.

3. **Lee los mensajes del script**: Los scripts son verbosos intencionalmente. Lee los mensajes para entender qué está pasando.

4. **Guarda los backups importantes**: Los backups automáticos se acumulan. Guarda los importantes en otro directorio.

5. **En desarrollo, puedes ser más rápido**: Usa `--force` para saltar confirmaciones si estás seguro.

## 🔗 Más Información

- Documentación completa: [scripts/README.md](README.md)
- Scripts disponibles: Ver `backend/scripts/`
- Configuración de BD: [app/config.py](../app/config.py)
- Modelos: [app/models/](../app/models/)
