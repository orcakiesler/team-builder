from __future__ import annotations

from typing import List

from constants import AVAILABILITY_MEDLEY_MIX
from ...models import Person


def filter_available(swimmers: List[Person]) -> List[Person]:
    """
    Filter swimmers available for mixed 4x50 medley relay (2 men, 2 women).
    
    Criteria:
    - medley_mix availability = True
    (no gender filter - both men and women can be selected)
    """
    return [
        p
        for p in swimmers
        if p.availability.get(AVAILABILITY_MEDLEY_MIX, False)
    ]
