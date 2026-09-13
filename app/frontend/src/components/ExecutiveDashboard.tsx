"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "./ui/GlassCard";
import { AnimatedCounter } from "./ui/AnimatedCounter";
import { HealthBadge } from "./ui/HealthBadge";
import { StatusPill } from "./ui/StatusPill";
import { GradientButton } from "./ui/GradientButton";
import { Shimmer } from "./ui/Shimmer";
import {
  fetchDashboardStats, fetchDashboardSummary, fetchProjects, fetchExceptions,
  fetchTeamLeads, fetchReports, runSynthesisAgent, runComplianceAgent, reviewReport,
  getExportPdfUrl, getExportExcelUrl, fetchPredictiveAnalytics, triggerGoogleSheetsSync,
  type DashboardStats, type SynthesisResult, type Project, type ExceptionLog, type TeamLead,
  type PortfolioPredictiveSummary,
} from "@/lib/api";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Download, FileSpreadsheet, Sparkles, AlertCircle, MessageSquareWarning, Loader2,
  Package, Files, ScanLine, AlertTriangle, CheckCircle2, XCircle, Shield, RefreshCw, TrendingUp, Target, Clock, UserPlus
} from "lucide-react";
import WhatsAppSandbox from "./WhatsAppSandbox";
import AdminProjectManager from "./AdminProjectManager";

export default function ExecutiveDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [summary, setSummary] = useState<SynthesisResult | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionLog[]>([]);
  const [teamLeads, setTeamLeads] = useState<TeamLead[]>([]);
  const [flaggedReports, setFlaggedReports] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "admin">("dashboard");

  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isRunningCompliance, setIsRunningCompliance] = useState(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [predictiveSummary, setPredictiveSummary] = useState<PortfolioPredictiveSummary | null>(null);

  useEffect(() => {
    loadData();
    fetch("http://localhost:8000/api/system/health-details").then(r => r.json()).then(setSystemHealth).catch(() => {});
  }, []);


  async function loadData() {
    const [s, sum, p, e, tl, reports, pred] = await Promise.all([
      fetchDashboardStats(),
      fetchDashboardSummary(),
      fetchProjects(),
      fetchExceptions(),
      fetchTeamLeads(),
      fetchReports(),
      fetchPredictiveAnalytics(),
    ]);
    setStats(s);
    setSummary(sum);
    setProjects(p);
    setExceptions(e);
    setTeamLeads(tl);
    setPredictiveSummary(pred);
    setTeamLeads(tl);
    setFlaggedReports(Array.isArray(reports) ? reports.filter((r: any) => r.status === "FLAGGED_ANOMALY") : []);

    // Build chart data from reports
    const dailyTotals: Record<string, number> = {};
    if (Array.isArray(reports)) {
      reports.forEach((r: any) => {
        if (r.status === "COMMITTED" || r.status === "APPROVED") {
          const date = r.report_date || "";
          dailyTotals[date] = (dailyTotals[date] || 0) + (r.boxes_count || 0);
        }
      });
    }
    const sorted = Object.entries(dailyTotals).sort(([a], [b]) => a.localeCompare(b)).slice(-10);
    setChartData(sorted.map(([date, total]) => ({
      name: new Date(date + "T00:00:00").toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" }),
      throughput: total,
    })));

    setLoading(false);
  }

  async function handleRunSynthesis() {
    setIsSynthesizing(true);
    try {
      const result = await runSynthesisAgent();
      setSummary(result);
    } catch {}
    setIsSynthesizing(false);
  }

  async function handleRunCompliance() {
    setIsRunningCompliance(true);
    try {
      await runComplianceAgent();
      // Refresh team leads after compliance check
      const tl = await fetchTeamLeads();
      setTeamLeads(tl);
    } catch {}
    setIsRunningCompliance(false);
  }

  async function handleSheetsSync() {
    setIsSyncingSheets(true);
    setSyncStatusMsg(null);
    try {
      const res = await triggerGoogleSheetsSync();
      setSyncStatusMsg(res.message || "Google Sheets sync completed.");
    } catch (e: any) {
      setSyncStatusMsg(e.message || "Sync failed.");
    }
    setIsSyncingSheets(false);
  }

  async function handleReview(reportId: string, action: "APPROVE" | "REJECT") {
    try {
      await reviewReport(reportId, action);
      setFlaggedReports(prev => prev.filter(r => r.id !== reportId));
      // Refresh stats
      const s = await fetchDashboardStats();
      setStats(s);
    } catch {}
  }

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Shimmer key={i} className="h-28 w-full" />)}
        </div>
        <Shimmer className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Executive Command Center</h1>
          <p className="text-gray-400 text-sm">DataGuard Document Management — Real-time Operations</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center p-1 bg-white/5 border border-white/10 rounded-xl mr-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === "dashboard" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-gray-400 hover:text-white"}`}
            >
              Operations Overview
            </button>
            <button
              onClick={() => setActiveTab("admin")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === "admin" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-gray-400 hover:text-white"}`}
            >
              Admin Setup & Rules
            </button>
          </div>
          <button onClick={handleSheetsSync} disabled={isSyncingSheets} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm text-gray-200 transition-colors disabled:opacity-50">
            <RefreshCw size={16} className={`text-emerald-400 ${isSyncingSheets ? "animate-spin" : ""}`} />
            {isSyncingSheets ? "Syncing Sheets..." : "Sync Sheets"}
          </button>
          <button onClick={() => setShowWhatsApp(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm text-gray-200 transition-colors">
            <MessageSquareWarning size={16} className="text-emerald-400" /> WhatsApp Sandbox
          </button>
          <a href={projects[0] ? getExportPdfUrl(projects[0].id) : "#"} target="_blank" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm text-gray-200 transition-colors">
            <Download size={16} /> PDF
          </a>
          <a href={projects[0] ? getExportExcelUrl(projects[0].id) : "#"} target="_blank" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm text-gray-200 transition-colors">
            <FileSpreadsheet size={16} className="text-emerald-400" /> Excel
          </a>
        </div>
      </div>

      {activeTab === "admin" ? (
        <AdminProjectManager />
      ) : (
        <>
      {syncStatusMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs flex items-center justify-between">
          <span>{syncStatusMsg}</span>
          <button onClick={() => setSyncStatusMsg(null)} className="text-gray-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Containers", value: stats?.total_boxes || 0, icon: Package, color: "text-blue-400", bgColor: "bg-blue-500/10" },
          { label: "Total Files", value: stats?.total_files || 0, icon: Files, color: "text-purple-400", bgColor: "bg-purple-500/10" },
          { label: "Total Pages", value: stats?.total_pages || 0, icon: ScanLine, color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
          { label: "Flagged Reports", value: stats?.flagged_reports || 0, icon: AlertTriangle, color: "text-rose-400", bgColor: "bg-rose-500/10" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}>
            <GlassCard className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl ${stat.bgColor} flex items-center justify-center shrink-0`}>
                <stat.icon size={22} className={stat.color} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
                <h3 className={`text-2xl font-bold ${stat.color}`}>
                  <AnimatedCounter value={stat.value} />
                </h3>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Predictive Analytics & Velocity Intelligence */}
      {predictiveSummary && (
        <GlassCard className="border-indigo-500/20 bg-gradient-to-r from-indigo-950/20 via-slate-900/40 to-slate-950/40">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp size={20} className="text-indigo-400" />
                <h3 className="text-lg font-bold text-white">V3 Predictive SLA Intelligence</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">REAL-TIME FORECAST</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Rolling velocity trajectory, estimated completion dates & headcount advice</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Portfolio Health Score</p>
                <p className="text-xl font-bold text-emerald-400">{predictiveSummary.portfolio_health_score}%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {predictiveSummary.project_forecasts.map((f) => (
              <div key={f.project_id} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-semibold text-white">{f.project_name}</h4>
                    <p className="text-xs text-gray-400">Target SLA: {f.sla_target_date}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    f.risk_status === "ON_TRACK" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                    f.risk_status === "AT_RISK" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                    "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}>
                    {f.risk_status}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-300">
                    <span>Progress ({f.completion_percentage}%)</span>
                    <span>{f.total_processed_boxes} / {f.total_target_boxes} Boxes</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        f.risk_status === "ON_TRACK" ? "bg-gradient-to-r from-emerald-500 to-teal-400" :
                        f.risk_status === "AT_RISK" ? "bg-gradient-to-r from-amber-500 to-yellow-400" :
                        "bg-gradient-to-r from-rose-500 to-red-400"
                      }`}
                      style={{ width: `${Math.min(100, f.completion_percentage)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <Clock size={14} className="text-indigo-400" />
                    <span>Est. Finish: <strong className="text-white">{f.forecasted_completion_date}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <Target size={14} className="text-purple-400" />
                    <span>Velocity: <strong className="text-white">{f.daily_box_velocity}/day</strong></span>
                  </div>
                </div>

                {f.recommended_headcount_delta > 0 && (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
                    <UserPlus size={14} className="shrink-0" />
                    <span>{f.headcount_advice}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main Content (2/3) */}
        <div className="lg:col-span-2 space-y-8">

          {/* Throughput Chart */}
          <GlassCard className="h-[350px] flex flex-col">
            <h3 className="text-lg font-semibold mb-4 text-white">Daily Throughput (Containers)</h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#ffffff50" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#ffffff50" fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Area type="monotone" dataKey="throughput" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorThroughput)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Active Projects Grid */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Active Projects</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj, i) => {
                const completion = proj.completion_percent || 0;
                return (
                  <motion.div key={proj.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 * i }}>
                    <GlassCard className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-white text-sm">{proj.name}</h4>
                          <p className="text-xs text-gray-400 mt-0.5">{proj.client_name} · {proj.container_unit}</p>
                        </div>
                        <HealthBadge status={proj.health as "Green" | "Yellow" | "Red"} />
                      </div>
                      <div className="flex gap-4 text-xs text-gray-400">
                        <span>{(proj.total_boxes_processed || 0).toLocaleString()} processed</span>
                        <span className="text-gray-600">|</span>
                        <span>{proj.target_velocity}/day target</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>Completion</span>
                          <span>{completion.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(completion, 100)}%` }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className={`h-full rounded-full ${
                              proj.health === "Red" ? "bg-gradient-to-r from-rose-500 to-rose-400" :
                              proj.health === "Yellow" ? "bg-gradient-to-r from-amber-500 to-amber-400" :
                              "bg-gradient-to-r from-emerald-500 to-teal-400"
                            }`}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <a href={getExportPdfUrl(proj.id)} target="_blank" className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 transition-colors">PDF</a>
                        <a href={getExportExcelUrl(proj.id)} target="_blank" className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 transition-colors">Excel</a>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Team Compliance Matrix */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Team Compliance Matrix</h3>
              <GradientButton onClick={handleRunCompliance} className="text-xs py-1.5 px-4" disabled={isRunningCompliance}>
                {isRunningCompliance ? <><Loader2 size={14} className="animate-spin" /> Checking...</> : <><Shield size={14} /> Run Compliance</>}
              </GradientButton>
            </div>
            <GlassCard className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-gray-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Team Lead</th>
                      <th className="px-4 py-3 font-medium">Assigned Projects</th>
                      <th className="px-4 py-3 font-medium">Today</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {teamLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-white font-medium">{lead.name}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {lead.assigned_projects?.length || 0} project(s)
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={lead.submitted_today ? "Submitted" : "Missing"} />
                        </td>
                        <td className="px-4 py-3">
                          {!lead.submitted_today && (
                            <button onClick={() => setShowWhatsApp(true)} className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-xs">
                              <MessageSquareWarning size={14} /> Nudge
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Sidebar (1/3) */}
        <div className="space-y-8">

          {/* AI Synthesis Panel */}
          <GlassCard animatedBorder>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="text-emerald-400" size={20} />
              <h3 className="text-lg font-semibold text-white">AI Synthesis</h3>
            </div>

            {summary?.summary_text ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <p className="text-sm text-gray-300 leading-relaxed">{summary.summary_text}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{summary.period}</span>
                  <HealthBadge status={summary.overall_health as "Green" | "Yellow" | "Red"} />
                </div>
                {summary.key_bottlenecks?.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-300 font-medium mb-1">⚠️ Bottlenecks</p>
                    {summary.key_bottlenecks.map((b, i) => (
                      <p key={i} className="text-xs text-amber-200/70">• {b}</p>
                    ))}
                  </div>
                )}
                <GradientButton onClick={handleRunSynthesis} className="w-full text-sm py-2" disabled={isSynthesizing}>
                  {isSynthesizing ? <><Loader2 size={16} className="animate-spin" /> Synthesizing...</> : "Refresh Synthesis"}
                </GradientButton>
              </motion.div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400 mb-4">Generate an executive summary of all operations</p>
                <GradientButton onClick={handleRunSynthesis} className="w-full text-sm py-2" disabled={isSynthesizing}>
                  {isSynthesizing ? <><Loader2 size={16} className="animate-spin" /> Synthesizing...</> : <><Sparkles size={16} /> Run Synthesis</>}
                </GradientButton>
              </div>
            )}
          </GlassCard>

          {/* Flagged Anomalies */}
          {flaggedReports.length > 0 && (
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="text-amber-400" size={20} />
                <h3 className="text-lg font-semibold text-white">Flagged Reports</h3>
                <span className="ml-auto text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">{flaggedReports.length}</span>
              </div>
              <div className="space-y-3">
                {flaggedReports.map(r => (
                  <div key={r.id} className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-white">{r.submitted_by_name || r.submitted_by}</span>
                      <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                        Score: {r.anomaly_score?.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{r.anomaly_reason}</p>
                    <p className="text-xs text-gray-500">{r.report_date}</p>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleReview(r.id, "APPROVE")} className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                        <CheckCircle2 size={12} /> Approve
                      </button>
                      <button onClick={() => handleReview(r.id, "REJECT")} className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors">
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Exception Feed */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="text-rose-400" size={20} />
              <h3 className="text-lg font-semibold text-white">Exception Feed</h3>
            </div>
            <div className="space-y-3">
              {exceptions.length > 0 ? exceptions.map(exc => (
                <div key={exc.id} className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-1.5">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-white">{exc.project_name}</span>
                    <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded">{exc.category}</span>
                  </div>
                  <p className="text-xs text-gray-400">{exc.description}</p>
                  <p className="text-xs text-gray-500">Reported by {exc.reported_by_name} · {new Date(exc.reported_at).toLocaleDateString()}</p>
                </div>
              )) : (
                <p className="text-xs text-gray-500 text-center py-4">No exceptions reported</p>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
      </>
      )}

      <WhatsAppSandbox isOpen={showWhatsApp} onClose={() => setShowWhatsApp(false)} />
    </div>
  );
}
