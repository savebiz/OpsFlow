"""
ArchiveOps - End-to-End Automated Integration Test Suite
DataGuard Document Management Limited

Executes comprehensive endpoint and feature verification across all 18+ API routes.
"""

import unittest
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi.testclient import TestClient
from app.backend.main import app

class TestOpsFlowE2E(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_root_health_check(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "online")
        self.assertIn("OpsFlow", data.get("platform", ""))

    def test_02_projects_list(self):
        response = self.client.get("/api/projects")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(isinstance(data, list))
        self.assertGreaterEqual(len(data), 1)

    def test_03_reports_list(self):
        response = self.client.get("/api/reports")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(isinstance(data, list))

    def test_04_intake_report_submission_and_validation(self):
        payload = {
            "project_id": "p1",
            "boxes_count": 50,
            "files_count": 300,
            "pages_count": 1500,
            "indexing_count": 1400,
            "report_date": "2026-12-15",
            "submitted_by": "u1",
            "shift_type": "Morning"
        }
        response = self.client.post("/api/reports/submit", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("data", data)

    def test_05_predictive_analytics(self):
        response = self.client.get("/api/analytics/predictive")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("portfolio_health_score", data)
        self.assertIn("project_forecasts", data)

    def test_06_project_forecast_detail(self):
        response = self.client.get("/api/analytics/projects/p1/forecast")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("forecasted_completion_date", data)
        self.assertIn("risk_status", data)

    def test_07_adhoc_worker_crud(self):
        # Register worker
        phone = "+2348009990011"
        payload = {
            "name": "E2E Test Worker",
            "phone": phone,
            "project_id": "p1",
            "supervisor_id": "u1"
        }
        res_reg = self.client.post("/api/adhoc-workers", json=payload)
        self.assertIn(res_reg.status_code, (200, 400))  # 200 or 400 if already exists

        # List workers
        res_list = self.client.get("/api/adhoc-workers")
        self.assertEqual(res_list.status_code, 200)

        # Onboard worker
        res_onboard = self.client.post(f"/api/adhoc-workers/{phone}/onboard")
        self.assertEqual(res_onboard.status_code, 200)

    def test_08_adhoc_intake_webhook(self):
        payload = {
            "worker_phone": "+2348009990011",
            "project_id": "p1",
            "boxes_count": 25,
            "files_count": 150,
            "pages_count": 500,
            "records_count": 450,
            "report_date": "2026-09-13",
            "submitted_by_team_lead": True
        }
        response = self.client.post("/api/webhooks/adhoc-intake", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("report_id", data)

    def test_09_google_sheets_sync_trigger(self):
        response = self.client.post("/api/admin/sync-sheets")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)

    def test_10_client_portal_token_generation(self):
        response = self.client.post("/api/client-portal/generate-token/p1")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("token", data)
        self.assertIn("url", data)


if __name__ == "__main__":
    unittest.main()
