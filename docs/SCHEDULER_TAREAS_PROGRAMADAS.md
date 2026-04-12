# Sistema de Tareas Programadas (APScheduler)

## Descripción General

Se ha implementado un sistema de tareas programadas usando **APScheduler** que se ejecuta automáticamente en segundo plano cuando el servidor FastAPI está activo.

## Tareas Configuradas

### 1. Generación Automática de Alertas
- **Frecuencia**: Diariamente a las 2:00 AM
- **Función**: Escanea todos los clubes con alertas habilitadas y genera/actualiza alertas de documentación vencida
- **Job ID**: `generar_alertas_diario`
- **Proceso**:
  1. Obtiene clubes con `alertas_documentacion_enabled = True`
  2. Para cada club, analiza la documentación reglamentaria de todos los socios
  3. Crea alertas según el estado de vencimiento:
     - 🟡 **WARNING**: 30 días o menos antes de vencer
     - 🔴 **DANGER**: 0-60 días después de vencido
     - 🟣 **CRITICAL**: Más de 60 días vencido
  4. Marca como resueltas las alertas de documentos actualizados

### 2. Backups Automáticos de Base de Datos
- **Frecuencia**: Diariamente a las 3:00 AM
- **Job ID**: `backups_automaticos`
- **Proceso**:
  1. Verifica si los backups automáticos están habilitados (`backup_automatico_habilitado`)
  2. Comprueba si han pasado suficientes días desde el último backup (`backup_frecuencia_dias`)
  3. Crea una copia de seguridad de la base de datos
  4. Actualiza la fecha del último backup (`backup_ultimo_ejecutado`)
  5. Limpia backups antiguos según `backup_max_archivos`

## Configuración

### Horarios de Ejecución
Los horarios están definidos en `backend/app/services/scheduler_service.py`:

```python
# Alertas: Diario a las 2:00 AM (hora de España)
trigger=CronTrigger(hour=2, minute=0)

# Backups: Diario a las 3:00 AM (hora de España)
trigger=CronTrigger(hour=3, minute=0)
```

**Timezone configurado**: `Europe/Madrid`

### Configuración de Backups
Los backups se configuran desde el panel de administración:
- **Ubicación**: Admin → Base de Datos → Configuración de Backups Automáticos
- **Parámetros**:
  - `backup_automatico_habilitado`: Activar/desactivar backups automáticos
  - `backup_frecuencia_dias`: Cada cuántos días hacer backup (1-365)
  - `backup_max_archivos`: Máximo de backups a conservar (1-100)

### Configuración de Alertas
Las alertas se configuran por club:
- **Ubicación**: Admin → Sistema de Alertas → Configuración
- **Parámetros**:
  - `alertas_documentacion_enabled`: Activar/desactivar alertas del club
  - `alertas_dias_aviso_previo`: Días antes del vencimiento para generar WARNING (default: 30)
  - `alertas_dias_critico`: Días después del vencimiento para generar CRITICAL (default: 60)

## Arquitectura

### Archivos Principales

1. **scheduler_service.py** (`backend/app/services/scheduler_service.py`)
   - Clase `SchedulerService` que gestiona el scheduler
   - Métodos de inicio y parada
   - Definición de jobs
   - Lógica de ejecución de tareas

2. **main.py** (`backend/app/main.py`)
   - Integración del scheduler con el ciclo de vida de FastAPI
   - Uso de `lifespan` context manager para inicio/parada

3. **admin.py** (`backend/app/routes/admin.py`)
   - Endpoint `/api/admin/scheduler/status` para ver estado del scheduler

### Flujo de Inicio

1. FastAPI inicia → evento `lifespan` startup
2. Se importa `SchedulerService`
3. Se llama a `SchedulerService.start()`
4. Se crea `BackgroundScheduler` con timezone Madrid
5. Se registran las 2 tareas con sus triggers
6. El scheduler comienza a ejecutarse en segundo plano

### Flujo de Parada

1. FastAPI recibe señal de parada → evento `lifespan` shutdown
2. Se llama a `SchedulerService.shutdown()`
3. El scheduler se detiene de forma ordenada

## Logs y Monitoreo

### Logs del Sistema
Los logs del scheduler se pueden ver en la salida del servidor:

```
INFO - ✅ Scheduler iniciado correctamente
INFO - 📅 Tareas programadas:
INFO -   - Alertas: Diario a las 2:00 AM
INFO -   - Backups: Diario a las 3:00 AM
```

Cuando se ejecutan las tareas:
```
INFO - 🔔 Iniciando generación automática de alertas...
INFO - ✅ Alertas generadas - Creadas: 5, Actualizadas: 2, Resueltas: 1
```

```
INFO - 💾 Iniciando verificación de backups automáticos...
INFO - Creando backup automático...
INFO - ✅ Backup creado: piar_backup_20260409_030000.db (2.45 MB)
```

### Panel de Administración
**Ubicación**: Admin → Base de Datos → Tareas Programadas

Muestra:
- Estado del scheduler (Activo/Detenido)
- Lista de tareas configuradas
- Próxima ejecución de cada tarea
- Frecuencia de ejecución

## Mantenimiento

### Modificar Horarios
Para cambiar los horarios de ejecución, edita `scheduler_service.py`:

```python
# Cambiar hora de alertas (ejemplo: 1:30 AM)
trigger=CronTrigger(hour=1, minute=30)

# Ejecutar cada 12 horas
trigger=CronTrigger(hour='*/12')

# Ejecutar solo los lunes a las 3:00 AM
trigger=CronTrigger(day_of_week='mon', hour=3, minute=0)
```

### Agregar Nuevas Tareas
Para agregar una nueva tarea programada:

1. Crear el método estático en `SchedulerService`:
```python
@classmethod
def _job_mi_nueva_tarea(cls):
    """Descripción de la tarea"""
    logger.info("Ejecutando mi nueva tarea...")
    # ... lógica ...
```

2. Registrar en el método `start()`:
```python
cls._scheduler.add_job(
    func=cls._job_mi_nueva_tarea,
    trigger=CronTrigger(hour=4, minute=0),
    id='mi_nueva_tarea',
    name='Descripción de Mi Nueva Tarea',
    replace_existing=True
)
```

### Desactivar el Scheduler
Para desactivar temporalmente el scheduler, comenta las líneas en `main.py`:

```python
# SchedulerService.start()
# logger.info("✅ Scheduler de tareas programadas iniciado")
```

## Dependencias

```
APScheduler==3.10.4
```

Instalado en `backend/requirements.txt`

## Notas Técnicas

- **Thread-safe**: El BackgroundScheduler usa threads separados
- **Persistencia**: Las tareas se definen en código, no en base de datos
- **Timezone**: Configurado para Europe/Madrid
- **Manejo de errores**: Cada job tiene try-except para evitar que un error detenga el scheduler
- **Base de datos**: Cada job crea su propia sesión de DB con `SessionLocal()`

## Troubleshooting

### El scheduler no inicia
Verifica los logs de inicio del servidor. Si hay errores de importación, asegúrate de que APScheduler está instalado:
```bash
pip install APScheduler==3.10.4
```

### Las tareas no se ejecutan
1. Verifica que el scheduler está activo: `/api/admin/scheduler/status`
2. Comprueba la configuración de horarios
3. Revisa los logs del servidor para ver mensajes de error

### Los backups no se crean
1. Verifica que `backup_automatico_habilitado = True`
2. Comprueba que han pasado suficientes días según `backup_frecuencia_dias`
3. Revisa los permisos de escritura en el directorio de la base de datos

### Las alertas no se generan
1. Verifica que el club tiene `alertas_documentacion_enabled = True`
2. Comprueba que hay documentación con fechas de vencimiento
3. Revisa los logs para ver estadísticas de generación
