import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import '../../styles/AdminDatabase.css';
import '../../styles/ClubDetail.css';
import '../../styles/Tareas.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface DatabaseStatus {
  motor: string;
  url: string;
  estadisticas: {
    usuarios: number;
    clubes: number;
    noticias: number;
    eventos: number;
    alertas: number;
    tareas_comunitarias: number;
  };
  migraciones_recientes: Array<{
    nombre: string;
    fecha: string;
    descripcion: string;
  }>;
}

interface CheckResult {
  necesita_migracion: boolean;
  estadisticas: {
    tablas_faltantes: number;
    columnas_faltantes: number;
    tipo_incompatibilidades: number;
    total_cambios: number;
  };
  output: string;
  mensaje: string;
}

interface BackupInfo {
  filename: string;
  size_bytes: number;
  size_mb: number;
  created_at: string;
  full_path: string;
}

interface BackupConfig {
  backup_automatico_habilitado: boolean;
  backup_frecuencia_dias: number;
  backup_max_archivos: number;
  backup_ultimo_ejecutado: string | null;
}

interface SchedulerJob {
  id: string;
  name: string;
  next_run: string | null;
  trigger: string;
}

interface SchedulerStatus {
  running: boolean;
  jobs: SchedulerJob[];
}

const AdminDatabase: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [migrateResult, setMigrateResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOutput, setShowOutput] = useState(false);
  
  // Estados para backups
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [backupConfig, setBackupConfig] = useState<BackupConfig | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  
  // Estado para scheduler
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);

  useEffect(() => {
    loadStatus();
    loadBackups();
    loadBackupConfig();
    loadSchedulerStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/database/status`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data.info);
      }
    } catch (err) {
      console.error('Error al cargar estado:', err);
    }
  };

  const loadBackups = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/database/backups`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBackups(data.backups);
      }
    } catch (err) {
      console.error('Error al cargar backups:', err);
    }
  };

  const loadBackupConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/database/backup-config`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBackupConfig(data);
      }
    } catch (err) {
      console.error('Error al cargar configuración:', err);
    }
  };

  const loadSchedulerStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/scheduler/status`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSchedulerStatus(data.scheduler);
      }
    } catch (err) {
      console.error('Error al cargar estado del scheduler:', err);
    }
  };

  const handleCheck = async () => {
    setLoading(true);
    setError(null);
    setCheckResult(null);
    setMigrateResult(null);

    try {
      const response = await fetch(`${API_URL}/admin/database/check`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setCheckResult(data);
      } else {
        setError(data.detail || 'Error al verificar base de datos');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async () => {
    if (!confirm('⚠️ ¿Estás seguro de aplicar las migraciones?\n\nEsta operación modificará la base de datos.')) {
      return;
    }

    setLoading(true);
    setError(null);
    setMigrateResult(null);

    try {
      const response = await fetch(`${API_URL}/admin/database/migrate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setMigrateResult(data);
        // Recargar estado después de migrar
        await loadStatus();
        // Limpiar check result
        setCheckResult(null);
      } else {
        setError(data.detail?.mensaje || data.detail || 'Error al aplicar migraciones');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/admin/database/backup`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Backup creado exitosamente\n\nArchivo: ${data.filename}\nTamaño: ${data.size_mb} MB`);
        await loadBackups();
      } else {
        setError(data.detail || 'Error al crear backup');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDownloadBackup = async (filename: string) => {
    try {
      const response = await fetch(`${API_URL}/admin/database/backups/${filename}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Error al descargar backup');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error al descargar backup');
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm(`¿Estás seguro de eliminar el backup "${filename}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/database/backups/${filename}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        alert('Backup eliminado correctamente');
        await loadBackups();
      } else {
        alert('Error al eliminar backup');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error al eliminar backup');
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreFile) {
      alert('Por favor selecciona un archivo para restaurar');
      return;
    }

    if (!confirm('⚠️ ADVERTENCIA ⚠️\n\n¿Estás ABSOLUTAMENTE SEGURO de restaurar este backup?\n\nEsta operación:\n- Reemplazará todos los datos actuales por los del backup\n- Creará un backup de seguridad automático\n- No se puede deshacer\n\n¿Continuar?')) {
      return;
    }

    setBackupLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', restoreFile);

      const response = await fetch(`${API_URL}/admin/database/restore`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ ${data.message}\n\nBackup de seguridad creado: ${data.backup_created}\nTablas con datos restauradas: ${data.tables_restored}`);
        setRestoreFile(null);
        await loadStatus();
        await loadBackups();
      } else {
        setError(data.detail?.mensaje || data.detail || 'Error al restaurar backup');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleUpdateBackupConfig = async () => {
    if (!backupConfig) return;

    setBackupLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/admin/database/backup-config`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backupConfig),
      });

      const data = await response.json();

      if (response.ok) {
        setBackupConfig(data);
        alert('✅ Configuración de backups actualizada correctamente');
        await loadBackups(); // Recargar lista en caso de que se hayan eliminado backups antiguos
      } else {
        setError(data.detail || 'Error al actualizar configuración');
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="club-detail-main">
        <div className="club-detail-container">
          <button
            className="btn-volver-tareas"
            onClick={() => navigate(-1)}
          >
            ← Volver
          </button>

          <div className="admin-database-container">
      <div className="admin-database-header">
        <h1>🗄️ Gestión de Base de Datos</h1>
        <p className="subtitle">Administración y mantenimiento del esquema de la base de datos</p>
      </div>

      {/* Estado de la BD */}
      {status && (
        <div className="database-status-card">
          <h2>📊 Estado Actual</h2>
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Motor:</span>
              <span className="status-value">{status.motor.toUpperCase()}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Usuarios:</span>
              <span className="status-value">{status.estadisticas.usuarios}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Clubes:</span>
              <span className="status-value">{status.estadisticas.clubes}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Noticias:</span>
              <span className="status-value">{status.estadisticas.noticias}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Eventos:</span>
              <span className="status-value">{status.estadisticas.eventos}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Alertas:</span>
              <span className="status-value">{status.estadisticas.alertas}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Tareas Comunitarias:</span>
              <span className="status-value">{status.estadisticas.tareas_comunitarias}</span>
            </div>
          </div>

          {status.migraciones_recientes && status.migraciones_recientes.length > 0 && (
            <div className="migrations-history">
              <h3>📝 Últimas Migraciones</h3>
              <div className="migrations-list">
                {status.migraciones_recientes.map((mig, idx) => (
                  <div key={idx} className="migration-item">
                    <span className="migration-name">{mig.nombre}</span>
                    <span className="migration-date">{new Date(mig.fecha).toLocaleString('es-ES')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="database-actions-card">
        <h2>🔧 Mantenimiento del Esquema</h2>
        
        <div className="action-section">
          <h3>1️⃣ Verificar Estado del Esquema</h3>
          <p>Comprueba si hay cambios pendientes en el esquema sin aplicar modificaciones.</p>
          <button
            className="btn btn-check"
            onClick={handleCheck}
            disabled={loading}
          >
            {loading ? '⏳ Verificando...' : '🔍 Verificar Esquema'}
          </button>
        </div>

        {checkResult && (
          <div className={`check-result ${checkResult.necesita_migracion ? 'warning' : 'success'}`}>
            <div className="result-header">
              {checkResult.necesita_migracion ? (
                <>
                  <span className="icon">⚠️</span>
                  <h4>Se requieren actualizaciones</h4>
                </>
              ) : (
                <>
                  <span className="icon">✅</span>
                  <h4>Esquema actualizado</h4>
                </>
              )}
            </div>
            
            <div className="result-stats">
              <div className="stat-item">
                <span className="stat-label">Tablas faltantes:</span>
                <span className="stat-value">{checkResult.estadisticas.tablas_faltantes}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Columnas faltantes:</span>
                <span className="stat-value">{checkResult.estadisticas.columnas_faltantes}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total cambios:</span>
                <span className="stat-value">{checkResult.estadisticas.total_cambios}</span>
              </div>
            </div>

            {checkResult.necesita_migracion && (
              <div className="action-section">
                <h3>2️⃣ Aplicar Migraciones</h3>
                <p className="warning-text">
                  ⚠️ Esta operación modificará la base de datos. Se creará un backup automático.
                </p>
                <button
                  className="btn btn-migrate"
                  onClick={handleMigrate}
                  disabled={loading}
                >
                  {loading ? '⏳ Aplicando...' : '⚡ Aplicar Migraciones'}
                </button>
              </div>
            )}

            <button
              className="btn-link"
              onClick={() => setShowOutput(!showOutput)}
            >
              {showOutput ? '▼ Ocultar detalles' : '▶ Ver detalles técnicos'}
            </button>

            {showOutput && (
              <pre className="output-console">{checkResult.output}</pre>
            )}
          </div>
        )}

        {migrateResult && (
          <div className="migrate-result success">
            <div className="result-header">
              <span className="icon">✅</span>
              <h4>Migraciones Aplicadas Correctamente</h4>
            </div>
            <p>Se aplicaron {migrateResult.cambios_aplicados} cambios a la base de datos.</p>
            {migrateResult.output && (
              <>
                <button
                  className="btn-link"
                  onClick={() => setShowOutput(!showOutput)}
                >
                  {showOutput ? '▼ Ocultar detalles' : '▶ Ver detalles técnicos'}
                </button>
                {showOutput && (
                  <pre className="output-console">{migrateResult.output}</pre>
                )}
              </>
            )}
          </div>
        )}

        {error && (
          <div className="error-message">
            <span className="icon">❌</span>
            <div>
              <h4>Error</h4>
              <p>{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Gestión de Backups */}
      <div className="database-actions-card">
        <h2>💾 Gestión de Backups</h2>
        
        <div className="action-section">
          <h3>Crear Backup Manual</h3>
          <p>Crea una copia de seguridad de la base de datos actual.</p>
          <button
            className="btn btn-backup"
            onClick={handleCreateBackup}
            disabled={backupLoading}
          >
            {backupLoading ? '⏳ Creando...' : '💾 Crear Backup Ahora'}
          </button>
        </div>

        {/* Lista de backups */}
        {backups.length > 0 && (
          <div className="backups-list">
            <h3>📦 Backups Disponibles ({backups.length})</h3>
            <div className="backups-table">
              {backups.map((backup) => (
                <div key={backup.filename} className="backup-item">
                  <div className="backup-info">
                    <span className="backup-name">{backup.filename}</span>
                    <span className="backup-meta">
                      {backup.size_mb} MB • {new Date(backup.created_at).toLocaleString('es-ES')}
                    </span>
                  </div>
                  <div className="backup-actions">
                    <button
                      className="btn-small btn-download"
                      onClick={() => handleDownloadBackup(backup.filename)}
                      title="Descargar backup"
                    >
                      ⬇️
                    </button>
                    <button
                      className="btn-small btn-delete"
                      onClick={() => handleDeleteBackup(backup.filename)}
                      title="Eliminar backup"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Restaurar backup */}
        <div className="action-section restore-section">
          <h3>⚠️ Restaurar Backup</h3>
          <p className="warning-text">
            Restaura la base de datos desde un archivo de backup JSON. Reemplaza todos los datos actuales. Se creará un backup de seguridad automáticamente.
          </p>
          <div className="file-upload-section">
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
              id="restore-file-input"
            />
            <label htmlFor="restore-file-input" className="file-label">
              {restoreFile ? `📄 ${restoreFile.name}` : '📁 Seleccionar archivo de backup'}
            </label>
            {restoreFile && (
              <button
                className="btn btn-restore"
                onClick={handleRestoreBackup}
                disabled={backupLoading}
              >
                {backupLoading ? '⏳ Restaurando...' : '⚡ Restaurar Base de Datos'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Configuración de Backups Automáticos */}
      {backupConfig && (
        <div className="database-actions-card">
          <h2>⚙️ Configuración de Backups Automáticos</h2>
          
          <div className="config-section">
            <div className="config-row">
              <label className="config-label">
                <input
                  type="checkbox"
                  checked={backupConfig.backup_automatico_habilitado}
                  onChange={(e) => setBackupConfig({ ...backupConfig, backup_automatico_habilitado: e.target.checked })}
                />
                <span>Habilitar backups automáticos</span>
              </label>
            </div>

            {backupConfig.backup_automatico_habilitado && (
              <>
                <div className="config-row">
                  <label className="config-label-block">
                    <span>Frecuencia de backups (días)</span>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={backupConfig.backup_frecuencia_dias}
                      onChange={(e) => setBackupConfig({ ...backupConfig, backup_frecuencia_dias: parseInt(e.target.value) })}
                      className="config-input"
                    />
                  </label>
                </div>

                <div className="config-row">
                  <label className="config-label-block">
                    <span>Máximo de backups a conservar</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={backupConfig.backup_max_archivos}
                      onChange={(e) => setBackupConfig({ ...backupConfig, backup_max_archivos: parseInt(e.target.value) })}
                      className="config-input"
                    />
                  </label>
                </div>

                {backupConfig.backup_ultimo_ejecutado && (
                  <div className="config-info">
                    <span className="info-icon">ℹ️</span>
                    <span>Último backup automático: {new Date(backupConfig.backup_ultimo_ejecutado).toLocaleString('es-ES')}</span>
                  </div>
                )}
              </>
            )}

            <button
              className="btn btn-primary"
              onClick={handleUpdateBackupConfig}
              disabled={backupLoading}
            >
              {backupLoading ? '⏳ Guardando...' : '💾 Guardar Configuración'}
            </button>
          </div>
        </div>
      )}

      {/* Estado del Scheduler */}
      {schedulerStatus && (
        <div className="database-actions-card">
          <h2>⏰ Tareas Programadas (Scheduler)</h2>
          
          <div className="scheduler-status">
            <div className="status-badge" style={{
              background: schedulerStatus.running ? '#48bb78' : '#f56565',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              display: 'inline-block',
              marginBottom: '1rem'
            }}>
              {schedulerStatus.running ? '✅ Activo' : '❌ Detenido'}
            </div>

            {schedulerStatus.jobs && schedulerStatus.jobs.length > 0 && (
              <div className="scheduler-jobs">
                <h3>📋 Tareas Configuradas</h3>
                <div className="jobs-list">
                  {schedulerStatus.jobs.map((job) => (
                    <div key={job.id} className="job-item">
                      <div className="job-header">
                        <span className="job-name">{job.name}</span>
                        <span className="job-id">{job.id}</span>
                      </div>
                      <div className="job-details">
                        <div className="job-detail">
                          <span className="job-label">Próxima ejecución:</span>
                          <span className="job-value">
                            {job.next_run 
                              ? new Date(job.next_run).toLocaleString('es-ES', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short'
                                })
                              : 'No programada'}
                          </span>
                        </div>
                        <div className="job-detail">
                          <span className="job-label">Frecuencia:</span>
                          <span className="job-value">{job.trigger}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="scheduler-info">
              <p style={{ color: '#718096', fontSize: '0.875rem', marginTop: '1rem' }}>
                ℹ️ Las tareas programadas se ejecutan automáticamente según la configuración. 
                El scheduler se inicia automáticamente con el servidor.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Información adicional */}
      <div className="database-info-card">
        <h2>ℹ️ Información</h2>
        <div className="info-section">
          <h3>¿Cuándo usar esta herramienta?</h3>
          <ul>
            <li>Después de actualizar el código (git pull)</li>
            <li>Cuando aparecen errores de "column not found"</li>
            <li>Para sincronizar el esquema con los modelos del código</li>
          </ul>
        </div>
        <div className="info-section">
          <h3>Seguridad</h3>
          <ul>
            <li>✅ Se crea un backup automático antes de aplicar cambios</li>
            <li>✅ Solo los superadministradores pueden ejecutar migraciones</li>
            <li>✅ El dry-run permite verificar sin modificar datos</li>
          </ul>
        </div>
      </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default AdminDatabase;
