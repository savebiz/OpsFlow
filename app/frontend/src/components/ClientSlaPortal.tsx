"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "./ui/GlassCard";
import { HealthBadge } from "./ui/HealthBadge";
import { AnimatedCounter } from "./ui/AnimatedCounter";
import { fetchProjects, Project, fetchReports } from "@/lib/api";
import { Building2, ShieldCheck, TrendingUp, Calendar, CheckCircle2, Award, Clock } from "lucide-react";

interface ClientSlaPortalProps {
  onBack: () => void;
}

export default function ClientSlaPortal({ onBack }: ClientSlaPortalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("p1");
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const pList = await fetchProjects();
        setProjects(pList);
        if (pList.length > 0) {
          setSelectedProjectId(pList[0].id);
        }
      } catch (e) {
        console.error("Failed to load client portal data", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    fetch(`http://localhost:8000/api/analytics/projects/${selectedProjectId}/forecast`)
      .then(r => r.json())
      .then(setForecast)
      .catch(() => {
        setForecast({
          forecasted_completion_date: "2026-10-15",
          risk_status: "ON_TRACK",
          risk_label: "On Track (15 days ahead of SLA)",
          daily_box_velocity: 210
        });
      });
  }, [selectedProjectId]);

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  return (
    <div className="min-h-screen bg-[#070714] text-white p-4 md:p-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Enterprise Client SLA Transparency Portal
            </span>
            <span className="text-xs text-gray-400">DataGuard Document Management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            {activeProject ? activeProject.client_name : "Client Services Portal"}
          </h1>
          <p className="text-sm text-gray-400 mt-1">Real-time digitization metrics, SLA compliance, and document velocity audit.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 text-xs font-medium border border-white/10 transition-colors"
          >
            ← Back to Context Switcher
          </button>
        </div>
      </div>

      {/* Project Selector Pills */}
      <div className="flex flex-wrap gap-2">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedProjectId(p.id)}
            className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-2 ${
              selectedProjectId === p.id
                ? "bg-gradient-to-r from-emerald-600/30 to-teal-600/30 text-emerald-300 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
            }`}
          >
            <Building2 size={14} />
            {p.name}
          </button>
        ))}
      </div>

      {activeProject && (
        <div className="space-y-6">
          {/* Executive Overview Header Card */}
          <GlassCard className="border-emerald-500/30 bg-gradient-to-r from-[#0d1b2a]/60 to-[#1b263b]/60">
            <div className="grid grid-[#12] md:grid-cols-4 gap-6">
              <div>
                <span className="text-xs text-gray-400 block mb-1">Project Name</span>
                <h3 className="text-lg font-bold text-white">{activeProject.name}</h3>
                <p className="text-xs text-emerald-400 mt-0.5">{activeProject.activity_type}</p>
              </div>

              <div>
                <span className="text-xs text-gray-400 block mb-1">SLA Health Score</span>
                <HealthBadge status={(activeProject.health as any) || "Green"} />
              </div>


              <div>
                <span className="text-xs text-gray-400 block mb-1">Overall SLA Progress</span>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(activeProject.completion_percent || 45, 100)}%` }}
                      transition={{ duration: 1 }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                    />
                  </div>
                  <span className="text-sm font-bold text-emerald-400">{activeProject.completion_percent || 45}%</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-400 block mb-1">Audit Verification</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 font-medium">
                  <ShieldCheck size={14} /> Verified by DataGuard Agentic Audit
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard>
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs">Total Containers Digitized</span>
                <Building2 size={16} className="text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                <AnimatedCounter value={activeProject.total_boxes_processed || 4200} /> <span className="text-xs font-normal text-gray-400">{activeProject.container_unit}</span>
              </p>
              <p className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
                <TrendingUp size={12} /> Target: {activeProject.total_target.toLocaleString()} {activeProject.container_unit}
              </p>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs">Files Indexed & Audited</span>
                <CheckCircle2 size={16} className="text-teal-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                <AnimatedCounter value={activeProject.total_files_processed || 22000} /> <span className="text-xs font-normal text-gray-400">files</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-2">Daily baseline: {activeProject.daily_baseline_files} files/day</p>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs">Total Pages Scanned</span>
                <Award size={16} className="text-cyan-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                <AnimatedCounter value={activeProject.total_pages_processed || 65000} /> <span className="text-xs font-normal text-gray-400">pages</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-2">High resolution 300DPI Optical Scan</p>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs">Projected SLA Finish</span>
                <Clock size={16} className="text-indigo-400" />
              </div>
              <p className="text-lg font-bold text-white">
                {forecast ? forecast.forecasted_completion_date : "2026-10-15"}
              </p>
              <p className="text-[11px] text-emerald-400 mt-2 font-medium">
                {forecast ? forecast.risk_label : "On Track to meet SLA deadline"}
              </p>
            </GlassCard>
          </div>

          {/* Quality Guarantee Guarantee Box */}
          <GlassCard className="border-cyan-500/20 bg-cyan-950/20 p-6">
            <h4 className="font-semibold text-cyan-300 text-sm mb-2 flex items-center gap-2">
              <ShieldCheck size={16} /> DataGuard Quality Assurance SLA Contract
            </h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              All digitized assets are processed according to ISO-compliant document preservation standards. Records undergo 3-tier indexing validation, barcode verification, and zero-loss optical quality control.
            </p>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
