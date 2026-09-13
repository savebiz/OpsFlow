"""
WhatsApp Dispatcher Tool (Sandbox Mode — Zero Cost)
Logs all messages to the local JSON database.
If TWILIO_ACCOUNT_SID env var is present, dispatches via Twilio REST API.
"""
import os
import uuid
from datetime import datetime, timezone, timedelta
from app.backend.google_sheets_db import insert

WAT = timezone(timedelta(hours=1))


def send_whatsapp_message(
    user_id: str,
    user_name: str,
    phone: str,
    project_id: str,
    project_name: str,
    message: str,
    nudge_type: str = "17:00 WAT Reminder",
) -> dict:
    """
    Send a WhatsApp message via Twilio REST API if configured,
    or log to sandbox DB if operating in demo/sandbox mode.
    """
    now = datetime.now(WAT)
    
    nudge_record = {
        "id": f"nudge-{uuid.uuid4().hex[:8]}",
        "target_user_id": user_id,
        "target_user_name": user_name,
        "target_phone": phone,
        "project_id": project_id,
        "project_name": project_name,
        "nudge_type": nudge_type,
        "channel": "WhatsApp",
        "status": "SENT_SANDBOX",
        "message_body": message,
        "sent_at": now.isoformat(),
    }

    account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
    from_number = os.environ.get("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")

    # If live Twilio credentials exist, dispatch HTTP request
    if account_sid and auth_token:
        try:
            import urllib.request
            import urllib.parse
            import base64

            url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
            to_phone = f"whatsapp:{phone}" if not phone.startswith("whatsapp:") else phone
            
            data = urllib.parse.urlencode({
                "From": from_number,
                "To": to_phone,
                "Body": message
            }).encode('utf-8')

            req = urllib.request.Request(url, data=data, method="POST")
            auth_str = f"{account_sid}:{auth_token}"
            auth_b64 = base64.b64encode(auth_str.encode('ascii')).decode('ascii')
            req.add_header("Authorization", f"Basic {auth_b64}")

            with urllib.request.urlopen(req) as response:
                if response.status in (200, 201):
                    nudge_record["status"] = "SENT_LIVE_TWILIO"
                    print(f"[OK] [WhatsApp Live API] Dispatched to {user_name} ({phone})")
                else:
                    nudge_record["status"] = "TWILIO_ERROR"
        except Exception as e:
            nudge_record["status"] = "TWILIO_DISPATCH_FAILED"
            nudge_record["error"] = str(e)
            print(f"[WARN] [WhatsApp Live Dispatch Failed] {e}. Logged to Sandbox.")
    else:
        print(f"[WhatsApp Sandbox] -> {user_name} ({phone}): {nudge_type}")

    insert("nudges", nudge_record)
    return nudge_record


def send_escalation(
    user_id: str,
    user_name: str,
    phone: str,
    project_id: str,
    project_name: str,
    hours_missing: int = 48,
) -> dict:
    """Send a 48-hour escalation to Head of Client Services."""
    message = (
        f"[ESCALATION] Missing Report ({hours_missing}h)\n\n"
        f"Team Lead *{user_name}* has not submitted a daily report "
        f"for *{project_name}* in the last {hours_missing} hours.\n\n"
        f"Immediate action required.\n\n"
        f"-- OpsFlow Compliance Agent"
    )
    return send_whatsapp_message(
        user_id=user_id,
        user_name=user_name,
        phone=phone,
        project_id=project_id,
        project_name=project_name,
        message=message,
        nudge_type="48h Escalation",
    )


def send_anomaly_alert(
    user_id: str,
    user_name: str,
    phone: str,
    project_id: str,
    project_name: str,
    anomaly_reason: str,
) -> dict:
    """Send an anomaly alert to the submitter and Head of Client Services."""
    message = (
        f"[ANOMALY ALERT] Anomaly Detected\n\n"
        f"A report submitted for *{project_name}* has been flagged:\n"
        f"{anomaly_reason}\n\n"
        f"The report is pending review by the Head of Client Services.\n\n"
        f"-- OpsFlow Intake Agent"
    )
    return send_whatsapp_message(
        user_id=user_id,
        user_name=user_name,
        phone=phone,
        project_id=project_id,
        project_name=project_name,
        message=message,
        nudge_type="Anomaly Alert",
    )


def send_onboarding_message(phone: str, worker_name: str, project_name: str, form_link: str, supervisor_name: str = '') -> dict:
    """Constructs bilingual welcome message (English + Pidgin)"""
    message = (
        f"Welcome to DataGuard OpsFlow!\n\n"
        f"Hello {worker_name}, you have been assigned to {project_name}. "
        f"Your supervisor is {supervisor_name}.\n\n"
        f"How far, make sure say you use this link submit your work every day:\n"
        f"{form_link}\n\n"
        f"Thank you!"
    )
    return send_whatsapp_message(
        user_id="adhoc",
        user_name=worker_name,
        phone=phone,
        project_id="",
        project_name=project_name,
        message=message,
        nudge_type="Onboarding"
    )

def send_daily_form_reminder(phone: str, worker_name: str, project_name: str, form_link: str) -> dict:
    """Sends daily reminder with form link"""
    message = (
        f"Hello {worker_name},\n\n"
        f"Reminder to submit your daily report for {project_name}:\n"
        f"{form_link}\n\n"
        f"Make sure you submit before end of day!"
    )
    return send_whatsapp_message(
        user_id="adhoc",
        user_name=worker_name,
        phone=phone,
        project_id="",
        project_name=project_name,
        message=message,
        nudge_type="Daily Form Reminder"
    )
