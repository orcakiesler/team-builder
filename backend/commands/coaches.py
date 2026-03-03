"""Commands for coach profiles and team-coach assignment."""
from __future__ import annotations

from pathlib import Path

from relay_builder import db as relay_db


def cmd_get_coach(db_path: Path, payload: dict) -> dict:
    """Get coach by email. Creates empty row if missing. Payload: { "email": str }."""
    email = (payload.get("email") or "").strip()
    if not email:
        return {"error": "email is required"}
    coach = relay_db.get_coach_by_email(db_path, email)
    if coach is None:
        return {"error": "Coach not found"}
    return {"coach": coach}


def cmd_update_coach(db_path: Path, payload: dict) -> dict:
    """Upsert coach. Payload: { "email": str (current), "name": str | null, "birth_year": int | null, "new_email": str | null }.
    If new_email is set and different from email, the coach row is re-keyed to new_email (e.g. after auth email change)."""
    email = (payload.get("email") or "").strip()
    if not email:
        return {"error": "email is required"}
    new_email = (payload.get("new_email") or "").strip() or None
    name = payload.get("name")
    if name is not None:
        name = (name or "").strip() or None
    birth_year = payload.get("birth_year")
    if birth_year is not None and birth_year != "":
        try:
            birth_year = int(birth_year)
        except (TypeError, ValueError):
            birth_year = None
    else:
        birth_year = None
    if new_email and new_email != email:
        coach = relay_db.get_coach_by_email(db_path, email)
        use_name = name if name is not None else (coach.get("name") if coach else None)
        use_birth_year = birth_year if birth_year is not None else (coach.get("birth_year") if coach else None)
        relay_db.replace_team_coach_email(db_path, email, new_email)
        relay_db.delete_coach(db_path, email)
        relay_db.upsert_coach(db_path, new_email, name=use_name, birth_year=use_birth_year)
        coach = relay_db.get_coach_by_email(db_path, new_email)
    else:
        relay_db.upsert_coach(db_path, email, name=name, birth_year=birth_year)
        coach = relay_db.get_coach_by_email(db_path, email)
    return {"coach": coach}


def cmd_list_coaches(db_path: Path) -> dict:
    """Return all coaches."""
    coaches = relay_db.load_coaches(db_path)
    return {"coaches": coaches}


def cmd_list_teams_with_coaches(db_path: Path) -> dict:
    """Return teams with their coach emails."""
    data = relay_db.load_teams_with_coaches(db_path)
    return {"teams_with_coaches": data}


def cmd_set_team_coaches(db_path: Path, payload: dict) -> dict:
    """Set coach emails for a team. Payload: { "team_name": str, "coach_emails": [str] }."""
    team_name = (payload.get("team_name") or "").strip()
    if not team_name:
        return {"error": "team_name is required"}
    teams = relay_db.load_teams(db_path)
    if team_name not in teams:
        return {"error": f"Team '{team_name}' not found"}
    coach_emails = payload.get("coach_emails")
    if not isinstance(coach_emails, list):
        coach_emails = []
    relay_db.set_team_coaches(db_path, team_name, coach_emails)
    return {"team_name": team_name, "coaches": relay_db.load_team_coaches(db_path, team_name)}
