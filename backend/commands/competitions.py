"""Competition commands: list, add, delete."""

from __future__ import annotations

from pathlib import Path

from relay_builder import db as relay_db


def cmd_list_competitions(db_path: Path) -> dict:
    relay_db.ensure_database(db_path)
    return {"competitions": relay_db.load_competitions(db_path)}


def cmd_add_competition(db_path: Path, payload: dict) -> dict:
    name = payload.get("name") or ""
    start_date = payload.get("start_date") or ""
    end_date = payload.get("end_date") or ""
    location = payload.get("location") or ""
    relay_db.ensure_database(db_path)
    comp = relay_db.add_competition(db_path, name, start_date, end_date, location)
    return {"competition": comp, "competitions": relay_db.load_competitions(db_path)}


def cmd_delete_competitions(db_path: Path, payload: dict) -> dict:
    ids = payload.get("ids") or []
    if not ids:
        return {"competitions": relay_db.load_competitions(db_path)}
    relay_db.ensure_database(db_path)
    relay_db.delete_competitions(db_path, [int(i) for i in ids])
    return {"competitions": relay_db.load_competitions(db_path)}
