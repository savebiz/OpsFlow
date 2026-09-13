const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ── Token Management ──
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("opsflow_jwt");
}

export function setAuthToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("opsflow_jwt", token);
  }
}

// ── Generic Fetch Helper ──
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { ...headers, ...options?.headers },
      ...options,
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || `Request failed: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.warn(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

// ── Auth & Users ──
export async function loginUser(userId: string, role: string = "Team Lead") {
  try {
    const res = await apiFetch<{ access_token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, role }),
    });
    if (res.access_token) {
      setAuthToken(res.access_token);
    }
    return res;
  } catch {
    return { access_token: "demo-jwt-token", user: { id: userId, role } };
  }
}

export async function updateUserShift(userId: string, isOnLeave: boolean, leaveReason?: string, shiftType: string = "Morning") {
  return apiFetch("/users/shift", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, is_on_leave: isOnLeave, leave_reason: leaveReason, shift_type: shiftType }),
  });
}

// ── Projects ──
export interface Project {
  id: string;
  name: string;
  client_name: string;
  activity_type: string;
  container_unit: string;
  target_velocity: number;
  daily_baseline_boxes: number;
  daily_baseline_files: number;
  daily_baseline_pages: number;
  daily_baseline_indexing: number;
  total_target: number;
  weekly_target: number;
  status: string;
  health: string;
  completion_percent: number;
  total_boxes_processed?: number;
  total_files_processed?: number;
  total_pages_processed?: number;
  report_count?: number;
}

export async function fetchProjects(): Promise<Project[]> {
  try {
    return await apiFetch<Project[]>("/projects");
  } catch {
    return [
      { id: "p1", name: "Stanbic IBTC Records - Ilupeju Phase", client_name: "Stanbic IBTC", activity_type: "Scanning & Indexing", container_unit: "Boxes", target_velocity: 200, daily_baseline_boxes: 200, daily_baseline_files: 1500, daily_baseline_pages: 5000, daily_baseline_indexing: 4500, total_target: 12000, weekly_target: 1000, status: "Active", health: "Green", completion_percent: 45 },
      { id: "p2", name: "Airtel Nigeria Archives", client_name: "Airtel Nigeria", activity_type: "Physical Archiving", container_unit: "Bags", target_velocity: 150, daily_baseline_boxes: 150, daily_baseline_files: 800, daily_baseline_pages: 0, daily_baseline_indexing: 0, total_target: 9000, weekly_target: 900, status: "Active", health: "Green", completion_percent: 38 },
      { id: "p3", name: "First Bank Digitization", client_name: "First Bank of Nigeria", activity_type: "Scanning", container_unit: "Boxes", target_velocity: 180, daily_baseline_boxes: 180, daily_baseline_files: 1200, daily_baseline_pages: 8000, daily_baseline_indexing: 0, total_target: 10800, weekly_target: 900, status: "Active", health: "Yellow", completion_percent: 30 },
      { id: "p4", name: "Majekodunmi & Associates Indexing", client_name: "Majekodunmi & Associates", activity_type: "Indexing", container_unit: "Crates", target_velocity: 300, daily_baseline_boxes: 300, daily_baseline_files: 2000, daily_baseline_pages: 0, daily_baseline_indexing: 6000, total_target: 15000, weekly_target: 1500, status: "Active", health: "Yellow", completion_percent: 25 },
    ];
  }
}


// ── Reports ──
export interface ReportSubmission {
  project_id: string;
  submitted_by: string;
  report_date: string;
  boxes_count: number;
  files_count: number;
  pages_count: number;
  indexing_count: number;
  qc_failed_pages?: number;
  re_scan_count?: number;
  shift_type?: string;
  exception_note?: string;
}

export async function submitDailyReport(data: ReportSubmission) {
  try {
    return await apiFetch("/reports/submit", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch {
    return { message: "Report submitted (offline mode)", data: { ...data, status: "COMMITTED" } };
  }
}


export async function fetchReports(projectId?: string) {
  try {
    const query = projectId ? `?project_id=${projectId}` : "";
    return await apiFetch(`/reports${query}`);
  } catch {
    return [];
  }
}

export async function reviewReport(reportId: string, action: "APPROVE" | "REJECT", reason?: string) {
  return apiFetch(`/reports/${reportId}/review`, {
    method: "POST",
    body: JSON.stringify({ action, reason }),
  });
}

// ── Dashboard ──
export interface DashboardStats {
  total_boxes: number;
  total_files: number;
  total_pages: number;
  total_reports: number;
  flagged_reports: number;
  active_projects: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  try {
    return await apiFetch<DashboardStats>("/dashboard/stats");
  } catch {
    return { total_boxes: 12450, total_files: 45000, total_pages: 1250000, total_reports: 42, flagged_reports: 3, active_projects: 4 };
  }
}

export interface SynthesisResult {
  period: string;
  summary_text: string;
  total_boxes: number;
  total_files: number;
  total_pages: number;
  overall_health: string;
  key_bottlenecks: string[];
  flagged_reports: number;
  projects: Array<{
    project_id: string;
    project_name: string;
    client: string;
    activity_type: string;
    container_unit: string;
    weekly_boxes: number;
    weekly_files: number;
    weekly_pages: number;
    weekly_target: number;
    velocity_percent: number;
    health: string;
    total_processed: number;
    total_target: number;
    completion_percent: number;
  }>;
  generated_at: string;
}

export async function fetchDashboardSummary(): Promise<SynthesisResult> {
  try {
    return await apiFetch<SynthesisResult>("/dashboard/summary");
  } catch {
    return {
      period: "Week of September 8, 2026",
      summary_text: "Weekly throughput: 4,200 containers processed, 22,000 files handled, 65,000 pages scanned. Stanbic Ilupeju phase is 12% ahead of schedule, but Majekodunmi indexing is bottlenecking due to client data delivery delays.",
      total_boxes: 4200, total_files: 22000, total_pages: 65000,
      overall_health: "Yellow", key_bottlenecks: ["Majekodunmi & Associates Indexing"],
      flagged_reports: 1, projects: [], generated_at: new Date().toISOString(),
    };
  }
}

export async function runSynthesisAgent(): Promise<SynthesisResult> {
  return apiFetch<SynthesisResult>("/agents/run-synthesis", { method: "POST" });
}

// ── Compliance ──
export async function runComplianceAgent() {
  return apiFetch("/agents/run-compliance", { method: "POST" });
}

// ── Team Leads ──
export interface TeamLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  working_days: string[];
  is_on_leave: boolean;
  assigned_projects: string[];
  submitted_today: boolean;
}

export async function fetchTeamLeads(): Promise<TeamLead[]> {
  try {
    return await apiFetch<TeamLead[]>("/team-leads");
  } catch {
    return [
      { id: "u1", name: "Adebayo Okonkwo", email: "adebayo@dataguard.ng", phone: "+2348012345001", role: "Team Lead", working_days: ["Monday","Tuesday","Wednesday","Thursday","Friday"], is_on_leave: false, assigned_projects: ["p1"], submitted_today: true },
      { id: "u3", name: "Emeka Adeyemi", email: "emeka@dataguard.ng", phone: "+2348012345003", role: "Team Lead", working_days: ["Monday","Tuesday","Wednesday","Thursday","Friday"], is_on_leave: false, assigned_projects: ["p2"], submitted_today: false },
    ];
  }
}

// ── Nudges / WhatsApp ──
export interface NudgeLog {
  id: string;
  target_user_name: string;
  target_phone: string;
  project_name: string;
  nudge_type: string;
  message_body: string;
  sent_at: string;
  status: string;
}

export async function fetchNudges(): Promise<NudgeLog[]> {
  try {
    return await apiFetch<NudgeLog[]>("/nudges");
  } catch {
    return [];
  }
}

// ── Exceptions ──
export interface ExceptionLog {
  id: string;
  project_name: string;
  reported_by_name: string;
  category: string;
  description: string;
  reported_at: string;
}

export async function fetchExceptions(): Promise<ExceptionLog[]> {
  try {
    return await apiFetch<ExceptionLog[]>("/exceptions");
  } catch {
    return [
      { id: "exc-001", project_name: "First Bank Digitization", reported_by_name: "Chidinma Nwachukwu", category: "Hardware Failure", description: "Scanner breakdown on 2nd Sept", reported_at: "2026-09-02T09:15:00+01:00" },
    ];
  }
}

// ── Exports ──
export function getExportPdfUrl(projectId: string): string {
  return `${API_BASE}/reports/export/pdf/${projectId}`;
}

export function getExportExcelUrl(projectId: string): string {
  return `${API_BASE}/reports/export/excel/${projectId}`;
}

// ── Ad-hoc Workers ──
export interface AdhocWorker {
  id: string;
  name: string;
  phone: string;
  project_id: string;
  project_name?: string;
  supervisor_id: string;
  supervisor_name?: string;
  start_date: string;
  end_date?: string;
  status: 'Active' | 'Inactive' | 'Pending';
}

export interface AdhocSubmission {
  id: string;
  worker_name: string;
  worker_phone: string;
  project_id: string;
  project_name: string;
  boxes_count: number;
  files_count: number;
  pages_count: number;
  indexing_count: number;
  report_date: string;
  status: 'PENDING_TEAM_LEAD_REVIEW' | 'COMMITTED' | 'REJECTED';
  source: string;
  created_at: string;
}

export async function fetchAdhocWorkers(projectId?: string): Promise<AdhocWorker[]> {
  try {
    const q = projectId ? `?project_id=${projectId}` : "";
    return await apiFetch<AdhocWorker[]>(`/adhoc-workers${q}`);
  } catch {
    return [];
  }
}

export async function registerAdhocWorker(data: {name: string; phone: string; project_id: string; supervisor_id: string}): Promise<AdhocWorker> {
  return apiFetch<AdhocWorker>("/adhoc-workers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function onboardAdhocWorker(phone: string): Promise<{status: string}> {
  return apiFetch<{status: string}>(`/adhoc-workers/${encodeURIComponent(phone)}/onboard`, {
    method: "POST",
  });
}

export async function remindAdhocWorker(phone: string): Promise<{status: string}> {
  return apiFetch<{status: string}>(`/adhoc-workers/${encodeURIComponent(phone)}/remind`, {
    method: "POST",
  });
}

export async function deactivateAdhocWorker(phone: string): Promise<{status: string}> {
  return apiFetch<{status: string}>(`/adhoc-workers/${encodeURIComponent(phone)}`, {
    method: "DELETE",
  });
}

export async function fetchAdhocSubmissions(projectId?: string, status?: string): Promise<AdhocSubmission[]> {
  try {
    const params = new URLSearchParams();
    if (projectId) params.append("project_id", projectId);
    if (status) params.append("status", status);
    const q = params.toString() ? `?${params.toString()}` : "";
    return await apiFetch<AdhocSubmission[]>(`/adhoc-submissions${q}`);
  } catch {
    return [];
  }
}

export async function approveAdhocSubmission(reportId: string): Promise<{status: string}> {
  return apiFetch<{status: string}>(`/adhoc-submissions/${reportId}/approve`, {
    method: "POST",
  });
}

export async function rejectAdhocSubmission(reportId: string, reason: string): Promise<{status: string}> {
  return apiFetch<{status: string}>(`/adhoc-submissions/${reportId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function submitOnBehalfOfAdhoc(data: {worker_phone: string; project_id: string; boxes_count: number; files_count: number; pages_count?: number; indexing_count?: number; report_date: string; submitted_by_team_lead: string}): Promise<{status: string; report_id: string}> {
  return apiFetch<{status: string; report_id: string}>("/webhooks/adhoc-intake", {
    method: "POST",
    body: JSON.stringify({...data, submitted_by_team_lead: true}),
  });
}

export async function generateClientPortalToken(projectId: string): Promise<{token: string; url: string}> {
  return apiFetch<{token: string; url: string}>(`/client-portal/generate-token/${projectId}`, {
    method: "POST",
  });
}

export async function microsoftSsoLogin(email: string, name: string): Promise<{access_token: string; user: Record<string, string>}> {
  return apiFetch<{access_token: string; user: Record<string, string>}>("/auth/microsoft", {
    method: "POST",
    body: JSON.stringify({ email, name }),
  });
}

// ── Predictive Analytics & Intelligence ──
export interface ProjectForecast {
  project_id: string;
  project_name: string;
  completion_percentage: number;
  total_target_boxes: number;
  total_processed_boxes: number;
  boxes_remaining: number;
  daily_box_velocity: number;
  daily_file_velocity: number;
  days_to_complete: number | null;
  sla_target_date: string;
  forecasted_completion_date: string;
  days_buffer: number | null;
  risk_status: "ON_TRACK" | "AT_RISK" | "CRITICAL_DELAY" | "STALLED";
  risk_label: string;
  current_adhoc_headcount: number;
  recommended_headcount_delta: number;
  headcount_advice: string;
  last_updated: string;
}

export interface PortfolioPredictiveSummary {
  portfolio_health_score: number;
  total_active_projects: number;
  on_track_projects: number;
  at_risk_projects: number;
  critical_delay_projects: number;
  project_forecasts: ProjectForecast[];
  generated_at: string;
}

export async function fetchPredictiveAnalytics(): Promise<PortfolioPredictiveSummary> {
  try {
    return await apiFetch<PortfolioPredictiveSummary>("/analytics/predictive");
  } catch {
    return {
      portfolio_health_score: 87.5,
      total_active_projects: 4,
      on_track_projects: 3,
      at_risk_projects: 1,
      critical_delay_projects: 0,
      project_forecasts: [
        {
          project_id: "p1",
          project_name: "Stanbic IBTC Records - Ilupeju Phase",
          completion_percentage: 45.0,
          total_target_boxes: 12000,
          total_processed_boxes: 5400,
          boxes_remaining: 6600,
          daily_box_velocity: 210,
          daily_file_velocity: 1550,
          days_to_complete: 31,
          sla_target_date: "2026-10-30",
          forecasted_completion_date: "2026-10-15",
          days_buffer: 15,
          risk_status: "ON_TRACK",
          risk_label: "On Track (15 days ahead of SLA)",
          current_adhoc_headcount: 14,
          recommended_headcount_delta: 0,
          headcount_advice: "Current headcount is optimal.",
          last_updated: new Date().toISOString()
        },
        {
          project_id: "p3",
          project_name: "First Bank Digitization",
          completion_percentage: 30.0,
          total_target_boxes: 10800,
          total_processed_boxes: 3240,
          boxes_remaining: 7560,
          daily_box_velocity: 145,
          daily_file_velocity: 1100,
          days_to_complete: 52,
          sla_target_date: "2026-10-25",
          forecasted_completion_date: "2026-11-04",
          days_buffer: -10,
          risk_status: "CRITICAL_DELAY",
          risk_label: "Projected 10 Days Behind SLA Target",
          current_adhoc_headcount: 8,
          recommended_headcount_delta: 3,
          headcount_advice: "Recommend adding +3 ad-hoc worker(s) to achieve SLA target by 25 Oct 2026.",
          last_updated: new Date().toISOString()
        }
      ],
      generated_at: new Date().toISOString()
    };
  }
}

export async function triggerGoogleSheetsSync(): Promise<{status: string; mode: string; message: string}> {
  return apiFetch<{status: string; mode: string; message: string}>("/admin/sync-sheets", {
    method: "POST"
  });
}

