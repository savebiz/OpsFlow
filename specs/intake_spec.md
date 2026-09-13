# Intake Form Specification

## Overview
The Team Lead Intake Form is the primary data entry point for daily operations reporting. It must be mobile-first, minimal-friction, and intelligent.

## Dynamic Field Rules

### Container Unit Label
- Display "Boxes" when project.container_unit === "Boxes"
- Display "Bags" when project.container_unit === "Bags"  
- Display "Crates" when project.container_unit === "Crates"

### Conditional Fields
| Field | Visible When |
|-------|-------------|
| Total Pages | activity_type includes "Scanning" |
| Indexing Count | activity_type includes "Indexing" |
| Files Count | Always visible |
| Container Count | Always visible |

### Activity Type → Visible Fields Matrix
| Activity Type | Containers | Files | Pages | Indexing |
|--------------|-----------|-------|-------|---------|
| Scanning | ✓ | ✓ | ✓ | ✗ |
| Indexing | ✓ | ✓ | ✗ | ✓ |
| Scanning & Indexing | ✓ | ✓ | ✓ | ✓ |
| Physical Archiving | ✓ | ✓ | ✗ | ✗ |

## Validation Rules (pre_commit_hook)
1. All numeric values must be non-negative integers
2. At least one numeric field must be > 0
3. Report date cannot be in the future
4. One report per project per team lead per day

## Anomaly Detection (anomaly_detection skill)
- Threshold: 3x historical daily average triggers FLAGGED_ANOMALY
- Below 10% of average also triggers (possible under-reporting)
- Flagged reports require Head of Client Services approval
- Anomaly warning shown to team lead BEFORE submission

## Exception Reporting
Optional free-text field for:
- Equipment failures ("Scanner breakdown")
- Infrastructure issues ("Power outage")  
- Client-side delays ("Awaiting additional boxes from client")
- Staffing ("Team member absent - sick leave")
