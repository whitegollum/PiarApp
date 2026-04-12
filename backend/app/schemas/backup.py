from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class BackupConfigSchema(BaseModel):
    backup_automatico_habilitado: bool = Field(default=False, description="Si los backups automáticos están habilitados")
    backup_frecuencia_dias: int = Field(default=7, ge=1, le=365, description="Frecuencia de backups en días (1-365)")
    backup_max_archivos: int = Field(default=10, ge=1, le=100, description="Número máximo de backups a conservar")
    backup_ultimo_ejecutado: Optional[datetime] = Field(default=None, description="Fecha del último backup automático")

    class Config:
        from_attributes = True


class BackupInfo(BaseModel):
    filename: str
    size_bytes: int
    size_mb: float
    created_at: datetime
    full_path: str


class BackupListResponse(BaseModel):
    backups: list[BackupInfo]
    total: int
    total_size_mb: float


class BackupCreateResponse(BaseModel):
    success: bool
    filename: str
    size_mb: float
    message: str


class BackupRestoreResponse(BaseModel):
    success: bool
    message: str
    backup_created: str
    tables_restored: Optional[int] = None
