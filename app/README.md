# Relay Team Builder – Electron App

Desktop UI for building relay teams from your Excel files.

## Prerequisites

- **Backend**: From `team-builder/backend`, run `poetry install` so the Python script runs.
- **Node**: Install dependencies for the app (see below).

## Run the app

From the **app** folder:

```bash
cd app
npm install
npm start
```

## Usage

1. **Choose files**: Click each card or drag-and-drop your Excel files:
   - **Best times (50m)** – best times per stroke.
   - **Names & relay availability** – names, gender, year of birth, availability per event.
2. **Build teams**: When both files are set, click **Build teams**.
3. **Results**:
   - **Left**: Teams by event (age group, total time, swimmers; for medley, stroke order is shown).
   - **Right**: List of all loaded swimmers.
4. **Swimmer details**: Click a swimmer name in the right list to open a window with their data (name, gender, YOB, age, times, availability).
