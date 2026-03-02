# Relay Auth Backend

Small FastAPI-based authentication and authorization service for the Relay Team Builder app.

## Features

- User registration and login
- Password hashing using bcrypt
- JWT access tokens
- User roles (`admin`, `user`)

## Quick start (local)

```bash
cd auth-backend
poetry install
poetry run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Then open `http://127.0.0.1:8000/docs` in your browser to explore the API.

