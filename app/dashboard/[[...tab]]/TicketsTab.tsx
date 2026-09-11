// app/dashboard/[[...tab]]/TicketsTab.tsx

"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ticket,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  MessageSquare,
  User,
  Mail,
  ShieldAlert,
  Send,
  Loader2,
  X,
  Filter,
  Check,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export type SupportTicket = {
  id: string;
  ticket_number: string;
  workspace_id: string;
  customer_email: string;
  customer_name: string;
  subject: string;
  priority: "urgent" | "high" | "normal";
  status: "open" | "in_progress" | "resolved";
  chat_history: Array<{ role: string; text: string; time?: string }>;
  sentiment?: { level?: string; explanation?: string };
  admin_notes?: string;
  created_at: string;
  updated_at: string;
};

export function TicketsTab() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  const { data: tickets = [], isLoading, isRefetching, refetch } = useQuery<SupportTicket[]>({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      const res = await fetch("/api/admin/tickets");
      if (!res.ok) throw new Error("Failed to load tickets");
      return res.ok ? await res.json() : [];
    },
    refetchInterval: 10000, // auto refresh tickets every 10s
  });

  const handleUpdateStatus = async (ticketId: string, newStatus: "open" | "in_progress" | "resolved") => {
    try {
      setUpdating(true);
      const res = await fetch("/api/admin/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          status: newStatus,
          adminNotes: adminNotes || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to update ticket");

      const updated = await res.json();
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(updated);
      }
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.ticket_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;
  const urgentCount = tickets.filter((t) => t.priority === "urgent" && t.status !== "resolved").length;

  return (
    <div className="space-y-6 font-sans text-slate-100 pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Support Tickets & Escalations</h1>
            {urgentCount > 0 && (
              <span className="animate-pulse bg-red-500/20 text-red-400 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-red-500/30 uppercase tracking-widest">
                {urgentCount} Urgent Alert{urgentCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time critical issues auto-escalated by Oogway Chatbot AI based on sentiment and urgency detection.
          </p>
        </div>

        <Button
          onClick={() => refetch()}
          disabled={isRefetching}
          variant="outline"
          className="border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin text-[#B2EA4D]" : ""}`} />
          {isRefetching ? "Refreshing..." : "Refresh Tickets"}
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Escalations</span>
            <Ticket className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-black text-white mt-2">{tickets.length}</p>
        </Card>

        <Card className="bg-slate-900/60 border-red-500/20 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-red-400 uppercase tracking-wider">Open Tickets</span>
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-black text-red-400 mt-2">{openCount}</p>
        </Card>

        <Card className="bg-slate-900/60 border-amber-500/20 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">In Progress</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">{inProgressCount}</p>
        </Card>

        <Card className="bg-slate-900/60 border-emerald-500/20 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-[#B2EA4D] mt-2">{resolvedCount}</p>
        </Card>
      </div>

      {/* Search & Filtering Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search by ticket #, customer email, or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-950 border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 rounded-lg h-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {["all", "open", "in_progress", "resolved"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md text-[11px] font-bold capitalize transition-colors cursor-pointer ${
                  statusFilter === st ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Priority Select */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-1.5 h-9 outline-none cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#B2EA4D]" />
          <p className="text-xs font-semibold">Loading support tickets...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/30 rounded-2xl border border-slate-800/60 p-8 space-y-3">
          <CheckCircle2 className="w-10 h-10 text-[#B2EA4D] mx-auto opacity-80" />
          <h3 className="text-base font-bold text-white">No Tickets Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
              ? "No support tickets match your current filters."
              : "All customer inquiries are currently handled smoothly by Oogway AI!"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((t) => (
            <Card
              key={t.id}
              onClick={() => {
                setSelectedTicket(t);
                setAdminNotes(t.admin_notes || "");
              }}
              className={`p-4 bg-slate-900/80 border hover:border-slate-700 transition-all rounded-xl cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                t.status === "open"
                  ? "border-red-500/30 bg-red-950/10"
                  : t.status === "in_progress"
                  ? "border-amber-500/30 bg-amber-950/10"
                  : "border-slate-800"
              }`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {/* Priority Icon */}
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    t.priority === "urgent"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : t.priority === "high"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  }`}
                >
                  {t.priority === "urgent" ? (
                    <AlertCircle className="w-5 h-5 animate-pulse" />
                  ) : (
                    <MessageSquare className="w-5 h-5" />
                  )}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-black text-[#B2EA4D] bg-[#B2EA4D]/10 px-2 py-0.5 rounded border border-[#B2EA4D]/20">
                      {t.ticket_number}
                    </span>
                    <span className="text-xs font-semibold text-slate-300 truncate max-w-[220px]">
                      {t.customer_name} ({t.customer_email})
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(t.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-white truncate">{t.subject}</p>
                </div>
              </div>

              {/* Status & Priority Badges */}
              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    t.priority === "urgent"
                      ? "bg-red-500/20 text-red-400 border-red-500/40"
                      : t.priority === "high"
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  {t.priority}
                </span>

                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                    t.status === "open"
                      ? "bg-red-500/15 text-red-400 border-red-500/30"
                      : t.status === "in_progress"
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      : "bg-emerald-500/15 text-[#B2EA4D] border-emerald-500/30"
                  }`}
                >
                  {t.status.replace("_", " ")}
                </span>

                <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white hover:bg-slate-800">
                  Inspect &rarr;
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Ticket Detail Drawer / Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black text-[#B2EA4D] bg-[#B2EA4D]/10 px-2.5 py-0.5 rounded border border-[#B2EA4D]/20">
                    {selectedTicket.ticket_number}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded border ${
                      selectedTicket.priority === "urgent"
                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {selectedTicket.priority} Priority
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white leading-tight">{selectedTicket.subject}</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-white rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Customer Box */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-sm">
                    {selectedTicket.customer_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{selectedTicket.customer_name}</p>
                    <p className="text-slate-400 text-xs flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-500" /> {selectedTicket.customer_email}
                    </p>
                  </div>
                </div>

                <a
                  href={`mailto:${selectedTicket.customer_email}?subject=Regarding Your Support Ticket ${selectedTicket.ticket_number}: ${selectedTicket.subject}&body=Hello ${selectedTicket.customer_name},%0D%0A%0D%0AWe are contacting you regarding your support ticket (${selectedTicket.ticket_number}).%0D%0A%0D%0ABest regards,%0D%0AOogway Support Team`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-colors"
                >
                  <Send className="w-3.5 h-3.5 text-[#B2EA4D]" /> Reply via Email
                </a>
              </div>

              {/* Chat Log Transcript */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#B2EA4D]" /> Customer Chat Session Log
                </h4>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 max-h-60 overflow-y-auto">
                  {selectedTicket.chat_history && selectedTicket.chat_history.length > 0 ? (
                    selectedTicket.chat_history.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                      >
                        <span className="text-[9px] font-mono text-slate-500 mb-0.5">
                          {msg.role === "user" ? selectedTicket.customer_name : "Oogway AI Assistant"}
                        </span>
                        <div
                          className={`p-3 rounded-xl max-w-[85%] text-xs leading-relaxed ${
                            msg.role === "user"
                              ? "bg-[#B2EA4D]/15 text-[#B2EA4D] border border-[#B2EA4D]/30"
                              : "bg-slate-800 text-slate-200 border border-slate-700"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 italic text-center py-4">No chat transcript log stored.</p>
                  )}
                </div>
              </div>

              {/* Admin Notes */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                  Admin Resolution Notes
                </h4>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about resolution or actions taken by support team..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-xs placeholder:text-slate-500 focus:border-[#B2EA4D] outline-none"
                />
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Current Status:</span>
                <span className="font-extrabold text-white uppercase">{selectedTicket.status.replace("_", " ")}</span>
              </div>

              <div className="flex items-center gap-2">
                {selectedTicket.status !== "in_progress" && selectedTicket.status !== "resolved" && (
                  <Button
                    disabled={updating}
                    onClick={() => handleUpdateStatus(selectedTicket.id, "in_progress")}
                    variant="outline"
                    className="border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-bold rounded-xl"
                  >
                    Mark In Progress
                  </Button>
                )}

                {selectedTicket.status !== "resolved" && (
                  <Button
                    disabled={updating}
                    onClick={() => handleUpdateStatus(selectedTicket.id, "resolved")}
                    className="bg-[#B2EA4D] text-[#050B06] hover:bg-[#B2EA4D]/90 text-xs font-bold rounded-xl shadow-md gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Resolve Ticket
                  </Button>
                )}

                {selectedTicket.status === "resolved" && (
                  <Button
                    disabled={updating}
                    onClick={() => handleUpdateStatus(selectedTicket.id, "open")}
                    variant="outline"
                    className="border-slate-700 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                  >
                    Re-open Ticket
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
