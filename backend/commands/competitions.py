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


def cmd_update_competition(db_path: Path, payload: dict) -> dict:
    cid = payload.get("id")
    if cid is None:
        raise ValueError("Competition id is required for update")
    cid = int(cid)
    name = payload.get("name") or ""
    start_date = payload.get("start_date") or ""
    end_date = payload.get("end_date") or ""
    location = payload.get("location") or ""
    relay_db.ensure_database(db_path)
    relay_db.update_competition(db_path, cid, name, start_date, end_date, location)
    teams = payload.get("teams")
    if isinstance(teams, list):
        team_names = [str(t).strip() for t in teams if str(t).strip()]
        relay_db.set_competition_teams(db_path, cid, team_names)
    competitions = relay_db.load_competitions(db_path)
    teams_map = relay_db.load_competition_teams_map(db_path)
    for c in competitions:
        c["teams"] = teams_map.get(c["id"], [])
    return {"competitions": competitions}


def cmd_duplicate_competition(db_path: Path, payload: dict) -> dict:
    source_id = payload.get("source_id") or payload.get("id")
    if source_id is None:
        raise ValueError("source_id is required")
    source_id = int(source_id)
    new_start = payload.get("new_start_date") or ""
    new_end = payload.get("new_end_date") or ""
    if not new_start or not new_end:
        raise ValueError("new_start_date and new_end_date are required")
    relay_db.ensure_database(db_path)
    new_comp = relay_db.duplicate_competition(db_path, source_id, new_start, new_end)
    competitions = relay_db.load_competitions(db_path)
    teams_map = relay_db.load_competition_teams_map(db_path)
    for c in competitions:
        c["teams"] = teams_map.get(c["id"], [])
    return {"competition": new_comp, "competitions": competitions}
