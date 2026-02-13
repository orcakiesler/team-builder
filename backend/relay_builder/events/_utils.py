from __future__ import annotations

from ..models import Person


def normalize_gender(gender: str | None) -> str | None:
    """Normalize gender to lowercase for comparison."""
    if gender is None:
        return None
    return str(gender).strip().lower()


def is_gender_match(person: Person, target_gender: str) -> bool:
    """Check if person's gender matches target (case-insensitive)."""
    person_gender = normalize_gender(person.gender)
    target = target_gender.lower().strip()
    return person_gender == target
