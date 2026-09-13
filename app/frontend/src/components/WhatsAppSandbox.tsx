"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, CheckCheck, MessageCircle, RefreshCw, Send } from "lucide-react";
import { clsx } from "clsx";
import { fetchNudges, runComplianceAgent, NudgeLog } from "@/lib/api";

interface WhatsAppSandboxProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WhatsAppSandbox({ isOpen, onClose }: WhatsAppSandboxProps) {
  const [nudges, setNudges] = useState<NudgeLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const loadNudges = async () => {
    setLoading(true);
    try {
      const data = await fetchNudges();
      setNudges(data);
    } catch {
      console.error("Failed to load nudges");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNudges();
    }
  }, [isOpen]);

  const handleRunCompliance = async () => {
    setTriggering(true);
    try {
      await runComplianceAgent();
      await loadNudges();
    } catch (e) {
      console.error("Error triggering compliance agent:", e);
    } finally {
      setTriggering(false);
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-[#0a0a1a] border-l border-white/10 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="bg-[#1a1a2e] border-b border-white/10 p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                  <MessageCircle className="text-emerald-400" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">ArchiveOps Compliance Bot</h3>
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    WhatsApp Business Sandbox API
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={loadNudges} 
                  disabled={loading}
                  className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                  title="Refresh Nudges"
                >
                  <RefreshCw size={16} className={clsx(loading && "animate-spin")} />
                </button>
                <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a0a1a] relative" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(16,185,129,0.03) 0%, transparent 100%)' }}>
              {nudges.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm">
                  <MessageCircle size={36} className="mx-auto mb-3 opacity-30 text-emerald-400" />
                  No compliance messages logged yet.
                  <p className="text-xs text-gray-600 mt-1">Click "Trigger Compliance Nudges" below to check missing reports.</p>
                </div>
              ) : (
                nudges.map((msg) => (
                  <div key={msg.id} className="flex flex-col items-start">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {msg.nudge_type || "Reminder"}
                      </span>
                      <span className="text-[10px] text-gray-400">To: {msg.target_user_name} ({msg.project_name})</span>
                    </div>
                    <div className="max-w-[90%] rounded-2xl rounded-tl-none px-4 py-3 bg-[#1a1a2e] text-gray-200 border border-white/10 shadow-md">
                      <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.message_body}</p>
                      <div className="flex items-center justify-end gap-1.5 mt-2 pt-1 border-t border-white/5">
                        <span className="text-[10px] text-gray-500">{new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <CheckCheck size={12} className="text-emerald-400" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#1a1a2e] border-t border-white/10 shrink-0 space-y-2">
              <button 
                onClick={handleRunCompliance}
                disabled={triggering}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send size={14} className={clsx(triggering && "animate-spin")} />
                {triggering ? "Checking Compliance & Triggering Nudges..." : "Trigger 17:00 WAT Compliance Check"}
              </button>
              <p className="text-[10px] text-center text-gray-500">
                🔒 Sandbox Mode — Simulates WhatsApp Business API payloads at $0 cost
              </p>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

