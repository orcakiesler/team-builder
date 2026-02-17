"""Import-files command: merge from best-times and/or names-relays Excel into DB."""

from __future__ import annotations

from pathlib import Path

from relay_builder import db as relay_db
from relay_builder.loader import (
    load_people,
    load_people_from_names_only,
    load_people_from_best_times_only,
)
from relay_builder.models import Person


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
