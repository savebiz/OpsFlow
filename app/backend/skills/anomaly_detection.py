"""
Anomaly Detection Skill
Cross-references incoming daily report metrics against historical baselines
from context/baselines.json. Flags reports with values >3x or <0.1x the
daily baseline as anomalous.
"""
import json
from pathlib import Path
from typing import Tuple, Optional

WORKSPACE = Path(__file__).resolve().parent.parent.parent.parent
BASELINES_FILE = WORKSPACE / "context" / "baselines.json"


def _load_baselines() -> dict:
    """Load project baselines from context."""
    if not BASELINES_FILE.exists():
        return {}
    try:
        with open(BASELINES_FILE, "r") as f:
            data = json.load(f)
        return data.get("projects", {})
    except (json.JSONDecodeError, KeyError):
        return {}


def _find_baseline_for_project(project_id: str, baselines: dict) -> Optional[dict]:
    """Match a project ID to its baseline config."""
    # Direct key match
    if project_id in baselines:
        return baselines[project_id]
    # Try matching by project database ID to baseline key
    id_map = {
        "p1": "stanbic-ibtc-ilupeju",
        "p2": "airtel-nigeria-archives",
        "p3": "first-bank-digitization",
        "p4": "majekodunmi-indexing",
    }
    mapped_key = id_map.get(project_id)
    if mapped_key and mapped_key in baselines:
        return baselines[mapped_key]
    return None


def detect_anomaly(report: dict) -> Tuple[float, Optional[str]]:
    """
    Detect anomalies in a daily report by comparing against baselines.
    
    Returns:
        Tuple of (anomaly_score, anomaly_reason)
        anomaly_reason is None if no anomaly detected.
    """
    baselines = _load_baselines()
    project_id = report.get("project_id", "")
    baseline = _find_baseline_for_project(project_id, baselines)
    
    if not baseline:
        return 0.0, None

    daily_baseline = baseline.get("daily_baseline", {})
    thresholds = baseline.get("anomaly_thresholds", {"max_multiplier": 3.0, "min_multiplier": 0.1})
    max_mult = thresholds.get("max_multiplier", 3.0)
    min_mult = thresholds.get("min_multiplier", 0.1)

    anomalies = []
    max_score = 0.0

    # Check each metric against its baseline
    checks = [
        ("boxes_count", "boxes", baseline.get("container_unit", "Boxes")),
        ("files_count", "files", "Files"),
        ("pages_count", "pages", "Pages"),
        ("indexing_count", "indexing", "Indexing records"),
    ]

    for report_field, baseline_field, label in checks:
        reported_value = report.get(report_field, 0)
        baseline_value = daily_baseline.get(baseline_field, 0)
        
        if baseline_value == 0:
            # No baseline for this metric, skip
            if reported_value > 0 and baseline_field in ("pages", "indexing"):
                # Unexpected non-zero value for a metric that should be 0
                pass
            continue
        
        ratio = reported_value / baseline_value
        deviation = abs(ratio - 1.0)
        
        if ratio > max_mult:
            score = ratio
            anomalies.append(
                f"{label}: {reported_value:,} reported vs {baseline_value:,} baseline "
                f"({ratio:.1f}x — exceeds {max_mult}x threshold)"
            )
            max_score = max(max_score, score)
        elif ratio < min_mult and reported_value > 0:
            score = 1.0 / ratio if ratio > 0 else 10.0
            anomalies.append(
                f"{label}: {reported_value:,} reported vs {baseline_value:,} baseline "
                f"(only {ratio:.1%} of expected — possible under-reporting)"
            )
            max_score = max(max_score, score)

    if anomalies:
        reason = "Anomaly detected: " + "; ".join(anomalies)
        return round(max_score, 2), reason

    return 0.0, None


def check_anomaly_preview(project_id: str, field: str, value: int) -> dict:
    """
    Quick anomaly preview for frontend pre-submission warning.
    Returns { is_anomalous, ratio, baseline_value, message }
    """
    baselines = _load_baselines()
    baseline = _find_baseline_for_project(project_id, baselines)
    
    if not baseline:
        return {"is_anomalous": False, "ratio": 0, "baseline_value": 0, "message": ""}
    
    field_map = {
        "boxes_count": "boxes",
        "files_count": "files",
        "pages_count": "pages",
        "indexing_count": "indexing",
    }
    
    baseline_field = field_map.get(field, field)
    baseline_value = baseline.get("daily_baseline", {}).get(baseline_field, 0)
    
    if baseline_value == 0:
        return {"is_anomalous": False, "ratio": 0, "baseline_value": 0, "message": ""}
    
    ratio = value / baseline_value
    thresholds = baseline.get("anomaly_thresholds", {"max_multiplier": 3.0})
    is_anomalous = ratio > thresholds.get("max_multiplier", 3.0) or (ratio < 0.1 and value > 0)
    
    message = ""
    if is_anomalous:
        if ratio > thresholds.get("max_multiplier", 3.0):
            message = f"⚠️ This value is {ratio:.1f}x the daily average of {baseline_value:,}. This will be flagged for review."
        else:
            message = f"⚠️ This value is only {ratio:.1%} of the daily average of {baseline_value:,}. This may indicate under-reporting."
    
    return {
        "is_anomalous": is_anomalous,
        "ratio": round(ratio, 2),
        "baseline_value": baseline_value,
        "message": message,
    }
