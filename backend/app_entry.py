"""
Entry point for the Electron app. Supports:
- Legacy: --best-times, --names-relays → run from files, print JSON.
- Commands (with --db): list-swimmers, build-teams, import-files, update-swimmer,
  delete-swimmers, list-competitions, add-competition.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date
from pathlib import Path

from constants import AGE_GROUPS
from relay_builder import (
    load_people,
    filter_freestyle_women,
    filter_freestyle_men,
    filter_medley_women,
    filter_medley_men,
    filter_mixed_freestyle,
    filter_mixed_medley,
)
from relay_builder.events.freestyle_women.team_builder import build_teams as build_freestyle_women
from relay_builder.events.freestyle_men.team_builder import build_teams as build_freestyle_men
from relay_builder.events.medley_women.team_builder import build_teams as build_medley_women
from relay_builder.events.medley_men.team_builder import build_teams as build_medley_men
from relay_builder.events.mixed_freestyle.team_builder import build_teams as build_mixed_freestyle
from relay_builder.events.mixed_medley.team_builder import build_teams as build_mixed_medley
from relay_builder.models import Person
from relay_builder import db as relay_db
from relay_builder.loader import load_people_from_names_only, load_people_from_best_times_only

EVENT_CONFIGS = [
    ("Women's 4x50 Freestyle", filter_freestyle_women, build_freestyle_women, False),
    ("Men's 4x50 Freestyle", filter_freestyle_men, build_freestyle_men, False),
    ("Women's 4x50 Medley", filter_medley_women, build_medley_women, True),
    ("Men's 4x50 Medley", filter_medley_men, build_medley_men, True),
    ("Mixed 4x50 Freestyle", filter_mixed_freestyle, build_mixed_freestyle, False),
    ("Mixed 4x50 Medley", filter_mixed_medley, build_mixed_medley, True),
]
STROKE_LABELS = ["Backstroke", "Breaststroke", "Butterfly", "Freestyle"]


def _person_to_dict(p, id_=None) -> dict:
    out = {
        "first_name": p.first_name,
        "last_name": p.last_name,
        "full_name": p.full_name,
        "gender": p.gender,
        "year_of_birth": p.year_of_birth,
        "age": p.age,
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


def _swimmer_dict_to_person(d: dict) -> Person:
    return Person(
        first_name=d.get("first_name") or "",
        last_name=d.get("last_name") or "",
        gender=d.get("gender"),
        year_of_birth=d.get("year_of_birth"),
        age=d.get("age"),
        freestyle_50=d.get("freestyle_50"),
        backstroke_50=d.get("backstroke_50"),
        breaststroke_50=d.get("breaststroke_50"),
        butterfly_50=d.get("butterfly_50"),
        availability=d.get("availability") or {},
        medical_date=d.get("medical_date") or None,
    )


def _is_medical_valid(medical_date_str: str | None, meet_start_date_str: str | None) -> bool:
    """
    Only include swimmer if they have a non-empty medical date AND it is valid for the meet.
    - No meet date: do not filter (return True).
    - Empty/missing medical date: exclude (return False).
    - Medical valid for 1 year from check date: include (return True if med_date + 1 year >= meet_date).
    - Expired medical: exclude (return False).
    """
    if not meet_start_date_str or not meet_start_date_str.strip():
        return True
    if not medical_date_str or not medical_date_str.strip():
        return False  # exclude anyone with empty medical date
    try:
        from datetime import datetime, timedelta
        meet_date = datetime.strptime(meet_start_date_str.strip()[:10], "%Y-%m-%d").date()
        med_date = datetime.strptime(medical_date_str.strip()[:10], "%Y-%m-%d").date()
        return med_date + timedelta(days=365) >= meet_date
    except (ValueError, TypeError):
        return False


def _people_from_db(db_path: Path) -> list[Person]:
    rows = relay_db.load_all(db_path)
    return [_swimmer_dict_to_person(r) for r in rows]


def run(best_times_path: str, names_relays_path: str, reference_year: int | None = None) -> dict:
    """Legacy: build from two Excel files."""
    best = Path(best_times_path)
    names = Path(names_relays_path)
    if not best.is_file():
        raise FileNotFoundError(f"File not found: {best}")
    if not names.is_file():
        raise FileNotFoundError(f"File not found: {names}")

    people = load_people(best, names)
    reference_year = reference_year or date.today().year
    people = _people_from_db(db_path)
    swimmers_with_id = relay_db.load_all(db_path)
    teams_by_event = {}
    for event_name, filter_func, build_func, is_medley in EVENT_CONFIGS:
        available = filter_func(people)
        teams = build_func(available, reference_year=reference_year)
        teams_by_event[event_name] = []
        for team in teams:
            lo, hi = AGE_GROUPS[team.age_group]
            teams_by_event[event_name].append({
                "age_group_range": [lo, hi],
                "total_age": team.total_age,
                "total_time": round(team.total_time, 2),
                "is_medley": is_medley,
                "stroke_labels": STROKE_LABELS if is_medley else None,
                "swimmers": [_person_to_dict(s) for s in team.swimmers],
            })
    return {
        "reference_year": reference_year,
        "swimmers": swimmers_with_id,
        "teams": teams_by_event,
    }


def cmd_list_swimmers(db_path: Path) -> dict:
    relay_db.ensure_database(db_path)
    return {"swimmers": relay_db.load_all(db_path)}


def cmd_build_teams(db_path: Path, reference_year: int | None = None, meet_start_date: str | None = None) -> dict:
    relay_db.ensure_database(db_path)
    reference_year = reference_year or date.today().year
    people = _people_from_db(db_path)
    if meet_start_date:
        # Exclude expired medicals and anyone with empty medical date
        people = [p for p in people if _is_medical_valid(getattr(p, "medical_date", None), meet_start_date)]
    swimmers_with_id = relay_db.load_all(db_path)
    teams_by_event = {}
    for event_name, filter_func, build_func, is_medley in EVENT_CONFIGS:
        available = filter_func(people)
        teams = build_func(available, reference_year=reference_year)
        teams_by_event[event_name] = []
        for team in teams:
            lo, hi = AGE_GROUPS[team.age_group]
            teams_by_event[event_name].append({
                "age_group_range": [lo, hi],
                "total_age": team.total_age,
                "total_time": round(team.total_time, 2),
                "is_medley": is_medley,
                "stroke_labels": STROKE_LABELS if is_medley else None,
                "swimmers": [_person_to_dict(s) for s in team.swimmers],
            })
    return {
        "reference_year": reference_year,
        "swimmers": swimmers_with_id,
        "teams": teams_by_event,
    }


def cmd_update_swimmer(db_path: Path, payload: dict) -> dict:
    sid = payload.get("id")
    if sid is None:
        raise ValueError("Missing 'id'")
    relay_db.ensure_database(db_path)
    kwargs = {k: payload[k] for k in ("first_name", "last_name", "gender", "year_of_birth",
        "freestyle_50", "backstroke_50", "breaststroke_50", "butterfly_50", "availability", "medical_date") if k in payload}
    if kwargs.get("availability") is not None:
        pass  # already dict
    relay_db.update_swimmer(db_path, int(sid), **kwargs)
    updated = relay_db.load_all(db_path)
    one = next((s for s in updated if s["id"] == int(sid)), None)
    return {"swimmer": one}


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
    if year_of_birth is None:
        raise ValueError("Birth year is required")
    if gender not in ("m", "f"):
        raise ValueError("Gender must be m or f")
    medical_date = (payload.get("medical_date") or "").strip() or None
    freestyle_50 = _optional_float(payload.get("freestyle_50"))
    backstroke_50 = _optional_float(payload.get("backstroke_50"))
    breaststroke_50 = _optional_float(payload.get("breaststroke_50"))
    butterfly_50 = _optional_float(payload.get("butterfly_50"))
    availability = payload.get("availability")
    if not isinstance(availability, dict):
        availability = {}
    person = Person(
        first_name=first_name,
        last_name=last_name,
        gender=gender,
        year_of_birth=year_of_birth,
        age=(date.today().year - year_of_birth) if year_of_birth else None,
        freestyle_50=freestyle_50,
        backstroke_50=backstroke_50,
        breaststroke_50=breaststroke_50,
        butterfly_50=butterfly_50,
        availability=availability,
        medical_date=medical_date,
    )
    relay_db.ensure_database(db_path)
    relay_db.insert_one(db_path, person)
    return {"swimmers": relay_db.load_all(db_path)}


def _optional_float(val):
    if val is None or str(val).strip() == "":
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def cmd_delete_swimmers(db_path: Path, payload: dict) -> dict:
    ids = payload.get("ids") or []
    if not ids:
        return {"swimmers": relay_db.load_all(db_path)}
    relay_db.ensure_database(db_path)
    relay_db.delete_swimmers(db_path, [int(i) for i in ids])
    return {"swimmers": relay_db.load_all(db_path)}


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


def _eq_val(a, b):
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    return a == b


def _availability_eq(a, b):
    return (a or {}) == (b or {})


def _person_equals_row_full(p: Person, row: dict) -> bool:
    """True if Person p has same data as DB row (for both-files merge)."""
    return (
        (p.first_name or "") == (row.get("first_name") or "")
        and (p.last_name or "") == (row.get("last_name") or "")
        and _eq_val(p.gender, row.get("gender"))
        and _eq_val(p.year_of_birth, row.get("year_of_birth"))
        and _eq_val(p.freestyle_50, row.get("freestyle_50"))
        and _eq_val(p.backstroke_50, row.get("backstroke_50"))
        and _eq_val(p.breaststroke_50, row.get("breaststroke_50"))
        and _eq_val(p.butterfly_50, row.get("butterfly_50"))
        and _availability_eq(p.availability, row.get("availability"))
        and _eq_val(getattr(p, "medical_date", None), row.get("medical_date"))
    )


def _person_equals_row_names_only(p: Person, row: dict) -> bool:
    """True if Person p has same names-relevant data as DB row."""
    return (
        (p.first_name or "") == (row.get("first_name") or "")
        and (p.last_name or "") == (row.get("last_name") or "")
        and _eq_val(p.gender, row.get("gender"))
        and _eq_val(p.year_of_birth, row.get("year_of_birth"))
        and _availability_eq(p.availability, row.get("availability"))
        and _eq_val(getattr(p, "medical_date", None), row.get("medical_date"))
    )


def _times_differ(p: Person, row: dict) -> bool:
    """True if any best time in p differs from row (for best-times-only import)."""
    return (
        not _eq_val(p.freestyle_50, row.get("freestyle_50"))
        or not _eq_val(p.backstroke_50, row.get("backstroke_50"))
        or not _eq_val(p.breaststroke_50, row.get("breaststroke_50"))
        or not _eq_val(p.butterfly_50, row.get("butterfly_50"))
    )


def cmd_import_files(
    db_path: Path,
    best_times_path: str | None,
    names_relays_path: str | None,
) -> dict:
    if not best_times_path and not names_relays_path:
        raise ValueError("import-files requires at least one of --best-times or --names-relays")
    relay_db.ensure_database(db_path)
    existing = relay_db.load_all(db_path)
    name_to_id = {}
    id_to_row = {}
    for row in existing:
        sid = row["id"]
        key = (str(row.get("first_name") or "").strip().lower(), str(row.get("last_name") or "").strip().lower())
        name_to_id[key] = sid
        id_to_row[sid] = row

    added = 0
    updated = 0
    skipped: list[str] = []

    if best_times_path and names_relays_path:
        # Both files: full merge (current behavior)
        best = Path(best_times_path)
        names = Path(names_relays_path)
        if not best.is_file():
            raise FileNotFoundError(f"File not found: {best}")
        if not names.is_file():
            raise FileNotFoundError(f"File not found: {names}")
        people_from_files = load_people(best, names)
        for p in people_from_files:
            key = (p.first_name.strip().lower(), p.last_name.strip().lower())
            if key in name_to_id:
                sid = name_to_id[key]
                row = id_to_row[sid]
                if not _person_equals_row_full(p, row):
                    relay_db.update_swimmer(
                        db_path,
                        sid,
                        first_name=p.first_name,
                        last_name=p.last_name,
                        gender=p.gender,
                        year_of_birth=p.year_of_birth,
                        freestyle_50=p.freestyle_50,
                        backstroke_50=p.backstroke_50,
                        breaststroke_50=p.breaststroke_50,
                        butterfly_50=p.butterfly_50,
                        availability=p.availability,
                        medical_date=getattr(p, "medical_date", None),
                    )
                    updated += 1
            else:
                new_id = relay_db.insert_one(db_path, p)
                name_to_id[key] = new_id
                added += 1

    elif names_relays_path:
        # Names only: add new swimmers (times empty), update existing (names/gender/yob/medical/availability)
        names = Path(names_relays_path)
        if not names.is_file():
            raise FileNotFoundError(f"File not found: {names}")
        people_from_files = load_people_from_names_only(names)
        for p in people_from_files:
            key = (p.first_name.strip().lower(), p.last_name.strip().lower())
            if key in name_to_id:
                sid = name_to_id[key]
                row = id_to_row[sid]
                if not _person_equals_row_names_only(p, row):
                    relay_db.update_swimmer(
                        db_path,
                        sid,
                        first_name=p.first_name,
                        last_name=p.last_name,
                        gender=p.gender,
                        year_of_birth=p.year_of_birth,
                        availability=p.availability,
                        medical_date=getattr(p, "medical_date", None),
                    )
                    updated += 1
            else:
                new_id = relay_db.insert_one(db_path, p)
                name_to_id[key] = new_id
                added += 1

    else:
        # Best times only: update only existing swimmers; skip and report others
        best = Path(best_times_path)
        if not best.is_file():
            raise FileNotFoundError(f"File not found: {best}")
        people_from_files = load_people_from_best_times_only(best)
        for p in people_from_files:
            key = (p.first_name.strip().lower(), p.last_name.strip().lower())
            if key in name_to_id:
                sid = name_to_id[key]
                row = id_to_row[sid]
                kwargs = {}
                if p.freestyle_50 is not None:
                    kwargs["freestyle_50"] = p.freestyle_50
                if p.backstroke_50 is not None:
                    kwargs["backstroke_50"] = p.backstroke_50
                if p.breaststroke_50 is not None:
                    kwargs["breaststroke_50"] = p.breaststroke_50
                if p.butterfly_50 is not None:
                    kwargs["butterfly_50"] = p.butterfly_50
                if kwargs and _times_differ(p, row):
                    relay_db.update_swimmer(db_path, sid, **kwargs)
                    updated += 1
            else:
                skipped.append(f"{p.first_name} {p.last_name}".strip())

    swimmers = relay_db.load_all(db_path)
    out = {
        "swimmers": swimmers,
        "imported": added,
        "updated": updated,
    }
    if skipped:
        out["skipped"] = skipped
    return out


def cmd_update_swimmer(db_path: Path, payload: dict) -> dict:
    swimmer_id = payload.get("id")
    if swimmer_id is None:
        raise ValueError("Missing 'id' in update payload")
    relay_db.ensure_database(db_path)

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
    if "availability" in payload:
        kwargs["availability"] = payload["availability"]
    if "medical_date" in payload:
        kwargs["medical_date"] = payload["medical_date"] or None

    relay_db.update_swimmer(db_path, int(swimmer_id), **kwargs)
    updated = relay_db.load_all(db_path)
    one = next((s for s in updated if s["id"] == int(swimmer_id)), None)
    return {"swimmer": one} if one else {"swimmer": None}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=None)
    parser.add_argument("--command", default=None,
        choices=["list-swimmers", "build-teams", "import-files", "update-swimmer", "delete-swimmers", "list-competitions", "add-competition", "delete-competitions", "add-swimmer"])
    parser.add_argument("--best-times", default=None)
    parser.add_argument("--names-relays", default=None)
    parser.add_argument("--reference-year", type=int, default=None)
    parser.add_argument("--meet-start-date", default=None, help="YYYY-MM-DD; used to filter swimmers with valid medical")
    args = parser.parse_args()

    try:
        # Prefer env so Electron passes path without shell mangling (same file for list/add/build).
        db_path_str = os.environ.get("RELAY_DB_PATH") or args.db
        if db_path_str and args.command:
            db_path = Path(db_path_str).resolve()
            if args.command == "list-swimmers":
                out = cmd_list_swimmers(db_path)
            elif args.command == "build-teams":
                out = cmd_build_teams(db_path, args.reference_year, args.meet_start_date)
            elif args.command == "import-files":
                if not args.best_times and not args.names_relays:
                    raise ValueError("import-files requires at least one of --best-times or --names-relays")
                out = cmd_import_files(db_path, args.best_times, args.names_relays)
            elif args.command == "update-swimmer":
                out = cmd_update_swimmer(db_path, json.load(sys.stdin))
            elif args.command == "delete-swimmers":
                out = cmd_delete_swimmers(db_path, json.load(sys.stdin))
            elif args.command == "list-competitions":
                out = cmd_list_competitions(db_path)
            elif args.command == "add-competition":
                out = cmd_add_competition(db_path, json.load(sys.stdin))
            elif args.command == "add-swimmer":
                out = cmd_add_swimmer(db_path, json.load(sys.stdin))
            elif args.command == "delete-competitions":
                out = cmd_delete_competitions(db_path, json.load(sys.stdin))
            else:
                raise ValueError(f"Unknown command: {args.command}")
            print(json.dumps(out, ensure_ascii=False))
        else:
            if not args.best_times or not args.names_relays:
                raise ValueError("Legacy mode requires --best-times and --names-relays")
            out = run(args.best_times, args.names_relays, args.reference_year)
            print(json.dumps(out, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
