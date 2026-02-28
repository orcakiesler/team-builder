"""
Small HTTP API for the Electron app. Uses relay_builder directly (no main.py).

Run from backend folder:
  poetry run uvicorn api_server:app --host 127.0.0.1 --port 8765

The Electron app starts this server and calls POST /build-teams with file paths.
"""

from __future__ import annotations

from datetime import date
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from constants import AGE_GROUPS, STROKE_LABELS
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

app = FastAPI(title="Relay Team Builder API")


def _person_to_dict(p) -> dict:
    """Serialize a Person to a JSON-serializable dict."""
    return {
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
    }


class BuildTeamsRequest(BaseModel):
    best_times_path: str
    names_relays_path: str
    reference_year: int | None = None


EVENT_CONFIGS = [
    ("Women's 4x50 Freestyle", filter_freestyle_women, build_freestyle_women, False),
    ("Men's 4x50 Freestyle", filter_freestyle_men, build_freestyle_men, False),
    ("Women's 4x50 Medley", filter_medley_women, build_medley_women, True),
    ("Men's 4x50 Medley", filter_medley_men, build_medley_men, True),
    ("Mixed 4x50 Freestyle", filter_mixed_freestyle, build_mixed_freestyle, False),
    ("Mixed 4x50 Medley", filter_mixed_medley, build_mixed_medley, True),
]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/build-teams")
def build_teams_api(req: BuildTeamsRequest):
    """Load swimmers from the two Excel files and build teams. Uses backend modules directly."""
    best = Path(req.best_times_path)
    names = Path(req.names_relays_path)
    if not best.is_file():
        raise HTTPException(status_code=400, detail=f"File not found: {best}")
    if not names.is_file():
        raise HTTPException(status_code=400, detail=f"File not found: {names}")

    people = load_people(best, names)
    reference_year = req.reference_year if req.reference_year is not None else date.today().year

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
        "swimmers": [_person_to_dict(p) for p in people],
        "teams": teams_by_event,
    }
