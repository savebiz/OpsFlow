import json
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta

DB_FILE = Path(__file__).parent / "db.json"
WAT = timezone(timedelta(hours=1))


def _load_db() -> Dict[str, List[Dict]]:
    """Load database from local JSON file."""
    if not DB_FILE.exists():
        return {"users": [], "projects": [], "reports": [], "exceptions": [], "nudges": [], "summaries": []}
    with open(DB_FILE, "r") as f:
        return json.load(f)


def _save_db(data: Dict[str, List[Dict]]):
    """Save database to local JSON file."""
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=2, default=str)


def get_all(table: str) -> List[Dict]:
    """Get all records from a table."""
    db = _load_db()
    return db.get(table, [])


def get_by_id(table: str, record_id: str) -> Optional[Dict]:
    """Get a single record by ID."""
    db = _load_db()
    for rec in db.get(table, []):
        if rec.get("id") == record_id:
            return rec
    return None


def query(table: str, filters: Dict[str, Any]) -> List[Dict]:
    """Query records by filter criteria."""
    db = _load_db()
    results = []
    for rec in db.get(table, []):
        match = all(rec.get(k) == v for k, v in filters.items())
        if match:
            results.append(rec)
    return results


def insert(table: str, record: Dict):
    """Insert a new record into a table."""
    db = _load_db()
    if table not in db:
        db[table] = []
    db[table].append(record)
    _save_db(db)
    return record


def update(table: str, record_id: str, updates: Dict):
    """Update an existing record by ID."""
    db = _load_db()
    records = db.get(table, [])
    for rec in records:
        if rec.get("id") == record_id:
            rec.update(updates)
            _save_db(db)
            return rec
    return None


def delete(table: str, record_id: str) -> bool:
    """Delete a record by ID."""
    db = _load_db()
    records = db.get(table, [])
    db[table] = [r for r in records if r.get("id") != record_id]
    _save_db(db)
    return len(db[table]) < len(records)


def count(table: str, filters: Optional[Dict] = None) -> int:
    """Count records, optionally filtered."""
    if filters:
        return len(query(table, filters))
    return len(get_all(table))


def clear():
    """Clear all tables."""
    _save_db({"users": [], "projects": [], "reports": [], "exceptions": [], "nudges": [], "summaries": []})
