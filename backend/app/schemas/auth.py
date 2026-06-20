from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    password_confirmation: str = Field(min_length=8, max_length=128)

    @model_validator(mode="after")
    def validate_password_confirmation(self) -> "UserRegister":
        if self.password != self.password_confirmation:
            raise ValueError("Passwords do not match")
        return self


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: str


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    role: str | None = None


class UserResponse(UserBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CurrentUser(UserResponse):
    pass


class ErrorResponse(BaseModel):
    detail: str


class MessageResponse(BaseModel):
    success: bool = True
    message: str


class SyncRunResponse(BaseModel):
    success: bool
    message: str
    synced_count: int = 0
    details: str | None = None


class SyncStatusResponse(BaseModel):
    id: int
    name: str
    success: bool
    message: str | None
    details: str | None
    synced_count: int
    last_success_at: datetime | None
    updated_at: datetime

    model_config = {"from_attributes": True}
