from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Iterable

from .models import Person


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

