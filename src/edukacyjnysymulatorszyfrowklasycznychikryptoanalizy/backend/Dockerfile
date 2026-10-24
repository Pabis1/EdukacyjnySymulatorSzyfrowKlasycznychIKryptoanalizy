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

COPY src ./src
RUN uv sync --locked

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000
CMD ["uvicorn", "edukacyjnysymulatorszyfrowklasycznychikryptoanalizy.backend.app:app", "--host", "0.0.0.0", "--port", "8000"]
