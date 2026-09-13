"""
ArchiveOps Seed Data
Populates the database with rich demo data including:
- 6 users (5 team leads + 1 Head of Client Services)
- 4 active projects (Stanbic, Airtel, First Bank, Majekodunmi)
- 14 days of historical daily reports with realistic variance
- Exception logs
- Sample nudges
"""
import sys
import os
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import random
import uuid
from datetime import datetime, timedelta, timezone
from app.backend.google_sheets_db import clear, insert


WAT = timezone(timedelta(hours=1))


def seed_data():
    """Seed the database with comprehensive demo data."""
    clear()

    # ── Users ──────────────────────────────────────
    users = [
        {
            "id": "u1", "name": "Adebayo Okonkwo",
            "email": "adebayo@dataguard.ng", "phone": "+2348012345001",
            "role": "Team Lead",
            "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            "is_on_leave": False,
            "assigned_projects": ["p1"],
        },
        {
            "id": "u2", "name": "Chidinma Nwachukwu",
            "email": "chidinma@dataguard.ng", "phone": "+2348012345002",
            "role": "Team Lead",
            "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            "is_on_leave": False,
            "assigned_projects": ["p1", "p3"],
        },
        {
            "id": "u3", "name": "Emeka Adeyemi",
            "email": "emeka@dataguard.ng", "phone": "+2348012345003",
            "role": "Team Lead",
            "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            "is_on_leave": False,
            "assigned_projects": ["p2"],
        },
        {
            "id": "u4", "name": "Folake Bakare",
            "email": "folake@dataguard.ng", "phone": "+2348012345004",
            "role": "Team Lead",
            "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            "is_on_leave": False,
            "assigned_projects": ["p4"],
        },
        {
            "id": "u5", "name": "Ibrahim Yusuf",
            "email": "ibrahim@dataguard.ng", "phone": "+2348012345005",
            "role": "Team Lead",
            "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            "is_on_leave": False,
            "assigned_projects": ["p4"],
        },
        {
            "id": "u6", "name": "Godwin Okafor",
            "email": "godwin@dataguard.ng", "phone": "+2348012345006",
            "role": "Head of Client Services",
            "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            "is_on_leave": False,
            "assigned_projects": [],
        },
    ]
    for u in users:
        insert("users", u)

    # ── Projects ──────────────────────────────────────
    projects = [
        {
            "id": "p1",
            "name": "Stanbic IBTC Records - Ilupeju Phase",
            "client_name": "Stanbic IBTC",
            "activity_type": "Scanning & Indexing",
            "container_unit": "Boxes",
            "target_velocity": 200,
            "daily_baseline_boxes": 200,
            "daily_baseline_files": 1500,
            "daily_baseline_pages": 5000,
            "daily_baseline_indexing": 4500,
            "total_target": 12000,
            "weekly_target": 1000,
            "status": "Active",
            "health": "Green",
            "completion_percent": 45.0,
        },
        {
            "id": "p2",
            "name": "Airtel Nigeria Archives",
            "client_name": "Airtel Nigeria",
            "activity_type": "Physical Archiving",
            "container_unit": "Bags",
            "target_velocity": 150,
            "daily_baseline_boxes": 150,
            "daily_baseline_files": 800,
            "daily_baseline_pages": 0,
            "daily_baseline_indexing": 0,
            "total_target": 9000,
            "weekly_target": 900,
            "status": "Active",
            "health": "Green",
            "completion_percent": 38.0,
        },
        {
            "id": "p3",
            "name": "First Bank Digitization",
            "client_name": "First Bank of Nigeria",
            "activity_type": "Scanning",
            "container_unit": "Boxes",
            "target_velocity": 180,
            "daily_baseline_boxes": 180,
            "daily_baseline_files": 1200,
            "daily_baseline_pages": 8000,
            "daily_baseline_indexing": 0,
            "total_target": 10800,
            "weekly_target": 900,
            "status": "Active",
            "health": "Yellow",
            "completion_percent": 30.0,
        },
        {
            "id": "p4",
            "name": "Majekodunmi & Associates Indexing",
            "client_name": "Majekodunmi & Associates",
            "activity_type": "Indexing",
            "container_unit": "Crates",
            "target_velocity": 300,
            "daily_baseline_boxes": 300,
            "daily_baseline_files": 2000,
            "daily_baseline_pages": 0,
            "daily_baseline_indexing": 6000,
            "total_target": 15000,
            "weekly_target": 1500,
            "status": "Active",
            "health": "Yellow",
            "completion_percent": 25.0,
        },
    ]
    for p in projects:
        insert("projects", p)

    # ── Historical Daily Reports (14 days) ──────────────────────────────────────
    random.seed(42)  # Reproducible data
    now = datetime.now(WAT)
    
    # Project configs for realistic data generation
    report_configs = {
        "p1": {"lead": "u1", "lead_name": "Adebayo Okonkwo", "boxes": 200, "files": 1500, "pages": 5000, "indexing": 4500},
        "p2": {"lead": "u3", "lead_name": "Emeka Adeyemi", "boxes": 150, "files": 800, "pages": 0, "indexing": 0},
        "p3": {"lead": "u2", "lead_name": "Chidinma Nwachukwu", "boxes": 180, "files": 1200, "pages": 8000, "indexing": 0},
        "p4": {"lead": "u4", "lead_name": "Folake Bakare", "boxes": 300, "files": 2000, "pages": 0, "indexing": 6000},
    }
    
    for day_offset in range(14, 0, -1):
        report_date = (now - timedelta(days=day_offset)).strftime("%Y-%m-%d")
        day_name = (now - timedelta(days=day_offset)).strftime("%A")
        
        # Skip weekends
        if day_name in ("Saturday", "Sunday"):
            continue
        
        for pid, config in report_configs.items():
            # Add realistic variance (±15%)
            variance = random.uniform(0.85, 1.15)
            
            # Simulate lower output on some days (e.g., scanner issues)
            if day_offset == 10 and pid == "p3":
                variance = 0.3  # Scanner breakdown day
            if day_offset == 6 and pid == "p1":
                variance = 0.5  # Power outage day
            
            boxes = max(0, int(config["boxes"] * variance))
            files = max(0, int(config["files"] * variance))
            pages = max(0, int(config["pages"] * variance)) if config["pages"] > 0 else 0
            indexing = max(0, int(config["indexing"] * variance)) if config["indexing"] > 0 else 0
            
            report = {
                "id": f"rpt-{uuid.uuid4().hex[:8]}",
                "project_id": pid,
                "submitted_by": config["lead"],
                "submitted_by_name": config["lead_name"],
                "report_date": report_date,
                "boxes_count": boxes,
                "files_count": files,
                "pages_count": pages,
                "indexing_count": indexing,
                "status": "COMMITTED",
                "anomaly_score": 0.0,
                "anomaly_reason": None,
                "created_at": f"{report_date}T17:30:00+01:00",
            }
            insert("reports", report)

    # Add one anomaly-flagged report for demo
    anomaly_report = {
        "id": f"rpt-{uuid.uuid4().hex[:8]}",
        "project_id": "p1",
        "submitted_by": "u1",
        "submitted_by_name": "Adebayo Okonkwo",
        "report_date": (now - timedelta(days=1)).strftime("%Y-%m-%d"),
        "boxes_count": 650,
        "files_count": 4800,
        "pages_count": 50000,  # 10x the baseline — anomaly!
        "indexing_count": 4200,
        "status": "FLAGGED_ANOMALY",
        "anomaly_score": 10.0,
        "anomaly_reason": "Anomaly detected: Pages: 50,000 reported vs 5,000 baseline (10.0x — exceeds 3.0x threshold)",
        "created_at": f"{(now - timedelta(days=1)).strftime('%Y-%m-%d')}T16:45:00+01:00",
    }
    insert("reports", anomaly_report)

    # ── Exception Logs ──────────────────────────────────────
    exceptions = [
        {
            "id": "exc-001",
            "project_id": "p3",
            "project_name": "First Bank Digitization",
            "reported_by": "u2",
            "reported_by_name": "Chidinma Nwachukwu",
            "category": "Hardware Failure",
            "description": "Scanner breakdown on 2nd Sept — Fujitsu fi-7160 paper feed mechanism jammed. Technician called, ETA 24hrs.",
            "reported_at": (now - timedelta(days=10)).strftime("%Y-%m-%dT09:15:00+01:00"),
        },
        {
            "id": "exc-002",
            "project_id": "p1",
            "project_name": "Stanbic IBTC Records - Ilupeju Phase",
            "reported_by": "u1",
            "reported_by_name": "Adebayo Okonkwo",
            "category": "Power Outage",
            "description": "Power outage on 8th Sept — PHCN outage from 10:00-15:00. Generator fuel exhausted at 13:00. Lost 5 hours of scanning.",
            "reported_at": (now - timedelta(days=6)).strftime("%Y-%m-%dT15:30:00+01:00"),
        },
        {
            "id": "exc-003",
            "project_id": "p4",
            "project_name": "Majekodunmi & Associates Indexing",
            "reported_by": "u4",
            "reported_by_name": "Folake Bakare",
            "category": "Client Data Delay",
            "description": "Awaiting additional 500 crates from client warehouse. Expected delivery pushed to next week.",
            "reported_at": (now - timedelta(days=3)).strftime("%Y-%m-%dT11:00:00+01:00"),
        },
    ]
    for e in exceptions:
        insert("exceptions", e)

    # ── Sample Nudges ──────────────────────────────────────
    nudges = [
        {
            "id": "nudge-001",
            "target_user_id": "u5",
            "target_user_name": "Ibrahim Yusuf",
            "target_phone": "+2348012345005",
            "project_id": "p4",
            "project_name": "Majekodunmi & Associates Indexing",
            "nudge_type": "17:00 WAT Reminder",
            "channel": "WhatsApp",
            "status": "SENT_SANDBOX",
            "message_body": "🔔 Daily Report Reminder\n\nHi Ibrahim,\n\nYour daily report for *Majekodunmi & Associates Indexing* has not been submitted yet. Please submit before end of day.\n\n— ArchiveOps Compliance Agent",
            "sent_at": (now - timedelta(days=2)).strftime("%Y-%m-%dT17:05:00+01:00"),
        },
        {
            "id": "nudge-002",
            "target_user_id": "u3",
            "target_user_name": "Emeka Adeyemi",
            "target_phone": "+2348012345003",
            "project_id": "p2",
            "project_name": "Airtel Nigeria Archives",
            "nudge_type": "17:00 WAT Reminder",
            "channel": "WhatsApp",
            "status": "SENT_SANDBOX",
            "message_body": "🔔 Daily Report Reminder\n\nHi Emeka,\n\nYour daily report for *Airtel Nigeria Archives* has not been submitted yet. Please submit before end of day.\n\n— ArchiveOps Compliance Agent",
            "sent_at": (now - timedelta(days=5)).strftime("%Y-%m-%dT17:02:00+01:00"),
        },
    ]
    for n in nudges:
        insert("nudges", n)

    print("[OK] Seeded: 6 users, 4 projects, ~40 daily reports, 3 exceptions, 2 nudges")


if __name__ == "__main__":
    seed_data()
