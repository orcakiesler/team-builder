"""Parsing helpers for Excel loader: column normalization, time/date/name extraction."""

from __future__ import annotations

from datetime import date
from typing import Any, List, Optional

import pandas as pd


def normalize_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """Lowercase and strip column names for easier matching."""
    df = df.copy()
    df.columns = [str(c).strip().lower() for c in df.columns]
    return df


def parse_time_to_seconds(value: Any) -> Optional[float]:
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

    if ":" in s:
        try:
            mins_str, secs_str = s.split(":", 1)
            mins = float(mins_str)
            secs = float(secs_str)
            return mins * 60.0 + secs
        except ValueError:
            pass

    try:
        return float(s)
    except ValueError:
        return None


def parse_medical_date(value: Any) -> Optional[str]:
    """
    Parse a cell value as dd/mm/yyyy into YYYY-MM-DD string, or return None.
    """
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    if pd.isna(value):
        return None
    if hasattr(value, "strftime"):
        try:
            return value.strftime("%Y-%m-%d")
        except (ValueError, TypeError):
            return None
    s = str(value).strip()
    if not s:
        return None
    parts = s.replace("-", "/").split("/")
    if len(parts) != 3:
        return None
    try:
        day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
        if year < 100:
            year += 2000 if year < 50 else 1900
        return date(year, month, day).strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return None


def split_name(
    row: Any,
    first_name_col: str,
    last_name_col: Optional[str],
    full_name_col: Optional[str],
) -> tuple[str, str]:
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

    return "", ""


def find_col(df: pd.DataFrame, candidates: List[str]) -> Optional[str]:
    """Return the first column name from candidates that exists in df, or None."""
    for c in candidates:
        if c in df.columns:
            return c
    return None
