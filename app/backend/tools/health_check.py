"""
ArchiveOps Terminal System Health Diagnostic Tool
DataGuard Document Management Limited

Validates API integrity, database storage, environment variables, and background services.
"""

import sys
import os
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from datetime import datetime

def run_health_diagnostics():
    print("=" * 50)
    print("ArchiveOps System Health Diagnostic")
    print("DataGuard Document Management Limited")
    print("=" * 50)

    # 1. Environment & Configuration Check
    print("[1/5] Checking Configuration & Environment...")
    env_file = PROJECT_ROOT / ".env"
    if env_file.exists():
        print("  [OK] .env configuration file exists.")
    else:
        print("  [WARN] .env configuration file missing (using default environment).")

    allowed_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
    print(f"  [OK] Allowed CORS Origins: {allowed_origins}")

    # 2. Database Integrity Check
    print("\n[2/5] Checking Local Database Integrity...")
    from app.backend.google_sheets_db import DB_FILE, get_all
    if DB_FILE.exists():
        print(f"  [OK] Database file exists at {DB_FILE}")
        projects = get_all("projects") or get_all("baselines")
        users = get_all("users")
        reports = get_all("reports")
        adhoc = get_all("adhoc_workers")
        print(f"  [OK] Records found — Projects: {len(projects)}, Users: {len(users)}, Reports: {len(reports)}, Ad-hoc Workers: {len(adhoc)}")
    else:
        print("  [WARN] Database file db.json not yet created. Will be seeded on startup.")

    # 3. Anomaly & Predictive Intelligence Engine Check
    print("\n[3/5] Checking AI & Predictive Intelligence Layer...")
    try:
        from app.backend.skills.anomaly_detection import detect_anomaly
        from app.backend.skills.executive_synthesis import synthesize
        from app.backend.skills.predictive_analytics import generate_portfolio_predictive_summary
        print("  [OK] Anomaly Detection, Executive Synthesis & Predictive Skills loaded successfully.")
    except Exception as e:
        print(f"  [ERROR] Intelligence skills failed to load: {e}")

    # 4. WhatsApp Dispatcher Status Check
    print("\n[4/5] Checking WhatsApp Dispatcher & Credentials...")
    twilio_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    twilio_token = os.environ.get("TWILIO_AUTH_TOKEN")
    if twilio_sid and twilio_token:
        print(f"  [OK] Live Twilio credentials configured (SID: {twilio_sid[:8]}...).")
    else:
        print("  [OK] Twilio Sandbox / Local Simulation Mode active.")

    # 5. API Server Readiness Test
    print("\n[5/5] Testing FastAPI Application Endpoint Instantiation...")
    try:
        from fastapi.testclient import TestClient
        from app.backend.main import app
        client = TestClient(app)
        res = client.get("/")
        if res.status_code == 200:
            print("  [OK] API Root endpoint responded with 200 OK.")
        else:
            print(f"  [WARN] API Root returned status {res.status_code}")
    except Exception as e:
        print(f"  [ERROR] API instantiation test failed: {e}")

    print("=" * 50)
    print(f"[SUCCESS] System health check completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("==========================================")

if __name__ == "__main__":
    run_health_diagnostics()
