"""
Pre-Commit Hook
Validates all intake form submissions before committing to the database.
Ensures integer data types, non-negative values, and required fields.
"""
from typing import Tuple, Optional


def validate_report(report: dict) -> bool:
    """
    Validate a daily report submission.
    Returns True if valid, False if any validation fails.
    """
    numeric_fields = ["boxes_count", "files_count", "pages_count", "indexing_count", "qc_failed_pages", "re_scan_count"]
    
    for field in numeric_fields:
        val = report.get(field, 0)
        # Must be an integer (not float, not string)
        if not isinstance(val, int):
            return False
        # Must be non-negative
        if val < 0:
            return False

    # QC failed pages cannot exceed total pages scanned
    if report.get("qc_failed_pages", 0) > report.get("pages_count", 0) and report.get("pages_count", 0) > 0:
        return False

    # At least one numeric field must be > 0
    has_data = any(report.get(f, 0) > 0 for f in numeric_fields)
    if not has_data:
        return False

    # Required fields
    if not report.get("project_id"):
        return False
    if not report.get("submitted_by"):
        return False
    if not report.get("report_date"):
        return False

    return True


def validate_field(field_name: str, value) -> Tuple[bool, Optional[str]]:
    """
    Validate a single field value. Used for real-time frontend validation.
    Returns (is_valid, error_message).
    """
    numeric_fields = ["boxes_count", "files_count", "pages_count", "indexing_count"]
    
    if field_name in numeric_fields:
        if not isinstance(value, int):
            return False, f"{field_name} must be a whole number"
        if value < 0:
            return False, f"{field_name} cannot be negative"
        if value > 999999:
            return False, f"{field_name} value seems unreasonably large"
    
    if field_name == "report_date":
        if not value or not isinstance(value, str):
            return False, "Report date is required"
        # Basic date format check
        parts = value.split("-")
        if len(parts) != 3:
            return False, "Date must be in YYYY-MM-DD format"
    
    return True, None
