"""
Executive Synthesis Skill
Aggregates weekly/monthly throughput, calculates project velocity vs targets,
assigns health scores, and generates natural language summaries.
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from app.backend.google_sheets_db import get_all, query

WAT = timezone(timedelta(hours=1))


def _calculate_health(actual_weekly: int, target_weekly: int) -> str:
    """Calculate project health based on actual vs target velocity."""
    if target_weekly == 0:
        return "Green"
    ratio = actual_weekly / target_weekly
    if ratio >= 0.9:
        return "Green"
    elif ratio >= 0.7:
        return "Yellow"
    else:
        return "Red"


def _get_week_range() -> tuple:
    """Get this week's Monday and Friday dates."""
    now = datetime.now(WAT)
    monday = now - timedelta(days=now.weekday())
    friday = monday + timedelta(days=4)
    return monday.strftime("%Y-%m-%d"), friday.strftime("%Y-%m-%d")


def synthesize() -> dict:
    """
    Generate the executive synthesis summary.
    Aggregates throughput, calculates health, and builds NLP summary.
    """
    projects = get_all("projects")
    reports = get_all("reports")
    exceptions = get_all("exceptions")
    
    monday_str, friday_str = _get_week_range()
    
    # Filter this week's committed reports
    weekly_reports = [
        r for r in reports
        if r.get("status") in ("COMMITTED", "APPROVED")
    ]
    
    # Aggregate by project
    project_totals: Dict[str, Dict] = {}
    for report in weekly_reports:
        pid = report.get("project_id", "")
        if pid not in project_totals:
            project_totals[pid] = {"boxes": 0, "files": 0, "pages": 0, "indexing": 0, "days": set()}
        project_totals[pid]["boxes"] += report.get("boxes_count", 0)
        project_totals[pid]["files"] += report.get("files_count", 0)
        project_totals[pid]["pages"] += report.get("pages_count", 0)
        project_totals[pid]["indexing"] += report.get("indexing_count", 0)
        project_totals[pid]["days"].add(report.get("report_date", ""))
    
    # Build per-project summaries
    project_summaries = []
    overall_boxes = 0
    overall_files = 0
    overall_pages = 0
    bottlenecks = []
    ahead = []
    
    for p in projects:
        pid = p.get("id", "")
        totals = project_totals.get(pid, {"boxes": 0, "files": 0, "pages": 0, "indexing": 0, "days": set()})
        
        weekly_target = p.get("weekly_target", p.get("target_velocity", 0) * 5)
        total_target = p.get("total_target", weekly_target * 12)
        
        health = _calculate_health(totals["boxes"], weekly_target)
        velocity_pct = round((totals["boxes"] / weekly_target * 100), 1) if weekly_target else 0
        
        # Calculate overall completion
        all_project_reports = [r for r in reports if r.get("project_id") == pid and r.get("status") in ("COMMITTED", "APPROVED")]
        total_boxes_all_time = sum(r.get("boxes_count", 0) for r in all_project_reports)
        completion = round((total_boxes_all_time / total_target * 100), 1) if total_target else 0
        
        summary = {
            "project_id": pid,
            "project_name": p.get("name", ""),
            "client": p.get("client_name", ""),
            "activity_type": p.get("activity_type", ""),
            "container_unit": p.get("container_unit", "Boxes"),
            "weekly_boxes": totals["boxes"],
            "weekly_files": totals["files"],
            "weekly_pages": totals["pages"],
            "weekly_indexing": totals["indexing"],
            "weekly_target": weekly_target,
            "velocity_percent": velocity_pct,
            "health": health,
            "total_processed": total_boxes_all_time,
            "total_target": total_target,
            "completion_percent": min(completion, 100.0),
            "reporting_days": len(totals["days"]) if isinstance(totals["days"], set) else totals.get("days", 0),
        }
        project_summaries.append(summary)
        
        overall_boxes += totals["boxes"]
        overall_files += totals["files"]
        overall_pages += totals["pages"]
        
        if health == "Red":
            bottlenecks.append(p.get("name", pid))
        elif velocity_pct > 105:
            diff = velocity_pct - 100
            ahead.append(f"{p.get('name', pid)} ({diff:.0f}% ahead)")
    
    # Count flagged reports
    flagged_count = len([r for r in reports if r.get("status") == "FLAGGED_ANOMALY"])
    
    # Build natural language summary
    now = datetime.now(WAT)
    summary_parts = []
    summary_parts.append(
        f"Weekly throughput as of {now.strftime('%A, %B %d')}: "
        f"{overall_boxes:,} containers processed, {overall_files:,} files handled, "
        f"{overall_pages:,} pages scanned."
    )
    
    if ahead:
        summary_parts.append(f"Projects ahead of schedule: {', '.join(ahead)}.")
    
    if bottlenecks:
        summary_parts.append(f"Projects requiring attention: {', '.join(bottlenecks)} — currently below 70% target velocity.")
    
    # Include exception context
    if exceptions:
        recent_exceptions = exceptions[-3:]  # Last 3
        exc_summaries = [
            f"{e.get('category', 'Issue')} at {e.get('project_name', 'Unknown')}: {e.get('description', '')}"
            for e in recent_exceptions
        ]
        summary_parts.append(f"Recent exceptions: {'; '.join(exc_summaries)}.")
    
    if flagged_count > 0:
        summary_parts.append(f"{flagged_count} report(s) flagged for anomaly review.")
    
    overall_health = "Red" if bottlenecks else ("Green" if ahead else "Yellow")
    
    return {
        "id": f"synthesis-{now.strftime('%Y%m%d%H%M')}",
        "period": f"Week of {(now - timedelta(days=now.weekday())).strftime('%B %d, %Y')}",
        "summary_text": " ".join(summary_parts),
        "total_boxes": overall_boxes,
        "total_files": overall_files,
        "total_pages": overall_pages,
        "overall_health": overall_health,
        "key_bottlenecks": bottlenecks,
        "flagged_reports": flagged_count,
        "projects": project_summaries,
        "generated_at": now.isoformat(),
    }
