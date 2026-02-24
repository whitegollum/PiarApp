from pydantic import BaseModel, EmailStr
from typing import Optional

class EmailConfigBase(BaseModel):
    smtp_server: str
    smtp_port: int
    smtp_username: str
    smtp_password: Optional[str] = None # Optional in update/response (hidden)
    smtp_from_email: EmailStr
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False
    frontend_url: str

class EmailConfigUpdate(EmailConfigBase):
    pass

class EmailConfigResponse(EmailConfigBase):
    class Config:
        from_attributes = True

class TestEmailRequest(BaseModel):
    to_email: EmailStr
