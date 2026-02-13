from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Optional


@dataclass
class Person:
    """
    Represents a swimmer with basic identity, best 50m times, and relay availability.

    Times are stored in seconds (float) when they can be parsed, otherwise None.
    Availability is a mapping from event name (column name in the availability Excel)
    to a boolean flag.
    """

    first_name: str
    last_name: str
    gender: Optional[str] = None
    year_of_birth: Optional[int] = None
    age: Optional[int] = None  # always derived: current year − year_of_birth (not from file/DB)

    # Best 50m times in seconds (None if no time / empty cell)
    freestyle_50: Optional[float] = None
    backstroke_50: Optional[float] = None
    breaststroke_50: Optional[float] = None
    butterfly_50: Optional[float] = None

    # Event-name -> is_available
    availability: Dict[str, bool] = field(default_factory=dict)

    @property
    def full_name(self) -> str:
        return f"{self.first_name.strip()} {self.last_name.strip()}".strip()

