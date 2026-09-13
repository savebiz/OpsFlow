"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Shield, User, Building2 } from "lucide-react";
import { loginUser } from "@/lib/api";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (role: "TEAM_LEAD" | "EXECUTIVE" | "CLIENT") => void;
}

export default function LoginModal({ isOpen, onClose, onSelectRole }: LoginModalProps) {
  const [selectedRole, setSelectedRole] = useState<"TEAM_LEAD" | "EXECUTIVE" | "CLIENT">("TEAM_LEAD");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const userId = selectedRole === "TEAM_LEAD" ? "u1" : selectedRole === "EXECUTIVE" ? "u2" : "u6";
      const roleStr = selectedRole === "TEAM_LEAD" ? "Team Lead" : selectedRole === "EXECUTIVE" ? "Head of Client Services" : "Client Viewer";
      await loginUser(userId, roleStr);
      onSelectRole(selectedRole);
      onClose();
    } catch (e) {
      console.error("Login failed", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#0a0a1f] border border-white/10 rounded-2xl p-6 shadow-2xl z-50 space-y-6"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Lock className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">ArchiveOps Authentication</h3>
                  <p className="text-xs text-gray-400">DataGuard Identity & Access Management</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Role Selection Options */}
            <div className="space-y-3">
              <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Select Authorized Operational Context</label>

              <button
                onClick={() => setSelectedRole("TEAM_LEAD")}
                className={`w-full p-4 rounded-xl border transition-all text-left flex items-center gap-4 ${
                  selectedRole === "TEAM_LEAD"
                    ? "bg-emerald-500/10 border-emerald-500 text-white shadow-md shadow-emerald-500/10"
                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                }`}
              >
                <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <User size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Team Lead Intake</h4>
                  <p className="text-xs text-gray-400">Mobile-optimized throughput logging & shift reports</p>
                </div>
              </button>

              <button
                onClick={() => setSelectedRole("EXECUTIVE")}
                className={`w-full p-4 rounded-xl border transition-all text-left flex items-center gap-4 ${
                  selectedRole === "EXECUTIVE"
                    ? "bg-teal-500/10 border-teal-500 text-white shadow-md shadow-teal-500/10"
                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                }`}
              >
                <div className="p-2.5 rounded-lg bg-teal-500/20 text-teal-400">
                  <Shield size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Head of Client Services</h4>
                  <p className="text-xs text-gray-400">Executive command center, anomaly approval & AI synthesis</p>
                </div>
              </button>

              <button
                onClick={() => setSelectedRole("CLIENT")}
                className={`w-full p-4 rounded-xl border transition-all text-left flex items-center gap-4 ${
                  selectedRole === "CLIENT"
                    ? "bg-cyan-500/10 border-cyan-500 text-white shadow-md shadow-cyan-500/10"
                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                }`}
              >
                <div className="p-2.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <Building2 size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Enterprise Client Viewer</h4>
                  <p className="text-xs text-gray-400">Read-only project SLA progress & audit transparency</p>
                </div>
              </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
              >
                {loading ? "Authenticating JWT Session..." : "Authenticate Selected Role"}
              </button>

              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await fetch("http://localhost:8000/api/auth/microsoft", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: "adebayo@dataguardng.com", name: "Adebayo Okonkwo" })
                    }).then(r => r.json());
                    if (res.access_token) {
                      localStorage.setItem("archiveops_jwt", res.access_token);
                    }
                    onSelectRole("EXECUTIVE");
                    onClose();
                  } catch (e) {
                    console.error("Microsoft SSO failed", e);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium text-xs border border-white/10 transition-colors flex items-center justify-center gap-2"
              >
                <Building2 size={16} />
                <span>Sign in with Microsoft (@dataguardng.com)</span>
              </button>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
