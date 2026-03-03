import secrets
from typing import List

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select, func, text
from sqlalchemy.orm import Session

from .config import get_settings
from .database import Base, engine, get_db
from .dependencies import get_current_admin_user, get_current_user
from .models import InviteCode, User
from .schemas import InviteCodeCreate, InviteCodeRead, LinkSwimmerRequest, Token, UserCreate, UserRead, UserUpdateMe, UserUpdateRole
from .security import create_access_token, hash_password, verify_password


settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _generate_invite_code() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(6))


@app.on_event("startup")
def on_startup() -> None:
    # Create tables if they don't exist yet
    Base.metadata.create_all(bind=engine)
    # Add swimmer_id column if missing (e.g. existing DB from before roles change)
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN swimmer_id INTEGER"))
            conn.commit()
    except Exception:
        pass
    # Add role column to invite_codes if missing (for coach/admin invites)
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE invite_codes ADD COLUMN role VARCHAR(32)"))
            conn.commit()
    except Exception:
        pass


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/auth/register", response_model=UserRead)
def register_user(payload: UserCreate, db: Session = Depends(get_db)) -> UserRead:
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    swimmer_id: int | None = None
    role: str

    if payload.invite_code and payload.invite_code.strip():
        code_row = db.get(InviteCode, payload.invite_code.strip().upper())
        if code_row is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired invite code")
        if code_row.role:
            role = code_row.role
            swimmer_id = None
        else:
            role = "swimmer"
            swimmer_id = code_row.swimmer_id if code_row.swimmer_id else None
        db.delete(code_row)
        db.flush()
    else:
        # No invite code: default to swimmer. Coach/admin only via invite codes.
        total_users = db.scalar(select(func.count()).select_from(User)) or 0
        if total_users == 0:
            role = "admin"
        else:
            role = "swimmer"

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=role,
        swimmer_id=swimmer_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)


@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> Token:
    user = db.scalar(select(User).where(User.email == form_data.username))
    if user is None or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect email or password")

    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    return Token(access_token=access_token)


@app.get("/auth/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)


@app.patch("/auth/me", response_model=UserRead)
def update_current_user(
    payload: UserUpdateMe,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserRead:
    """Update own profile (e.g. email)."""
    if payload.email is not None:
        new_email = (payload.email or "").strip()
        if not new_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email cannot be empty")
        existing = db.scalar(select(User).where(User.email == new_email))
        if existing is not None and existing.id != current_user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use")
        current_user.email = new_email
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return UserRead.model_validate(current_user)


@app.get("/admin/users", response_model=List[UserRead])
def list_users(_: User = Depends(get_current_admin_user), db: Session = Depends(get_db)) -> List[UserRead]:
    users = db.scalars(select(User)).all()
    return [UserRead.model_validate(u) for u in users]


@app.post("/admin/users/{user_id}/role", response_model=UserRead)
def update_user_role(
    user_id: int,
    payload: UserUpdateRole,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
) -> UserRead:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.role = payload.role
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)


@app.post("/admin/users/{user_id}/link-swimmer", response_model=UserRead)
def link_user_swimmer(
    user_id: int,
    payload: LinkSwimmerRequest,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
) -> UserRead:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.swimmer_id = payload.swimmer_id
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)


@app.post("/admin/invite-codes", response_model=InviteCodeRead)
def create_invite_code(
    payload: InviteCodeCreate,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
) -> InviteCodeRead:
    """Create a one-time invite code: for a swimmer (swimmer_id), or for coach/admin (role)."""
    if payload.role:
        if payload.role not in ("coach", "admin"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="role must be coach or admin")
        swimmer_id = 0
        role = payload.role
    elif payload.swimmer_id is not None:
        swimmer_id = payload.swimmer_id
        role = None
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide either swimmer_id or role")
    for _ in range(10):
        code = _generate_invite_code()
        if db.get(InviteCode, code) is None:
            invite = InviteCode(code=code, swimmer_id=swimmer_id, role=role)
            db.add(invite)
            db.commit()
            return InviteCodeRead(code=code)
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not generate unique code")

