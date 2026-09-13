"""
ArchiveOps - Predictive Analytics Engine (V3 Intelligence Layer)
DataGuard Document Management Limited

Calculates rolling daily throughput velocity, estimates completion dates,
scores SLA breach risk, and provides headcount optimization recommendations.
"""

from datetime import datetime, date, timedelta
from typing import Dict, List, Any, Optional

def calculate_rolling_velocity(reports: List[Dict[str, Any]], days: int = 7) -> Dict[str, float]:
    """
    Calculates average daily processing volume for the last N days.
    Returns dictionary with volume per activity type.
    """
    if not reports:
        return {"boxes": 0.0, "files": 0.0, "pages": 0.0, "records": 0.0}

    today = date.today()
    cutoff_date = today - timedelta(days=days)

    recent_reports = []
    for r in reports:
        report_date_str = r.get("report_date") or r.get("created_at", "")[:10]
        try:
            r_date = datetime.strptime(report_date_str, "%Y-%m-%d").date()
            if r_date >= cutoff_date:
                recent_reports.append(r)
        except (ValueError, TypeError):
            continue

    if not recent_reports:
        # Fallback to taking all reports if none in recent cutoff window
        recent_reports = reports

    # Calculate total processed in window
    total_boxes = sum(r.get("boxes_count", 0) for r in recent_reports)
    total_files = sum(r.get("files_count", 0) for r in recent_reports)
    total_pages = sum(r.get("pages_count", 0) for r in recent_reports)
    total_records = sum(r.get("records_count", 0) for r in recent_reports)

    # Unique active days in sample
    unique_days = len({r.get("report_date") for r in recent_reports if r.get("report_date")})
    effective_days = max(unique_days, 1)

    return {
        "boxes": round(total_boxes / effective_days, 1),
        "files": round(total_files / effective_days, 1),
        "pages": round(total_pages / effective_days, 1),
        "records": round(total_records / effective_days, 1),
        "sample_days": effective_days
    }


def forecast_project_completion(
    project_id: str,
    project_name: str,
    baseline: Dict[str, Any],
    reports: List[Dict[str, Any]],
    adhoc_headcount: int = 0
) -> Dict[str, Any]:
    """
    Computes velocity, forecasted completion date, SLA breach risk, and headcount advice.
    """
    target_boxes = baseline.get("target_boxes", 0)
    target_files = baseline.get("target_files", 0)
    target_date_str = baseline.get("target_completion_date", "2026-12-31")

    try:
        sla_target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        sla_target_date = date.today() + timedelta(days=30)

    # Calculate accumulated processed numbers
    total_boxes_done = sum(r.get("boxes_count", 0) for r in reports if r.get("project_id") == project_id)
    total_files_done = sum(r.get("files_count", 0) for r in reports if r.get("project_id") == project_id)

    boxes_remaining = max(0, target_boxes - total_boxes_done)
    files_remaining = max(0, target_files - total_files_done)

    # Calculate velocities
    project_reports = [r for r in reports if r.get("project_id") == project_id]
    v_7 = calculate_rolling_velocity(project_reports, days=7)
    v_14 = calculate_rolling_velocity(project_reports, days=14)

    # Primary throughput metric is boxes (or files if primary)
    daily_box_velocity = v_7["boxes"] if v_7["boxes"] > 0 else v_14["boxes"]
    daily_file_velocity = v_7["files"] if v_7["files"] > 0 else v_14["files"]

    today = date.today()

    if daily_box_velocity > 0:
        days_needed = int(boxes_remaining / daily_box_velocity)
    elif daily_file_velocity > 0:
        days_needed = int(files_remaining / daily_file_velocity)
    else:
        days_needed = 999  # Stalled / no progress data yet

    forecasted_completion_date = today + timedelta(days=days_needed)

    # Risk evaluation
    days_buffer = (sla_target_date - forecasted_completion_date).days

    if days_needed >= 999:
        risk_status = "STALLED"
        risk_label = "No Recent Progress Data"
    elif days_buffer >= 3:
        risk_status = "ON_TRACK"
        risk_label = f"On Track ({days_buffer} days ahead of SLA)"
    elif days_buffer >= 0:
        risk_status = "AT_RISK"
        risk_label = f"Tight Window ({days_buffer} days buffer)"
    else:
        risk_status = "CRITICAL_DELAY"
        risk_label = f"Projected {abs(days_buffer)} Days Behind SLA Target"

    # Headcount recommendation calculation
    # Assume 1 ad-hoc worker adds ~15 boxes or ~80 files per day
    recommended_headcount_delta = 0
    headcount_advice = "Current headcount is optimal."

    if risk_status in ("AT_RISK", "CRITICAL_DELAY", "STALLED"):
        days_left_in_sla = max((sla_target_date - today).days, 1)
        required_daily_boxes = boxes_remaining / days_left_in_sla
        shortfall_boxes = max(0, required_daily_boxes - daily_box_velocity)
        
        # 15 boxes/day per worker
        additional_workers_needed = max(1, int(shortfall_boxes / 15) + 1)
        recommended_headcount_delta = additional_workers_needed
        headcount_advice = f"Recommend adding +{additional_workers_needed} ad-hoc worker(s) to achieve SLA target by {sla_target_date.strftime('%d %b %Y')}."

    completion_percentage = 0.0
    if target_boxes > 0:
        completion_percentage = min(100.0, round((total_boxes_done / target_boxes) * 100, 1))
    elif target_files > 0:
        completion_percentage = min(100.0, round((total_files_done / target_files) * 100, 1))

    return {
        "project_id": project_id,
        "project_name": project_name,
        "completion_percentage": completion_percentage,
        "total_target_boxes": target_boxes,
        "total_processed_boxes": total_boxes_done,
        "boxes_remaining": boxes_remaining,
        "daily_box_velocity": daily_box_velocity,
        "daily_file_velocity": daily_file_velocity,
        "days_to_complete": days_needed if days_needed < 999 else None,
        "sla_target_date": target_date_str,
        "forecasted_completion_date": forecasted_completion_date.strftime("%Y-%m-%d"),
        "days_buffer": days_buffer if days_needed < 999 else None,
        "risk_status": risk_status,
        "risk_label": risk_label,
        "current_adhoc_headcount": adhoc_headcount,
        "recommended_headcount_delta": recommended_headcount_delta,
        "headcount_advice": headcount_advice,
        "last_updated": datetime.now().isoformat()
    }


def generate_portfolio_predictive_summary(
    baselines: Dict[str, Any],
    reports: List[Dict[str, Any]],
    adhoc_workers: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Generates a portfolio-level predictive analytics summary across all active projects.
    """
    forecasts = []
    total_active_projects = 0
    on_track_count = 0
    at_risk_count = 0
    critical_count = 0

    for pid, bdata in baselines.items():
        total_active_projects += 1
        p_name = bdata.get("name", f"Project {pid}")
        # Count assigned ad-hoc workers
        worker_count = len([w for w in adhoc_workers if w.get("project_id") == pid and w.get("status") == "ACTIVE"])
        
        forecast = forecast_project_completion(pid, p_name, bdata, reports, worker_count)
        forecasts.append(forecast)

        status = forecast["risk_status"]
        if status == "ON_TRACK":
            on_track_count += 1
        elif status == "AT_RISK":
            at_risk_count += 1
        elif status in ("CRITICAL_DELAY", "STALLED"):
            critical_count += 1

    health_score = round(((on_track_count * 100) + (at_risk_count * 50)) / max(total_active_projects, 1), 1)

    return {
        "portfolio_health_score": health_score,
        "total_active_projects": total_active_projects,
        "on_track_projects": on_track_count,
        "at_risk_projects": at_risk_count,
        "critical_delay_projects": critical_count,
        "project_forecasts": forecasts,
        "generated_at": datetime.now().isoformat()
    }
