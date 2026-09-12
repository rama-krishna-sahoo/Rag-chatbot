// app/dashboard/[[...tab]]/KeyContactsTab.tsx

"use client";

import React, { useState, useEffect } from "react";
import {
  PhoneCall,
  Mail,
  UserPlus,
  Search,
  Trash2,
  Edit,
  Copy,
  Check,
  Share2,
  Building2,
  Clock,
  Sparkles,
  Phone,
  Eye,
  X,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { KeyContact } from "@/app/api/contacts/route";

export function KeyContactsTab({ workspaceId }: { workspaceId?: string }) {
  const targetWsId = workspaceId || "00000000-0000-0000-0000-000000000000";

  const [contacts, setContacts] = useState<KeyContact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingContact, setEditingContact] = useState<KeyContact | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [previewContact, setPreviewContact] = useState<KeyContact | null>(null);

  // Form Fields State
  const [formData, setFormData] = useState({
    name: "",
    designation: "",
    department: "Admissions",
    phone: "",
    email: "",
    availability: "Mon - Fri (9:00 AM - 5:00 PM)",
    keywords: ""
  });

  // Fetch Key Contacts from API
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/contacts?workspaceId=${encodeURIComponent(targetWsId)}`);
      const data = await res.json();
      if (res.ok && data.contacts) {
        setContacts(data.contacts);
      }
    } catch (e) {
      console.warn("Failed to fetch key contacts:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [targetWsId]);

  const handleOpenAddModal = () => {
    setEditingContact(null);
    setFormData({
      name: "",
      designation: "",
      department: "Admissions",
      phone: "",
      email: "",
      availability: "Mon - Fri (9:00 AM - 5:00 PM)",
      keywords: ""
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (contact: KeyContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      designation: contact.designation,
      department: contact.department || "General",
      phone: contact.phone || "",
      email: contact.email || "",
      availability: contact.availability || "Mon - Fri (9:00 AM - 5:00 PM)",
      keywords: Array.isArray(contact.keywords) ? contact.keywords.join(", ") : contact.keywords || ""
    });
    setShowModal(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSaving(true);
      const payloadContact = {
        id: editingContact ? editingContact.id : undefined,
        name: formData.name.trim(),
        designation: formData.designation.trim() || "Department Official",
        department: formData.department.trim() || "General",
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        availability: formData.availability.trim(),
        keywords: formData.keywords.split(",").map((k) => k.trim()).filter(Boolean)
      };

      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: targetWsId,
          contact: payloadContact
        })
      });

      const data = await res.json();
      if (res.ok && data.contacts) {
        setContacts(data.contacts);
        setShowModal(false);
      }
    } catch (e) {
      alert("Failed to save contact. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;

    try {
      const res = await fetch(`/api/contacts?workspaceId=${encodeURIComponent(targetWsId)}&id=${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok && data.contacts) {
        setContacts(data.contacts);
      }
    } catch (e) {
      alert("Failed to delete contact.");
    }
  };

  const handleCopyCardText = (contact: KeyContact) => {
    const text = `📇 ${contact.name}\n💼 ${contact.designation} (${contact.department})\n📞 Phone: ${contact.phone || "N/A"}\n✉️ Email: ${contact.email || "N/A"}\n⏰ Hours: ${contact.availability || "N/A"}`;
    navigator.clipboard.writeText(text);
    setCopiedId(contact.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleShareContact = (contact: KeyContact) => {
    const shareData = {
      title: contact.name,
      text: `${contact.name} - ${contact.designation}\nPhone: ${contact.phone || ""}\nEmail: ${contact.email || ""}`,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      handleCopyCardText(contact);
    }
  };

  // Filter Categories
  const categories = ["All", "Admissions", "Placements", "IT Support", "Accounts", "General"];

  const filteredContacts = contacts.filter((c) => {
    const matchesCat = selectedCategory === "All" || c.department.toLowerCase() === selectedCategory.toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      c.name.toLowerCase().includes(query) ||
      c.designation.toLowerCase().includes(query) ||
      c.department.toLowerCase().includes(query) ||
      c.phone.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      (Array.isArray(c.keywords) && c.keywords.some((k) => k.toLowerCase().includes(query)));

    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111A13] border border-[#B2EA4D]/25 p-6 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#B2EA4D]/15 text-[#B2EA4D] border border-[#B2EA4D]/30 shadow-inner">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Key Contacts & Emergency Directory
                <span className="text-[10px] font-extrabold uppercase font-mono px-2 py-0.5 rounded-full bg-[#B2EA4D]/20 text-[#B2EA4D] border border-[#B2EA4D]/40">
                  Interactive Cards
                </span>
              </h3>
              <p className="text-xs text-slate-300 max-w-xl">
                Add department leads, admission officers, placement heads, and helpdesk details. When users ask contact queries, the AI chatbot presents these exact details in high-UX click-to-call & click-to-email cards!
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleOpenAddModal}
          className="bg-[#B2EA4D] hover:bg-[#B2EA4D]/90 text-[#0c1407] font-black text-xs h-10 px-5 rounded-xl shadow-lg hover:scale-105 transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Add Key Contact
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#1b2e11]/40 border border-[#B2EA4D]/15 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <Input
            type="text"
            placeholder="Search contacts by name, role, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#0c1407] border-[#B2EA4D]/20 text-xs text-slate-200 placeholder:text-slate-500 h-9 focus:border-[#B2EA4D]"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-[#B2EA4D] text-[#0c1407] shadow-md scale-105"
                  : "bg-[#0c1407] text-slate-400 hover:text-white border border-[#B2EA4D]/15"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#B2EA4D]" />
          <p className="text-xs font-mono">Loading Key Contacts Directory...</p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="text-center py-16 bg-[#111A13]/60 rounded-2xl border border-dashed border-[#B2EA4D]/20 space-y-3">
          <Building2 className="w-10 h-10 text-slate-500 mx-auto" />
          <p className="text-sm font-bold text-slate-300">No Key Contacts Found</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery ? "No contacts match your search query." : "Click 'Add Key Contact' above to configure key phone numbers and emails for your workspace."}
          </p>
          <Button onClick={handleOpenAddModal} variant="outline" className="border-[#B2EA4D]/30 text-[#B2EA4D] hover:bg-[#B2EA4D]/10 text-xs font-bold h-8">
            + Add First Contact
          </Button>
        </div>
      ) : (
        /* Contacts Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredContacts.map((contact) => {
            const initials = contact.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase();

            return (
              <Card
                key={contact.id}
                className="bg-[#111A13]/90 border border-[#B2EA4D]/25 hover:border-[#B2EA4D]/50 rounded-2xl p-5 shadow-lg transition-all duration-300 hover:shadow-2xl flex flex-col justify-between space-y-4 group relative overflow-hidden"
              >
                <div className="space-y-3">
                  {/* Card Header: Avatar & Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#B2EA4D] to-lime-600 text-[#0c1407] font-black text-sm flex items-center justify-center shadow-md shrink-0 font-mono border border-lime-300">
                        {initials}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="text-sm font-extrabold text-white truncate group-hover:text-[#B2EA4D] transition-colors">
                          {contact.name}
                        </h4>
                        <p className="text-[11px] text-slate-300 truncate font-medium">{contact.designation}</p>
                      </div>
                    </div>

                    <span className="text-[9px] font-extrabold uppercase font-mono px-2 py-0.5 rounded-md bg-[#B2EA4D]/15 text-[#B2EA4D] border border-[#B2EA4D]/30 shrink-0">
                      {contact.department}
                    </span>
                  </div>

                  {/* Contact Methods List */}
                  <div className="bg-[#0c1407]/80 rounded-xl p-3 border border-[#B2EA4D]/15 space-y-2 text-xs font-mono">
                    {contact.phone && (
                      <div className="flex items-center justify-between gap-2 text-slate-200">
                        <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                          <Phone className="w-3.5 h-3.5 text-[#B2EA4D]" /> Phone:
                        </span>
                        <a
                          href={`tel:${contact.phone.replace(/[^0-9+]/g, "")}`}
                          className="font-bold text-[#B2EA4D] hover:underline flex items-center gap-1"
                        >
                          {contact.phone}
                        </a>
                      </div>
                    )}

                    {contact.email && (
                      <div className="flex items-center justify-between gap-2 text-slate-200">
                        <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                          <Mail className="w-3.5 h-3.5 text-lime-400" /> Email:
                        </span>
                        <a
                          href={`mailto:${contact.email}`}
                          className="font-bold text-slate-200 hover:text-[#B2EA4D] hover:underline truncate max-w-[160px]"
                        >
                          {contact.email}
                        </a>
                      </div>
                    )}

                    {contact.availability && (
                      <div className="flex items-center justify-between gap-2 text-slate-400 text-[10px]">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-amber-400" /> Hours:
                        </span>
                        <span className="truncate">{contact.availability}</span>
                      </div>
                    )}
                  </div>

                  {/* Keywords Tag Badges */}
                  {contact.keywords && contact.keywords.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-1">
                      <span className="text-[9px] text-slate-500 font-mono font-bold">Query Triggers:</span>
                      {contact.keywords.slice(0, 3).map((kw, idx) => (
                        <span key={idx} className="text-[8px] font-mono bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons (Call, Email, Copy, Share, Edit, Delete) */}
                <div className="pt-2 border-t border-[#B2EA4D]/15 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone.replace(/[^0-9+]/g, "")}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black bg-[#B2EA4D] hover:bg-[#B2EA4D]/90 text-[#0c1407] rounded-lg shadow-sm transition-all"
                        title="Click to Call"
                      >
                        <PhoneCall className="w-3 h-3" /> Call
                      </a>
                    )}
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-[#1b2e11] hover:bg-[#203210] text-[#B2EA4D] border border-[#B2EA4D]/30 rounded-lg transition-all"
                        title="Click to Email"
                      >
                        <Mail className="w-3 h-3" /> Email
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyCardText(contact)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
                      title="Copy Card Details"
                    >
                      {copiedId === contact.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleShareContact(contact)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
                      title="Share Contact"
                    >
                      <Share2 className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                    <button
                      onClick={() => setPreviewContact(contact)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-[#B2EA4D] border border-slate-800 transition-colors"
                      title="Preview Chat Card"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(contact)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-[#B2EA4D] border border-slate-800 transition-colors"
                      title="Edit Contact"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-500/30 transition-colors"
                      title="Delete Contact"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Contact Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111A13] border border-[#B2EA4D]/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-[#B2EA4D]/15 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#B2EA4D]" />
                <h3 className="text-base font-black text-white">
                  {editingContact ? "Edit Key Contact Details" : "Add New Key Contact"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">Full Name *</label>
                  <Input
                    required
                    type="text"
                    placeholder="e.g. Dr. Sangram K. Sahoo"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-[#0c1407] border-[#B2EA4D]/25 text-xs text-white placeholder:text-slate-500 h-9"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">Department Category</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-[#0c1407] border border-[#B2EA4D]/25 text-xs text-white rounded-md px-3 h-9 font-mono"
                  >
                    <option value="Admissions">Admissions</option>
                    <option value="Placements">Placements</option>
                    <option value="IT Support">IT Support</option>
                    <option value="Accounts">Accounts & Fees</option>
                    <option value="Hostel">Hostel & Transport</option>
                    <option value="General">General Inquiry</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">Designation / Role Title *</label>
                <Input
                  required
                  type="text"
                  placeholder="e.g. Director of Admissions & Student Affairs"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="bg-[#0c1407] border-[#B2EA4D]/25 text-xs text-white placeholder:text-slate-500 h-9"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">Phone Number</label>
                  <Input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-[#0c1407] border-[#B2EA4D]/25 text-xs text-white placeholder:text-slate-500 h-9 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">Email Address</label>
                  <Input
                    type="email"
                    placeholder="e.g. admissions@institute.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-[#0c1407] border-[#B2EA4D]/25 text-xs text-white placeholder:text-slate-500 h-9 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">Availability / Office Hours</label>
                <Input
                  type="text"
                  placeholder="e.g. Mon - Fri (9:00 AM - 5:00 PM)"
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  className="bg-[#0c1407] border-[#B2EA4D]/25 text-xs text-white placeholder:text-slate-500 h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">Query Trigger Keywords (Comma Separated)</label>
                <Input
                  type="text"
                  placeholder="e.g. admission, fees, seat booking, entrance"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  className="bg-[#0c1407] border-[#B2EA4D]/25 text-xs text-white placeholder:text-slate-500 h-9 font-mono"
                />
                <p className="text-[10px] text-slate-400">When users type these keywords in chat, this contact card will be suggested.</p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#B2EA4D]/15">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="text-slate-400 text-xs">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#B2EA4D] hover:bg-[#B2EA4D]/90 text-[#0c1407] font-black text-xs h-9 px-5 rounded-lg shadow-md"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingContact ? "Save Changes" : "Create Contact Card"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Chat Card Preview Modal */}
      {previewContact && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-neutral-900">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-black uppercase font-mono text-[#203210] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-lime-600" /> Chatbot Card Preview
              </span>
              <button onClick={() => setPreviewContact(null)} className="text-neutral-400 hover:text-neutral-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-inner">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lime-400 to-[#B2EA4D] text-[#203210] font-black text-xs flex items-center justify-center shrink-0 shadow">
                  {previewContact.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-black text-neutral-900 leading-tight">{previewContact.name}</h5>
                  <p className="text-[11px] text-neutral-500 font-medium leading-tight mt-0.5">{previewContact.designation}</p>
                  <span className="inline-block mt-1 text-[9px] font-extrabold bg-[#B2EA4D]/30 text-[#203210] px-2 py-0.5 rounded font-mono">
                    {previewContact.department}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-[11px] font-mono bg-white p-2.5 rounded-xl border border-slate-200 text-neutral-700">
                {previewContact.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 flex items-center gap-1">📞 Phone:</span>
                    <strong className="text-lime-700">{previewContact.phone}</strong>
                  </div>
                )}
                {previewContact.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 flex items-center gap-1">✉️ Email:</span>
                    <strong className="text-neutral-800 truncate max-w-[140px]">{previewContact.email}</strong>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {previewContact.phone && (
                  <a
                    href={`tel:${previewContact.phone}`}
                    className="flex items-center justify-center gap-1 py-1.5 bg-[#B2EA4D] text-[#203210] text-[10px] font-extrabold rounded-lg shadow-sm"
                  >
                    <PhoneCall className="w-3 h-3" /> Call Now
                  </a>
                )}
                {previewContact.email && (
                  <a
                    href={`mailto:${previewContact.email}`}
                    className="flex items-center justify-center gap-1 py-1.5 bg-neutral-900 text-white text-[10px] font-extrabold rounded-lg shadow-sm"
                  >
                    <Mail className="w-3 h-3" /> Send Email
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
