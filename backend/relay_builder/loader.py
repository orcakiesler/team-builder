from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import List, Optional

import pandas as pd

from .models import Person
from constants import (
    NAME_CANDIDATES,
    FIRST_NAME_CANDIDATES,
    LAST_NAME_CANDIDATES,
    YOB_CANDIDATES,
    GENDER_CANDIDATES,
    STROKE_COLUMN_ALIASES,
)


def _normalize_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """Lowercase and strip column names for easier matching."""
    df = df.copy()
    df.columns = [str(c).strip().lower() for c in df.columns]
    return df


def _parse_time_to_seconds(value) -> Optional[float]:
    """
    Parse a cell value into seconds (float).

    Supports:
    - Empty / NaN -> None
    - Numeric values (assumed seconds)
    - Strings like "32.15" (seconds)
    - Strings like "0:32.15" or "00:32.15" (minutes:seconds.fraction)
    """
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None

    if isinstance(value, (int, float)):
        return float(value)

    s = str(value).strip()
    if not s:
        return None

    # Try mm:ss.xx or m:ss.xx
    if ":" in s:
        try:
            mins_str, secs_str = s.split(":", 1)
            mins = float(mins_str)
            secs = float(secs_str)
            return mins * 60.0 + secs
        except ValueError:
            pass

    # Fallback: plain seconds
    try:
        return float(s)
    except ValueError:
        return None


def _split_name(row, first_name_col: str, last_name_col: Optional[str], full_name_col: Optional[str]):
    """
    Extract first and last name from a row, supporting either:
    - separate first/last name columns, or
    - a single full-name column.
    """
    if first_name_col in row and pd.notna(row[first_name_col]) and last_name_col and last_name_col in row:
        first_name = str(row[first_name_col]).strip()
        last_name = str(row[last_name_col]).strip()
        return first_name, last_name

    if full_name_col and full_name_col in row and pd.notna(row[full_name_col]):
        full = str(row[full_name_col]).strip()
        parts = full.split()
        if len(parts) == 1:
            return parts[0], ""
        return parts[0], " ".join(parts[1:])

    # Fallback to empty
    return "", ""


def load_people(
    best_times_path: str | Path,
    names_relays_path: str | Path,
) -> List[Person]:
    """
    Load swimmers from the two Excel files and return a list of Person objects.

    Assumptions (can be relaxed/adjusted once we see your real files):
    - Both files contain name information and (ideally) year of birth.
    - We join rows based on full name (case-insensitive) and year of birth when available.
    - Stroke columns in best-times file use names like:
        "50 free", "50 back", "50 breast", "50 fly"
        (any case; basic synonyms handled below).
    - Availability columns in names-relays file are all non-identity columns
      that are not year/gender/name; they are converted to True/False.
    """
    best_times_path = Path(best_times_path)
    names_relays_path = Path(names_relays_path)

    # Read workbooks
    best_df = pd.read_excel(best_times_path)
    avail_df = pd.read_excel(names_relays_path)

    best_df = _normalize_column_names(best_df)
    avail_df = _normalize_column_names(avail_df)

    # Guess name / identity columns using shared constants

    def find_col(df, candidates):
        for c in candidates:
            if c in df.columns:
                return c
        return None

    best_full_name_col = find_col(best_df, NAME_CANDIDATES)
    best_first_name_col = find_col(best_df, FIRST_NAME_CANDIDATES)
    best_last_name_col = find_col(best_df, LAST_NAME_CANDIDATES)
    best_yob_col = find_col(best_df, YOB_CANDIDATES)

    avail_full_name_col = find_col(avail_df, NAME_CANDIDATES)
    avail_first_name_col = find_col(avail_df, FIRST_NAME_CANDIDATES)
    avail_last_name_col = find_col(avail_df, LAST_NAME_CANDIDATES)
    avail_yob_col = find_col(avail_df, YOB_CANDIDATES)
    avail_gender_col = find_col(avail_df, GENDER_CANDIDATES)

    if not (best_full_name_col or (best_first_name_col and best_last_name_col)):
        raise ValueError(
            "Could not find name columns in best-times file. "
            "Expected either 'name' or 'first name' + 'last name'."
        )
    if not (avail_full_name_col or (avail_first_name_col and avail_last_name_col)):
        raise ValueError(
            "Could not find name columns in names-relays file. "
            "Expected either 'name' or 'first name' + 'last name'."
        )

    # Build a key for joining: (full_name_lower, year_of_birth or None)
    def build_key_df(df, full_name_col, first_col, last_col, yob_col):
        keys = []
        for _, row in df.iterrows():
            first, last = _split_name(row, first_col or "", last_col, full_name_col)
            full = f"{first} {last}".strip()
            yob = None
            if yob_col and yob_col in row:
                val = row[yob_col]
                if pd.notna(val) and val != "":
                    try:
                        yob = int(val)
                    except (TypeError, ValueError):
                        try:
                            yob = int(float(str(val).strip()))
                        except (TypeError, ValueError):
                            yob = None
            keys.append((full.lower(), yob))
        return keys

    # Only use year-of-birth in the key if BOTH files actually have it.
    use_yob_in_key = bool(best_yob_col and avail_yob_col)

    best_keys = build_key_df(
        best_df,
        best_full_name_col,
        best_first_name_col,
        best_last_name_col,
        best_yob_col if use_yob_in_key else None,
    )
    avail_keys = build_key_df(
        avail_df,
        avail_full_name_col,
        avail_first_name_col,
        avail_last_name_col,
        avail_yob_col if use_yob_in_key else None,
    )

    # Map from key to row index for each frame
    best_index = {k: i for i, k in enumerate(best_keys)}
    avail_index = {k: i for i, k in enumerate(avail_keys)}

    stroke_cols = {}
    for attr, aliases in STROKE_COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in best_df.columns:
                stroke_cols[attr] = alias
                break

    # Identify availability columns: everything that is not clearly identity
    identity_cols = {
        c
        for c in [
            avail_full_name_col,
            avail_first_name_col,
            avail_last_name_col,
            avail_yob_col,
            avail_gender_col,
        ]
        if c is not None
    }
    availability_cols = [c for c in avail_df.columns if c not in identity_cols]

    people: List[Person] = []

    for key, best_row_idx in best_index.items():
        if key not in avail_index:
            # Swimmer exists in times file but not in availability file; skip or keep with empty availability.
            continue

        avail_row_idx = avail_index[key]
        best_row = best_df.iloc[best_row_idx]
        avail_row = avail_df.iloc[avail_row_idx]

        # Identity fields
        first, last = _split_name(
            best_row,
            best_first_name_col or "",
            best_last_name_col,
            best_full_name_col,
        )

        gender = None
        if avail_gender_col and avail_gender_col in avail_row and pd.notna(avail_row[avail_gender_col]):
            gender = str(avail_row[avail_gender_col]).strip()

        yob = None
        # Try best_times file first, then availability file
        if best_yob_col and best_yob_col in best_row:
            val = best_row[best_yob_col]
            if pd.notna(val) and val != "":
                try:
                    yob = int(val)
                except (TypeError, ValueError):
                    # If it's not a number, try to extract number from string
                    try:
                        yob = int(float(str(val).strip()))
                    except (TypeError, ValueError):
                        yob = None
        elif avail_yob_col and avail_yob_col in avail_row:
            val = avail_row[avail_yob_col]
            if pd.notna(val) and val != "":
                try:
                    yob = int(val)
                except (TypeError, ValueError):
                    try:
                        yob = int(float(str(val).strip()))
                    except (TypeError, ValueError):
                        yob = None

        # Stroke times
        freestyle_50 = _parse_time_to_seconds(best_row[stroke_cols["freestyle_50"]]) if "freestyle_50" in stroke_cols else None
        backstroke_50 = _parse_time_to_seconds(best_row[stroke_cols["backstroke_50"]]) if "backstroke_50" in stroke_cols else None
        breaststroke_50 = _parse_time_to_seconds(best_row[stroke_cols["breaststroke_50"]]) if "breaststroke_50" in stroke_cols else None
        butterfly_50 = _parse_time_to_seconds(best_row[stroke_cols["butterfly_50"]]) if "butterfly_50" in stroke_cols else None

        # Availability flags: True if cell is not empty, False otherwise
        availability = {}
        for col in availability_cols:
            val = avail_row[col]
            # Simple check: available if cell is not empty/NaN
            is_available = pd.notna(val) and val != "" and str(val).strip() != ""
            availability[col] = is_available

        # Age from year of birth (current year at load time)
        age = (date.today().year - yob) if yob is not None else None

        people.append(
            Person(
                first_name=first,
                last_name=last,
                gender=gender,
                year_of_birth=yob,
                age=age,
                freestyle_50=freestyle_50,
                backstroke_50=backstroke_50,
                breaststroke_50=breaststroke_50,
                butterfly_50=butterfly_50,
                availability=availability,
            )
        )

    return people

