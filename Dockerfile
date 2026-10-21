FROM python:3.12-slim
WORKDIR /app
COPY . /app
RUN pip install uv
RUN uv sync
CMD ["uv", "run", "pytest"]
