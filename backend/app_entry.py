"""
Entry point for the Electron app. Supports:
- Legacy: --best-times, --names-relays → run from files, print JSON.
- Commands (with --db): list-swimmers, build-teams, import-files, update-swimmer,
  delete-swimmers, list-competitions, add-competition, delete-competitions, add-swimmer.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from commands import (
    cmd_add_competition,
    cmd_add_swimmer,
    cmd_build_teams,
    cmd_delete_competitions,
    cmd_delete_swimmers,
    cmd_import_files,
    cmd_list_competitions,
    cmd_list_swimmers,
    cmd_update_swimmer,
    run_legacy,
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=None)
    parser.add_argument(
        "--command",
        default=None,
        choices=[
            "list-swimmers",
            "build-teams",
            "import-files",
            "update-swimmer",
            "delete-swimmers",
            "list-competitions",
            "add-competition",
            "delete-competitions",
            "add-swimmer",
        ],
    )
    parser.add_argument("--best-times", default=None)
    parser.add_argument("--names-relays", default=None)
    parser.add_argument("--reference-year", type=int, default=None)
    parser.add_argument(
        "--meet-start-date",
        default=None,
        help="YYYY-MM-DD; used to filter swimmers with valid medical",
    )
    args = parser.parse_args()

    try:
        db_path_str = os.environ.get("RELAY_DB_PATH") or args.db
        if db_path_str and args.command:
            db_path = Path(db_path_str).resolve()
            if args.command == "list-swimmers":
                out = cmd_list_swimmers(db_path)
            elif args.command == "build-teams":
                out = cmd_build_teams(db_path, args.reference_year, args.meet_start_date)
            elif args.command == "import-files":
                if not args.best_times and not args.names_relays:
                    raise ValueError(
                        "import-files requires at least one of --best-times or --names-relays"
                    )
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
            out = run_legacy(args.best_times, args.names_relays, args.reference_year)
            print(json.dumps(out, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
