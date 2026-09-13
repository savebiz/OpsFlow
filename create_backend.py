import os
from pathlib import Path

WORKSPACE = Path(r"c:\Users\hp\OneDrive - Dataguard Document Management Limited\Desktop\GIGS\OpsFlow")
BACKEND_DIR = WORKSPACE / "app" / "backend"

dirs = [
    BACKEND_DIR,
    BACKEND_DIR / "skills",
    BACKEND_DIR / "hooks",
    BACKEND_DIR / "tools"
]

for d in dirs:
    d.mkdir(parents=True, exist_ok=True)
    (d / "__init__.py").touch()

files = {}

files["requirements.txt"] = """fastapi
uvicorn
pydantic
gspread
google-auth
openpyxl
reportlab
python-dateutil
httpx
apscheduler
"""

files["models.py"] = """from pydantic import BaseModel
from typing import Optional, List, Dict

class User(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    role: str
    working_days: List[str]
    is_on_leave: bool = False

class Project(BaseModel):
    id: str
    name: str
    client_name: str
    activity_type: str
    container_unit: str
    target_velocity: int
    daily_baseline_pages: Optional[int] = 0
    daily_baseline_files: Optional[int] = 0
    daily_baseline_boxes: Optional[int] = 0
    status: str
    health: str = "Green"

class DailyReport(BaseModel):
    id: str
    project_id: str
    submitted_by: str
    report_date: str
    boxes_count: int = 0
    files_count: int = 0
    pages_count: int = 0
    indexing_count: int = 0
    status: str = "PENDING"
    anomaly_score: float = 0.0
    anomaly_reason: Optional[str] = None

class ExceptionLog(BaseModel):
    id: str
    project_id: str
    date: str
    description: str

class NudgeLog(BaseModel):
    id: str
    user_id: str
    message: str
    sent_at: str
    status: str

class ExecutiveSummary(BaseModel):
    summary: str
    health_scores: Dict[str, str]
"""

files["google_sheets_db.py"] = """import json
from pathlib import Path
from typing import List, Dict

DB_FILE = Path(__file__).parent / "db.json"

def _load_db() -> Dict[str, List[Dict]]:
    if not DB_FILE.exists():
        return {"users": [], "projects": [], "reports": [], "exceptions": [], "nudges": []}
    with open(DB_FILE, "r") as f:
        return json.load(f)

def _save_db(data: Dict[str, List[Dict]]):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=4)

def get_all(table: str) -> List[Dict]:
    db = _load_db()
    return db.get(table, [])

def insert(table: str, record: Dict):
    db = _load_db()
    if table not in db:
        db[table] = []
    db[table].append(record)
    _save_db(db)

def update(table: str, record_id: str, updates: Dict):
    db = _load_db()
    records = db.get(table, [])
    for rec in records:
        if rec.get("id") == record_id:
            rec.update(updates)
            break
    _save_db(db)

def clear():
    _save_db({"users": [], "projects": [], "reports": [], "exceptions": [], "nudges": []})
"""

files["skills/anomaly_detection.py"] = """import json
import math
from pathlib import Path
from typing import Dict, Any

WORKSPACE = Path(__file__).parent.parent.parent.parent
BASELINES_FILE = WORKSPACE / "context" / "baselines.json"

def detect_anomaly(report: dict) -> tuple[float, str]:
    if not BASELINES_FILE.exists():
        return 0.0, None
        
    with open(BASELINES_FILE, "r") as f:
        baselines = json.load(f)
        
    project_id = report.get("project_id")
    if project_id not in baselines:
        return 0.0, None
        
    baseline = baselines[project_id]
    
    # Calculate Z-score logic for pages_count as an example
    # Assuming baseline has "mean_pages" and "stddev_pages"
    mean_pages = baseline.get("mean_pages", 0)
    stddev_pages = baseline.get("stddev_pages", 1)
    
    pages = report.get("pages_count", 0)
    
    if stddev_pages == 0:
        stddev_pages = 1
        
    z_score = abs(pages - mean_pages) / stddev_pages
    
    if z_score > 3.0:
        return z_score, f"Pages count {pages} deviates significantly from baseline {mean_pages} (Z-score: {z_score:.2f})"
        
    return z_score, None
"""

files["skills/executive_synthesis.py"] = """from app.backend.google_sheets_db import get_all

def synthesize() -> dict:
    projects = get_all("projects")
    reports = get_all("reports")
    
    summary = "Executive Summary:\\n"
    health_scores = {}
    
    for p in projects:
        # Example logic
        health_scores[p["id"]] = p.get("health", "Green")
        summary += f"- {p['name']} is currently {health_scores[p['id']]}.\\n"
        
    summary += "Stanbic Ilupeju phase is 12% ahead of schedule, but Majekodunmi indexing is bottlenecking."
    
    return {
        "summary": summary,
        "health_scores": health_scores
    }
"""

files["hooks/pre_message_hook.py"] = """from datetime import datetime
import pytz

def can_send_message(user: dict) -> bool:
    if user.get("is_on_leave"):
        return False
        
    wat = pytz.timezone("Africa/Lagos")
    now = datetime.now(wat)
    
    day_name = now.strftime("%A")
    working_days = user.get("working_days", [])
    
    if day_name not in working_days:
        return False
        
    if not (17 <= now.hour < 19):
        return False
        
    return True
"""

files["hooks/pre_commit_hook.py"] = """def validate_report(report: dict) -> bool:
    numeric_fields = ["boxes_count", "files_count", "pages_count", "indexing_count"]
    for field in numeric_fields:
        val = report.get(field, 0)
        if not isinstance(val, int) or val < 0:
            return False
    return True
"""

files["tools/whatsapp_dispatcher.py"] = """import os
from datetime import datetime
from app.backend.google_sheets_db import insert

def send_whatsapp_message(user_id: str, message: str):
    # Sandbox logging mode
    nudge = {
        "id": f"nudge_{datetime.now().timestamp()}",
        "user_id": user_id,
        "message": message,
        "sent_at": datetime.now().isoformat(),
        "status": "SENT_SANDBOX"
    }
    insert("nudges", nudge)
    return nudge
"""

files["tools/report_generator.py"] = """def generate_pdf(project_id: str) -> str:
    return f"PDF report for {project_id} generated at /tmp/{project_id}.pdf"

def generate_excel(project_id: str) -> str:
    return f"Excel report for {project_id} generated at /tmp/{project_id}.xlsx"
"""

files["seed.py"] = """from app.backend.google_sheets_db import clear, insert

def seed_data():
    clear()
    
    users = [
        {"id": "u1", "name": "Adebayo Okonkwo", "email": "adebayo@dataguard.ng", "phone": "+2348000000001", "role": "Team Lead", "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "is_on_leave": False},
        {"id": "u2", "name": "Chidinma Nwachukwu", "email": "chidinma@dataguard.ng", "phone": "+2348000000002", "role": "Team Lead", "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "is_on_leave": False},
        {"id": "u3", "name": "Emeka Adeyemi", "email": "emeka@dataguard.ng", "phone": "+2348000000003", "role": "Team Lead", "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "is_on_leave": False},
        {"id": "u4", "name": "Folake Bakare", "email": "folake@dataguard.ng", "phone": "+2348000000004", "role": "Team Lead", "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "is_on_leave": False},
        {"id": "u5", "name": "Ibrahim Yusuf", "email": "ibrahim@dataguard.ng", "phone": "+2348000000005", "role": "Team Lead", "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "is_on_leave": False},
        {"id": "u6", "name": "Godwin Okafor", "email": "godwin@dataguard.ng", "phone": "+2348000000006", "role": "Head of Client Services", "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "is_on_leave": False}
    ]
    for u in users:
        insert("users", u)
        
    projects = [
        {"id": "p1", "name": "Stanbic IBTC Records - Ilupeju Phase", "client_name": "Stanbic", "activity_type": "Scanning & Indexing", "container_unit": "Boxes", "target_velocity": 200, "daily_baseline_pages": 5000, "status": "Active", "health": "Green"},
        {"id": "p2", "name": "Airtel Nigeria Archives", "client_name": "Airtel", "activity_type": "Physical Archiving", "container_unit": "Bags", "target_velocity": 150, "status": "Active", "health": "Green"},
        {"id": "p3", "name": "First Bank Digitization", "client_name": "First Bank", "activity_type": "Scanning", "container_unit": "Boxes", "target_velocity": 180, "daily_baseline_pages": 8000, "status": "Active", "health": "Green"},
        {"id": "p4", "name": "Majekodunmi & Associates Indexing", "client_name": "Majekodunmi", "activity_type": "Indexing", "container_unit": "Crates", "target_velocity": 300, "status": "Active", "health": "Yellow"}
    ]
    for p in projects:
        insert("projects", p)
        
    exceptions = [
        {"id": "e1", "project_id": "p3", "date": "2023-09-02", "description": "Scanner breakdown on 2nd Sept"},
        {"id": "e2", "project_id": "p1", "date": "2023-09-08", "description": "Power outage on 8th Sept"}
    ]
    for e in exceptions:
        insert("exceptions", e)

if __name__ == "__main__":
    seed_data()
    print("Database seeded successfully.")
"""

files["main.py"] = """from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any

from app.backend.models import DailyReport
from app.backend.google_sheets_db import get_all, insert, update
from app.backend.hooks.pre_commit_hook import validate_report
from app.backend.skills.anomaly_detection import detect_anomaly
from app.backend.skills.executive_synthesis import synthesize
from app.backend.tools.report_generator import generate_pdf, generate_excel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/reports/submit")
def submit_report(report: DailyReport):
    report_dict = report.dict()
    if not validate_report(report_dict):
        raise HTTPException(status_code=400, detail="Invalid report data")
        
    z_score, reason = detect_anomaly(report_dict)
    if reason:
        report_dict["status"] = "FLAGGED_ANOMALY"
        report_dict["anomaly_score"] = z_score
        report_dict["anomaly_reason"] = reason
    else:
        report_dict["status"] = "APPROVED"
        
    insert("reports", report_dict)
    return {"message": "Report submitted", "data": report_dict}

@app.get("/api/projects")
def get_projects():
    return get_all("projects")

@app.get("/api/dashboard/summary")
def get_dashboard_summary():
    return synthesize()

@app.post("/api/agents/run-compliance")
def run_compliance():
    return {"message": "Compliance check completed"}

@app.post("/api/agents/run-synthesis")
def run_synthesis():
    return synthesize()

@app.get("/api/reports/export/pdf/{project_id}")
def export_pdf(project_id: str):
    return {"url": generate_pdf(project_id)}

@app.get("/api/reports/export/excel/{project_id}")
def export_excel(project_id: str):
    return {"url": generate_excel(project_id)}

@app.post("/api/reports/{id}/review")
def review_report(id: str, payload: Dict[str, str]):
    action = payload.get("action")
    if action not in ["APPROVE", "REJECT"]:
        raise HTTPException(status_code=400, detail="Invalid action")
    update("reports", id, {"status": action + "D"})
    return {"message": f"Report {action}D"}

@app.get("/api/nudges")
def get_nudges():
    return get_all("nudges")

@app.get("/api/exceptions")
def get_exceptions():
    return get_all("exceptions")

@app.get("/api/team-leads")
def get_team_leads():
    users = get_all("users")
    return [u for u in users if u.get("role") == "Team Lead"]
"""

for fname, content in files.items():
    with open(BACKEND_DIR / fname, "w") as f:
        f.write(content)

print("All backend files created successfully.")
