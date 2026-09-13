"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import TeamLeadIntake from "@/components/TeamLeadIntake";
import ExecutiveDashboard from "@/components/ExecutiveDashboard";
import ClientSlaPortal from "@/components/ClientSlaPortal";
import LoginModal from "@/components/LoginModal";
import AdhocWorkerPanel from "@/components/AdhocWorkerPanel";
import { ClipboardList, BarChart3, Building2, Settings, Lock, Users } from "lucide-react";

type Role = "TeamLead" | "Executive" | "Client" | null;

export default function Home() {
  const [role, setRole] = useState<Role>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAdhocPanel, setShowAdhocPanel] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedRole = localStorage.getItem("opsflow-role") as Role;
    if (savedRole) setRole(savedRole);
  }, []);

  const selectRole = (r: Role) => {
    if (r) localStorage.setItem("opsflow-role", r);
    setRole(r);
  };

  const clearRole = () => {
    localStorage.removeItem("opsflow-role");
    setRole(null);
  };

  const handleLoginModalSelect = (modalRole: "TEAM_LEAD" | "EXECUTIVE" | "CLIENT") => {
    const targetRole: Role = modalRole === "TEAM_LEAD" ? "TeamLead" : modalRole === "EXECUTIVE" ? "Executive" : "Client";
    selectRole(targetRole);
  };

  if (!isMounted) return null;

  return (
    <div className="relative min-h-screen bg-[#070714]">
      {/* Header bar for clearing role / authenticating */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        {(role === "Executive" || role === "TeamLead") && (
          <button
            onClick={() => setShowAdhocPanel(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-full transition-colors border border-purple-500/30 shadow-lg shadow-purple-500/10 mr-2"
          >
            <Users size={13} /> Ad-hoc Workers
          </button>
        )}
        <button
          onClick={() => setShowLoginModal(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-full transition-colors border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
        >
          <Lock size={13} /> Auth & RBAC Modal
        </button>
        {role && (
          <button 
            onClick={clearRole}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10"
          >
            <Settings size={13} /> Switch Context
          </button>
        )}
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSelectRole={handleLoginModalSelect}
      />

      <AdhocWorkerPanel
        isVisible={showAdhocPanel}
        currentUserId="u1" // In a real app this would come from an auth context
        currentUserRole={role === "TeamLead" ? "Team Lead" : "Head of Client Services"}
        onClose={() => setShowAdhocPanel(false)}
      />

      <AnimatePresence mode="wait">
        {!role ? (
          <motion.div 
            key="role-selector"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center min-h-screen p-6"
          >
            <div className="text-center mb-12">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-3 inline-block">
                Enterprise Records Management & Digitization Platform
              </span>
              <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent mb-4">
                OpsFlow Platform
              </h1>
              <p className="text-gray-400 max-w-md mx-auto text-sm">
                DataGuard Document Management — Select your operational workspace role to begin.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 w-full max-w-5xl">
              <GlassCard 
                className="group cursor-pointer hover:border-emerald-500/40 transition-all hover:-translate-y-1"
                onClick={() => selectRole("TeamLead")}
              >
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-emerald-500/20">
                  <ClipboardList className="text-emerald-400" size={24} />
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">Team Lead Intake</h2>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Mobile-optimized intake interface for floor leads to log daily container throughput, quality control rescans, and shift reports.
                </p>
              </GlassCard>

              <GlassCard 
                className="group cursor-pointer hover:border-teal-500/40 transition-all hover:-translate-y-1"
                onClick={() => selectRole("Executive")}
              >
                <div className="h-12 w-12 rounded-xl bg-teal-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-teal-500/20">
                  <BarChart3 className="text-teal-400" size={24} />
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">Executive Command Center</h2>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Command center for Head of Client Services. Track project health, approve flagged anomalies, and review AI synthesis reports.
                </p>
              </GlassCard>

              <GlassCard 
                className="group cursor-pointer hover:border-cyan-500/40 transition-all hover:-translate-y-1"
                onClick={() => selectRole("Client")}
              >
                <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-cyan-500/20">
                  <Building2 className="text-cyan-400" size={24} />
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">Client SLA Portal</h2>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Clean, read-only transparency portal for enterprise clients (Stanbic, Airtel, First Bank) to track document digitization SLAs.
                </p>
              </GlassCard>
            </div>
          </motion.div>
        ) : role === "TeamLead" ? (
          <motion.div key="team-lead" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <TeamLeadIntake />
          </motion.div>
        ) : role === "Executive" ? (
          <motion.div key="executive" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ExecutiveDashboard />
          </motion.div>
        ) : (
          <motion.div key="client" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ClientSlaPortal onBack={clearRole} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

