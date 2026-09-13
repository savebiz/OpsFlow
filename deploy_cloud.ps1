# ArchiveOps Cloud Deployment Helper Script (PowerShell)
# DataGuard Document Management Limited

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "ArchiveOps Cloud Deployment Helper" -ForegroundColor Cyan
Write-Host "DataGuard Document Management Limited" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host "[1/4] Validating environment..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "[WARNING] .env file not found. Copying .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

Write-Host "[2/4] Verifying backend imports..." -ForegroundColor Yellow
$env:PYTHONPATH="."
python -c "import app.backend.main; print('[OK] Backend imports verified successfully.')"

Write-Host "[3/4] Checking Docker readiness..." -ForegroundColor Yellow
try {
    docker --version
    Write-Host "[OK] Docker CLI is available." -ForegroundColor Green
} catch {
    Write-Host "[NOTE] Docker CLI not active on native Windows host. (WSL Docker available)." -ForegroundColor Yellow
}

Write-Host "[4/4] Free-Tier Cloud Deployment Guide:" -ForegroundColor Cyan
Write-Host "------------------------------------------"
Write-Host "1. Render.com / Railway.app (FastAPI Backend):"
Write-Host "   - Build Context: ."
Write-Host "   - Dockerfile Path: Dockerfile.backend"
Write-Host "   - Env Var: ALLOWED_ORIGINS=https://archiveops.vercel.app"
Write-Host ""
Write-Host "2. Vercel / Netlify (Next.js Frontend):"
Write-Host "   - Root Directory: app/frontend"
Write-Host "   - Env Var: NEXT_PUBLIC_API_URL=https://<your-backend>.onrender.com/api"
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] ArchiveOps production deployment helper completed!" -ForegroundColor Green
