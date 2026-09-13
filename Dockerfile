# ── Stage 1: Build Next.js Frontend ──
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY app/frontend/package*.json ./
RUN npm ci

COPY app/frontend ./
RUN npm run build

# ── Stage 2: Production Python Backend & Runtime ──
FROM python:3.11-slim AS runner
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements & install
COPY app/backend/requirements.txt ./app/backend/requirements.txt
RUN pip install --no-cache-dir -r app/backend/requirements.txt
RUN pip install --no-cache-dir uvicorn

# Copy all application files
COPY context ./context
COPY customers ./customers
COPY app ./app

# Expose FastAPI port
EXPOSE 8000

ENV PYTHONPATH=/app
ENV PORT=8000

# Start production server
CMD ["python", "-m", "uvicorn", "app.backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
