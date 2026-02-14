from __future__ import annotations

from itertools import combinations
from typing import List, Optional

from constants import GENDER_MEN, GENDER_WOMEN
from ...models import Person
from .._team_utils import (
    RelayTeam,
    calculate_age,
    get_age_group_index,
    get_available_age_groups,
    get_current_year,
)
from .._utils import is_gender_match


def build_teams(
    swimmers: List[Person],
    reference_year: Optional[int] = None,
    max_teams_per_group: int = 1,
) -> List[RelayTeam]:
    """
    Build fastest relay teams for mixed 4x50 freestyle (2 men, 2 women).
    
    Constraints:
    - Max 1 team per age group
    - Each swimmer can only be in 1 team
    - Prioritize older age groups first
    - Exactly 4 swimmers per team (2 men, 2 women)
    - Teams are built from fastest available swimmers
    
    Args:
        swimmers: List of available swimmers (already filtered for this event)
        reference_year: Year to calculate ages (default: current year)
        max_teams_per_group: Maximum teams per age group (default: 1)
    
    Returns:
        List of RelayTeam objects, sorted by age group (oldest first)
    """
    if reference_year is None:
        reference_year = get_current_year()
    # Separate by gender
    men = [s for s in swimmers if is_gender_match(s, GENDER_MEN)]
    women = [s for s in swimmers if is_gender_match(s, GENDER_WOMEN)]

    # Filter swimmers with freestyle times and valid age
    valid_men = [
        s
        for s in men
        if s.freestyle_50 is not None
        and s.year_of_birth is not None
        and calculate_age(s.year_of_birth, reference_year) is not None
    ]
    valid_women = [
        s
        for s in women
        if s.freestyle_50 is not None
        and s.year_of_birth is not None
        and calculate_age(s.year_of_birth, reference_year) is not None
    ]

    if len(valid_men) < 2 or len(valid_women) < 2:
        return []

    # Sort by fastest freestyle time
    valid_men.sort(key=lambda s: s.freestyle_50)
    valid_women.sort(key=lambda s: s.freestyle_50)

    teams: List[RelayTeam] = []
    used_swimmers = set()

    # Get available age groups (oldest first)
    all_valid = valid_men + valid_women
    available_groups = get_available_age_groups(all_valid, reference_year)

    for group_idx in available_groups:
        if len(teams) >= max_teams_per_group * len(available_groups):
            break

        # Find fastest team for this age group
        best_team = _find_fastest_mixed_freestyle_team(
            valid_men, valid_women, group_idx, used_swimmers, reference_year
        )

        if best_team:
            teams.append(best_team)
            # Mark swimmers as used
            used_swimmers.update(id(s) for s in best_team.swimmers)

    return teams


def _find_fastest_mixed_freestyle_team(
    men: List[Person],
    women: List[Person],
    target_group_idx: int,
    used_swimmers: set[int],
    reference_year: int,
) -> Optional[RelayTeam]:
    """Find the fastest mixed team (2 men, 2 women) that fits the target age group."""
    # Filter out used swimmers
    available_men = [s for s in men if id(s) not in used_swimmers]
    available_women = [s for s in women if id(s) not in used_swimmers]

    if len(available_men) < 2 or len(available_women) < 2:
        return None

    best_team = None
    best_time = float("inf")

    # Try all combinations of 2 men and 2 women
    for men_combo in combinations(available_men, 2):
        for women_combo in combinations(available_women, 2):
            team = list(men_combo) + list(women_combo)

            ages = [calculate_age(s.year_of_birth, reference_year) for s in team]
            if any(a is None for a in ages):
                continue

            total_age = sum(ages)
            group_idx = get_age_group_index(total_age)

            if group_idx == target_group_idx:
                # Calculate total time (sum of freestyle times)
                total_time = sum(s.freestyle_50 for s in team if s.freestyle_50 is not None)

                if total_time < best_time:
                    best_time = total_time
                    best_team = RelayTeam(
                        swimmers=team,
                        age_group=target_group_idx,
                        total_time=total_time,
                        total_age=total_age,
                    )

    return best_team
