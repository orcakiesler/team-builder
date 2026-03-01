from __future__ import annotations

import json
import sqlite3
from datetime import date
from pathlib import Path
from typing import Any, Dict, Iterable, List

from .models import Person


def ensure_database(db_path: str | Path) -> None:
    """Create the swimmers database if it does not exist and run migrations."""
    create_database(db_path)
    _migrate_swimmers_medical(db_path)
    _migrate_swimmers_team(db_path)
    _migrate_swimmer_meet_availability(db_path)
    _migrate_teams_table(db_path)
    _migrate_competition_teams(db_path)
    _migrate_swimmers_team_masters_test(db_path)


def _migrate_swimmers_medical(db_path: str | Path) -> None:
    """Add medical_date column to swimmers if it does not exist."""
    path = Path(db_path)
    if not path.exists():
        return
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(swimmers)")
        columns = [row[1] for row in cur.fetchall()]
        if "medical_date" not in columns:
            cur.execute("ALTER TABLE swimmers ADD COLUMN medical_date TEXT")
        conn.commit()


def _migrate_swimmers_team(db_path: str | Path) -> None:
    """Add team column to swimmers if it does not exist; set existing rows to default 'Haifa - masters'."""
    path = Path(db_path)
    if not path.exists():
        return
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(swimmers)")
        columns = [row[1] for row in cur.fetchall()]
        if "team" not in columns:
            cur.execute("ALTER TABLE swimmers ADD COLUMN team TEXT")
            cur.execute("UPDATE swimmers SET team = ? WHERE team IS NULL OR team = ''", ("Haifa - masters",))
        conn.commit()


def _migrate_swimmer_meet_availability(db_path: str | Path) -> None:
    """Create swimmer_meet_availability table and backfill from swimmers.availability_json."""
    path = Path(db_path)
    if not path.exists():
        return
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS swimmer_meet_availability (
                swimmer_id INTEGER NOT NULL,
                competition_id INTEGER NOT NULL,
                availability_json TEXT NOT NULL,
                PRIMARY KEY (swimmer_id, competition_id),
                FOREIGN KEY (swimmer_id) REFERENCES swimmers(id) ON DELETE CASCADE,
                FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
            )
            """
        )
        conn.commit()
        # Backfill: for each swimmer and each competition, copy current availability if not already present
        cur.execute("SELECT COUNT(*) FROM swimmer_meet_availability")
        if cur.fetchone()[0] > 0:
            conn.commit()
            return
        cur.execute(
            "SELECT id, availability_json FROM swimmers WHERE COALESCE(availability_json, '') != '' AND availability_json != '{}'"
        )
        swimmers_with_avail = cur.fetchall()
        cur.execute("SELECT id FROM competitions")
        competition_ids = [row[0] for row in cur.fetchall()]
        for swimmer_id, availability_json in swimmers_with_avail:
            for competition_id in competition_ids:
                cur.execute(
                    "INSERT OR IGNORE INTO swimmer_meet_availability (swimmer_id, competition_id, availability_json) VALUES (?, ?, ?)",
                    (swimmer_id, competition_id, availability_json or "{}"),
                )
        conn.commit()


def _migrate_teams_table(db_path: str | Path) -> None:
    """Create teams table and seed with default if empty."""
    path = Path(db_path)
    if not path.exists():
        return
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            )
            """
        )
        cur.execute("SELECT COUNT(*) FROM teams")
        if cur.fetchone()[0] == 0:
            cur.execute("INSERT INTO teams (name) VALUES (?)", ("Haifa - masters",))
        conn.commit()


def _migrate_competition_teams(db_path: str | Path) -> None:
    """Create competition_teams table; backfill existing meets with all teams."""
    path = Path(db_path)
    if not path.exists():
        return
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS competition_teams (
                competition_id INTEGER NOT NULL,
                team_name TEXT NOT NULL,
                PRIMARY KEY (competition_id, team_name),
                FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
            )
            """
        )
        conn.commit()
        cur.execute("SELECT COUNT(*) FROM competition_teams")
        if cur.fetchone()[0] > 0:
            return
        cur.execute("SELECT id FROM competitions")
        comp_ids = [row[0] for row in cur.fetchall()]
        cur.execute("SELECT name FROM teams ORDER BY id")
        all_teams = [row[0] for row in cur.fetchall()]
        for comp_id in comp_ids:
            for team_name in all_teams:
                cur.execute(
                    "INSERT OR IGNORE INTO competition_teams (competition_id, team_name) VALUES (?, ?)",
                    (comp_id, team_name),
                )
        conn.commit()


def _migrate_swimmers_team_masters_test(db_path: str | Path) -> None:
    """One-time correction: ensure 'Masters - test' exists; set swimmers whose team is not in the teams list to it."""
    path = Path(db_path)
    if not path.exists():
        return
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(swimmers)")
        columns = [row[1] for row in cur.fetchall()]
        if "team" not in columns:
            conn.commit()
            return
        cur.execute("INSERT OR IGNORE INTO teams (name) VALUES (?)", ("Masters - test",))
        cur.execute("SELECT name FROM teams")
        valid_teams = {row[0] for row in cur.fetchall()}
        cur.execute("SELECT id, team FROM swimmers")
        for row in cur.fetchall():
            swimmer_id, team = row[0], (row[1] or "").strip()
            if team not in valid_teams:
                cur.execute("UPDATE swimmers SET team = ? WHERE id = ?", ("Masters - test", swimmer_id))
        conn.commit()


def create_database(db_path: str | Path) -> None:
    """
    Create (or recreate) a simple SQLite database for swimmers and competitions.
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
                team TEXT NOT NULL,
                freestyle_50 REAL,
                backstroke_50 REAL,
                breaststroke_50 REAL,
                butterfly_50 REAL,
                availability_json TEXT NOT NULL,
                medical_date TEXT
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS competitions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                location TEXT NOT NULL
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE
            )
            """
        )
        conn.commit()


def _row_to_swimmer_dict(row: tuple) -> Dict[str, Any]:
    (
        id_,
        first_name,
        last_name,
        gender,
        year_of_birth,
        team,
        freestyle_50,
        backstroke_50,
        breaststroke_50,
        butterfly_50,
        availability_json,
        medical_date,
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
        "team": team or "Haifa - masters",
        "freestyle_50": freestyle_50,
        "backstroke_50": backstroke_50,
        "breaststroke_50": breaststroke_50,
        "butterfly_50": butterfly_50,
        "availability": availability,
        "medical_date": medical_date,
    }


def get_availability_for_meet(
    db_path: str | Path, competition_id: int
) -> Dict[int, Dict[str, bool]]:
    """Return swimmer_id -> availability dict for the given competition."""
    path = Path(db_path)
    if not path.exists():
        return {}
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT swimmer_id, availability_json FROM swimmer_meet_availability WHERE competition_id = ?",
            (competition_id,),
        )
        out = {}
        for swimmer_id, availability_json in cur.fetchall():
            out[swimmer_id] = json.loads(availability_json) if availability_json else {}
        return out


def set_swimmer_availability_for_meet(
    db_path: str | Path,
    swimmer_id: int,
    competition_id: int,
    availability: Dict[str, bool],
) -> None:
    """Set availability for one swimmer at one meet (upsert)."""
    path = Path(db_path)
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO swimmer_meet_availability (swimmer_id, competition_id, availability_json)
            VALUES (?, ?, ?)
            ON CONFLICT(swimmer_id, competition_id) DO UPDATE SET availability_json = excluded.availability_json
            """,
            (swimmer_id, competition_id, json.dumps(availability, ensure_ascii=False)),
        )
        conn.commit()


def load_all(
    db_path: str | Path,
    competition_id: int | None = None,
) -> List[Dict[str, Any]]:
    """
    Load all swimmers, ordered by first name A-Z.
    If competition_id is set, merge availability for that meet from swimmer_meet_availability.
    Otherwise availability is {} for each swimmer.
    """
    path = Path(db_path)
    if not path.exists():
        return []
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, first_name, last_name, gender, year_of_birth,
                   team,
                   freestyle_50, backstroke_50, breaststroke_50, butterfly_50,
                   medical_date
            FROM swimmers
            ORDER BY first_name, last_name
            """
        )
        rows = cur.fetchall()
    # Build list with id, ..., medical_date only (no availability_json in SELECT)
    swimmers = []
    for row in rows:
        (
            id_,
            first_name,
            last_name,
            gender,
            year_of_birth,
            team,
            freestyle_50,
            backstroke_50,
            breaststroke_50,
            butterfly_50,
            medical_date,
        ) = row
        full_name = f"{first_name or ''} {last_name or ''}".strip()
        age = (date.today().year - year_of_birth) if year_of_birth is not None else None
        swimmers.append({
            "id": id_,
            "first_name": first_name or "",
            "last_name": last_name or "",
            "full_name": full_name,
            "gender": gender,
            "year_of_birth": year_of_birth,
            "age": age,
            "team": team or "Haifa - masters",
            "freestyle_50": freestyle_50,
            "backstroke_50": backstroke_50,
            "breaststroke_50": breaststroke_50,
            "butterfly_50": butterfly_50,
            "availability": {},
            "medical_date": medical_date,
        })
    if competition_id is not None:
        avail_by_swimmer = get_availability_for_meet(db_path, competition_id)
        for s in swimmers:
            s["availability"] = avail_by_swimmer.get(s["id"], {})
    return swimmers


def insert_one(db_path: str | Path, person: Person) -> int:
    """Insert a single Person. Availability is not stored here; use set_swimmer_availability_for_meet per meet."""
    path = Path(db_path)
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO swimmers (
                first_name, last_name, gender, year_of_birth,
                team,
                freestyle_50, backstroke_50, breaststroke_50, butterfly_50,
                availability_json, medical_date
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                person.first_name,
                person.last_name,
                person.gender,
                person.year_of_birth,
                person.team or "Haifa - masters",
                person.freestyle_50,
                person.backstroke_50,
                person.breaststroke_50,
                person.butterfly_50,
                "{}",
                person.medical_date or None,
            ),
        )
        conn.commit()
        return cur.lastrowid


def delete_swimmers(db_path: str | Path, ids: List[int]) -> None:
    """Delete swimmers by id list."""
    if not ids:
        return
    path = Path(db_path)
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        placeholders = ",".join("?" * len(ids))
        cur.execute(f"DELETE FROM swimmers WHERE id IN ({placeholders})", ids)
        conn.commit()


def load_competitions(db_path: str | Path) -> List[Dict[str, Any]]:
    """Load all competitions, ordered by start_date."""
    path = Path(db_path)
    if not path.exists():
        return []
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, name, start_date, end_date, location
            FROM competitions
            ORDER BY start_date
            """
        )
        return [
            {
                "id": row[0],
                "name": row[1],
                "start_date": row[2],
                "end_date": row[3],
                "location": row[4],
            }
            for row in cur.fetchall()
        ]


def add_competition(
    db_path: str | Path,
    name: str,
    start_date: str,
    end_date: str,
    location: str,
) -> Dict[str, Any]:
    """Insert a competition and return the new row as dict."""
    path = Path(db_path)
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO competitions (name, start_date, end_date, location)
            VALUES (?, ?, ?, ?)
            """,
            (name, start_date, end_date, location),
        )
        conn.commit()
        row_id = cur.lastrowid
    return {
        "id": row_id,
        "name": name,
        "start_date": start_date,
        "end_date": end_date,
        "location": location,
    }


def delete_competitions(db_path: str | Path, ids: List[int]) -> None:
    """Delete competitions by id list."""
    if not ids:
        return
    path = Path(db_path)
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        placeholders = ",".join("?" * len(ids))
        cur.execute(f"DELETE FROM competitions WHERE id IN ({placeholders})", ids)
        conn.commit()


def load_teams(db_path: str | Path) -> List[str]:
    """Load team names from the teams table, ordered by id."""
    path = Path(db_path)
    if not path.exists():
        return []
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.execute("SELECT name FROM teams ORDER BY id")
        return [row[0] for row in cur.fetchall()]


def add_team(db_path: str | Path, name: str) -> None:
    """Add a team name. Raises if duplicate."""
    path = Path(db_path)
    name = (name or "").strip()
    if not name:
        raise ValueError("Team name is required")
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.execute("INSERT INTO teams (name) VALUES (?)", (name,))
        conn.commit()


def delete_team(db_path: str | Path, name: str) -> None:
    """Remove a team. Raises if any swimmer is assigned to this team."""
    path = Path(db_path)
    name = (name or "").strip()
    if not name:
        raise ValueError("Team name is required")
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM swimmers WHERE team = ?", (name,))
        if cur.fetchone()[0] > 0:
            raise ValueError(f"Cannot delete team \"{name}\": some swimmers are still assigned to it. Reassign them first.")
        cur.execute("DELETE FROM teams WHERE name = ?", (name,))
        conn.commit()


def load_competition_teams(db_path: str | Path, competition_id: int) -> List[str]:
    """Return team names for a competition, ordered by insertion."""
    path = Path(db_path)
    if not path.exists():
        return []
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT team_name FROM competition_teams WHERE competition_id = ? ORDER BY team_name",
            (competition_id,),
        )
        return [row[0] for row in cur.fetchall()]


def load_competition_teams_map(db_path: str | Path) -> Dict[int, List[str]]:
    """Return { competition_id: [team_names] } for all competitions."""
    path = Path(db_path)
    if not path.exists():
        return {}
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT competition_id, team_name FROM competition_teams ORDER BY competition_id, team_name"
        )
        out = {}
        for comp_id, team_name in cur.fetchall():
            out.setdefault(comp_id, []).append(team_name)
        return out


def set_competition_teams(db_path: str | Path, competition_id: int, team_names: List[str]) -> None:
    """Set the list of teams for a competition (replaces existing)."""
    path = Path(db_path)
    with sqlite3.connect(path) as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM competition_teams WHERE competition_id = ?", (competition_id,))
        for name in team_names:
            n = (name or "").strip()
            if n:
                cur.execute(
                    "INSERT INTO competition_teams (competition_id, team_name) VALUES (?, ?)",
                    (competition_id, n),
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
                p.team or "Haifa - masters",
                p.freestyle_50,
                p.backstroke_50,
                p.breaststroke_50,
                p.butterfly_50,
                "{}",
                p.medical_date or None,
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
                team,
                freestyle_50,
                backstroke_50,
                breaststroke_50,
                butterfly_50,
                availability_json,
                medical_date
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
        conn.commit()


def update_swimmer(
    db_path: str | Path,
    id_: int,
    *,
    first_name: str | None = None,
    last_name: str | None = None,
    gender: str | None = None,
    year_of_birth: int | None = None,
    team: str | None = None,
    freestyle_50: float | None = None,
    backstroke_50: float | None = None,
    breaststroke_50: float | None = None,
    butterfly_50: float | None = None,
    medical_date: str | None = None,
) -> None:
    """Update a single swimmer by id (global attributes only). Use set_swimmer_availability_for_meet for availability."""
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
    if team is not None:
        updates.append("team = ?")
        args.append(team)
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
    if medical_date is not None:
        updates.append("medical_date = ?")
        args.append(medical_date or None)
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

