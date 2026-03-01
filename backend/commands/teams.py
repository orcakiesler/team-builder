"""Team commands: list, add, delete. Teams are stored in the DB."""

from __future__ import annotations

from pathlib import Path

from relay_builder import db as relay_db


def cmd_list_teams(db_path: Path) -> dict:
    relay_db.ensure_database(db_path)
    return {"teams": relay_db.load_teams(db_path)}


def cmd_add_team(db_path: Path, payload: dict) -> dict:
    name = (payload.get("name") or "").strip()
    if not name:
        raise ValueError("Team name is required")
    relay_db.ensure_database(db_path)
    relay_db.add_team(db_path, name)
    return {"teams": relay_db.load_teams(db_path)}


def cmd_delete_team(db_path: Path, payload: dict) -> dict:
    name = (payload.get("name") or "").strip()
    if not name:
        raise ValueError("Team name is required")
    relay_db.ensure_database(db_path)
    relay_db.delete_team(db_path, name)
    return {"teams": relay_db.load_teams(db_path)}
