"""Command handlers for the relay builder CLI (list-swimmers, build-teams, import-files, etc.)."""

from .swimmers import (
    cmd_add_swimmer,
    cmd_bulk_update_team,
    cmd_delete_swimmers,
    cmd_delete_swimmers_by_team,
    cmd_list_swimmers,
    cmd_list_swimmers_by_team,
    cmd_update_swimmer,
    people_from_db,
    person_to_dict,
)
from .competitions import (
    cmd_add_competition,
    cmd_delete_competitions,
    cmd_duplicate_competition,
    cmd_list_competitions,
    cmd_update_competition,
)
from .build_teams import cmd_build_teams, run_legacy
from .import_files import cmd_import_files
from .settings import cmd_list_relay_types, cmd_reset_database, cmd_save_relay_types
from .teams import cmd_add_team, cmd_delete_team, cmd_list_teams
from .coaches import (
    cmd_get_coach,
    cmd_list_coaches,
    cmd_list_teams_with_coaches,
    cmd_set_team_coaches,
    cmd_update_coach,
)

__all__ = [
    "cmd_add_swimmer",
    "cmd_add_competition",
    "cmd_add_team",
    "cmd_build_teams",
    "cmd_bulk_update_team",
    "cmd_delete_competitions",
    "cmd_delete_swimmers",
    "cmd_delete_swimmers_by_team",
    "cmd_delete_team",
    "cmd_duplicate_competition",
    "cmd_import_files",
    "cmd_list_competitions",
    "cmd_list_relay_types",
    "cmd_list_swimmers",
    "cmd_list_swimmers_by_team",
    "cmd_list_teams",
    "cmd_list_teams_with_coaches",
    "cmd_get_coach",
    "cmd_update_coach",
    "cmd_list_coaches",
    "cmd_set_team_coaches",
    "cmd_reset_database",
    "cmd_save_relay_types",
    "cmd_update_competition",
    "cmd_update_swimmer",
    "people_from_db",
    "person_to_dict",
    "run_legacy",
]
