#!/usr/bin/env bash
# ArchiveOps Cloud Deployment Helper Script
# DataGuard Document Management Limited

set -e

echo "=========================================="
echo "ArchiveOps Cloud Deployment Helper"
echo "DataGuard Document Management Limited"
echo "=========================================="

echo "[1/4] Validating environment..."
if [ ! -f ".env" ]; then
    echo "[WARNING] .env file not found. Copying .env.example..."
    cp .env.example .env
fi

echo "[2/4] Verifying backend dependencies..."
python3 -m pip install -q -r app/backend/requirements.txt

echo "[3/4] Testing backend build & imports..."
python3 -c "import app.backend.main; print('[OK] Backend imports verified successfully.')"

echo "[4/4] Free-Tier Cloud Deployment Options:"
echo "------------------------------------------"
echo "Option A — Render.com / Railway.app (Backend Docker):"
echo "  1. Connect GitHub repository."
echo "  2. Create Web Service using Dockerfile.backend."
echo "  3. Set PORT=8000."
echo ""
echo "Option B — Vercel.com (Frontend Next.js):"
echo "  1. Import project directory app/frontend."
echo "  2. Set NEXT_PUBLIC_API_URL to your deployed backend URL."
echo "=========================================="
echo "[SUCCESS] ArchiveOps build check complete!"
