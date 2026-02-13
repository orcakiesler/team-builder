from __future__ import annotations

from typing import List

from constants import STROKE_FREESTYLE
from ...models import Person


def filter_available(swimmers: List[Person]) -> List[Person]:
    """
    Filter swimmers available for mixed 4x50 freestyle relay (2 men, 2 women).
    
    Criteria:
    - freestyle_mix availability = True
    (no gender filter - both men and women can be selected)
    """
    return [
        p
        for p in swimmers
        if p.availability.get(f"{STROKE_FREESTYLE[0]}_mix", False)
    ]
