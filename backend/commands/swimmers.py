"""Swimmer commands: list, add, update, delete; Person/dict conversion and DB helpers."""

from __future__ import annotations

from datetime import date
from pathlib import Path

from relay_builder.models import Person
from relay_builder import db as relay_db


def person_to_dict(p: Person, id_: int | None = None) -> dict:
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


def swimmer_dict_to_person(d: dict) -> Person:
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


def optional_float(val):
    if val is None or str(val).strip() == "":
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def people_from_db(db_path: Path) -> list[Person]:
    rows = relay_db.load_all(db_path)
    return [swimmer_dict_to_person(r) for r in rows]


def cmd_list_swimmers(db_path: Path) -> dict:
    relay_db.ensure_database(db_path)
    return {"swimmers": relay_db.load_all(db_path)}


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
    freestyle_50 = optional_float(payload.get("freestyle_50"))
    backstroke_50 = optional_float(payload.get("backstroke_50"))
    breaststroke_50 = optional_float(payload.get("breaststroke_50"))
    butterfly_50 = optional_float(payload.get("butterfly_50"))
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


def cmd_delete_swimmers(db_path: Path, payload: dict) -> dict:
    ids = payload.get("ids") or []
    if not ids:
        return {"swimmers": relay_db.load_all(db_path)}
    relay_db.ensure_database(db_path)
    relay_db.delete_swimmers(db_path, [int(i) for i in ids])
    return {"swimmers": relay_db.load_all(db_path)}
