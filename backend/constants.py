from __future__ import annotations

"""
Central place for Excel-related constants:
- Column name candidates for identity fields (names, gender, year of birth)
- Stroke column mappings

All column names here are assumed to be normalized to lowercase and stripped.
"""

# Name / identity columns
NAME_CANDIDATES = ["name", "full name"]
FIRST_NAME_CANDIDATES = [
    "first name",
    "firstname",
    "first",
    "fname",  # your current files
]
LAST_NAME_CANDIDATES = [
    "last name",
    "lastname",
    "last",
    "sname",  # your current files
]
YOB_CANDIDATES = ["year of birth", "yob", "birth year", "born", "birth_year"]
GENDER_CANDIDATES = ["gender", "sex"]
MEDICALS_CANDIDATES = ["medicals", "medical", "last medical", "medical date", "medical check"]

# Gender values
GENDER_MEN = "m"
GENDER_WOMEN = "f"

# Stroke names (each constant contains both full and short name options)
STROKE_FREESTYLE = ["freestyle", "free"]
STROKE_BACKSTROKE = ["backstroke", "back"]
STROKE_BREASTSTROKE = ["breaststroke", "breast"]
STROKE_BUTTERFLY = ["butterfly", "fly"]

# Availability event keys (from names_relays Excel file)
AVAILABILITY_FREESTYLE = "freestyle"
AVAILABILITY_MEDLEY = "medley"
AVAILABILITY_FREESTYLE_MIX = "freestyle_mix"
AVAILABILITY_MEDLEY_MIX = "medley_mix"

# Medley leg labels (order: back, breast, fly, free)
STROKE_LABELS = ["Backstroke", "Breaststroke", "Butterfly", "Freestyle"]

# Age groups for relay teams (sum of 4 swimmers' ages, inclusive)
AGE_GROUPS = [
    (100, 119),  # group1
    (120, 159),  # group2
    (160, 199),  # group3
    (200, 239),  # group4
    (240, 279),  # group5
    (280, 319),  # group6
]

# Stroke column detection (best-times file)
STROKE_COLUMN_ALIASES = {
    # attribute on Person -> list of possible column headers (normalized)
    "freestyle_50": [
        "50 free",
        "50 freestyle",
        "50m free",
        "50m freestyle",
        "freestyle",  # your current files
    ],
    "backstroke_50": [
        "50 back",
        "50 backstroke",
        "50m back",
        "50m backstroke",
        "backstroke",  # your current files
    ],
    "breaststroke_50": [
        "50 breast",
        "50 breaststroke",
        "50m breast",
        "50m breaststroke",
        "breaststroke",  # your current files
    ],
    "butterfly_50": [
        "50 fly",
        "50 butterfly",
        "50m fly",
        "50m butterfly",
        "butterfly",  # your current files
    ],
}

