Relay Team Builder – Backend
============================

This backend is a small Python service that:

- Reads swimmer information from two Excel workbooks:
  - A workbook with best times for each 50m stroke.
  - A workbook with relay availability for each swimmer.
- Produces a list of `Person` objects containing:
  - First name, last name, gender, year of birth.
  - Best times for all 50m strokes.
  - Boolean availability flags for each relay event.
- Optionally stores the data in a local SQLite database.

## Setup

1. Create and activate a virtual environment (recommended), e.g.:

   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate  # On Windows PowerShell: .venv\Scripts\Activate.ps1
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

## Usage (initial loader)

The core entry point for now will be a function like:

```python
from relay_builder.loader import load_people

people = load_people(
    best_times_path=r"c:\Users\GilKiesler\Downloads\best_times.xlsx",
    names_relays_path=r"c:\Users\GilKiesler\Downloads\names_relays.xlsx",
)
```

This will return a list of `Person` instances and (optionally) write everything into a SQLite database file.

## API server (for Electron app)

The Electron frontend talks to the backend over HTTP, not via `main.py`. From the backend folder:

```bash
poetry install   # includes fastapi, uvicorn
poetry run uvicorn api_server:app --host 127.0.0.1 --port 8765
```

- **GET /health** – readiness check.
- **POST /build-teams** – body: `{ "best_times_path": "...", "names_relays_path": "..." }`  
  Returns `{ "reference_year", "swimmers", "teams" }` using `relay_builder` (load_people, event filters, build_teams) directly.

When you run the Electron app (`npm start` from `app/`), it starts this API server automatically and calls it to build teams.

