/**
 * src/pages/admin/help/page.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin — Help & Documentation.
 * Route: /admin/help
 *
 * Mostly static (FAQ, quick links, video guides). The one wired piece is
 * the "Contact Engineering" button — it opens a modal that posts to
 *   POST /api/tickets
 * via services/ticketApi.js → createTicket(). Same endpoint investigators
 * use for support; admin tickets are routed to the same admin queue.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HelpCircle, Search, Book, MessageSquare, Mail, ExternalLink,
  ChevronRight, ChevronDown, LayoutDashboard, PlayCircle,
  FileText, Shield, Database, Users, Settings, AlertTriangle,
  Activity, Lock, Send, X, CheckCircle2,
} from "lucide-react";

import Header from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { createTicket, formatApiError } from "@/services/ticketApi";

const CATEGORIES = [
  { id: "user-mgmt", icon: Users,    label: "User Management" },
  { id: "database",  icon: Database, label: "Database & Backups" },
  { id: "security",  icon: Shield,   label: "Security & Audit" },
  { id: "reports",   icon: FileText, label: "Reports" },
  { id: "settings",  icon: Settings, label: "Settings & Config" },
  { id: "account",   icon: Lock,     label: "Account & Login" },
];

const FAQS = {
  "user-mgmt": [
    { q: "How do I add a new investigator account?",
      a: "Go to Admin → User Management and click 'Add User'. Fill in the full name, username, email, password, and select 'Investigator' as the role. The system auto-generates a badge number (INV-XXXX) when the account is created." },
    { q: "How do I deactivate a user?",
      a: "On the User Management page, find the user and click the Active/Inactive toggle in the Status column. The user is immediately signed out and cannot log back in until reactivated. The action is recorded in the audit log." },
    { q: "Can I delete a user account?",
      a: "Yes — click the trash icon next to the user. However, if the investigator has active assigned cases, the system blocks deletion and asks you to re-assign or close those cases first. This safeguard is required by UC-6." },
    { q: "What's the difference between Inactive and Deleted?",
      a: "Inactive users still exist in the database (so audit history stays linked) but cannot log in. Deleted users are permanently removed. Prefer Inactive when in doubt — it's reversible." },
  ],
  database: [
    { q: "How often are backups taken?",
      a: "By default, the system performs a nightly full backup at 02:00 UTC and incremental backups every 4 hours. You can trigger a manual backup from Admin → Database → 'Backup Now'." },
    { q: "How do I restore from a backup?",
      a: "From Admin → Database, click the restore icon next to the backup file you want to restore. The system will confirm twice and then take ~5 minutes to restore. Plan a maintenance window — users will be signed out during restore." },
    { q: "What does Database Optimization do?",
      a: "It rebuilds indexes, removes orphaned records, and reclaims unused storage. Recommended monthly. Takes about 2 minutes and does NOT cause downtime." },
  ],
  security: [
    { q: "Where can I see who deleted a case?",
      a: "Admin → Audit Logs. Filter by Module='Case Management' and Action='DELETE'. Every state change is logged with user, timestamp, IP, and action detail." },
    { q: "How long are audit logs retained?",
      a: "Indefinitely by default. For compliance, the platform supports configurable retention via the SETTINGS table (default = 7 years for forensics, 2 years for read-only views)." },
    { q: "What should I do if I see a failed login burst?",
      a: "The dashboard alerts banner highlights repeated failures. From Audit Logs, filter by Status='Failed' and Action='LOGIN'. If you see >10 attempts on one account in 5 minutes, the account is auto-locked for 15 minutes — you can manually unlock from User Management." },
  ],
  reports: [
    { q: "Which report types are available?",
      a: "Case Summary, Crime Hotspot, Case Timeline, AI Leads Report, and Suspect Analysis. Generate them from Admin → Reports — each has its own filter set (date range, province, crime type, etc.)." },
    { q: "What formats can I export to?",
      a: "PDF (default, formatted), CSV (raw data), and JSON (machine-readable). All formats include a header with generation timestamp and admin name for audit traceability." },
    { q: "Can investigators see admin-generated reports?",
      a: "No — reports are scoped to the user who generated them. Investigators only see their own report history; admins see only admin-generated reports. Audit logs are separate." },
  ],
  settings: [
    { q: "How do I change the password complexity policy?",
      a: "Admin → Settings → Security. Adjust the minimum length, required character classes, and rotation interval. New policies apply on the user's next password change — existing passwords are not invalidated." },
    { q: "Can I customize the dashboard theme?",
      a: "Yes — Admin → Settings → Appearance lets you toggle light/dark, accent color, and density (comfortable/compact). Themes are per-user; your investigators' choices are saved separately." },
  ],
  account: [
    { q: "How do I change my own password?",
      a: "Admin → Profile → Security tab. Enter your current password, then the new one twice. The change is logged in the audit trail." },
    { q: "What if I forget my password?",
      a: "There is no self-service password reset for admins (security policy). Another admin must reset your password from User Management. If you are the only admin, contact engineering via the form below." },
  ],
};

const QUICK_LINKS = [
  { icon: Activity,  label: "Admin Onboarding Guide",  desc: "Walkthrough for new administrators",       href: "#" },
  { icon: Shield,    label: "Security Best Practices", desc: "Audit logs, password policy, MFA setup",   href: "#" },
  { icon: Database,  label: "Backup & Recovery",       desc: "Disaster-recovery playbook",                href: "#" },
  { icon: FileText,  label: "Reporting Guide",         desc: "Generating audit-ready reports",            href: "#" },
];

const VIDEO_GUIDES = [
  { title: "Adding your first user",       duration: "2 min", color: "bg-blue-50 border-blue-200",    icon: Users },
  { title: "Running a backup & restore",   duration: "4 min", color: "bg-purple-50 border-purple-200", icon: Database },
  { title: "Reading the audit log",        duration: "3 min", color: "bg-green-50 border-green-200",   icon: Activity },
  { title: "Generating compliance reports",duration: "5 min", color: "bg-amber-50 border-amber-200",   icon: FileText },
];

// ═════════════════════════════════════════════════════════════════════════════
// Contact Engineering Modal
// ═════════════════════════════════════════════════════════════════════════════
function ContactModal({ onClose, onSent }) {
  const [form, setForm] = useState({ priority: "normal", subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const isValid = form.subject.trim() && form.message.trim();

  const handle = async () => {
    if (!isValid) return;
    setBusy(true); setError(null);
    try {
      const fresh = await createTicket(form);
      onSent(fresh.ticket_id);
    } catch (err) {
      setError(formatApiError(err, "Could not send the message."));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Send className="h-4 w-4 text-deep-ocean" /> Contact Engineering
          </h2>
          <button onClick={onClose} disabled={busy} className="p-2 rounded-lg hover:bg-slate-100 cursor-pointer">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <p className="text-sm text-slate-600">
            Open a ticket with the engineering team. Your message is recorded in the ticket system
            and assigned a tracking ID.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Priority</label>
            <div className="flex gap-2">
              {[
                { value: "normal",   label: "Normal",   color: "border-blue-200    bg-blue-50    text-blue-700" },
                { value: "urgent",   label: "Urgent",   color: "border-orange-200 bg-orange-50  text-orange-700" },
                { value: "critical", label: "Critical", color: "border-red-200    bg-red-50     text-red-700" },
              ].map(p => (
                <button key={p.value}
                  onClick={() => setForm(f => ({ ...f, priority: p.value }))}
                  className={`flex-1 px-3 py-2 rounded-lg border-2 text-xs font-semibold uppercase transition-all cursor-pointer
                    ${form.priority === p.value
                      ? `${p.color} ring-2 ring-offset-1 ring-deep-ocean/30`
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Subject <span className="text-red-500">*</span>
            </label>
            <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              placeholder="Short summary of the issue"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean" />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              rows={6}
              placeholder="Describe what's happening, what you expected, and any error messages…"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean resize-none" />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} disabled={busy}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
            Cancel
          </button>
          <button onClick={handle} disabled={!isValid || busy}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 text-white
              ${(!isValid || busy)
                ? "bg-deep-ocean/40 cursor-not-allowed"
                : "bg-deep-ocean hover:bg-deep-ocean-900 cursor-pointer"}`}>
            {busy
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
              : <><Send className="h-4 w-4" /> Send Ticket</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function AdminHelpPage() {
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState("user-mgmt");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState({});
  const [showContact, setShowContact] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const visibleFaqs = (FAQS[activeCategory] || []).filter(f => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-10">
      <Header />

      <main className="max-w-6xl mx-auto px-4 lg:px-6 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500">
          <button onClick={() => navigate("/admin")}
            className="flex items-center gap-1.5 hover:text-slate-800 transition-colors cursor-pointer">
            <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
          </button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-800 font-medium">Help</span>
        </nav>

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-deep-ocean" /> Admin Help & Documentation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Guides, FAQs, and contact details for administrators
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search the help center…"
            className="w-full pl-10 pr-3 py-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean/30 focus:border-deep-ocean" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Category sidebar */}
          <Card className="lg:col-span-1 p-2 h-fit">
            {CATEGORIES.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setActiveCategory(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
                  ${activeCategory === id
                    ? "bg-deep-ocean text-white"
                    : "text-slate-600 hover:bg-slate-100"}`}>
                <Icon className="h-4 w-4 shrink-0" /> {label}
              </button>
            ))}
          </Card>

          {/* FAQ panel */}
          <Card className="lg:col-span-3 p-5 space-y-3">
            <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Book className="h-4 w-4 text-deep-ocean" />
              {CATEGORIES.find(c => c.id === activeCategory)?.label}
            </h2>

            {visibleFaqs.length === 0 ? (
              <p className="text-sm text-slate-500 py-10 text-center">
                No FAQs match your search. Try a different keyword or contact engineering below.
              </p>
            ) : visibleFaqs.map((faq, i) => {
              const key = `${activeCategory}-${i}`;
              const isOpen = expanded[key];
              return (
                <div key={key} className="border border-slate-200 rounded-lg overflow-hidden">
                  <button onClick={() => setExpanded(s => ({ ...s, [key]: !isOpen }))}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 cursor-pointer">
                    <span className="text-sm font-medium text-slate-800">{faq.q}</span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">{faq.a}</div>
                  )}
                </div>
              );
            })}
          </Card>
        </div>

        {/* Quick links */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Quick Links
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {QUICK_LINKS.map(l => (
              <a key={l.label} href={l.href}
                className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-deep-ocean/30 hover:shadow-sm transition-all">
                <l.icon className="h-5 w-5 text-deep-ocean shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                    {l.label}
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{l.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Video guides */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Video Tutorials
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {VIDEO_GUIDES.map(v => (
              <div key={v.title}
                className={`p-4 rounded-xl border-2 ${v.color} hover:shadow-sm cursor-pointer transition-all`}>
                <div className="flex items-center justify-between mb-3">
                  <v.icon className="h-5 w-5 text-slate-700" />
                  <PlayCircle className="h-5 w-5 text-slate-500" />
                </div>
                <p className="font-semibold text-sm text-slate-800">{v.title}</p>
                <p className="text-xs text-slate-500 mt-1">{v.duration}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <Card className="p-6 bg-deep-ocean/5 border-deep-ocean/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-deep-ocean/10">
                <MessageSquare className="h-6 w-6 text-deep-ocean" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Need more help?</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Open a ticket with the engineering team. We typically reply within 4 working hours.
                </p>
              </div>
            </div>
            <button onClick={() => setShowContact(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-deep-ocean text-white text-sm font-semibold hover:bg-deep-ocean-900 cursor-pointer self-start sm:self-center">
              <Mail className="h-4 w-4" /> Contact Engineering
            </button>
          </div>
        </Card>
      </main>

      {/* Contact modal */}
      {showContact && (
        <ContactModal
          onClose={() => setShowContact(false)}
          onSent={(id) => {
            setShowContact(false);
            showToast(`Ticket ${id} created. Engineering will reply shortly.`);
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border bg-emerald-50 border-emerald-200 text-emerald-800 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4" /> {toast}
        </div>
      )}
    </div>
  );
}
