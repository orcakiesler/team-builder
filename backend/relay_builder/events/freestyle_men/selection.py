from __future__ import annotations

from typing import List

from constants import GENDER_MEN, STROKE_FREESTYLE
from ...models import Person
from .._utils import is_gender_match


def filter_available(swimmers: List[Person]) -> List[Person]:
    """
    Filter swimmers available for men's 4x50 freestyle relay.
    
    Criteria:
    - freestyle availability = True
    - gender = GENDER_MEN (case-insensitive)
    """
    return [
        p
        for p in swimmers
        if p.availability.get(STROKE_FREESTYLE[0], False)
        and is_gender_match(p, GENDER_MEN)
    ]
