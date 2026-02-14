from __future__ import annotations

"""
Small helper script to:
- Load swimmers from the two Excel files.
- Print a quick summary of the people.
- Optionally write them into a local SQLite database.

Usage (from the backend folder):

    python main.py ^
        --best-times "C:\\Users\\GilKiesler\\Downloads\\best_times.xlsx" ^
        --names-relays "C:\\Users\\GilKiesler\\Downloads\\names_relays.xlsx" ^
        --db "relay_swimmers.db"
"""

import argparse
import json
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
from relay_builder.db import create_database, insert_people
from relay_builder.events.freestyle_women.team_builder import build_teams as build_freestyle_women
from relay_builder.events.freestyle_men.team_builder import build_teams as build_freestyle_men
from relay_builder.events.medley_women.team_builder import build_teams as build_medley_women
from relay_builder.events.medley_men.team_builder import build_teams as build_medley_men
from relay_builder.events.mixed_freestyle.team_builder import build_teams as build_mixed_freestyle
from relay_builder.events.mixed_medley.team_builder import build_teams as build_mixed_medley


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Load swimmers and (optionally) store them in SQLite.")
    parser.add_argument(
        "--best-times",
        required=True,
        help="Path to the Excel file with best 50m times.",
    )
    parser.add_argument(
        "--names-relays",
        required=True,
        help="Path to the Excel file with relay availability.",
    )
    parser.add_argument(
        "--db",
        default=None,
        help="Optional path to a SQLite DB file to create/populate.",
    )
    parser.add_argument(
        "--show-events",
        action="store_true",
        help="Print available swimmers for each relay event.",
    )
    parser.add_argument(
        "--show-teams",
        action="store_true",
        help="Build and print fastest relay teams per age group for each event.",
    )
    parser.add_argument(
        "--reference-year",
        type=int,
        default=None,
        help="Year used to calculate ages (default: current year).",
    )
    parser.add_argument(
        "--output",
        choices=("text", "json"),
        default="text",
        help="Output format: text for human-readable, json for machine/Electron (default: text).",
    )
    return parser.parse_args()


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


def main() -> None:
    args = parse_args()

    best_times_path = Path(args.best_times)
    names_relays_path = Path(args.names_relays)

    people = load_people(best_times_path, names_relays_path)

    if args.output == "json":
        reference_year = args.reference_year if args.reference_year is not None else date.today().year
        event_configs = [
            ("Women's 4x50 Freestyle", filter_freestyle_women, build_freestyle_women, False),
            ("Men's 4x50 Freestyle", filter_freestyle_men, build_freestyle_men, False),
            ("Women's 4x50 Medley", filter_medley_women, build_medley_women, True),
            ("Men's 4x50 Medley", filter_medley_men, build_medley_men, True),
            ("Mixed 4x50 Freestyle", filter_mixed_freestyle, build_mixed_freestyle, False),
            ("Mixed 4x50 Medley", filter_mixed_medley, build_mixed_medley, True),
        ]
        stroke_labels = ["Backstroke", "Breaststroke", "Butterfly", "Freestyle"]
        teams_by_event = {}
        for event_name, filter_func, build_func, is_medley in event_configs:
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
                    "stroke_labels": stroke_labels if is_medley else None,
                    "swimmers": [_person_to_dict(s) for s in team.swimmers],
                })
        out = {
            "reference_year": reference_year,
            "swimmers": [_person_to_dict(p) for p in people],
            "teams": teams_by_event,
        }
        print(json.dumps(out, ensure_ascii=False))
        return

    print(f"Loading people from:\n  best-times:   {best_times_path}\n  names-relays: {names_relays_path}")
    print(f"\nLoaded {len(people)} swimmers.\n")

    # Print a short preview
    for p in people[:10]:
        print(
            f"- {p.full_name} "
            f"(gender={p.gender}, yob={p.year_of_birth}) "
            f"50free={p.freestyle_50} 50back={p.backstroke_50} "
            f"50breast={p.breaststroke_50} 50fly={p.butterfly_50}"
        )
        if p.availability:
            # show only a subset so output stays readable
            items = list(p.availability.items())[:4]
            avail_str = ", ".join(f"{k}={v}" for k, v in items)
            if len(p.availability) > 4:
                avail_str += ", ..."
            print(f"    availability: {avail_str}")

    if args.show_events:
        print("\n" + "=" * 60)
        print("AVAILABLE SWIMMERS BY EVENT")
        print("=" * 60)
        
        events = [
            ("Women's 4x50 Freestyle", filter_freestyle_women),
            ("Men's 4x50 Freestyle", filter_freestyle_men),
            ("Women's 4x50 Medley", filter_medley_women),
            ("Men's 4x50 Medley", filter_medley_men),
            ("Mixed 4x50 Freestyle", filter_mixed_freestyle),
            ("Mixed 4x50 Medley", filter_mixed_medley),
        ]
        
        for event_name, filter_func in events:
            available = filter_func(people)
            print(f"\n{event_name}: {len(available)} swimmers")
            if available:
                for p in available:
                    print(f"  - {p.full_name} (gender={p.gender}, yob={p.year_of_birth})")
            else:
                print("  (none)")
        
        print("\n" + "=" * 60)

    if args.show_teams:
        reference_year = args.reference_year if args.reference_year is not None else date.today().year
        print("\n" + "=" * 60)
        print(f"RELAY TEAMS BY EVENT (fastest per age group, reference year {reference_year})")
        print("=" * 60)

        event_configs = [
            ("Women's 4x50 Freestyle", filter_freestyle_women, build_freestyle_women, False),
            ("Men's 4x50 Freestyle", filter_freestyle_men, build_freestyle_men, False),
            ("Women's 4x50 Medley", filter_medley_women, build_medley_women, True),
            ("Men's 4x50 Medley", filter_medley_men, build_medley_men, True),
            ("Mixed 4x50 Freestyle", filter_mixed_freestyle, build_mixed_freestyle, False),
            ("Mixed 4x50 Medley", filter_mixed_medley, build_mixed_medley, True),
        ]

        stroke_labels = ("Backstroke", "Breaststroke", "Butterfly", "Freestyle")

        for event_name, filter_func, build_func, is_medley in event_configs:
            available = filter_func(people)
            teams = build_func(available, reference_year=reference_year)
            print(f"\n--- {event_name} ---")
            if not teams:
                print("  (no teams built)")
                continue
            for team in teams:
                lo, hi = AGE_GROUPS[team.age_group]
                print(f"  Age group {lo}-{hi} (total age {team.total_age}, time {team.total_time:.2f}s)")
                if is_medley:
                    for i, s in enumerate(team.swimmers):
                        print(f"    {stroke_labels[i]}: {s.full_name}")
                else:
                    print(f"    {', '.join(s.full_name for s in team.swimmers)}")

        print("\n" + "=" * 60)

    if args.db:
        db_path = Path(args.db)
        print(f"\nCreating / updating SQLite DB at {db_path} ...")
        create_database(db_path)
        insert_people(db_path, people)
        print("Done. You can inspect this DB with any SQLite viewer (e.g. DB Browser for SQLite).")


if __name__ == "__main__":
    main()

