"""
ArchiveOps Weekly Executive Synthesis CRON Routine
Runs every Friday at 16:00 WAT (UTC+1) to aggregate weekly throughput,
calculate project health scores, and generate natural language summaries.

Schedule: 0 16 * * 5 (16:00 WAT, every Friday)
"""

import json
from datetime import datetime, timezone, timedelta
from pathlib import Path

WAT = timezone(timedelta(hours=1))

def get_weekly_reports(db_path: str) -> list:
    """Load this week's daily reports (Monday to Friday)."""
    try:
        with open(db_path, 'r') as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []
    
    now = datetime.now(WAT)
    monday = now - timedelta(days=now.weekday())
    monday_str = monday.strftime('%Y-%m-%d')
    friday_str = now.strftime('%Y-%m-%d')
    
    return [
        r for r in data.get('daily_reports', [])
        if monday_str <= r.get('report_date', '') <= friday_str
           and r.get('status') != 'FLAGGED_ANOMALY'
    ]

def get_baselines(baselines_path: str) -> dict:
    """Load project baselines."""
    try:
        with open(baselines_path, 'r') as f:
            return json.load(f).get('projects', {})
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def get_exceptions(db_path: str) -> list:
    """Load this week's exception logs."""
    try:
        with open(db_path, 'r') as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []
    
    now = datetime.now(WAT)
    monday = now - timedelta(days=now.weekday())
    monday_str = monday.strftime('%Y-%m-%d')
    
    return [
        e for e in data.get('exception_logs', [])
        if e.get('reported_at', '')[:10] >= monday_str
    ]

def calculate_health(actual_weekly: int, target_weekly: int) -> str:
    """Calculate project health based on velocity vs target."""
    if target_weekly == 0:
        return 'Green'
    ratio = actual_weekly / target_weekly
    if ratio >= 0.9:
        return 'Green'
    elif ratio >= 0.7:
        return 'Yellow'
    else:
        return 'Red'

def generate_synthesis(db_path: str, baselines_path: str) -> dict:
    """Generate the weekly executive synthesis summary."""
    reports = get_weekly_reports(db_path)
    baselines = get_baselines(baselines_path)
    exceptions = get_exceptions(db_path)
    
    # Aggregate by project
    project_totals = {}
    for report in reports:
        pid = report.get('project_id', '')
        if pid not in project_totals:
            project_totals[pid] = {
                'boxes': 0, 'files': 0, 'pages': 0, 'indexing': 0, 'days': 0
            }
        project_totals[pid]['boxes'] += report.get('boxes_count', 0)
        project_totals[pid]['files'] += report.get('files_count', 0)
        project_totals[pid]['pages'] += report.get('pages_count', 0)
        project_totals[pid]['indexing'] += report.get('indexing_count', 0)
        project_totals[pid]['days'] += 1
    
    # Build project summaries
    project_summaries = []
    overall_boxes = 0
    overall_files = 0
    overall_pages = 0
    bottlenecks = []
    ahead_of_schedule = []
    
    for pid, baseline in baselines.items():
        totals = project_totals.get(pid, {'boxes': 0, 'files': 0, 'pages': 0, 'indexing': 0, 'days': 0})
        target_weekly = baseline.get('target_velocity', {}).get('weekly_target_boxes', 0)
        health = calculate_health(totals['boxes'], target_weekly)
        
        velocity_pct = round((totals['boxes'] / target_weekly * 100), 1) if target_weekly else 0
        
        project_summaries.append({
            'project_id': pid,
            'project_name': baseline.get('name', pid),
            'client': baseline.get('client', ''),
            'weekly_boxes': totals['boxes'],
            'weekly_files': totals['files'],
            'weekly_pages': totals['pages'],
            'target_boxes': target_weekly,
            'velocity_percent': velocity_pct,
            'health': health,
            'reporting_days': totals['days']
        })
        
        overall_boxes += totals['boxes']
        overall_files += totals['files']
        overall_pages += totals['pages']
        
        if health == 'Red':
            bottlenecks.append(baseline.get('name', pid))
        elif velocity_pct > 100:
            ahead_of_schedule.append(f"{baseline.get('name', pid)} ({velocity_pct - 100:.0f}% ahead)")
    
    # Build natural language summary
    summary_parts = []
    summary_parts.append(f"Weekly throughput: {overall_boxes:,} containers, {overall_files:,} files, {overall_pages:,} pages processed.")
    
    if ahead_of_schedule:
        summary_parts.append(f"Ahead of schedule: {', '.join(ahead_of_schedule)}.")
    
    if bottlenecks:
        summary_parts.append(f"Bottlenecks requiring attention: {', '.join(bottlenecks)}.")
    
    if exceptions:
        exception_summary = "; ".join([
            f"{e.get('category', 'Issue')}: {e.get('description', '')}" 
            for e in exceptions[:3]
        ])
        summary_parts.append(f"Notable exceptions this week: {exception_summary}.")
    
    return {
        'period': f"Week of {(datetime.now(WAT) - timedelta(days=datetime.now(WAT).weekday())).strftime('%B %d, %Y')}",
        'summary_text': ' '.join(summary_parts),
        'total_boxes': overall_boxes,
        'total_files': overall_files,
        'total_pages': overall_pages,
        'overall_health': 'Red' if bottlenecks else ('Yellow' if not ahead_of_schedule else 'Green'),
        'key_bottlenecks': bottlenecks,
        'projects': project_summaries,
        'generated_at': datetime.now(WAT).isoformat()
    }

if __name__ == '__main__':
    base_path = Path(__file__).parent.parent
    db_path = str(base_path / 'app' / 'backend' / 'data' / 'database.json')
    baselines_path = str(base_path / 'context' / 'baselines.json')
    
    print(f"[{datetime.now(WAT).strftime('%Y-%m-%d %H:%M:%S')} WAT] Running weekly executive synthesis...")
    
    result = generate_synthesis(db_path, baselines_path)
    
    print(f"\n{'='*60}")
    print(f"EXECUTIVE SYNTHESIS — {result['period']}")
    print(f"{'='*60}")
    print(f"\n{result['summary_text']}")
    print(f"\nOverall Health: {result['overall_health']}")
    print(f"Total Containers: {result['total_boxes']:,}")
    print(f"Total Files: {result['total_files']:,}")
    print(f"Total Pages: {result['total_pages']:,}")
    
    if result['key_bottlenecks']:
        print(f"\n⚠ Bottlenecks: {', '.join(result['key_bottlenecks'])}")
    
    print(f"\nGenerated at: {result['generated_at']}")
