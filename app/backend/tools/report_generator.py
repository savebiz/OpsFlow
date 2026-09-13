"""
Report Generator Tool
Generates PDF reports using ReportLab and Excel reports using openpyxl.
Creates professional DataGuard-branded client handoff documents.
"""
import os
import tempfile
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Dict

WAT = timezone(timedelta(hours=1))
REPORTS_DIR = Path(__file__).parent.parent / "generated_reports"
REPORTS_DIR.mkdir(exist_ok=True)


def generate_pdf_report(project: dict, reports: List[Dict]) -> str:
    """Generate a professional PDF report for a project."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import inch, cm
        from reportlab.lib.colors import HexColor
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
    except ImportError:
        # Fallback: generate a text file if reportlab not installed
        return _generate_text_report(project, reports, "pdf")

    filepath = str(REPORTS_DIR / f"{project['id']}_report.pdf")
    doc = SimpleDocTemplate(filepath, pagesize=A4, topMargin=1*cm, bottomMargin=1*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CustomTitle", parent=styles["Heading1"],
        fontSize=20, textColor=HexColor("#1a1a2e"),
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        "CustomSubtitle", parent=styles["Heading2"],
        fontSize=14, textColor=HexColor("#4a4a6a"),
        spaceAfter=12,
    )
    body_style = ParagraphStyle(
        "CustomBody", parent=styles["Normal"],
        fontSize=10, textColor=HexColor("#333333"),
    )

    elements = []
    
    # Header
    elements.append(Paragraph("DATAGUARD DOCUMENT MANAGEMENT LIMITED", title_style))
    elements.append(Paragraph("ArchiveOps — Project Performance Report", subtitle_style))
    elements.append(Spacer(1, 12))
    
    # Project Info
    elements.append(Paragraph(f"<b>Project:</b> {project.get('name', 'N/A')}", body_style))
    elements.append(Paragraph(f"<b>Client:</b> {project.get('client_name', 'N/A')}", body_style))
    elements.append(Paragraph(f"<b>Activity:</b> {project.get('activity_type', 'N/A')}", body_style))
    elements.append(Paragraph(f"<b>Generated:</b> {datetime.now(WAT).strftime('%B %d, %Y at %H:%M WAT')}", body_style))
    elements.append(Spacer(1, 20))
    
    # Summary stats
    committed = [r for r in reports if r.get("status") in ("COMMITTED", "APPROVED")]
    total_boxes = sum(r.get("boxes_count", 0) for r in committed)
    total_files = sum(r.get("files_count", 0) for r in committed)
    total_pages = sum(r.get("pages_count", 0) for r in committed)
    
    elements.append(Paragraph("Summary", subtitle_style))
    summary_data = [
        ["Metric", "Value"],
        ["Total Reports", str(len(committed))],
        [f"Total {project.get('container_unit', 'Boxes')}", f"{total_boxes:,}"],
        ["Total Files", f"{total_files:,}"],
        ["Total Pages", f"{total_pages:,}"],
        ["Health Status", project.get("health", "Green")],
    ]
    
    summary_table = Table(summary_data, colWidths=[200, 200])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HexColor("#1a1a2e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 11),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
        ("BACKGROUND", (0, 1), (-1, -1), HexColor("#f5f5f5")),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#cccccc")),
        ("FONTSIZE", (0, 1), (-1, -1), 10),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 20))
    
    # Daily Reports Table
    elements.append(Paragraph("Daily Reports", subtitle_style))
    
    header = ["Date", "Submitted By", project.get("container_unit", "Boxes"), "Files", "Pages", "Status"]
    table_data = [header]
    
    for r in sorted(committed, key=lambda x: x.get("report_date", ""), reverse=True)[:30]:
        table_data.append([
            r.get("report_date", ""),
            r.get("submitted_by_name", r.get("submitted_by", "")),
            str(r.get("boxes_count", 0)),
            str(r.get("files_count", 0)),
            str(r.get("pages_count", 0)),
            r.get("status", ""),
        ])
    
    if len(table_data) > 1:
        report_table = Table(table_data, colWidths=[80, 120, 60, 60, 60, 80])
        report_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), HexColor("#10b981")),
            ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#dddddd")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), HexColor("#f9f9f9")]),
            ("ALIGN", (2, 0), (-1, -1), "CENTER"),
        ]))
        elements.append(report_table)
    
    doc.build(elements)
    return filepath


def generate_excel_report(project: dict, reports: List[Dict]) -> str:
    """Generate a formatted Excel report for a project."""
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    except ImportError:
        return _generate_text_report(project, reports, "xlsx")

    filepath = str(REPORTS_DIR / f"{project['id']}_report.xlsx")
    wb = Workbook()
    ws = wb.active
    ws.title = "Project Report"
    
    # Styles
    header_font = Font(bold=True, color="FFFFFF", size=12)
    header_fill = PatternFill(start_color="1A1A2E", end_color="1A1A2E", fill_type="solid")
    green_fill = PatternFill(start_color="10B981", end_color="10B981", fill_type="solid")
    alt_fill = PatternFill(start_color="F5F5F5", end_color="F5F5F5", fill_type="solid")
    thin_border = Border(
        left=Side(style="thin"), right=Side(style="thin"),
        top=Side(style="thin"), bottom=Side(style="thin"),
    )
    
    # Title
    ws.merge_cells("A1:G1")
    ws["A1"] = f"ArchiveOps Report — {project.get('name', 'Project')}"
    ws["A1"].font = Font(bold=True, size=16, color="1A1A2E")
    
    ws.merge_cells("A2:G2")
    ws["A2"] = f"Client: {project.get('client_name', '')} | Activity: {project.get('activity_type', '')} | Generated: {datetime.now(WAT).strftime('%B %d, %Y')}"
    ws["A2"].font = Font(size=10, color="666666")
    
    # Headers row
    headers = ["Date", "Submitted By", project.get("container_unit", "Boxes"), "Files", "Pages", "Indexing", "Status"]
    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=4, column=col, value=h)
        cell.font = header_font
        cell.fill = green_fill
        cell.alignment = Alignment(horizontal="center")
        cell.border = thin_border
    
    # Data rows
    committed = [r for r in reports if r.get("status") in ("COMMITTED", "APPROVED")]
    for row_idx, r in enumerate(sorted(committed, key=lambda x: x.get("report_date", ""), reverse=True), 5):
        data = [
            r.get("report_date", ""),
            r.get("submitted_by_name", r.get("submitted_by", "")),
            r.get("boxes_count", 0),
            r.get("files_count", 0),
            r.get("pages_count", 0),
            r.get("indexing_count", 0),
            r.get("status", ""),
        ]
        for col, val in enumerate(data, 1):
            cell = ws.cell(row=row_idx, column=col, value=val)
            cell.border = thin_border
            if row_idx % 2 == 0:
                cell.fill = alt_fill
            if col >= 3 and col <= 6:
                cell.alignment = Alignment(horizontal="center")
    
    # Auto-adjust column widths
    for col in range(1, 8):
        ws.column_dimensions[chr(64 + col)].width = 18
    
    # Summary sheet
    ws2 = wb.create_sheet("Summary")
    ws2["A1"] = "Summary Statistics"
    ws2["A1"].font = Font(bold=True, size=14)
    
    total_boxes = sum(r.get("boxes_count", 0) for r in committed)
    total_files = sum(r.get("files_count", 0) for r in committed)
    total_pages = sum(r.get("pages_count", 0) for r in committed)
    
    summary_items = [
        ("Total Reports", len(committed)),
        (f"Total {project.get('container_unit', 'Boxes')}", total_boxes),
        ("Total Files", total_files),
        ("Total Pages", total_pages),
        ("Health Status", project.get("health", "Green")),
    ]
    
    for idx, (label, value) in enumerate(summary_items, 3):
        ws2.cell(row=idx, column=1, value=label).font = Font(bold=True)
        ws2.cell(row=idx, column=2, value=value)
    
    wb.save(filepath)
    return filepath


def _generate_text_report(project: dict, reports: List[Dict], fmt: str) -> str:
    """Fallback text report if ReportLab/openpyxl not installed."""
    filepath = str(REPORTS_DIR / f"{project['id']}_report.txt")
    
    committed = [r for r in reports if r.get("status") in ("COMMITTED", "APPROVED")]
    total_boxes = sum(r.get("boxes_count", 0) for r in committed)
    
    with open(filepath, "w") as f:
        f.write(f"ArchiveOps Report — {project.get('name', 'Project')}\n")
        f.write(f"{'='*60}\n")
        f.write(f"Client: {project.get('client_name', '')}\n")
        f.write(f"Activity: {project.get('activity_type', '')}\n")
        f.write(f"Total {project.get('container_unit', 'Boxes')}: {total_boxes:,}\n")
        f.write(f"Reports: {len(committed)}\n")
        f.write(f"\nGenerated: {datetime.now(WAT).isoformat()}\n")
    
    return filepath
