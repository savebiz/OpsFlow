# REVIEW.md — ArchiveOps Code Review Standards

Before proposing any PR or code merge, ALL changes must pass this checklist:

## Code Quality
- [ ] All Python functions have type hints
- [ ] All TypeScript components use proper types (no `any`)
- [ ] No hardcoded credentials or API keys
- [ ] All API endpoints return consistent JSON response shapes
- [ ] Error handling covers edge cases (empty data, network failures)

## Data Integrity
- [ ] Pre-commit hook validates all numeric intake fields
- [ ] Anomaly detection runs before committing daily reports
- [ ] Exception logs are linked to specific projects
- [ ] Nudge logs record all dispatched messages

## UI/UX Standards
- [ ] Mobile viewport tested (375px, 390px, 414px widths)
- [ ] Desktop viewport tested (1280px, 1440px, 1920px widths)
- [ ] All interactive elements have hover/focus states
- [ ] Loading states shown during API calls
- [ ] Error states displayed with actionable messages
- [ ] Animations are smooth (60fps) and not jarring

## Security
- [ ] CORS restricted to allowed origins
- [ ] No sensitive data in client-side localStorage
- [ ] API inputs sanitized and validated
- [ ] WhatsApp dispatches blocked outside 17:00-19:00 WAT window

## Testing
- [ ] API endpoints return correct status codes
- [ ] Anomaly detection correctly flags 3x+ deviations
- [ ] Pre-message hook correctly blocks off-hours dispatches
- [ ] PDF and Excel exports generate valid files
