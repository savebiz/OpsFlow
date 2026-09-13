"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "./ui/GlassCard";
import { GradientButton } from "./ui/GradientButton";
import { HealthBadge } from "./ui/HealthBadge";
import { 
  FolderPlus, Settings, UserCheck, Package, CheckSquare, Square, 
  Loader2, Plus, CheckCircle2, ShieldCheck, Mail, Calendar, BarChart2 
} from "lucide-react";
import { fetchProjects, createProject, updateProject, type Project } from "@/lib/api";

export default function AdminProjectManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [activityType, setActivityType] = useState("Scanning");
  const [containerUnit, setContainerUnit] = useState("Boxes");
  const [assignedLeadEmail, setAssignedLeadEmail] = useState("adebayo@dataguard.ng");
  const [requiresPageCount, setRequiresPageCount] = useState(true);
  const [requiresIndexingCount, setRequiresIndexingCount] = useState(false);
  const [targetVelocity, setTargetVelocity] = useState(200);
  const [totalTarget, setTotalTarget] = useState(10000);
  const [slaTargetDate, setSlaTargetDate] = useState("2026-10-30");

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setIsLoading(true);
    const data = await fetchProjects();
    setProjects(data);
    setIsLoading(false);
  }

  function handleOpenCreate() {
    setEditingProjectId(null);
    setName("");
    setClientName("");
    setActivityType("Scanning");
    setContainerUnit("Boxes");
    setAssignedLeadEmail("adebayo@dataguard.ng");
    setRequiresPageCount(true);
    setRequiresIndexingCount(false);
    setTargetVelocity(200);
    setTotalTarget(10000);
    setSlaTargetDate("2026-10-30");
    setShowCreateModal(true);
  }

  function handleEditProject(p: Project) {
    setEditingProjectId(p.id);
    setName(p.name);
    setClientName(p.client_name);
    setActivityType(p.activity_type);
    setContainerUnit(p.container_unit || "Boxes");
    setAssignedLeadEmail(p.assigned_lead_email || "adebayo@dataguard.ng");
    setRequiresPageCount(p.requires_page_count ?? true);
    setRequiresIndexingCount(p.requires_indexing_count ?? false);
    setTargetVelocity(p.target_velocity || 200);
    setTotalTarget(p.total_target || 10000);
    setSlaTargetDate(p.sla_target_date || "2026-10-30");
    setShowCreateModal(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload: Partial<Project> = {
      name,
      client_name: clientName,
      activity_type: activityType,
      container_unit: containerUnit,
      assigned_lead_email: assignedLeadEmail,
      requires_page_count: requiresPageCount,
      requires_indexing_count: requiresIndexingCount,
      target_velocity: Number(targetVelocity),
      daily_baseline_boxes: Number(targetVelocity),
      daily_baseline_files: Number(targetVelocity) * 8,
      daily_baseline_pages: requiresPageCount ? Number(targetVelocity) * 25 : 0,
      daily_baseline_indexing: requiresIndexingCount ? Number(targetVelocity) * 20 : 0,
      total_target: Number(totalTarget),
      weekly_target: Math.round(Number(totalTarget) / 10),
      sla_target_date: slaTargetDate,
      status: "Active",
      health: "Green"
    };

    try {
      if (editingProjectId) {
        await updateProject(editingProjectId, payload);
        setSuccessMsg("Project updated successfully!");
      } else {
        await createProject(payload);
        setSuccessMsg("New project created & assigned successfully!");
      }
      loadProjects();
      setTimeout(() => {
        setShowCreateModal(false);
        setSuccessMsg("");
      }, 1500);
    } catch {
      alert("Failed to save project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-emerald-400" size={24} />
            <h2 className="text-xl font-bold text-white">Project Setup & Security Scoping</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Admin Backend: Configure relational project metrics, container types, dynamic intake fields, and team lead security scoping.
          </p>
        </div>
        <GradientButton onClick={handleOpenCreate} className="shrink-0 flex items-center gap-2">
          <Plus size={18} /> New Project Setup
        </GradientButton>
      </div>

      {/* Projects Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Active Projects ({projects.length})</h3>
          <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            USEREMAIL Security Active
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">
            <Loader2 className="animate-spin mx-auto mb-2 text-emerald-400" size={24} />
            Loading project specifications...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs font-semibold text-gray-400 bg-white/[0.02]">
                  <th className="p-4">Project Name & Client</th>
                  <th className="p-4">Assigned Lead</th>
                  <th className="p-4">Container Unit</th>
                  <th className="p-4">Metric Rules</th>
                  <th className="p-4">Baseline Velocity</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-medium text-white">
                      <div className="flex items-center gap-2">
                        <span>{p.name}</span>
                        <HealthBadge status={p.health as "Green" | "Yellow" | "Red"} />
                      </div>
                      <p className="text-xs text-gray-500">{p.client_name} · {p.activity_type}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg w-fit">
                        <Mail size={12} />
                        {p.assigned_lead_email || "adebayo@dataguard.ng"}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20 font-mono">
                        <Package size={12} />
                        {p.container_unit || "Boxes"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`px-2 py-0.5 rounded ${p.requires_page_count ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "bg-gray-800 text-gray-500"}`}>
                          {p.requires_page_count ? "✓ Pages Required" : "✕ Pages Hidden"}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${p.requires_indexing_count ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-gray-800 text-gray-500"}`}>
                          {p.requires_indexing_count ? "✓ Indexing Required" : "✕ Indexing Hidden"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-mono text-gray-400">
                      {p.target_velocity || 200} {p.container_unit || "Boxes"}/day
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleEditProject(p)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                      >
                        <Settings size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Modal Form */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FolderPlus className="text-emerald-400" size={20} />
                  {editingProjectId ? "Edit Project Configuration" : "Create New Project Specification"}
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">✕</button>
              </div>

              {successMsg ? (
                <div className="p-6 text-center text-emerald-400 space-y-2">
                  <CheckCircle2 className="mx-auto" size={40} />
                  <p className="font-semibold">{successMsg}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-300">Project Name</label>
                      <input
                        type="text" required
                        value={name} onChange={(e) => setName(e.target.value)}
                        className="glass-input w-full mt-1 text-xs"
                        placeholder="e.g. Stanbic RSA Indexing"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-300">Client Name</label>
                      <input
                        type="text" required
                        value={clientName} onChange={(e) => setClientName(e.target.value)}
                        className="glass-input w-full mt-1 text-xs"
                        placeholder="e.g. Stanbic IBTC"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-300">Activity / Task Type</label>
                      <select
                        value={activityType} onChange={(e) => setActivityType(e.target.value)}
                        className="glass-input w-full mt-1 text-xs bg-slate-900"
                      >
                        <option value="Scanning">Scanning</option>
                        <option value="Indexing">Indexing</option>
                        <option value="Scanning & Indexing">Scanning & Indexing</option>
                        <option value="Quality Control (QC)">Quality Control (QC)</option>
                        <option value="Scanned and Verified">Scanned and Verified</option>
                        <option value="Physical Archiving">Physical Archiving</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-300">Container Type</label>
                      <select
                        value={containerUnit} onChange={(e) => setContainerUnit(e.target.value)}
                        className="glass-input w-full mt-1 text-xs bg-slate-900"
                      >
                        <option value="Boxes">Box (Standard Archives)</option>
                        <option value="Bags">Bag (Majekodunmi/Airtel)</option>
                        <option value="Crates">Crate (Special Transport)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-300">Assigned Team Lead Email (Security Filter)</label>
                    <select
                      value={assignedLeadEmail} onChange={(e) => setAssignedLeadEmail(e.target.value)}
                      className="glass-input w-full mt-1 text-xs bg-slate-900"
                    >
                      <option value="adebayo@dataguard.ng">adebayo@dataguard.ng (Adebayo Okonkwo)</option>
                      <option value="chidinma@dataguard.ng">chidinma@dataguard.ng (Chidinma Nwachukwu)</option>
                      <option value="emeka@dataguard.ng">emeka@dataguard.ng (Emeka Adeyemi)</option>
                      <option value="folake@dataguard.ng">folake@dataguard.ng (Folake Bakare)</option>
                      <option value="ibrahim@dataguard.ng">ibrahim@dataguard.ng (Ibrahim Yusuf)</option>
                    </select>
                    <p className="text-[10px] text-gray-500 mt-1">AppSheet rule: [Assigned_Lead_Email] = USEREMAIL()</p>
                  </div>

                  {/* Dynamic Metric Toggles */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                    <span className="text-xs font-semibold text-gray-300">Dynamic Metric Intake Rules</span>
                    <div className="flex items-center justify-between text-xs text-gray-300 pt-1">
                      <span>Require Page Count Field</span>
                      <button
                        type="button"
                        onClick={() => setRequiresPageCount(!requiresPageCount)}
                        className={`p-1 rounded flex items-center gap-1 transition-colors ${requiresPageCount ? "text-emerald-400" : "text-gray-500"}`}
                      >
                        {requiresPageCount ? <CheckSquare size={18} /> : <Square size={18} />}
                        {requiresPageCount ? "Enabled" : "Disabled"}
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-300 pt-1">
                      <span>Require Indexing Count Field</span>
                      <button
                        type="button"
                        onClick={() => setRequiresIndexingCount(!requiresIndexingCount)}
                        className={`p-1 rounded flex items-center gap-1 transition-colors ${requiresIndexingCount ? "text-emerald-400" : "text-gray-500"}`}
                      >
                        {requiresIndexingCount ? <CheckSquare size={18} /> : <Square size={18} />}
                        {requiresIndexingCount ? "Enabled" : "Disabled"}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-300">Daily Target ({containerUnit})</label>
                      <input
                        type="number" required min="1"
                        value={targetVelocity} onChange={(e) => setTargetVelocity(Number(e.target.value))}
                        className="glass-input w-full mt-1 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-300 font-sans">Total Scope</label>
                      <input
                        type="number" required min="10"
                        value={totalTarget} onChange={(e) => setTotalTarget(Number(e.target.value))}
                        className="glass-input w-full mt-1 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-300">SLA Target Date</label>
                      <input
                        type="date" required
                        value={slaTargetDate} onChange={(e) => setSlaTargetDate(e.target.value)}
                        className="glass-input w-full mt-1 text-xs bg-slate-900"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white bg-white/5"
                    >
                      Cancel
                    </button>
                    <GradientButton type="submit" disabled={isSubmitting} className="text-xs px-5">
                      {isSubmitting ? "Saving..." : editingProjectId ? "Update Project" : "Save & Publish"}
                    </GradientButton>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
