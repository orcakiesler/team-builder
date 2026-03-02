"""Settings commands: relay types, reset database."""

from __future__ import annotations

from pathlib import Path

from relay_builder import db as relay_db


def cmd_list_relay_types(db_path: Path) -> dict:
    relay_db.ensure_database(db_path)
    return {"relay_types": relay_db.load_relay_types(db_path)}


def cmd_save_relay_types(db_path: Path, payload: dict) -> dict:
    keys = payload.get("relay_types")
    if not isinstance(keys, list):
        raise ValueError("relay_types must be a list")
    relay_db.ensure_database(db_path)
    relay_db.save_relay_types(db_path, keys)
    return {"relay_types": relay_db.load_relay_types(db_path)}


def cmd_reset_database(db_path: Path, payload: dict) -> dict:
    clear_teams = bool(payload.get("clear_teams"))
    relay_db.ensure_database(db_path)
    relay_db.reset_database(db_path, clear_teams=clear_teams)
    return {
        "competitions": [],
        "teams": relay_db.load_teams(db_path),
    }
