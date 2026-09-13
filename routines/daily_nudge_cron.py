"""
ArchiveOps Daily Nudge CRON Routine
Runs at 17:00 WAT (UTC+1) every weekday to check for missing daily reports
and dispatch WhatsApp reminders to non-compliant team leads.

Schedule: 0 17 * * 1-5 (17:00 WAT, Monday-Friday)
"""

import json
from datetime import datetime, timezone, timedelta
from pathlib import Path

WAT = timezone(timedelta(hours=1))

def get_todays_reports(db_path: str) -> list:
    """Load today's submitted reports from the local JSON database."""
    try:
        with open(db_path, 'r') as f:
            data = json.load(f)
        today = datetime.now(WAT).strftime('%Y-%m-%d')
        return [r for r in data.get('daily_reports', []) if r.get('report_date') == today]
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def get_active_assignments(db_path: str) -> list:
    """Get all active project-team lead assignments."""
    try:
        with open(db_path, 'r') as f:
            data = json.load(f)
        return [
            a for a in data.get('assignments', [])
            if a.get('status') == 'active'
        ]
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def get_team_lead(db_path: str, user_id: str) -> dict:
    """Get team lead details by ID."""
    try:
        with open(db_path, 'r') as f:
            data = json.load(f)
        for user in data.get('users', []):
            if user['id'] == user_id:
                return user
    except (FileNotFoundError, json.JSONDecodeError):
        pass
    return {}

def check_compliance(db_path: str) -> list:
    """
    Check which team leads have NOT submitted reports for today.
    Returns list of {user, project, reason} for non-compliant leads.
    """
    now = datetime.now(WAT)
    today_name = now.strftime('%A')
    
    reports = get_todays_reports(db_path)
    assignments = get_active_assignments(db_path)
    
    submitted_keys = {
        (r['submitted_by'], r['project_id']) for r in reports
    }
    
    non_compliant = []
    
    for assignment in assignments:
        user_id = assignment['user_id']
        project_id = assignment['project_id']
        
        if (user_id, project_id) in submitted_keys:
            continue
        
        user = get_team_lead(db_path, user_id)
        if not user:
            continue
        
        # Skip if on leave
        if user.get('is_on_leave', False):
            continue
        
        # Skip if today is not a working day
        working_days = user.get('working_days', [])
        if today_name not in working_days:
            continue
        
        non_compliant.append({
            'user_id': user_id,
            'user_name': user.get('name', 'Unknown'),
            'phone': user.get('phone', ''),
            'project_id': project_id,
            'project_name': assignment.get('project_name', 'Unknown Project'),
            'reason': f"No daily report submitted by {now.strftime('%H:%M')} WAT"
        })
    
    return non_compliant

def dispatch_nudges(non_compliant: list, sandbox_log_path: str) -> int:
    """
    Dispatch WhatsApp nudges for non-compliant team leads.
    In sandbox mode, logs to local JSON file.
    Returns count of nudges sent.
    """
    if not non_compliant:
        return 0
    
    nudges = []
    for entry in non_compliant:
        message = (
            f"🔔 Daily Report Reminder\n\n"
            f"Hi {entry['user_name']},\n\n"
            f"Your daily report for *{entry['project_name']}* has not been "
            f"submitted yet. Please submit your report as soon as possible.\n\n"
            f"— ArchiveOps Compliance Agent"
        )
        
        nudge = {
            'id': f"nudge-{datetime.now(WAT).strftime('%Y%m%d%H%M%S')}-{entry['user_id']}",
            'target_user_id': entry['user_id'],
            'target_user_name': entry['user_name'],
            'target_phone': entry['phone'],
            'project_id': entry['project_id'],
            'nudge_type': '17:00 WAT Reminder',
            'channel': 'WhatsApp',
            'status': 'sent_to_sandbox',
            'message_body': message,
            'sent_at': datetime.now(WAT).isoformat()
        }
        nudges.append(nudge)
    
    # Append to sandbox log
    try:
        with open(sandbox_log_path, 'r') as f:
            existing = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        existing = []
    
    existing.extend(nudges)
    
    with open(sandbox_log_path, 'w') as f:
        json.dump(existing, f, indent=2)
    
    return len(nudges)

if __name__ == '__main__':
    import sys
    
    base_path = Path(__file__).parent.parent
    db_path = str(base_path / 'app' / 'backend' / 'data' / 'database.json')
    sandbox_path = str(base_path / 'app' / 'backend' / 'data' / 'whatsapp_sandbox.json')
    
    print(f"[{datetime.now(WAT).strftime('%Y-%m-%d %H:%M:%S')} WAT] Running daily compliance check...")
    
    non_compliant = check_compliance(db_path)
    
    if non_compliant:
        print(f"Found {len(non_compliant)} non-compliant team lead(s):")
        for entry in non_compliant:
            print(f"  - {entry['user_name']} → {entry['project_name']}")
        
        count = dispatch_nudges(non_compliant, sandbox_path)
        print(f"Dispatched {count} WhatsApp nudge(s) to sandbox.")
    else:
        print("All team leads have submitted their reports. No nudges needed.")
