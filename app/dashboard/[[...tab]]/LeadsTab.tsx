// app/dashboard/[[...tab]]/LeadsTab.tsx

"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  Search,
  Phone,
  Mail,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  MessageSquare,
  TrendingUp,
  Filter,
  Plus,
  Loader2,
  X,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CapturedLead } from "@/app/api/leads/route";

export function LeadsTab({ workspaceId }: { workspaceId?: string }) {
  const targetWsId = workspaceId || "00000000-0000-0000-0000-000000000000";

  const [leads, setLeads] = useState<CapturedLead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<CapturedLead | null>(null);

  // Add Manual Lead Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [newLeadForm, setNewLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    firstQuery: "Manual Lead Entry from Dashboard"
  });

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/leads?workspaceId=${encodeURIComponent(targetWsId)}`);
      const data = await res.json();
      if (res.ok && data.leads) {
        setLeads(data.leads);
      }
    } catch (e) {
      console.warn("Failed to fetch leads:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [targetWsId]);

  const handleUpdateStatus = async (id: string, newStatus: CapturedLead["status"]) => {
    try {
      const res = await fetch("/api/leads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus, workspaceId: targetWsId })
      });
      const data = await res.json();
      if (res.ok && data.leads) {
        setLeads(data.leads);
      }
    } catch (e) {
      alert("Failed to update lead status.");
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;

    try {
      const res = await fetch(`/api/leads?workspaceId=${encodeURIComponent(targetWsId)}&id=${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok && data.leads) {
        setLeads(data.leads);
        if (selectedLead?.id === id) setSelectedLead(null);
      }
    } catch (e) {
      alert("Failed to delete lead.");
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.name.trim()) return;

    try {
      setSaving(true);
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newLeadForm,
          workspaceId: targetWsId,
          source: "Admin Dashboard Entry"
        })
      });

      const data = await res.json();
      if (res.ok && data.leads) {
        setLeads(data.leads);
        setShowAddModal(false);
        setNewLeadForm({ name: "", phone: "", email: "", firstQuery: "Manual Lead Entry" });
      }
    } catch (e) {
      alert("Failed to add lead.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (leads.length === 0) return;

    const headers = ["Name", "Phone", "Email", "First Query", "Source", "Status", "Date"];
    const rows = leads.map((l) => [
      `"${l.name}"`,
      `"${l.phone || ""}"`,
      `"${l.email || ""}"`,
      `"${(l.firstQuery || "").replace(/"/g, '""')}"`,
      `"${l.source || ""}"`,
      `"${l.status.toUpperCase()}"`,
      `"${new Date(l.createdAt).toLocaleString()}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `oogway_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLeads = leads.filter((l) => {
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      l.name.toLowerCase().includes(q) ||
      l.phone.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      (l.firstQuery && l.firstQuery.toLowerCase().includes(q));

    return matchesStatus && matchesSearch;
  });

  const totalCount = leads.length;
  const newCount = leads.filter((l) => l.status === "new").length;
  const contactedCount = leads.filter((l) => l.status === "contacted").length;
  const qualifiedCount = leads.filter((l) => l.status === "qualified").length;

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111A13] border border-[#B2EA4D]/25 p-6 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#B2EA4D]/15 text-[#B2EA4D] border border-[#B2EA4D]/30 shadow-inner">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Leads & Enquiry Channel
                <span className="text-[10px] font-extrabold uppercase font-mono px-2 py-0.5 rounded-full bg-[#B2EA4D]/20 text-[#B2EA4D] border border-[#B2EA4D]/40">
                  Live Lead Capture
                </span>
              </h3>
              <p className="text-xs text-slate-300 max-w-xl">
                Automatically capture user names, phone numbers, and email inquiries whenever visitors chat with your AI assistant. Filter leads, track pipeline status, and export to CSV.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="border-[#B2EA4D]/30 text-[#B2EA4D] hover:bg-[#B2EA4D]/10 font-bold text-xs h-10 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>

          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-[#B2EA4D] hover:bg-[#B2EA4D]/90 text-[#0c1407] font-black text-xs h-10 px-4 rounded-xl shadow-lg hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Lead
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#111A13]/90 border border-[#B2EA4D]/20 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Captured Leads</span>
            <Users className="w-4 h-4 text-[#B2EA4D]" />
          </div>
          <p className="text-2xl font-black text-white font-mono">{totalCount}</p>
        </Card>

        <Card className="bg-[#111A13]/90 border border-amber-500/20 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>New Unread Enquiries</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          </div>
          <p className="text-2xl font-black text-amber-300 font-mono">{newCount}</p>
        </Card>

        <Card className="bg-[#111A13]/90 border border-blue-500/20 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Contacted Prospects</span>
            <Phone className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-300 font-mono">{contactedCount}</p>
        </Card>

        <Card className="bg-[#111A13]/90 border border-emerald-500/20 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Qualified Pipeline</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-300 font-mono">{qualifiedCount}</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#1b2e11]/40 border border-[#B2EA4D]/15 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <Input
            type="text"
            placeholder="Search leads by name, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#0c1407] border-[#B2EA4D]/20 text-xs text-slate-200 placeholder:text-slate-500 h-9 focus:border-[#B2EA4D]"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          {[
            { id: "all", label: "All Leads" },
            { id: "new", label: "New" },
            { id: "contacted", label: "Contacted" },
            { id: "qualified", label: "Qualified" },
            { id: "closed", label: "Closed" }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                statusFilter === st.id
                  ? "bg-[#B2EA4D] text-[#0c1407] shadow-md scale-105"
                  : "bg-[#0c1407] text-slate-400 hover:text-white border border-[#B2EA4D]/15"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#B2EA4D]" />
          <p className="text-xs font-mono">Loading Lead Channel Pipeline...</p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="text-center py-16 bg-[#111A13]/60 rounded-2xl border border-dashed border-[#B2EA4D]/20 space-y-3">
          <UserCheck className="w-10 h-10 text-slate-500 mx-auto" />
          <p className="text-sm font-bold text-slate-300">No Leads Found</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery ? "No leads match your filter query." : "When new users interact with your chatbot, their name and contact information will appear right here."}
          </p>
        </div>
      ) : (
        <Card className="bg-[#111A13]/90 border border-[#B2EA4D]/20 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#1b2e11] text-slate-300 text-xs font-semibold uppercase border-b border-[#B2EA4D]/15 font-mono">
                <tr>
                  <th className="px-5 py-3.5">Prospect Name</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">Initial Inquiry / Interest</th>
                  <th className="px-5 py-3.5">Date & Source</th>
                  <th className="px-5 py-3.5">Pipeline Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredLeads.map((lead) => {
                  const initials = lead.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={lead.id} className="hover:bg-[#1b2e11]/30 transition-colors group">
                      {/* Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#B2EA4D] to-lime-600 text-[#0c1407] font-black text-xs flex items-center justify-center shrink-0 font-mono shadow-sm">
                            {initials}
                          </div>
                          <div>
                            <span className="font-extrabold text-white text-sm block group-hover:text-[#B2EA4D] transition-colors">
                              {lead.name}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">ID: {lead.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Details */}
                      <td className="px-5 py-4 font-mono">
                        <div className="space-y-1">
                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              className="text-xs text-[#B2EA4D] hover:underline flex items-center gap-1.5 font-bold"
                            >
                              <Phone className="w-3 h-3 text-[#B2EA4D]" /> {lead.phone}
                            </a>
                          )}
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}`}
                              className="text-xs text-slate-300 hover:text-white hover:underline flex items-center gap-1.5"
                            >
                              <Mail className="w-3 h-3 text-slate-400" /> {lead.email}
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Inquiry Snippet */}
                      <td className="px-5 py-4 max-w-xs">
                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                          {lead.firstQuery || "General Inquiry"}
                        </p>
                      </td>

                      {/* Date & Source */}
                      <td className="px-5 py-4 font-mono text-[11px]">
                        <div className="space-y-0.5">
                          <span className="text-slate-300 block">{new Date(lead.createdAt).toLocaleDateString()}</span>
                          <span className="text-[9px] text-slate-500 block">{lead.source || "Chatbot"}</span>
                        </div>
                      </td>

                      {/* Status Dropdown */}
                      <td className="px-5 py-4 font-mono">
                        <select
                          value={lead.status}
                          onChange={(e) => handleUpdateStatus(lead.id, e.target.value as any)}
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg border bg-[#0c1407] transition-all cursor-pointer ${
                            lead.status === "new"
                              ? "text-amber-300 border-amber-500/40 bg-amber-500/10"
                              : lead.status === "contacted"
                              ? "text-blue-300 border-blue-500/40 bg-blue-500/10"
                              : lead.status === "qualified"
                              ? "text-emerald-300 border-emerald-500/40 bg-emerald-500/10"
                              : "text-slate-400 border-slate-700 bg-slate-800/40"
                          }`}
                        >
                          <option value="new">New Lead</option>
                          <option value="contacted">Contacted</option>
                          <option value="qualified">Qualified</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>

                      {/* Action buttons */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              className="p-1.5 rounded-lg bg-[#B2EA4D] text-[#0c1407] hover:bg-[#B2EA4D]/90 transition-all font-bold"
                              title="Call Lead"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}`}
                              className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:text-white border border-slate-800 transition-colors"
                              title="Email Lead"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => setSelectedLead(lead)}
                            className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:text-[#B2EA4D] border border-slate-800 transition-colors"
                            title="View Full Lead Details"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLead(lead.id)}
                            className="p-1.5 rounded-lg bg-red-950/60 text-red-400 border border-red-500/30 hover:bg-red-900/60 transition-colors"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Manual Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111A13] border border-[#B2EA4D]/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#B2EA4D]/15 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#B2EA4D]" /> Add New Prospect Lead
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">Prospect Full Name *</label>
                <Input
                  required
                  type="text"
                  placeholder="e.g. Sangram Sahoo"
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  className="bg-[#0c1407] border-[#B2EA4D]/25 text-xs text-white h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">Contact Phone Number</label>
                <Input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={newLeadForm.phone}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                  className="bg-[#0c1407] border-[#B2EA4D]/25 text-xs text-white h-9 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">Email Address</label>
                <Input
                  type="email"
                  placeholder="e.g. sangram@example.com"
                  value={newLeadForm.email}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                  className="bg-[#0c1407] border-[#B2EA4D]/25 text-xs text-white h-9 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">Initial Inquiry / Interest Note</label>
                <Input
                  type="text"
                  placeholder="e.g. B.Tech Admissions 2026 inquiry"
                  value={newLeadForm.firstQuery}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, firstQuery: e.target.value })}
                  className="bg-[#0c1407] border-[#B2EA4D]/25 text-xs text-white h-9"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#B2EA4D]/15">
                <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)} className="text-slate-400 text-xs">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#B2EA4D] hover:bg-[#B2EA4D]/90 text-[#0c1407] font-black text-xs h-9 px-5 rounded-lg shadow-md"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Lead Record"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Detail View Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111A13] border border-[#B2EA4D]/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-[#B2EA4D]/15 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#B2EA4D]" /> Lead Detail Profile
              </h3>
              <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-[#0c1407] p-3 rounded-xl border border-[#B2EA4D]/15">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#B2EA4D] to-lime-600 text-[#0c1407] font-black text-base flex items-center justify-center shrink-0 font-mono shadow-md">
                  {selectedLead.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)}
                </div>
                <div>
                  <h4 className="text-base font-black text-white">{selectedLead.name}</h4>
                  <p className="text-xs text-[#B2EA4D] font-mono">{selectedLead.phone || selectedLead.email || "No contact info"}</p>
                </div>
              </div>

              <div className="bg-[#0c1407] p-3.5 rounded-xl border border-[#B2EA4D]/15 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <strong className="text-white">{selectedLead.phone || "N/A"}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Email:</span>
                  <strong className="text-white truncate max-w-[180px]">{selectedLead.email || "N/A"}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Captured Source:</span>
                  <strong className="text-amber-400">{selectedLead.source || "Chatbot"}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Captured Date:</span>
                  <strong className="text-slate-300">{new Date(selectedLead.createdAt).toLocaleString()}</strong>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Initial Inquiry Note</label>
                <div className="bg-[#0c1407] p-3 rounded-xl border border-[#B2EA4D]/15 text-xs text-slate-300 leading-relaxed font-sans">
                  {selectedLead.firstQuery || "General Inquiry"}
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2 border-t border-[#B2EA4D]/15 font-sans">
              <div className="flex items-center gap-2">
                {selectedLead.phone && (
                  <a
                    href={`tel:${selectedLead.phone}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-black bg-[#B2EA4D] text-[#0c1407] rounded-lg shadow-sm"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call Now
                  </a>
                )}
                {selectedLead.email && (
                  <a
                    href={`mailto:${selectedLead.email}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-[#1b2e11] text-[#B2EA4D] border border-[#B2EA4D]/30 rounded-lg"
                  >
                    <Mail className="w-3.5 h-3.5" /> Send Mail
                  </a>
                )}
              </div>

              <Button variant="ghost" onClick={() => setSelectedLead(null)} className="text-slate-400 text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
