# ROADMAP.md — ArchiveOps Project Priorities

## Current Sprint: MVP Launch

### Priority 1 — Core Platform (IN PROGRESS)
- [x] Repo Brain structure initialization
- [ ] FastAPI backend with all agents, skills, hooks, and tools
- [ ] Next.js 14 frontend with Team Lead Intake + Executive Dashboard
- [ ] Google Sheets API driver with local JSON demo mode
- [ ] WhatsApp Sandbox dispatcher (zero cost)

### Priority 2 — Data & Intelligence
- [ ] Anomaly detection skill with Z-score engine
- [ ] Executive synthesis skill with NLP summaries
- [ ] Pre-commit validation hooks
- [ ] Pre-message time-window hooks

### Priority 3 — Reporting & Export
- [ ] PDF report generator (ReportLab)
- [ ] Excel export generator (openpyxl)
- [ ] Google Drive API export integration

### Priority 4 — Polish & Launch
- [ ] Mobile responsiveness testing
- [ ] Desktop dashboard optimization
- [ ] End-to-end API integration testing
- [ ] Seed data population

---

## Future Roadmap

### V2 — Production Hardening
- Live Twilio WhatsApp API integration
- Google OAuth SSO authentication
- Google Sheets bidirectional sync
- AppSheet mobile companion app
- CRON job scheduler (APScheduler)

### V3 — Intelligence Layer
- Historical trend analysis
- Predictive completion date modeling
- Automated SLA breach alerts
- Client portal with read-only access
