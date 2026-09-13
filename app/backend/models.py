from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime


class User(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    role: str  # "Team Lead" or "Head of Client Services"
    working_days: List[str] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    is_on_leave: bool = False
    assigned_projects: List[str] = []


class Project(BaseModel):
    id: str
    name: str
    client_name: str
    activity_type: str  # "Scanning", "Indexing", "Scanning & Indexing", "Physical Archiving"
    container_unit: str  # "Boxes", "Bags", "Crates"
    target_velocity: int = 0
    daily_baseline_boxes: int = 0
    daily_baseline_files: int = 0
    daily_baseline_pages: int = 0
    daily_baseline_indexing: int = 0
    total_target: int = 0
    weekly_target: int = 0
    status: str = "Active"
    health: str = "Green"  # "Green", "Yellow", "Red"
    completion_percent: float = 0.0


class LoginRequest(BaseModel):
    user_id: str
    role: str = "Team Lead"  # "Team Lead", "Head of Client Services", "Client Viewer"


class UserShiftUpdate(BaseModel):
    user_id: str
    is_on_leave: bool = False
    leave_reason: Optional[str] = None
    shift_type: str = "Morning"  # "Morning", "Evening", "Full-Day"


class DailyReportSubmission(BaseModel):
    """Input model for report submission from Team Lead."""
    project_id: str
    submitted_by: str
    report_date: str
    boxes_count: int = 0
    files_count: int = 0
    pages_count: int = 0
    indexing_count: int = 0
    qc_failed_pages: int = 0
    re_scan_count: int = 0
    shift_type: str = "Morning"
    exception_note: Optional[str] = None


class DailyReport(BaseModel):
    """Full report record stored in database."""
    id: str
    project_id: str
    submitted_by: str
    submitted_by_name: str = ""
    report_date: str
    boxes_count: int = 0
    files_count: int = 0
    pages_count: int = 0
    indexing_count: int = 0
    qc_failed_pages: int = 0
    re_scan_count: int = 0
    shift_type: str = "Morning"
    status: str = "COMMITTED"  # "COMMITTED", "FLAGGED_ANOMALY", "APPROVED", "REJECTED"
    anomaly_score: float = 0.0
    anomaly_reason: Optional[str] = None
    created_at: str = ""



class ExceptionLog(BaseModel):
    id: str
    project_id: str
    project_name: str = ""
    reported_by: str = ""
    reported_by_name: str = ""
    category: str = "General"  # "Hardware Failure", "Power Outage", "Client Data Delay", "Staffing"
    description: str = ""
    reported_at: str = ""


class NudgeLog(BaseModel):
    id: str
    target_user_id: str
    target_user_name: str = ""
    target_phone: str = ""
    project_id: str = ""
    project_name: str = ""
    nudge_type: str = "17:00 WAT Reminder"  # "17:00 WAT Reminder", "48h Escalation", "Anomaly Alert"
    channel: str = "WhatsApp"
    status: str = "SENT_SANDBOX"
    message_body: str = ""
    sent_at: str = ""


class ExecutiveSummary(BaseModel):
    id: str = ""
    period: str = ""
    summary_text: str = ""
    total_boxes: int = 0
    total_files: int = 0
    total_pages: int = 0
    overall_health: str = "Green"
    key_bottlenecks: List[str] = []
    projects: List[Dict] = []
    generated_at: str = ""


class ReviewAction(BaseModel):
    action: str  # "APPROVE" or "REJECT"
    reason: Optional[str] = None


class ComplianceResult(BaseModel):
    checked_at: str = ""
    total_expected: int = 0
    total_submitted: int = 0
    total_missing: int = 0
    nudges_sent: int = 0
    details: List[Dict] = []
