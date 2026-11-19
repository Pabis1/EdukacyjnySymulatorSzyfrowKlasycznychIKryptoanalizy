# Build context is the repository root (see docker-compose.yml): the backend
# package imports 'core' and needs pyproject.toml and uv.lock from there.

FROM python:3.14-slim

COPY --from=ghcr.io/astral-sh/uv:0.12.0 /uv /usr/local/bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

WORKDIR /app

COPY pyproject.toml uv.lock .python-version README.md ./
RUN uv sync --locked --no-install-project

# Corpus for the brute force language models, fetched at build time so the app never downloads at startup.
# '/usr/local/share/nltk_data' is on NLTK's default search path.
RUN .venv/bin/python -m nltk.downloader -d /usr/local/share/nltk_data udhr2

COPY src ./src
RUN uv sync --locked

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000
CMD ["uvicorn", "edukacyjnysymulatorszyfrowklasycznychikryptoanalizy.backend.app:app", "--host", "0.0.0.0", "--port", "8000"]
