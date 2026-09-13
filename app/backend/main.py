"""
ArchiveOps Backend — FastAPI Application
Enterprise Records Management & Digitization Platform
DataGuard Document Management Limited
"""
import sys
import os
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
import uvicorn
import uuid


from app.backend.models import DailyReportSubmission, ReviewAction, LoginRequest, UserShiftUpdate
from app.backend.auth import create_token, verify_token, get_current_user, require_role
from app.backend.google_sheets_db import get_all, get_by_id, insert, update, query, count
from app.backend.hooks.pre_commit_hook import validate_report
from app.backend.hooks.pre_message_hook import can_send_message
from app.backend.skills.anomaly_detection import detect_anomaly, check_anomaly_preview
from app.backend.skills.executive_synthesis import synthesize
from app.backend.skills.predictive_analytics import generate_portfolio_predictive_summary, forecast_project_completion
from app.backend.tools.whatsapp_dispatcher import send_whatsapp_message
from app.backend.tools.report_generator import generate_pdf_report, generate_excel_report
from app.backend.scheduler import start_scheduler


WAT = timezone(timedelta(hours=1))

app = FastAPI(
    title="OpsFlow API",
    description="Enterprise Records Management & Digitization Platform — DataGuard Document Management Limited",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────
# Root & Health Check
# ──────────────────────────────────────

@app.get("/")
def root():
    return {
        "status": "online",
        "platform": "OpsFlow API — DataGuard Document Management Limited",
        "documentation": "/docs",
        "frontend_app": "http://localhost:3000",
        "health_check": "/api/health"
    }


@app.get("/api/health")
def health_check():

    return {
        "status": "ok",
        "platform": "ArchiveOps",
        "timestamp": datetime.now(WAT).isoformat(),
        "version": "1.0.0",
    }


# ──────────────────────────────────────
# Authentication & User Management
# ──────────────────────────────────────

@app.post("/api/auth/login")
def login(req: LoginRequest):
    """Authenticate user and issue JWT token."""
    user = get_by_id("users", req.user_id)
    if not user:
        # Fallback for demo users
        user = {"id": req.user_id, "name": f"User ({req.role})", "role": req.role}
    
    token = create_token(user_id=user["id"], name=user.get("name", ""), role=req.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user.get("name", ""),
            "role": req.role,
        }
    }


@app.get("/api/auth/me")
def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    """Get current authenticated user info."""
    return user


@app.post("/api/users/shift")
def update_user_shift(update_req: UserShiftUpdate):
    """Update team lead leave status and shift assignment."""
    user = get_by_id("users", update_req.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    updates = {
        "is_on_leave": update_req.is_on_leave,
        "leave_reason": update_req.leave_reason or "",
        "shift_type": update_req.shift_type,
    }
    update("users", update_req.user_id, updates)
    return {"message": "User shift updated successfully", "user_id": update_req.user_id, **updates}


@app.post("/api/auth/microsoft")
def microsoft_sso_login(payload: Dict[str, Any]):
    """Authenticate DataGuard staff member via Microsoft SSO."""
    email = payload.get("email", "")
    name = payload.get("name", "DataGuard User")
    
    if not email.endswith("@dataguardng.com") and email != "demo@dataguardng.com":
        # Allow demo authentication if domain not matching
        print(f"[MS SSO] Non-dataguard domain user: {email}. Allowing demo session.")
    
    role = "Team Lead" if "lead" in email.lower() else "Head of Client Services"
    user_id = f"u-{uuid.uuid4().hex[:6]}"
    token = create_token(user_id=user_id, name=name, role=role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user_id, "name": name, "email": email, "role": role}
    }


@app.post("/api/webhooks/appsheet")
def appsheet_webhook(payload: Dict[str, Any]):
    """Ingest live industrial barcode scanner payloads from AppSheet mobile handhelds."""
    project_id = payload.get("project_id", "p1")
    submitted_by = payload.get("submitted_by", "u1")
    boxes_count = int(payload.get("boxes_count", 0))
    files_count = int(payload.get("files_count", 0))
    pages_count = int(payload.get("pages_count", 0))
    
    today_str = datetime.now(WAT).strftime("%Y-%m-%d")
    report_record = {
        "id": f"appsheet-{uuid.uuid4().hex[:8]}",
        "project_id": project_id,
        "submitted_by": submitted_by,
        "submitted_by_name": "AppSheet Barcode Scanner",
        "report_date": today_str,
        "boxes_count": boxes_count,
        "files_count": files_count,
        "pages_count": pages_count,
        "indexing_count": int(payload.get("indexing_count", 0)),
        "status": "COMMITTED",
        "created_at": datetime.now(WAT).isoformat(),
        "source": "AppSheet Webhook"
    }
    insert("reports", report_record)
    return {"status": "SUCCESS", "message": "AppSheet barcode payload processed", "report_id": report_record["id"]}


# ──────────────────────────────────────
# Ad-hoc Roster & Webhooks
# ──────────────────────────────────────
from app.backend.adhoc_roster import (
    register_adhoc_worker, get_adhoc_workers, get_adhoc_worker_by_phone, update_adhoc_worker, deactivate_adhoc_worker
)
from app.backend.tools.whatsapp_dispatcher import send_onboarding_message, send_daily_form_reminder

@app.get("/api/adhoc-workers")
def list_adhoc_workers(project_id: Optional[str] = None):
    return get_adhoc_workers(project_id)

@app.post("/api/adhoc-workers")
def register_adhoc_worker_endpoint(payload: Dict[str, Any]):
    name = payload.get("name", "")
    phone = payload.get("phone", "")
    project_id = payload.get("project_id", "")
    supervisor_id = payload.get("supervisor_id", "")
    
    if not phone or not phone.startswith("+234"):
        raise HTTPException(status_code=400, detail="Phone must start with +234")
        
    return register_adhoc_worker(name, phone, project_id, supervisor_id)

@app.put("/api/adhoc-workers/{phone}")
def update_adhoc_worker_endpoint(phone: str, payload: Dict[str, Any]):
    updated = update_adhoc_worker(phone, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Worker not found")
    return updated

@app.delete("/api/adhoc-workers/{phone}")
def deactivate_adhoc_worker_endpoint(phone: str):
    updated = deactivate_adhoc_worker(phone)
    if not updated:
        raise HTTPException(status_code=404, detail="Worker not found")
    return updated

@app.post("/api/webhooks/adhoc-intake")
def adhoc_intake_webhook(payload: Dict[str, Any]):
    worker_phone = payload.get("worker_phone", "")
    project_id = payload.get("project_id", "")
    boxes_count = int(payload.get("boxes_count", 0))
    files_count = int(payload.get("files_count", 0))
    pages_count = int(payload.get("pages_count", 0))
    indexing_count = int(payload.get("indexing_count", 0))
    report_date = payload.get("report_date", datetime.now(WAT).strftime("%Y-%m-%d"))
    submitted_by_team_lead = payload.get("submitted_by_team_lead", False)
    
    worker = get_adhoc_worker_by_phone(worker_phone)
    if not worker:
        raise HTTPException(status_code=404, detail="Ad-hoc worker not found")
        
    report_dict = {
        "project_id": project_id,
        "boxes_count": boxes_count,
        "files_count": files_count,
        "pages_count": pages_count,
        "indexing_count": indexing_count,
        "report_date": report_date
    }
    
    z_score, reason = detect_anomaly(report_dict)
    status = "COMMITTED" if submitted_by_team_lead else "PENDING_TEAM_LEAD_REVIEW"
    if reason:
        status = "FLAGGED_ANOMALY"
        
    report_id = f"adhoc-rpt-{uuid.uuid4().hex[:8]}"
    report_record = {
        "id": report_id,
        "project_id": project_id,
        "submitted_by": worker["id"],
        "submitted_by_name": worker.get("name", "Unknown Worker"),
        "report_date": report_date,
        "boxes_count": boxes_count,
        "files_count": files_count,
        "pages_count": pages_count,
        "indexing_count": indexing_count,
        "status": status,
        "created_at": datetime.now(WAT).isoformat(),
        "source": "Team Lead On-Behalf" if submitted_by_team_lead else "Google Forms",
        "anomaly_score": z_score,
        "anomaly_reason": reason
    }
    insert("reports", report_record)
    return {"status": "SUCCESS", "report_id": report_id}

@app.post("/api/adhoc-workers/{phone}/onboard")
def onboard_adhoc_worker(phone: str):
    worker = get_adhoc_worker_by_phone(phone)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    project = get_by_id("projects", worker.get("project_id", ""))
    project_name = project.get("name", "") if project else "ArchiveOps Project"
    
    supervisor = get_by_id("users", worker.get("supervisor_id", ""))
    supervisor_name = supervisor.get("name", "") if supervisor else ""
    
    send_onboarding_message(phone, worker.get("name", ""), project_name, f"https://forms.dataguardng.com/adhoc/{project.get('id', '')}", supervisor_name)
    return {"status": "SUCCESS"}

@app.post("/api/adhoc-workers/{phone}/remind")
def remind_adhoc_worker(phone: str):
    worker = get_adhoc_worker_by_phone(phone)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    project = get_by_id("projects", worker.get("project_id", ""))
    project_name = project.get("name", "") if project else "ArchiveOps Project"
    
    send_daily_form_reminder(phone, worker.get("name", ""), project_name, f"https://forms.dataguardng.com/adhoc/{project.get('id', '')}")
    return {"status": "SUCCESS"}

@app.get("/api/adhoc-submissions")
def get_adhoc_submissions(project_id: Optional[str] = None, status: Optional[str] = None):
    reports = get_all("reports")
    adhoc = [r for r in reports if r.get("source") in ("Google Forms", "Team Lead On-Behalf")]
    if project_id:
        adhoc = [r for r in adhoc if r.get("project_id") == project_id]
    if status:
        adhoc = [r for r in adhoc if r.get("status") == status]
    return adhoc

@app.post("/api/adhoc-submissions/{report_id}/approve")
def approve_adhoc_submission(report_id: str):
    report = get_by_id("reports", report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    update("reports", report_id, {"status": "COMMITTED"})
    return {"status": "SUCCESS"}

@app.post("/api/adhoc-submissions/{report_id}/reject")
def reject_adhoc_submission(report_id: str, payload: Dict[str, Any]):
    report = get_by_id("reports", report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    update("reports", report_id, {"status": "REJECTED", "review_reason": payload.get("reason", "")})
    return {"status": "SUCCESS"}

# ──────────────────────────────────────
# Client Portal Token Endpoints
# ──────────────────────────────────────
@app.post("/api/client-portal/generate-token/{project_id}")
def generate_client_portal_token(project_id: str):
    token = uuid.uuid4().hex
    record = {
        "id": token,
        "project_id": project_id,
        "created_at": datetime.now(WAT).isoformat()
    }
    insert("portal_tokens", record)
    return {"token": token, "url": f"/client-portal/{token}"}

@app.get("/api/client-portal/{token}")
def get_client_portal_data(token: str):
    token_record = get_by_id("portal_tokens", token)
    if not token_record:
        raise HTTPException(status_code=404, detail="Token not found")
        
    project = get_by_id("projects", token_record["project_id"])
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    reports = query("reports", {"project_id": project["id"]})
    committed = [r for r in reports if r.get("status") in ("COMMITTED", "APPROVED")]
    
    total_boxes = sum(r.get("boxes_count", 0) for r in committed)
    total_pages = sum(r.get("pages_count", 0) for r in committed)
    
    return {
        "name": project.get("name"),
        "client": project.get("client_name"),
        "progress": {
            "boxes_processed": total_boxes,
            "pages_processed": total_pages
        },
        "reports_summary": len(committed),
        "projected_completion": "N/A"
    }


@app.get("/api/system/health-details")
def get_system_health_details():
    """System health diagnostic status for Executive Command Center."""
    twilio_active = bool(os.environ.get("TWILIO_ACCOUNT_SID") and os.environ.get("TWILIO_AUTH_TOKEN"))
    return {
        "status": "ONLINE",
        "database_engine": "Google Sheets API + SQLite Persistence",
        "database_connected": True,
        "whatsapp_gateway": "Twilio REST API (Live)" if twilio_active else "WhatsApp Sandbox Logger ($0 Cost)",
        "background_scheduler": "APScheduler Background Engine Active (17:00 WAT)",
        "uptime_version": "1.0.0-Enterprise",
        "timestamp": datetime.now(WAT).isoformat()
    }



@app.post("/api/reports/submit")
def submit_report(submission: DailyReportSubmission):
    """Submit a daily operations report. Runs pre-commit validation and anomaly detection."""
    report_dict = submission.dict()

    # Pre-commit hook: validate integers
    if not validate_report(report_dict):
        raise HTTPException(status_code=400, detail="Invalid report data: all numeric fields must be non-negative integers.")

    # Check for duplicate submission
    existing = query("reports", {"project_id": submission.project_id, "submitted_by": submission.submitted_by, "report_date": submission.report_date})
    if existing:
        raise HTTPException(status_code=409, detail="A report for this project and date has already been submitted.")

    # Get submitter name
    user = get_by_id("users", submission.submitted_by)
    submitter_name = user.get("name", "Unknown") if user else "Unknown"

    # Run anomaly detection
    z_score, reason = detect_anomaly(report_dict)
    
    report_id = f"rpt-{uuid.uuid4().hex[:8]}"
    now = datetime.now(WAT)

    report_record = {
        "id": report_id,
        **report_dict,
        "submitted_by_name": submitter_name,
        "status": "FLAGGED_ANOMALY" if reason else "COMMITTED",
        "anomaly_score": z_score,
        "anomaly_reason": reason,
        "created_at": now.isoformat(),
    }

    insert("reports", report_record)

    # If there's an exception note, log it
    if submission.exception_note:
        project = get_by_id("projects", submission.project_id)
        exception_record = {
            "id": f"exc-{uuid.uuid4().hex[:8]}",
            "project_id": submission.project_id,
            "project_name": project.get("name", "") if project else "",
            "reported_by": submission.submitted_by,
            "reported_by_name": submitter_name,
            "category": "General",
            "description": submission.exception_note,
            "reported_at": now.isoformat(),
        }
        insert("exceptions", exception_record)

    return {"message": "Report submitted successfully", "data": report_record}


@app.get("/api/reports")
def get_reports(project_id: Optional[str] = None, status: Optional[str] = None):
    """List all reports, optionally filtered by project or status."""
    reports = get_all("reports")
    if project_id:
        reports = [r for r in reports if r.get("project_id") == project_id]
    if status:
        reports = [r for r in reports if r.get("status") == status]
    # Sort by date desc
    reports.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return reports


@app.post("/api/reports/{report_id}/review")
def review_report(report_id: str, action: ReviewAction):
    """Approve or reject a flagged anomaly report."""
    report = get_by_id("reports", report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    new_status = "APPROVED" if action.action == "APPROVE" else "REJECTED"
    update("reports", report_id, {"status": new_status, "review_reason": action.reason or ""})
    return {"message": f"Report {new_status.lower()}", "report_id": report_id, "new_status": new_status}


@app.post("/api/reports/check-anomaly")
def check_anomaly(project_id: str, field: str, value: int):
    """Pre-submission anomaly check for frontend warning badge."""
    result = check_anomaly_preview(project_id, field, value)
    return result


# ──────────────────────────────────────
# Projects
# ──────────────────────────────────────

@app.get("/api/projects")
def get_projects():
    """List all active projects with health scores."""
    projects = get_all("projects")
    # Enrich with report counts
    reports = get_all("reports")
    for p in projects:
        pid = p.get("id")
        p_reports = [r for r in reports if r.get("project_id") == pid and r.get("status") in ("COMMITTED", "APPROVED")]
        p["total_boxes_processed"] = sum(r.get("boxes_count", 0) for r in p_reports)
        p["total_files_processed"] = sum(r.get("files_count", 0) for r in p_reports)
        p["total_pages_processed"] = sum(r.get("pages_count", 0) for r in p_reports)
        p["report_count"] = len(p_reports)
    return projects


@app.get("/api/projects/{project_id}")
def get_project(project_id: str):
    """Get a single project by ID."""
    project = get_by_id("projects", project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# ──────────────────────────────────────
# Dashboard
# ──────────────────────────────────────

@app.get("/api/dashboard/summary")
def get_dashboard_summary():
    """Executive synthesis dashboard summary with all metrics."""
    return synthesize()


@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    """Quick stats for the dashboard top bar."""
    reports = get_all("reports")
    projects = get_all("projects")
    committed = [r for r in reports if r.get("status") in ("COMMITTED", "APPROVED")]
    flagged = [r for r in reports if r.get("status") == "FLAGGED_ANOMALY"]
    
    return {
        "total_boxes": sum(r.get("boxes_count", 0) for r in committed),
        "total_files": sum(r.get("files_count", 0) for r in committed),
        "total_pages": sum(r.get("pages_count", 0) for r in committed),
        "total_reports": len(reports),
        "flagged_reports": len(flagged),
        "active_projects": len([p for p in projects if p.get("status") == "Active"]),
    }


# ──────────────────────────────────────
# Agents
# ──────────────────────────────────────

@app.post("/api/agents/run-compliance")
def run_compliance():
    """Run the Compliance & Nudge Agent to check for missing reports and send reminders."""
    now = datetime.now(WAT)
    today_str = now.strftime("%Y-%m-%d")
    today_name = now.strftime("%A")
    
    users = get_all("users")
    team_leads = [u for u in users if u.get("role") == "Team Lead"]
    reports = get_all("reports")
    
    today_submissions = {
        (r["submitted_by"], r["project_id"])
        for r in reports if r.get("report_date") == today_str
    }
    
    missing = []
    nudges_sent = 0
    
    for lead in team_leads:
        if lead.get("is_on_leave"):
            continue
        if today_name not in lead.get("working_days", []):
            continue
        
        for project_id in lead.get("assigned_projects", []):
            if (lead["id"], project_id) not in today_submissions:
                project = get_by_id("projects", project_id)
                project_name = project.get("name", project_id) if project else project_id
                
                entry = {
                    "user_id": lead["id"],
                    "user_name": lead["name"],
                    "phone": lead.get("phone", ""),
                    "project_id": project_id,
                    "project_name": project_name,
                    "status": "MISSING",
                }
                missing.append(entry)
                
                # Check pre-message hook before sending
                if can_send_message(lead):
                    message = (
                        f"🔔 Daily Report Reminder\n\n"
                        f"Hi {lead['name']},\n\n"
                        f"Your daily report for *{project_name}* has not been "
                        f"submitted yet. Please submit before end of day.\n\n"
                        f"— ArchiveOps Compliance Agent"
                    )
                    send_whatsapp_message(
                        user_id=lead["id"],
                        user_name=lead["name"],
                        phone=lead.get("phone", ""),
                        project_id=project_id,
                        project_name=project_name,
                        message=message,
                        nudge_type="17:00 WAT Reminder",
                    )
                    nudges_sent += 1
                    entry["nudge_sent"] = True
                else:
                    entry["nudge_sent"] = False
                    entry["nudge_reason"] = "Outside 17:00-19:00 WAT window or user off-duty"
    
    return {
        "checked_at": now.isoformat(),
        "total_expected": len(team_leads),
        "total_submitted": len(today_submissions),
        "total_missing": len(missing),
        "nudges_sent": nudges_sent,
        "details": missing,
    }


@app.post("/api/agents/run-synthesis")
def run_synthesis():
    """Trigger the Executive Synthesis Agent."""
    result = synthesize()
    insert("summaries", result)
    return result


# ──────────────────────────────────────
# Exports
# ──────────────────────────────────────

@app.get("/api/reports/export/pdf/{project_id}")
def export_pdf(project_id: str):
    """Generate and return a PDF report for a project."""
    project = get_by_id("projects", project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    reports = query("reports", {"project_id": project_id})
    filepath = generate_pdf_report(project, reports)
    return FileResponse(filepath, media_type="application/pdf", filename=f"ArchiveOps_{project['name']}_Report.pdf")


@app.get("/api/reports/export/excel/{project_id}")
def export_excel(project_id: str):
    """Generate and return an Excel report for a project."""
    project = get_by_id("projects", project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    reports = query("reports", {"project_id": project_id})
    filepath = generate_excel_report(project, reports)
    return FileResponse(filepath, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename=f"ArchiveOps_{project['name']}_Report.xlsx")


# ──────────────────────────────────────
# Nudges / WhatsApp Sandbox
# ──────────────────────────────────────

@app.get("/api/nudges")
def get_nudges():
    """List all WhatsApp sandbox messages."""
    nudges = get_all("nudges")
    nudges.sort(key=lambda n: n.get("sent_at", ""), reverse=True)
    return nudges


# ──────────────────────────────────────
# Exceptions
# ──────────────────────────────────────

@app.get("/api/exceptions")
def get_exceptions():
    """List all exception logs."""
    exceptions = get_all("exceptions")
    exceptions.sort(key=lambda e: e.get("reported_at", ""), reverse=True)
    return exceptions


# ──────────────────────────────────────
# Users / Team Leads
# ──────────────────────────────────────

@app.get("/api/users")
def get_users():
    """List all users."""
    return get_all("users")


@app.get("/api/team-leads")
def get_team_leads():
    """List team leads with their assignment and submission status."""
    users = get_all("users")
    reports = get_all("reports")
    today_str = datetime.now(WAT).strftime("%Y-%m-%d")
    
    leads = []
    for u in users:
        if u.get("role") != "Team Lead":
            continue
        
        # Check today's submissions
        today_submitted = [
            r for r in reports
            if r.get("submitted_by") == u["id"] and r.get("report_date") == today_str
        ]
        
        leads.append({
            **u,
            "submitted_today": len(today_submitted) > 0,
            "today_reports": today_submitted,
        })
    
    return leads


# ──────────────────────────────────────
# Startup: Seed data on first run
# ──────────────────────────────────────

@app.on_event("startup")
def startup_event():
    """Seed database and start background scheduler on application startup."""
    start_scheduler()
    from app.backend.google_sheets_db import _load_db, DB_FILE
    if not DB_FILE.exists():
        from app.backend.seed import seed_data
        seed_data()
        print("[OK] Database seeded with demo data.")
    else:
        db = _load_db()
        if not db.get("users"):
            from app.backend.seed import seed_data
            seed_data()
            print("[OK] Database seeded with demo data.")



# ──────────────────────────────────────
# Predictive Analytics & Intelligence
# ──────────────────────────────────────

@app.get("/api/analytics/predictive")
def get_predictive_analytics():
    """Portfolio-level velocity, SLA completion forecasting, and risk scoring."""
    projects = get_all("projects") or get_all("baselines")
    reports = get_all("reports")
    adhoc_workers = get_all("adhoc_workers")
    
    base_dict = {}
    if isinstance(projects, list):
        for p in projects:
            pid = p.get("id") or p.get("project_id")
            if pid:
                base_dict[pid] = {
                    "id": pid,
                    "name": p.get("name"),
                    "target_boxes": p.get("total_target") or 10000,
                    "target_files": p.get("total_files_target") or 50000,
                    "target_completion_date": p.get("target_date") or "2026-10-30"
                }
    elif isinstance(projects, dict):
        base_dict = projects

    return generate_portfolio_predictive_summary(base_dict, reports, adhoc_workers)


@app.get("/api/analytics/projects/{project_id}/forecast")
def get_project_forecast(project_id: str):
    """Project-level forecast and headcount recommendations."""
    projects = get_all("projects") or get_all("baselines")
    reports = get_all("reports")
    adhoc_workers = get_all("adhoc_workers")
    
    bdata = None
    if isinstance(projects, list):
        for p in projects:
            if (p.get("id") or p.get("project_id")) == project_id:
                bdata = {
                    "id": project_id,
                    "name": p.get("name"),
                    "target_boxes": p.get("total_target") or 10000,
                    "target_files": p.get("total_files_target") or 50000,
                    "target_completion_date": p.get("target_date") or "2026-10-30"
                }
                break
    elif isinstance(projects, dict):
        bdata = projects.get(project_id)

    if not bdata:
        bdata = {
            "id": project_id,
            "name": f"Project {project_id}",
            "target_boxes": 10000,
            "target_completion_date": "2026-10-30"
        }

    worker_count = len([w for w in adhoc_workers if w.get("project_id") == project_id and w.get("status") == "ACTIVE"])
    p_name = bdata.get("name", f"Project {project_id}")

    return forecast_project_completion(project_id, p_name, bdata, reports, worker_count)


# ──────────────────────────────────────
# Google Sheets Bidirectional Sync
# ──────────────────────────────────────

@app.post("/api/admin/sync-sheets")
def trigger_google_sheets_sync():
    """Triggers background bidirectional sync with Google Sheets."""
    try:
        from app.backend.sync_service import sync_local_db_to_google_sheets
        result = sync_local_db_to_google_sheets()
        return result
    except Exception as e:
        return {
            "status": "warning",
            "message": f"Sync fallback mode: {str(e)}",
            "synced_at": datetime.now(WAT).isoformat()
        }


if __name__ == "__main__":
    uvicorn.run("app.backend.main:app", host="0.0.0.0", port=8000, reload=True)

