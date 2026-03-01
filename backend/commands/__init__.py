"""Command handlers for the relay builder CLI (list-swimmers, build-teams, import-files, etc.)."""

from .swimmers import (
    cmd_add_swimmer,
    cmd_delete_swimmers,
    cmd_list_swimmers,
    cmd_update_swimmer,
    people_from_db,
    person_to_dict,
)
from .competitions import (
    cmd_add_competition,
    cmd_delete_competitions,
    cmd_list_competitions,
)
from .build_teams import cmd_build_teams, run_legacy
from .import_files import cmd_import_files
from .teams import cmd_add_team, cmd_delete_team, cmd_list_teams

__all__ = [
    "cmd_add_swimmer",
    "cmd_add_competition",
    "cmd_add_team",
    "cmd_build_teams",
    "cmd_delete_competitions",
    "cmd_delete_swimmers",
    "cmd_delete_team",
    "cmd_import_files",
    "cmd_list_competitions",
    "cmd_list_teams",
    "cmd_list_swimmers",
    "cmd_update_swimmer",
    "people_from_db",
    "person_to_dict",
    "run_legacy",
]
