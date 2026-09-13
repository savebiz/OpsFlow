"""
Pre-Message Hook
Verifies conditions before dispatching any WhatsApp message:
1. Current time must be between 17:00-19:00 WAT (UTC+1)
2. Target user must not be on leave
3. Today must be in the user's working_days schedule
"""
from datetime import datetime, timezone, timedelta

WAT = timezone(timedelta(hours=1))


def can_send_message(user: dict) -> bool:
    """
    Check if a WhatsApp message can be sent to this user right now.
    Returns True only if all conditions are met.
    """
    # Check leave status
    if user.get("is_on_leave", False):
        return False

    now = datetime.now(WAT)

    # Check working day
    day_name = now.strftime("%A")
    working_days = user.get("working_days", [])
    if day_name not in working_days:
        return False

    # Check time window: 17:00-19:00 WAT
    if not (17 <= now.hour < 19):
        return False

    return True


def get_send_status(user: dict) -> dict:
    """
    Get detailed send status for display in the UI.
    Returns reason if message cannot be sent.
    """
    now = datetime.now(WAT)
    day_name = now.strftime("%A")
    
    if user.get("is_on_leave", False):
        return {
            "can_send": False,
            "reason": f"{user.get('name', 'User')} is currently on leave",
            "current_time": now.strftime("%H:%M WAT"),
        }

    if day_name not in user.get("working_days", []):
        return {
            "can_send": False,
            "reason": f"{day_name} is not a working day for {user.get('name', 'User')}",
            "current_time": now.strftime("%H:%M WAT"),
        }

    if not (17 <= now.hour < 19):
        return {
            "can_send": False,
            "reason": f"Current time ({now.strftime('%H:%M')} WAT) is outside the 17:00-19:00 WAT dispatch window",
            "current_time": now.strftime("%H:%M WAT"),
        }

    return {
        "can_send": True,
        "reason": "All conditions met",
        "current_time": now.strftime("%H:%M WAT"),
    }
