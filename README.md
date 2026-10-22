# Edukacyjny symulator szyfrów klasycznych i kryptoanalizy
Edukacyjna platforma webowa, która w prosty sposób zademonstruje działanie szyfrów klasycznych oraz podstawowych metod kryptoanalizy.

# Główne funkcjonalności:
- Szyfrowanie i deszyfrowanie: Obsługa klasycznych algorytmów (m.in. Szyfr Cezara, Vigenère'a, podstawieniowe).
- Kryptoanaliza: Łamanie szyfrów metodą Brute Force oraz za pomocą analizy częstotliwościowej.
- Wizualizacja: Interaktywny interfejs pokazujący zmiany tekstu w czasie rzeczywistym.

# Technologie:
Projekt jest podzielony na dwa niezależne moduły komunikujące się przez REST API.

**Frontend**
- React - Interfejs użytkownika.

**Backend** 
- Python - silnik algorytmów
- NumPy - optymalizacja obliczeń matematycznych i operacji na macierzach
- NLTK - analiza tekstu

## Setup

Requires [uv](https://docs.astral.sh/uv/getting-started/installation/).
Install Python 3.14 and all dependencies from `uv.lock` into a local `.venv`:

```bash
uv sync
```

Then either activate the environment with `source .venv/bin/activate` or prefix commands with `uv run`.

## Running the full stack (Docker)

Requires Docker with Docker Compose v2.
From the repository root:

```bash
docker compose up --build -d
docker compose ps
```

Wait until `backend` shows `Up (healthy)` and `frontend` shows `Up`.
The frontend only starts after the backend healthcheck passes.

| URL | What |
|---|---|
| http://localhost:3000 | Frontend (React app served by nginx) |
| http://localhost:8000/docs | Backend API docs (Swagger UI) |

The frontend calls the API with relative `/api/...` URLs.
In Docker, nginx proxies them to the `backend` service, so the browser never talks to port 8000 directly.

Useful commands:

```bash
docker compose logs -f                # follow logs of all services
docker compose down                   # stop and remove the containers
docker compose run --rm --build test  # run the test suite in a container (same as CI)
```

Images are not rebuilt automatically, so pass `--build` after changing code.

## Running locally without Docker

Backend, with auto-reload on code changes:

```bash
uv run uvicorn edukacyjnysymulatorszyfrowklasycznychikryptoanalizy.backend.app:app --reload
```

Frontend, in a second terminal:

```bash
cd src/edukacyjnysymulatorszyfrowklasycznychikryptoanalizy/frontend
npm ci
npm run dev
```

Open http://localhost:5173.
The Vite dev server proxies `/api` to `http://localhost:8000`.
Set `API_PROXY_TARGET` to point it at a different backend.

Tests:

```bash
uv run pytest
```

## Dokumentacja

[Core - Algorytmy szyfrujące i deszyfrujące](https://docs.google.com/document/d/1cEw6kwm_8KB52Q1iBX7rSoaDLs0WHUOqEHmT_zJW2q8/edit?usp=sharing)