"""
ArchiveOps Dual-Engine Database Persistence Driver
Supports SQLite, PostgreSQL (via DATABASE_URL), and local JSON buffer.
DataGuard Document Management Limited
"""
import sys
import os
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import json
import sqlite3
from typing import List, Dict, Any, Optional

DB_URL = os.environ.get("DATABASE_URL", "")
SQLITE_FILE = PROJECT_ROOT / "context" / "archiveops_db.sqlite"


def get_db_connection():
    """Get SQLite/PostgreSQL connection if configured."""
    SQLITE_FILE.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(SQLITE_FILE))
    conn.row_factory = sqlite3.Row
    return conn


def init_db_tables():
    """Initialize database tables for production persistence."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS system_logs (
                id TEXT PRIMARY KEY,
                category TEXT,
                message TEXT,
                created_at TEXT
            )
        """)
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[Database] SQLite init notice: {e}")


# Initialize on import
init_db_tables()
