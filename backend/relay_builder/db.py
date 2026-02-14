from __future__ import annotations

import json
import sqlite3
from datetime import date
from pathlib import Path
from typing import Any, Dict, Iterable, List

from .models import Person


def ensure_database(db_path: str | Path) -> None:
    """Create the swimmers database if it does not exist."""
    create_database(db_path)


def create_database(db_path: str | Path) -> None:
    """
    Create (or recreate) a simple SQLite database for swimmers.

    The schema is intentionally straightforward: one table with JSON-encoded
    availability. If you ever need a more normalized schema, we can extend this.
    """
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS swimmers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                gender TEXT,
                year_of_birth INTEGER,
                freestyle_50 REAL,
                backstroke_50 REAL,
                breaststroke_50 REAL,
                butterfly_50 REAL,
                availability_json TEXT NOT NULL
            )
            """
        )
        conn.commit()


def insert_people(db_path: str | Path, people: Iterable[Person]) -> None:
    """Insert a collection of Person records into the SQLite database."""
    path = Path(db_path)
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        rows = [
            (
                p.first_name,
                p.last_name,
                p.gender,
                p.year_of_birth,
                p.freestyle_50,
                p.backstroke_50,
                p.breaststroke_50,
                p.butterfly_50,
                json.dumps(p.availability, ensure_ascii=False),
            )
            for p in people
        ]
        cur.executemany(
            """
            INSERT INTO swimmers (
                first_name,
                last_name,
                gender,
                year_of_birth,
                freestyle_50,
                backstroke_50,
                breaststroke_50,
                butterfly_50,
                availability_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
        conn.commit()


def insert_one(db_path: str | Path, person: Person) -> int:
    """Insert a single Person and return the new row id."""
    path = Path(db_path)
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO swimmers (
                first_name, last_name, gender, year_of_birth,
                freestyle_50, backstroke_50, breaststroke_50, butterfly_50,
                availability_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                person.first_name,
                person.last_name,
                person.gender,
                person.year_of_birth,
                person.freestyle_50,
                person.backstroke_50,
                person.breaststroke_50,
                person.butterfly_50,
                json.dumps(person.availability, ensure_ascii=False),
            ),
        )
        conn.commit()
        return cur.lastrowid


def _row_to_swimmer_dict(row: tuple) -> Dict[str, Any]:
    """Convert a DB row (id, first_name, last_name, ...) to app-facing dict with id and availability."""
    (
        id_,
        first_name,
        last_name,
        gender,
        year_of_birth,
        freestyle_50,
        backstroke_50,
        breaststroke_50,
        butterfly_50,
        availability_json,
    ) = row
    availability = json.loads(availability_json) if availability_json else {}
    full_name = f"{first_name or ''} {last_name or ''}".strip()
    age = (date.today().year - year_of_birth) if year_of_birth is not None else None
    return {
        "id": id_,
        "first_name": first_name or "",
        "last_name": last_name or "",
        "full_name": full_name,
        "gender": gender,
        "year_of_birth": year_of_birth,
        "age": age,
        "freestyle_50": freestyle_50,
        "backstroke_50": backstroke_50,
        "breaststroke_50": breaststroke_50,
        "butterfly_50": butterfly_50,
        "availability": availability,
    }


def load_all(db_path: str | Path) -> List[Dict[str, Any]]:
    """Load all swimmers from the database. Returns list of dicts with id and all Person fields."""
    path = Path(db_path)
    if not path.exists():
        return []
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, first_name, last_name, gender, year_of_birth,
                   freestyle_50, backstroke_50, breaststroke_50, butterfly_50,
                   availability_json
            FROM swimmers
            ORDER BY first_name, last_name
            """
        )
        return [_row_to_swimmer_dict(row) for row in cur.fetchall()]


def update_swimmer(
    db_path: str | Path,
    id_: int,
    *,
    first_name: str | None = None,
    last_name: str | None = None,
    gender: str | None = None,
    year_of_birth: int | None = None,
    freestyle_50: float | None = None,
    backstroke_50: float | None = None,
    breaststroke_50: float | None = None,
    butterfly_50: float | None = None,
    availability: Dict[str, bool] | None = None,
) -> None:
    """Update a single swimmer by id. Only provided fields are updated."""
    path = Path(db_path)
    updates = []
    args = []
    if first_name is not None:
        updates.append("first_name = ?")
        args.append(first_name)
    if last_name is not None:
        updates.append("last_name = ?")
        args.append(last_name)
    if gender is not None:
        updates.append("gender = ?")
        args.append(gender)
    if year_of_birth is not None:
        updates.append("year_of_birth = ?")
        args.append(year_of_birth)
    if freestyle_50 is not None:
        updates.append("freestyle_50 = ?")
        args.append(freestyle_50)
    if backstroke_50 is not None:
        updates.append("backstroke_50 = ?")
        args.append(backstroke_50)
    if breaststroke_50 is not None:
        updates.append("breaststroke_50 = ?")
        args.append(breaststroke_50)
    if butterfly_50 is not None:
        updates.append("butterfly_50 = ?")
        args.append(butterfly_50)
    if availability is not None:
        updates.append("availability_json = ?")
        args.append(json.dumps(availability, ensure_ascii=False))
    if not updates:
        return
    args.append(id_)
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.execute(
            f"UPDATE swimmers SET {', '.join(updates)} WHERE id = ?",
            args,
        )
        conn.commit()

