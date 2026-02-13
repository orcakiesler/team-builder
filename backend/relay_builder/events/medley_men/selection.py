from __future__ import annotations

from typing import List

from constants import AVAILABILITY_MEDLEY, GENDER_MEN
from ...models import Person
from .._utils import is_gender_match


def filter_available(swimmers: List[Person]) -> List[Person]:
    """
    Filter swimmers available for men's 4x50 medley relay.
    
    Criteria:
    - medley availability = True
    - gender = GENDER_MEN (case-insensitive)
    """
    return [
        p
        for p in swimmers
        if p.availability.get(AVAILABILITY_MEDLEY, False)
        and is_gender_match(p, GENDER_MEN)
    ]
