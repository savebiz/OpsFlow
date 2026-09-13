"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { Users, UserPlus, Phone, Bell, Check, X, Send, Search } from "lucide-react";
import clsx from "clsx";
import {
  AdhocWorker,
  AdhocSubmission,
  fetchAdhocWorkers,
  fetchAdhocSubmissions,
  registerAdhocWorker,
  onboardAdhocWorker,
  remindAdhocWorker,
  deactivateAdhocWorker,
  approveAdhocSubmission,
  rejectAdhocSubmission,
  submitOnBehalfOfAdhoc,
  fetchProjects,
  Project
} from "@/lib/api";

interface AdhocWorkerPanelProps {
  isVisible: boolean;
  currentUserId: string;
  currentUserRole: string;
  onClose: () => void;
}

type TabType = 'registry' | 'pending' | 'submit';

export default function AdhocWorkerPanel({ isVisible, currentUserId, currentUserRole, onClose }: AdhocWorkerPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('registry');
  const [workers, setWorkers] = useState<AdhocWorker[]>([]);
  const [submissions, setSubmissions] = useState<AdhocSubmission[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [newWorker, setNewWorker] = useState({ name: '', phone: '', project_id: '', supervisor_id: currentUserId });
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [submitForm, setSubmitForm] = useState({ worker_phone: '', project_id: '', boxes_count: 0, files_count: 0, pages_count: 0, indexing_count: 0, report_date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    if (isVisible) {
      loadData();
    }
  }, [isVisible]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [workersData, submissionsData, projectsData] = await Promise.all([
        fetchAdhocWorkers(),
        fetchAdhocSubmissions(undefined, 'PENDING_TEAM_LEAD_REVIEW'),
        fetchProjects()
      ]);
      setWorkers(workersData);
      setSubmissions(submissionsData);
      setProjects(projectsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-4 z-40 bg-[#070714]/95 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 rounded-xl border border-purple-500/30">
              <Users className="text-purple-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Ad-hoc Workforce Management</h2>
              <p className="text-sm text-gray-400">Manage temporary staff, review submissions, and submit on behalf</p>
            </div>
            <span className="ml-4 px-3 py-1 text-xs font-semibold bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
              {workers.length} Total Workers
            </span>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-6 px-6 pt-4 border-b border-white/10">
          <TabButton active={activeTab === 'registry'} onClick={() => setActiveTab('registry')} label="Workers Registry" />
          <TabButton active={activeTab === 'pending'} onClick={() => setActiveTab('pending')} label="Pending Approvals" badge={submissions.length} />
          {currentUserRole === 'Team Lead' && (
            <TabButton active={activeTab === 'submit'} onClick={() => setActiveTab('submit')} label="Submit On-Behalf" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" /></div>
          ) : (
            <>
              {activeTab === 'registry' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Search workers..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                    <button 
                      onClick={() => setShowRegisterForm(!showRegisterForm)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-colors"
                    >
                      <UserPlus size={16} /> Register New Worker
                    </button>
                  </div>

                  {showRegisterForm && (
                    <GlassCard className="p-4 grid grid-cols-4 gap-4 items-end">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Name</label>
                        <input type="text" className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm" value={newWorker.name} onChange={e => setNewWorker({...newWorker, name: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Phone (+234...)</label>
                        <input type="text" className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm" value={newWorker.phone} onChange={e => setNewWorker({...newWorker, phone: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Project</label>
                        <select className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm" value={newWorker.project_id} onChange={e => setNewWorker({...newWorker, project_id: e.target.value})}>
                          <option value="">Select Project</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <button 
                        onClick={async () => {
                          await registerAdhocWorker(newWorker);
                          setNewWorker({ name: '', phone: '', project_id: '', supervisor_id: currentUserId });
                          setShowRegisterForm(false);
                          loadData();
                        }}
                        className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Save
                      </button>
                    </GlassCard>
                  )}

                  <div className="grid gap-4">
                    {workers.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase())).map(worker => (
                      <GlassCard key={worker.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center font-bold text-white">
                            {worker.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-white text-sm">{worker.name}</h4>
                            <p className="text-xs text-gray-400">{worker.phone} • {worker.project_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <span className={clsx(
                            "px-2.5 py-1 rounded-full text-xs font-medium border",
                            worker.status === 'Active' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            worker.status === 'Pending' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                            "bg-gray-500/10 text-gray-400 border-gray-500/20"
                          )}>
                            {worker.status}
                          </span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => onboardAdhocWorker(worker.phone)} className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg" title="Onboard via WhatsApp"><Phone size={16} /></button>
                            <button onClick={() => remindAdhocWorker(worker.phone)} className="p-2 text-amber-400 hover:bg-amber-500/20 rounded-lg" title="Send Reminder"><Bell size={16} /></button>
                            <button onClick={() => deactivateAdhocWorker(worker.phone)} className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-lg" title="Deactivate"><X size={16} /></button>
                          </div>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'pending' && (
                <div className="space-y-4">
                  {submissions.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">No pending submissions.</div>
                  ) : (
                    submissions.map(sub => (
                      <GlassCard key={sub.id} className="p-5 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-semibold text-white">{sub.worker_name}</h4>
                            <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded">{sub.project_name}</span>
                          </div>
                          <div className="text-sm text-gray-300 flex gap-4">
                            <span>Boxes: <strong>{sub.boxes_count}</strong></span>
                            <span>Files: <strong>{sub.files_count}</strong></span>
                            <span>Pages: <strong>{sub.pages_count}</strong></span>
                            <span>Date: {sub.report_date}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={async () => { await approveAdhocSubmission(sub.id); loadData(); }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 rounded-lg text-sm transition-colors"
                          >
                            <Check size={16} /> Approve
                          </button>
                          <button 
                            onClick={async () => { await rejectAdhocSubmission(sub.id, "Rejected by Team Lead"); loadData(); }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 rounded-lg text-sm transition-colors"
                          >
                            <X size={16} /> Reject
                          </button>
                        </div>
                      </GlassCard>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'submit' && (
                <div className="max-w-2xl mx-auto">
                  <GlassCard className="p-6 space-y-6">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Select Worker</label>
                      <select 
                        className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                        value={submitForm.worker_phone}
                        onChange={e => {
                          const w = workers.find(wo => wo.phone === e.target.value);
                          setSubmitForm({...submitForm, worker_phone: e.target.value, project_id: w?.project_id || ''});
                        }}
                      >
                        <option value="">Choose a worker...</option>
                        {workers.filter(w => w.status === 'Active').map(w => (
                          <option key={w.id} value={w.phone}>{w.name} - {w.project_name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Boxes Count</label>
                        <input type="number" className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white" value={submitForm.boxes_count} onChange={e => setSubmitForm({...submitForm, boxes_count: parseInt(e.target.value) || 0})} />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Files Count</label>
                        <input type="number" className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white" value={submitForm.files_count} onChange={e => setSubmitForm({...submitForm, files_count: parseInt(e.target.value) || 0})} />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Pages Count</label>
                        <input type="number" className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white" value={submitForm.pages_count} onChange={e => setSubmitForm({...submitForm, pages_count: parseInt(e.target.value) || 0})} />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Indexing Count</label>
                        <input type="number" className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white" value={submitForm.indexing_count} onChange={e => setSubmitForm({...submitForm, indexing_count: parseInt(e.target.value) || 0})} />
                      </div>
                    </div>

                    <button 
                      onClick={async () => {
                        await submitOnBehalfOfAdhoc({...submitForm, submitted_by_team_lead: currentUserId});
                        setSubmitForm({...submitForm, boxes_count: 0, files_count: 0, pages_count: 0, indexing_count: 0});
                        loadData();
                      }}
                      disabled={!submitForm.worker_phone}
                      className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={18} /> Submit Report
                    </button>
                  </GlassCard>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function TabButton({ active, label, badge, onClick }: { active: boolean, label: string, badge?: number, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "pb-4 px-2 text-sm font-medium transition-colors border-b-2 relative",
        active ? "text-purple-400 border-purple-500" : "text-gray-400 border-transparent hover:text-gray-200"
      )}
    >
      <div className="flex items-center gap-2">
        {label}
        {badge !== undefined && badge > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-xs">{badge}</span>
        )}
      </div>
    </button>
  );
}
