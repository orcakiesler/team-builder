from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, EmailStr


Role = Literal["admin", "coach", "swimmer"]


class UserBase(BaseModel):
    email: EmailStr
    role: Role = "coach"
    swimmer_id: Optional[int] = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: Role = "coach"


class UserRead(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdateRole(BaseModel):
    role: Role


class LinkSwimmerRequest(BaseModel):
    swimmer_id: Optional[int] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[Role] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

