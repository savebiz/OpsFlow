"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "./ui/GlassCard";
import { GradientButton } from "./ui/GradientButton";
import { HealthBadge } from "./ui/HealthBadge";
import { AlertTriangle, CheckCircle2, Loader2, UploadCloud, ChevronDown } from "lucide-react";
import { fetchProjects, fetchMyProjects, submitDailyReport, fetchReports, type Project, type ReportSubmission } from "@/lib/api";

export default function TeamLeadIntake() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [recentReports, setRecentReports] = useState<any[]>([]);

  const [containersCount, setContainersCount] = useState("");
  const [filesCount, setFilesCount] = useState("");
  const [pagesCount, setPagesCount] = useState("");
  const [indexingCount, setIndexingCount] = useState("");
  const [qcFailedPages, setQcFailedPages] = useState("");
  const [reScanCount, setReScanCount] = useState("");
  const [shiftType, setShiftType] = useState("Morning");
  const [exceptionNote, setExceptionNote] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isOnLeave, setIsOnLeave] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadRecentReports(selectedProject.id);
    }
  }, [selectedProject]);

  async function loadProjects() {
    const myUser = typeof window !== "undefined" ? localStorage.getItem("opsflow_user_email") || "adebayo@dataguard.ng" : "adebayo@dataguard.ng";
    const data = await fetchMyProjects(myUser);
    setProjects(data);
    if (data.length > 0) setSelectedProject(data[0]);
  }

  async function loadRecentReports(projectId: string) {
    try {
      const data = await fetchReports(projectId);
      setRecentReports(Array.isArray(data) ? data.slice(0, 5) : []);
    } catch { setRecentReports([]); }
  }

  const containerVal = parseInt(containersCount || "0", 10);
  const pagesVal = parseInt(pagesCount || "0", 10);
  const qcVal = parseInt(qcFailedPages || "0", 10);

  // Dynamic anomaly detection
  const isContainerAnomaly = selectedProject && selectedProject.daily_baseline_boxes > 0 && containerVal > selectedProject.daily_baseline_boxes * 3;
  const isPagesAnomaly = selectedProject && selectedProject.daily_baseline_pages > 0 && pagesVal > selectedProject.daily_baseline_pages * 3;
  const isQcWarning = pagesVal > 0 && qcVal > pagesVal * 0.1; // >10% QC fail rate

  // Dynamic field visibility based on project rules & activity type
  const showPages = selectedProject?.requires_page_count ?? (selectedProject?.activity_type?.includes("Scanning") || selectedProject?.activity_type?.includes("Verified"));
  const showIndexing = selectedProject?.requires_indexing_count ?? selectedProject?.activity_type?.includes("Indexing");

  // Client initials for logo
  const clientInitials = selectedProject?.client_name?.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase() || "??";


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    if (showPages && qcVal > pagesVal && pagesVal > 0) {
      setError("Quality Control failed pages cannot exceed total scanned pages.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const today = new Date().toISOString().split("T")[0];
      const payload: ReportSubmission = {
        project_id: selectedProject.id,
        submitted_by: "u1", // Team Lead ID
        report_date: today,
        boxes_count: containerVal,
        files_count: parseInt(filesCount || "0", 10),
        pages_count: pagesVal,
        indexing_count: parseInt(indexingCount || "0", 10),
        qc_failed_pages: qcVal,
        re_scan_count: parseInt(reScanCount || "0", 10),
        shift_type: shiftType,
        exception_note: exceptionNote,
      };

      await submitDailyReport(payload);
      setSubmitted(true);
      loadRecentReports(selectedProject.id);
      setTimeout(() => {
        setSubmitted(false);
        setContainersCount("");
        setFilesCount("");
        setPagesCount("");
        setIndexingCount("");
        setQcFailedPages("");
        setReScanCount("");
        setExceptionNote("");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full p-4 pt-12 md:pt-20 pb-20">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}>

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Daily Report
          </h1>
          <p className="text-xs text-gray-500 mt-1">ArchiveOps — DataGuard Document Management</p>
        </div>

        {/* Project Selector */}
        {selectedProject && (
          <GlassCard className="mb-6 overflow-hidden relative">
            <div className="absolute top-4 right-4">
              <HealthBadge status={selectedProject.health as "Green" | "Yellow" | "Red"} />
            </div>
            <button
              onClick={() => setShowProjectPicker(!showProjectPicker)}
              className="flex items-center gap-4 w-full text-left"
            >
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-white/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-emerald-400">{clientInitials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">{selectedProject.client_name}</p>
                <h2 className="text-sm font-bold text-white leading-tight truncate">{selectedProject.name}</h2>
                <p className="text-xs text-gray-500 mt-1">{selectedProject.activity_type} · {selectedProject.container_unit}</p>
              </div>
              <ChevronDown size={16} className={`text-gray-400 transition-transform ${showProjectPicker ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {showProjectPicker && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProject(p); setShowProjectPicker(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          p.id === selectedProject.id ? "bg-emerald-500/10 text-emerald-400" : "text-gray-400 hover:bg-white/5"
                        }`}
                      >
                        {p.name} <span className="text-xs text-gray-500">({p.container_unit})</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Container Count (always shown) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-300">
              Total {selectedProject?.container_unit || "Boxes"} Processed
            </label>
            <input
              type="number" required min="0"
              value={containersCount}
              onChange={(e) => setContainersCount(e.target.value)}
              className="glass-input w-full"
              placeholder={`e.g. ${selectedProject?.daily_baseline_boxes || 200}`}
            />
            <AnimatePresence>
              {isContainerAnomaly && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="mt-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 animate-pulse-glow">
                    <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-rose-300">
                      ⚠️ Value is {(containerVal / (selectedProject?.daily_baseline_boxes || 1)).toFixed(1)}x the daily average of {selectedProject?.daily_baseline_boxes?.toLocaleString()}. This will be flagged for review.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Files Count (always shown) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-300">Total Files</label>
            <input
              type="number" min="0"
              value={filesCount}
              onChange={(e) => setFilesCount(e.target.value)}
              className="glass-input w-full"
              placeholder={`e.g. ${selectedProject?.daily_baseline_files || 1500}`}
            />
          </div>

          {/* Pages (only for Scanning activities) */}
          {showPages && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Total Pages Scanned</label>
              <input
                type="number" min="0"
                value={pagesCount}
                onChange={(e) => setPagesCount(e.target.value)}
                className="glass-input w-full"
                placeholder={`e.g. ${selectedProject?.daily_baseline_pages || 5000}`}
              />
              <AnimatePresence>
                {isPagesAnomaly && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
                      <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={16} />
                      <p className="text-xs text-rose-300">
                        ⚠️ Pages value is {(pagesVal / (selectedProject?.daily_baseline_pages || 1)).toFixed(1)}x the daily average. This will be flagged.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Indexing (only for Indexing activities) */}
          {showIndexing && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Indexing Count</label>
              <input
                type="number" min="0"
                value={indexingCount}
                onChange={(e) => setIndexingCount(e.target.value)}
                className="glass-input w-full"
                placeholder={`e.g. ${selectedProject?.daily_baseline_indexing || 4500}`}
              />
            </motion.div>
          )}

          {/* Exception Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-300">Exception Notes (Optional)</label>
            <textarea
              rows={3}
              value={exceptionNote}
              onChange={(e) => setExceptionNote(e.target.value)}
              className="glass-input w-full resize-none"
              placeholder="Scanner issues, power outages, staffing changes..."
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <GradientButton type="submit" className="w-full mt-4" disabled={isSubmitting || submitted}>
            {isSubmitting ? (
              <><Loader2 className="animate-spin" size={20} /> Submitting...</>
            ) : submitted ? (
              <><CheckCircle2 size={20} /> Submitted Successfully</>
            ) : (
              <><UploadCloud size={20} /> Submit Daily Report</>
            )}
          </GradientButton>
        </form>

        {/* Recent Submissions */}
        <div className="mt-8 space-y-4">
          <h3 className="text-sm font-semibold text-white">Recent Submissions</h3>
          <div className="space-y-3">
            {recentReports.length > 0 ? recentReports.map((r: any) => (
              <GlassCard key={r.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{r.report_date}</p>
                  <p className="text-xs text-gray-400">
                    {r.boxes_count?.toLocaleString()} {selectedProject?.container_unit || "Boxes"}
                    {r.pages_count > 0 ? `, ${r.pages_count?.toLocaleString()} Pages` : ""}
                    {r.indexing_count > 0 ? `, ${r.indexing_count?.toLocaleString()} Indexed` : ""}
                  </p>
                </div>
                {r.status === "FLAGGED_ANOMALY" ? (
                  <AlertTriangle className="text-amber-400" size={16} />
                ) : (
                  <CheckCircle2 className="text-emerald-400" size={16} />
                )}
              </GlassCard>
            )) : (
              <p className="text-xs text-gray-500 text-center py-4">No recent submissions for this project</p>
            )}
          </div>
        </div>

      </motion.div>
    </div>
  );
}
