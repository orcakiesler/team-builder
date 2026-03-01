"""Competition commands: list, add, delete."""

from __future__ import annotations

from pathlib import Path

from relay_builder import db as relay_db


def cmd_list_competitions(db_path: Path) -> dict:
    relay_db.ensure_database(db_path)
    competitions = relay_db.load_competitions(db_path)
    teams_map = relay_db.load_competition_teams_map(db_path)
    for c in competitions:
        c["teams"] = teams_map.get(c["id"], [])
    return {"competitions": competitions}


def cmd_add_competition(db_path: Path, payload: dict) -> dict:
    name = payload.get("name") or ""
    start_date = payload.get("start_date") or ""
    end_date = payload.get("end_date") or ""
    location = payload.get("location") or ""
    relay_db.ensure_database(db_path)
    comp = relay_db.add_competition(db_path, name, start_date, end_date, location)
    teams = payload.get("teams")
    if isinstance(teams, list) and teams:
        team_names = [str(t).strip() for t in teams if str(t).strip()]
    else:
        team_names = relay_db.load_teams(db_path)
    if not team_names:
        team_names = ["Haifa - masters"]  # fallback if no teams exist yet
    relay_db.set_competition_teams(db_path, comp["id"], team_names)
    competitions = relay_db.load_competitions(db_path)
    teams_map = relay_db.load_competition_teams_map(db_path)
    for c in competitions:
        c["teams"] = teams_map.get(c["id"], [])
    return {"competition": comp, "competitions": competitions}


def cmd_delete_competitions(db_path: Path, payload: dict) -> dict:
    ids = payload.get("ids") or []
    if not ids:
        relay_db.ensure_database(db_path)
        competitions = relay_db.load_competitions(db_path)
        teams_map = relay_db.load_competition_teams_map(db_path)
        for c in competitions:
            c["teams"] = teams_map.get(c["id"], [])
        return {"competitions": competitions}
    relay_db.ensure_database(db_path)
    relay_db.delete_competitions(db_path, [int(i) for i in ids])
    competitions = relay_db.load_competitions(db_path)
    teams_map = relay_db.load_competition_teams_map(db_path)
    for c in competitions:
        c["teams"] = teams_map.get(c["id"], [])
    return {"competitions": competitions}
