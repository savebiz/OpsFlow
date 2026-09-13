"""
ArchiveOps Background Scheduler Engine
Runs 17:00 WAT daily compliance checks and weekly executive synthesis.
Supports APScheduler or background thread fallback.
DataGuard Document Management Limited
"""
import sys
import os
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import time
import threading
from datetime import datetime, timezone, timedelta

WAT = timezone(timedelta(hours=1))
_scheduler_thread = None
_running = False


def _scheduler_loop():
    """Background loop that checks for 17:00 WAT daily reminders and weekly synthesis."""
    global _running
    last_compliance_date = None
    
    print("[Scheduler] ArchiveOps Background Scheduler Engine started.")
    
    while _running:
        try:
            now = datetime.now(WAT)
            today_str = now.strftime("%Y-%m-%d")
            
            # 17:00 WAT Daily Compliance Trigger
            if now.hour == 17 and last_compliance_date != today_str:
                from app.backend.main import run_compliance
                print(f"[Scheduler] Triggering 17:00 WAT daily compliance run for {today_str}...")
                run_compliance()
                last_compliance_date = today_str

            # Check every 60 seconds
            time.sleep(60)
        except Exception as e:
            print(f"[Scheduler] Error in scheduler loop: {e}")
            time.sleep(60)


def start_scheduler():
    """Start background scheduler."""
    global _scheduler_thread, _running
    if not _running:
        _running = True
        _scheduler_thread = threading.Thread(target=_scheduler_loop, daemon=True)
        _scheduler_thread.start()
        print("[Scheduler] Background scheduler thread launched.")


def stop_scheduler():
    """Stop background scheduler."""
    global _running
    _running = False
    print("[Scheduler] Background scheduler stopped.")
