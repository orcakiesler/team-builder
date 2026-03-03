"""Swimmer commands: list, add, update, delete; Person/dict conversion and DB helpers."""

from __future__ import annotations

from datetime import date
from pathlib import Path

from relay_builder.models import Person
from relay_builder import db as relay_db


def _get_teams(db_path: Path) -> list:
    return relay_db.load_teams(db_path)


def person_to_dict(p: Person, id_: int | None = None) -> dict:
    out = {
        "first_name": p.first_name,
        "last_name": p.last_name,
        "full_name": p.full_name,
        "gender": p.gender,
        "year_of_birth": p.year_of_birth,
        "age": p.age,
        "team": getattr(p, "team", None) or "",
        "freestyle_50": p.freestyle_50,
        "backstroke_50": p.backstroke_50,
        "breaststroke_50": p.breaststroke_50,
        "butterfly_50": p.butterfly_50,
        "availability": p.availability,
        "medical_date": getattr(p, "medical_date", None),
    }
    if id_ is not None:
        out["id"] = id_
    return out


def swimmer_dict_to_person(d: dict, default_team: str = "") -> Person:
    return Person(
        first_name=d.get("first_name") or "",
        last_name=d.get("last_name") or "",
        gender=d.get("gender"),
        year_of_birth=d.get("year_of_birth"),
        age=d.get("age"),
        team=(d.get("team") or "").strip() or default_team,
        freestyle_50=d.get("freestyle_50"),
        backstroke_50=d.get("backstroke_50"),
        breaststroke_50=d.get("breaststroke_50"),
        butterfly_50=d.get("butterfly_50"),
        availability=d.get("availability") or {},
        medical_date=d.get("medical_date") or None,
    )


def optional_float(val):
    if val is None or str(val).strip() == "":
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def people_from_db(db_path: Path, competition_id: int | None = None) -> list[Person]:
    """Load swimmers as Person list; if competition_id is set, availability is for that meet."""
    teams = _get_teams(db_path)
    default_team = teams[0] if teams else ""
    rows = relay_db.load_all(db_path, competition_id=competition_id)
    return [swimmer_dict_to_person(r, default_team) for r in rows]


def cmd_list_swimmers(db_path: Path, competition_id: int | None = None, team_filter: str | None = None) -> dict:
    relay_db.ensure_database(db_path)
    swimmers = relay_db.load_all(db_path, competition_id=competition_id, team_filter=team_filter)
    if competition_id is not None:
        meet_teams = relay_db.load_competition_teams(db_path, competition_id)
        if meet_teams:
            def _norm(s: str) -> str:
                return (s or "").strip().replace(" ", "").lower()
            meet_teams_set = {_norm(t) for t in meet_teams if t}
            swimmers = [s for s in swimmers if _norm((s.get("team") or "")) in meet_teams_set]
    return {"swimmers": swimmers}


def cmd_update_swimmer(db_path: Path, payload: dict) -> dict:
    swimmer_id = payload.get("id")
    if swimmer_id is None:
        raise ValueError("Missing 'id' in update payload")
    relay_db.ensure_database(db_path)

    competition_id = payload.get("competition_id")
    availability = payload.get("availability") if isinstance(payload.get("availability"), dict) else None
    if availability is not None and competition_id is None:
        raise ValueError("Availability can only be set when a meet is selected (competition_id required)")

    kwargs = {}
    if "first_name" in payload:
        kwargs["first_name"] = payload["first_name"]
    if "last_name" in payload:
        kwargs["last_name"] = payload["last_name"]
    if "gender" in payload:
        kwargs["gender"] = payload["gender"]
    if "year_of_birth" in payload:
        kwargs["year_of_birth"] = payload["year_of_birth"]
    if "freestyle_50" in payload:
        kwargs["freestyle_50"] = payload["freestyle_50"]
    if "backstroke_50" in payload:
        kwargs["backstroke_50"] = payload["backstroke_50"]
    if "breaststroke_50" in payload:
        kwargs["breaststroke_50"] = payload["breaststroke_50"]
    if "butterfly_50" in payload:
        kwargs["butterfly_50"] = payload["butterfly_50"]
    if "medical_date" in payload:
        kwargs["medical_date"] = payload["medical_date"] or None
    if "team" in payload:
        team_val = (payload.get("team") or "").strip()
        teams = _get_teams(db_path)
        if team_val not in teams:
            raise ValueError(f"Team must be one of: {', '.join(teams)}")
        kwargs["team"] = team_val
    if "email" in payload:
        kwargs["email"] = (payload.get("email") or "").strip() or None

    relay_db.update_swimmer(db_path, int(swimmer_id), **kwargs)
    if competition_id is not None and availability is not None:
        relay_db.set_swimmer_availability_for_meet(db_path, int(swimmer_id), int(competition_id), availability)

    updated = relay_db.load_all(db_path, competition_id=int(competition_id) if competition_id is not None else None)
    one = next((s for s in updated if s["id"] == int(swimmer_id)), None)
    return {"swimmer": one} if one else {"swimmer": None}


def cmd_add_swimmer(db_path: Path, payload: dict) -> dict:
    first_name = (payload.get("first_name") or "").strip()
    last_name = (payload.get("last_name") or "").strip()
    gender = (payload.get("gender") or "").strip() or None
    yob_raw = payload.get("year_of_birth")
    year_of_birth = None
    if yob_raw is not None and str(yob_raw).strip() != "":
        try:
            year_of_birth = int(float(str(yob_raw).strip()))
        except (ValueError, TypeError):
            pass
    if not first_name and not last_name:
        raise ValueError("First name and last name are required")
    if not first_name:
        raise ValueError("First name is required")
    if not last_name:
        raise ValueError("Last name is required")
    team_raw = (payload.get("team") or "").strip()
    teams = _get_teams(db_path)
    if not team_raw or team_raw not in teams:
        raise ValueError(f"Team is required and must be one of: {', '.join(teams)}")
    if year_of_birth is None:
        raise ValueError("Birth year is required")
    if gender not in ("m", "f"):
        raise ValueError("Gender must be m or f")
    medical_date = (payload.get("medical_date") or "").strip() or None
    freestyle_50 = optional_float(payload.get("freestyle_50"))
    backstroke_50 = optional_float(payload.get("backstroke_50"))
    breaststroke_50 = optional_float(payload.get("breaststroke_50"))
    butterfly_50 = optional_float(payload.get("butterfly_50"))
    availability = payload.get("availability")
    if not isinstance(availability, dict):
        availability = {}
    competition_id = payload.get("competition_id")
    if payload.get("availability") is not None and competition_id is None:
        raise ValueError("Availability can only be set when a meet is selected (competition_id required)")
    availability = payload.get("availability") if isinstance(payload.get("availability"), dict) else {}

    email = (payload.get("email") or "").strip() or None
    person = Person(
        first_name=first_name,
        last_name=last_name,
        gender=gender,
        year_of_birth=year_of_birth,
        age=(date.today().year - year_of_birth) if year_of_birth else None,
        team=team_raw,
        email=email,
        freestyle_50=freestyle_50,
        backstroke_50=backstroke_50,
        breaststroke_50=breaststroke_50,
        butterfly_50=butterfly_50,
        availability={},
        medical_date=medical_date,
    )
    relay_db.ensure_database(db_path)
    new_id = relay_db.insert_one(db_path, person)
    if competition_id is not None and availability:
        relay_db.set_swimmer_availability_for_meet(db_path, new_id, int(competition_id), availability)
    return {"swimmers": relay_db.load_all(db_path, competition_id=int(competition_id) if competition_id is not None else None)}


def cmd_delete_swimmers(db_path: Path, payload: dict) -> dict:
    ids = payload.get("ids") or []
    competition_id = payload.get("competition_id")
    if not ids:
        return {"swimmers": relay_db.load_all(db_path, competition_id=int(competition_id) if competition_id is not None else None)}
    relay_db.ensure_database(db_path)
    relay_db.delete_swimmers(db_path, [int(i) for i in ids])
    return {"swimmers": relay_db.load_all(db_path, competition_id=int(competition_id) if competition_id is not None else None)}


def cmd_list_swimmers_by_team(db_path: Path, payload: dict) -> dict:
    team = (payload.get("team") or "").strip()
    if not team:
        return {"swimmers": [], "count": 0}
    relay_db.ensure_database(db_path)
    swimmers = relay_db.load_all(db_path, team_filter=team)
    return {"swimmers": swimmers, "count": len(swimmers)}


def cmd_bulk_update_team(db_path: Path, payload: dict) -> dict:
    swimmer_ids = payload.get("swimmer_ids") or []
    new_team = (payload.get("team") or "").strip()
    if not new_team:
        raise ValueError("team is required")
    if not swimmer_ids:
        return {"updated": 0, "swimmers": relay_db.load_all(db_path)}
    relay_db.ensure_database(db_path)
    ids = [int(i) for i in swimmer_ids]
    updated = relay_db.bulk_update_team(db_path, ids, new_team)
    return {"updated": updated, "swimmers": relay_db.load_all(db_path)}


def cmd_delete_swimmers_by_team(db_path: Path, payload: dict) -> dict:
    team = (payload.get("team") or "").strip()
    if not team:
        raise ValueError("team is required")
    relay_db.ensure_database(db_path)
    deleted = relay_db.delete_swimmers_by_team(db_path, team)
    return {"deleted": deleted, "teams": relay_db.load_teams(db_path)}
