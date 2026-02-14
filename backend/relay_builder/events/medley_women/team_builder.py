from __future__ import annotations

from itertools import combinations, permutations
from typing import List, Optional

from ...models import Person
from .._team_utils import (
    RelayTeam,
    calculate_age,
    get_age_group_index,
    get_available_age_groups,
    get_current_year,
)


def build_teams(
    swimmers: List[Person],
    reference_year: Optional[int] = None,
    max_teams_per_group: int = 1,
) -> List[RelayTeam]:
    """
    Build fastest relay teams for women's 4x50 medley.
    
    Constraints:
    - Max 1 team per age group
    - Each swimmer can only be in 1 team
    - Prioritize older age groups first
    - Exactly 4 swimmers per team (1 per stroke)
    - Stroke order: backstroke, breaststroke, butterfly, freestyle
    
    Args:
        swimmers: List of available swimmers (already filtered for this event)
        reference_year: Year to calculate ages (default: current year)
        max_teams_per_group: Maximum teams per age group (default: 1)
    
    Returns:
        List of RelayTeam objects, sorted by age group (oldest first)
    """
    if reference_year is None:
        reference_year = get_current_year()
    # Filter swimmers with all required times and valid age
    valid_swimmers = [
        s
        for s in swimmers
        if s.backstroke_50 is not None
        and s.breaststroke_50 is not None
        and s.butterfly_50 is not None
        and s.freestyle_50 is not None
        and s.year_of_birth is not None
        and calculate_age(s.year_of_birth, reference_year) is not None
    ]

    if len(valid_swimmers) < 4:
        return []

    teams: List[RelayTeam] = []
    used_swimmers = set()

    # Get available age groups (oldest first)
    available_groups = get_available_age_groups(valid_swimmers, reference_year)

    for group_idx in available_groups:
        if len(teams) >= max_teams_per_group * len(available_groups):
            break

        # Find fastest team for this age group
        best_team = _find_fastest_medley_team(
            valid_swimmers, group_idx, used_swimmers, reference_year
        )

        if best_team:
            teams.append(best_team)
            # Mark swimmers as used
            used_swimmers.update(id(s) for s in best_team.swimmers)

    return teams


def _find_fastest_medley_team(
    swimmers: List[Person],
    target_group_idx: int,
    used_swimmers: set[int],
    reference_year: int,
) -> Optional[RelayTeam]:
    """
    Find the fastest medley team (1 swimmer per stroke) that fits the target age group.
    Stroke order: backstroke, breaststroke, butterfly, freestyle
    """
    # Filter out used swimmers
    available = [s for s in swimmers if id(s) not in used_swimmers]

    if len(available) < 4:
        return None

    best_team = None
    best_time = float("inf")

    # Try all combinations of 4 different swimmers
    for combo in combinations(available, 4):
        # Try all permutations to assign strokes
        for perm in permutations(combo):
            back, breast, fly, free = perm

            # Check if this combination fits the age group
            ages = [calculate_age(s.year_of_birth, reference_year) for s in perm]
            if any(a is None for a in ages):
                continue

            total_age = sum(ages)
            group_idx = get_age_group_index(total_age)

            if group_idx == target_group_idx:
                # Calculate total time (sum of each swimmer's time for their stroke)
                total_time = (
                    (back.backstroke_50 or float("inf"))
                    + (breast.breaststroke_50 or float("inf"))
                    + (fly.butterfly_50 or float("inf"))
                    + (free.freestyle_50 or float("inf"))
                )

                if total_time < best_time:
                    best_time = total_time
                    best_team = RelayTeam(
                        swimmers=list(perm),  # back, breast, fly, free order
                        age_group=target_group_idx,
                        total_time=total_time,
                        total_age=total_age,
                    )

    return best_team
