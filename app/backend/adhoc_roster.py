import uuid
from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from app.backend.google_sheets_db import get_all, get_by_id, insert, update, query

WAT = timezone(timedelta(hours=1))

def register_adhoc_worker(name: str, phone: str, project_id: str, supervisor_id: str) -> dict:
    worker_id = f"adhoc-{uuid.uuid4().hex[:8]}"
    worker = {
        "id": worker_id,
        "name": name,
        "phone": phone,
        "project_id": project_id,
        "supervisor_id": supervisor_id,
        "status": "Active",
        "registered_at": datetime.now(WAT).isoformat()
    }
    insert("adhoc_workers", worker)
    return worker

def get_adhoc_workers(project_id: Optional[str] = None) -> list:
    workers = get_all("adhoc_workers")
    if project_id:
        return [w for w in workers if w.get("project_id") == project_id]
    return workers

def get_adhoc_worker_by_phone(phone: str) -> Optional[dict]:
    results = query("adhoc_workers", {"phone": phone})
    return results[0] if results else None

def update_adhoc_worker(phone: str, updates: dict) -> dict:
    worker = get_adhoc_worker_by_phone(phone)
    if not worker:
        return None
    worker_id = worker["id"]
    updated_worker = update("adhoc_workers", worker_id, updates)
    return updated_worker

def deactivate_adhoc_worker(phone: str) -> dict:
    return update_adhoc_worker(phone, {"status": "Inactive"})
