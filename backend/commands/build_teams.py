"""Build-teams command: load swimmers from DB, filter by medical, run event builders."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from pathlib import Path

from constants import AGE_GROUPS, STROKE_LABELS
from relay_builder import (
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
from relay_builder import db as relay_db
from relay_builder.loader import load_people

from .swimmers import people_from_db, person_to_dict

EVENT_CONFIGS = [
    ("Women's 4x50 Freestyle", filter_freestyle_women, build_freestyle_women, False),
    ("Men's 4x50 Freestyle", filter_freestyle_men, build_freestyle_men, False),
    ("Women's 4x50 Medley", filter_medley_women, build_medley_women, True),
    ("Men's 4x50 Medley", filter_medley_men, build_medley_men, True),
    ("Mixed 4x50 Freestyle", filter_mixed_freestyle, build_mixed_freestyle, False),
    ("Mixed 4x50 Medley", filter_mixed_medley, build_mixed_medley, True),
]


def _is_medical_valid(medical_date_str: str | None, meet_start_date_str: str | None) -> bool:
    if not meet_start_date_str or not meet_start_date_str.strip():
        return True
    if not medical_date_str or not medical_date_str.strip():
        return False
    try:
        meet_date = datetime.strptime(meet_start_date_str.strip()[:10], "%Y-%m-%d").date()
        med_date = datetime.strptime(medical_date_str.strip()[:10], "%Y-%m-%d").date()
        return med_date + timedelta(days=365) >= meet_date
    except (ValueError, TypeError):
        return False


def cmd_build_teams(
    db_path: Path,
    reference_year: int | None = None,
    meet_start_date: str | None = None,
    competition_id: int | None = None,
) -> dict:
    relay_db.ensure_database(db_path)
    reference_year = reference_year or date.today().year
    people = people_from_db(db_path, competition_id=competition_id)
    if competition_id is not None:
        meet_teams = relay_db.load_competition_teams(db_path, competition_id)
        if meet_teams:
            def _norm(s: str) -> str:
                return (s or "").strip().replace(" ", "").lower()
            meet_teams_set = {_norm(t) for t in meet_teams if t}
            people = [p for p in people if _norm(getattr(p, "team", None) or "") in meet_teams_set]
    if meet_start_date:
        people = [
            p
            for p in people
            if _is_medical_valid(getattr(p, "medical_date", None), meet_start_date)
        ]
    swimmers_with_id = relay_db.load_all(db_path, competition_id=competition_id)
    if competition_id is not None:
        meet_teams = relay_db.load_competition_teams(db_path, competition_id)
        if meet_teams:
            def _norm_swimmer(s: str) -> str:
                return (s or "").strip().replace(" ", "").lower()
            meet_teams_set = {_norm_swimmer(t) for t in meet_teams if t}
            swimmers_with_id = [s for s in swimmers_with_id if _norm_swimmer(s.get("team") or "") in meet_teams_set]
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
                "swimmers": [person_to_dict(s) for s in team.swimmers],
            })
    return {
        "reference_year": reference_year,
        "swimmers": swimmers_with_id,
        "teams": teams_by_event,
    }


def run_legacy(
    best_times_path: str,
    names_relays_path: str,
    reference_year: int | None = None,
) -> dict:
    """Legacy: build teams from two Excel files (no DB)."""
    best = Path(best_times_path)
    names = Path(names_relays_path)
    if not best.is_file():
        raise FileNotFoundError(f"File not found: {best}")
    if not names.is_file():
        raise FileNotFoundError(f"File not found: {names}")
    people = load_people(best, names)
    reference_year = reference_year or date.today().year
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
                "swimmers": [person_to_dict(s) for s in team.swimmers],
            })
    return {
        "reference_year": reference_year,
        "swimmers": [person_to_dict(p) for p in people],
        "teams": teams_by_event,
    }
