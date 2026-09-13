# ArchiveOps Launch Runbook

This document serves as the step-by-step launch checklist for the ArchiveOps enterprise platform.

## Pre-Launch (1 week before)
1. **Set up Microsoft Entra ID:** Register the application for `@dataguardng.com` SSO integration.
2. **Configure Twilio WhatsApp:** Set up the WhatsApp sandbox (or live API configured with `sabo.victor1@gmail.com`).
3. **Create Google Forms:** Generate forms for each active project based on the `docs/adhoc_forms_template.md` specification.
4. **Set up Google Sheets:** Configure the response destinations for each project's Google Form.
5. **Deploy Apps Script Webhooks:** Attach the `app/backend/adhoc_forms_webhook.gs` script to the sheets, configure the URLs, and test submissions.
6. **Create Ad-hoc Worker Roster:** Input initial ad-hoc workers into the ArchiveOps database via the admin panel.

## Launch Day
1. **Deploy Backend:** Push the FastAPI backend to a chosen free-tier cloud service (e.g., Render, Railway, or Heroku).
2. **Deploy Frontend:** Publish the Next.js 14 frontend to Vercel or Netlify.
3. **Configure DNS and CORS:** Point the appropriate domains (e.g., `archiveops.dataguardng.com`) and ensure CORS settings in the backend allow the frontend domain.
4. **Onboard Ad-hoc Workers:** Send the WhatsApp onboarding messages containing the Google Form links to all ad-hoc workers.
5. **Onboard Core Staff:** Send an introductory email to core staff with login instructions for Microsoft SSO.
6. **Monitor System Health:** Keep a close watch on the system health dashboard for any anomalies or failures.

## Post-Launch (first week)
1. **Daily Monitoring:** Check submission rates to ensure workers are consistently submitting daily reports.
2. **Review Initial Submissions:** Have Team Leads review and approve the first batch of ad-hoc worker submissions.
3. **Collect User Feedback:** Gather usability feedback from both core staff and ad-hoc workers.
4. **Adjust Thresholds:** Refine the anomaly detection thresholds if false positives are occurring.
