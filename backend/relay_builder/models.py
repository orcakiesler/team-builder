from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Optional


@dataclass
class Person:
    """
    Represents a swimmer with attributes that are the same for every meet.

    - Identity: first_name, last_name, gender, year_of_birth, age (derived).
    - Best 50m times (seconds); medical_date (YYYY-MM-DD, valid 1 year).
    - availability: only set in context of a specific meet; comes from
      SwimmerMeetAvailability when loading for that meet. Not stored on the
      swimmer row in DB; stored per (swimmer, competition) in
      swimmer_meet_availability.
    """

    first_name: str
    last_name: str
    gender: Optional[str] = None
    year_of_birth: Optional[int] = None
    age: Optional[int] = None  # derived: current year − year_of_birth

    freestyle_50: Optional[float] = None
    backstroke_50: Optional[float] = None
    breaststroke_50: Optional[float] = None
    butterfly_50: Optional[float] = None

    # Per-meet; set when loading for a specific competition (from SwimmerMeetAvailability).
    availability: Dict[str, bool] = field(default_factory=dict)

    medical_date: Optional[str] = None

    @property
    def full_name(self) -> str:
        return f"{self.first_name.strip()} {self.last_name.strip()}".strip()


@dataclass
class SwimmerMeetAvailability:
    """
    Availability of a single swimmer for a single meet (competition).

    Stored in DB in swimmer_meet_availability; not on the swimmer row.
    """

    swimmer_id: int
    competition_id: int
    availability: Dict[str, bool] = field(default_factory=dict)

