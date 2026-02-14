from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import List, Optional

from constants import AGE_GROUPS
from ..models import Person


def get_current_year() -> int:
    """Return the current year (for age calculations)."""
    return date.today().year


@dataclass
class RelayTeam:
    """Represents a relay team with 4 swimmers."""

    swimmers: List[Person]
    age_group: int  # index in AGE_GROUPS (0-5)
    total_time: float  # sum of best times for the event
    total_age: int  # sum of swimmers' ages

    def __repr__(self) -> str:
        group_min, group_max = AGE_GROUPS[self.age_group]
        return (
            f"RelayTeam(age_group={group_min}-{group_max}, "
            f"total_time={self.total_time:.2f}s, "
            f"swimmers=[{', '.join(s.full_name for s in self.swimmers)}])"
        )


def calculate_age(
    year_of_birth: Optional[int],
    reference_year: Optional[int] = None,
) -> Optional[int]:
    """Calculate age from year of birth. Uses current year if reference_year is None."""
    if year_of_birth is None:
        return None
    if reference_year is None:
        reference_year = get_current_year()
    return reference_year - year_of_birth


def get_age_group_index(total_age: int) -> Optional[int]:
    """
    Get the age group index (0-5) for a given total age.
    Returns None if total_age doesn't fit any group.
    """
    for idx, (min_age, max_age) in enumerate(AGE_GROUPS):
        if min_age <= total_age <= max_age:
            return idx
    return None


def get_available_age_groups(
    swimmers: List[Person],
    reference_year: Optional[int] = None,
) -> List[int]:
    """
    Get list of age group indices that can potentially form teams from available swimmers.
    Returns groups sorted from oldest to youngest (highest to lowest index).
    Uses current year for age if reference_year is None.
    """
    if reference_year is None:
        reference_year = get_current_year()
    # Calculate ages
    swimmers_with_age = [
        (s, calculate_age(s.year_of_birth, reference_year))
        for s in swimmers
        if s.year_of_birth is not None
    ]

    if len(swimmers_with_age) < 4:
        return []

    # Find possible age group combinations
    possible_groups = set()
    ages = [age for _, age in swimmers_with_age]

    # Try all combinations of 4 swimmers
    from itertools import combinations

    for combo in combinations(ages, 4):
        total_age = sum(combo)
        group_idx = get_age_group_index(total_age)
        if group_idx is not None:
            possible_groups.add(group_idx)

    # Return sorted from oldest (highest index) to youngest (lowest index)
    return sorted(possible_groups, reverse=True)
