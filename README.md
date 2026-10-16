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
