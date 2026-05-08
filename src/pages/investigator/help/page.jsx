import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, ChevronDown, ChevronRight, BookOpen, Keyboard,
    FolderOpen, Map, Brain, FileText, Bell, Shield,
    ArrowLeft, LayoutDashboard, HelpCircle, PlayCircle,
    AlertTriangle, Users, Crosshair
} from 'lucide-react';
import Header from '@/components/Header';
import { Card } from '@/components/ui/Card';

// ── Data ──────────────────────────────────────────────────────────────────────

const CATEGORIES = [
    { id: 'cases', icon: FolderOpen, label: 'Case Management' },
    { id: 'search', icon: Search, label: 'Search & Filters' },
    { id: 'map', icon: Map, label: 'Crime Map' },
    { id: 'ai', icon: Brain, label: 'AI & Leads' },
    { id: 'reports', icon: FileText, label: 'Reports' },
    { id: 'account', icon: Shield, label: 'Account & Security' },
];

const GUIDES = [
    {
        title: 'Registering your first case',
        duration: '3 min',
        color: 'bg-blue-50  border-blue-200',
        icon: FolderOpen,
        src: '/videos/sample.mp4',
        description: 'Learn how to upload an FIR and register a new case in the system.',
    },
    {
        title: 'Using the AI lead generator',
        duration: '5 min',
        color: 'bg-purple-50 border-purple-200',
        icon: Brain,
        src: '/videos/sample.mp4',
        description: 'See how the AI extracts suspects, locations, and generates leads.',
    },
    {
        title: 'Reading the crime hotspot map',
        duration: '2 min',
        color: 'bg-green-50 border-green-200',
        icon: Crosshair,
        src: '/videos/sample.mp4',
        description: 'Navigate the map, filter hotspots, and fly to crime locations.',
    },
]

const FAQS = {
    cases: [
        {
            q: 'How do I register a new case?',
            a: 'Go to File → New Case from the top navigation, or click the "Register New Case" button on the All Cases page. Fill in the FIR details and submit. The AI will automatically extract entities like suspects, locations, and dates from the FIR text.',
        },
        {
            q: 'How do I change a case status?',
            a: 'Open the case detail page, then click the status badge (e.g. "Under Investigation") in the case header. A dropdown will appear with available status options: Active, Pending, Closed, Archived.',
        },
        {
            q: 'What are the case tabs for?',
            a: 'Each tab shows a different aspect of the case — Timeline (chronological events), Victims, Witnesses, Suspects, Leads (AI-generated), Linked Cases (related cases), and Location (crime scene map).',
        },
        {
            q: 'How do I link two cases together?',
            a: 'In the Linked Cases tab, click "Add Linked Case" and search by Case ID or suspect name. Cases are also linked automatically by the AI when shared suspects, weapons, or locations are detected.',
        },
    ],
    search: [
        {
            q: 'How do I search for a case?',
            a: 'Use the search bar in the header — type a case ID, suspect name, crime type, or location and press Enter. You can also go to the Search page for advanced multi-category filtering.',
        },
        {
            q: 'Can I filter results by multiple criteria?',
            a: 'Yes. On the Search Results page, use the filter panel to combine crime type, date range, severity, and status. Results update in real time as you apply filters.',
        },
        {
            q: 'How does the category tab bar work on search?',
            a: 'The tabs (All / Cases / Suspects / Victims / Witnesses / Leads / Locations) let you narrow results to a specific entity type. The count badge on each tab shows how many matches exist in that category.',
        },
    ],
    map: [
        {
            q: 'How do I use the crime hotspot map?',
            a: 'The map on the dashboard shows all active crime hotspots. Red markers = high severity, orange = medium, yellow = low. Click any marker to see a popup with city, province, and case count. Click a city in the Top Hotspots sidebar to fly to it.',
        },
        {
            q: 'The map is not loading tiles — what do I do?',
            a: 'You are likely offline. The map uses cached tiles that are saved automatically when you first view the map while online. Pan around Pakistan at zoom levels 5–10 while connected to pre-cache tiles for offline use.',
        },
        {
            q: 'How do I see the crime scene location for a specific case?',
            a: 'Open the case detail page and click the Location tab. The map will be centered on the crime scene with a red pin. Blue pins show nearby cases in the same area.',
        },
        {
            q: 'How do I reset the map view?',
            a: 'Click the crosshair/locate button (⊕) below the zoom controls on the top-right of the map. It smoothly flies back to the initial center and zoom level.',
        },
    ],
    ai: [
        {
            q: 'How are AI leads generated?',
            a: 'When a case is submitted, the AI analyses the FIR text using NLP to extract named entities (suspects, weapons, locations, dates). It then cross-references these against the case database to identify patterns and generate investigative leads.',
        },
        {
            q: 'How do I act on an AI lead?',
            a: 'Go to the Leads tab on the case page. Each lead shows a confidence score, type, and description. You can flag a lead for follow-up, dismiss it, or link it to another case using the action buttons on the right.',
        },
        {
            q: 'Can I trust the AI leads?',
            a: 'AI leads are suggestions, not conclusions. Always verify with manual investigation. High-confidence leads (>80%) have stronger evidence backing. Leads marked "Unverified" require human review before acting on them.',
        },
    ],
    reports: [
        {
            q: 'How do I generate a case report?',
            a: 'Go to Reports → Generate Report from the navigation, or use the Generate Report button on a case detail page. Select the report type (Summary, Evidence, Lead, Full), preview it, then export as PDF.',
        },
        {
            q: 'Can I export map data?',
            a: 'Yes. On the Analytics page, crime trend charts and hotspot maps can be exported as PNG images or CSV data using the export button in the top-right of each chart.',
        },
    ],
    account: [
        {
            q: 'How do I change my password?',
            a: 'Go to Settings → Profile from the navigation. Scroll to the Security section and click "Change Password". You will need to enter your current password to confirm.',
        },
        {
            q: 'What does Remember Me do on login?',
            a: 'When checked, your session is stored in localStorage and persists across browser restarts until the token expires. When unchecked, the session is stored in sessionStorage and clears when you close the browser.',
        },
        {
            q: 'Who can see my cases?',
            a: 'Cases are visible to all investigators by default. Admins can restrict case visibility by role. Sensitive cases can be marked confidential, which limits access to the assigned investigator and admins only.',
        },
    ],
};

const SHORTCUTS = [
    { keys: ['Ctrl', 'K'], action: 'Open search' },
    { keys: ['Ctrl', 'N'], action: 'Register new case' },
    { keys: ['Ctrl', 'D'], action: 'Go to dashboard' },
    { keys: ['Ctrl', '/'], action: 'Open help' },
    { keys: ['Esc'], action: 'Close modal / go back' },
    { keys: ['Enter'], action: 'Submit search' },
    { keys: ['Tab'], action: 'Navigate between fields' },
    { keys: ['Ctrl', 'P'], action: 'Print / export report' },
];

const QUICK_LINKS = [
    { icon: FolderOpen, label: 'All Cases', path: '/investigator/cases' },
    { icon: Search, label: 'Search Cases', path: '/search-case' },
    { icon: FileText, label: 'Generate Report', path: '/investigator/report' },
    { icon: Map, label: 'Crime Map', path: '/investigator' },
    { icon: AlertTriangle, label: 'Register Case', path: '/register-case' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

const FAQItem = ({ q, a }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-slate-50 transition-colors"
            >
                <span className="text-sm font-semibold text-slate-800 pr-4">{q}</span>
                <ChevronDown className={`h-4 w-4 text-slate-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="px-5 pb-4 bg-slate-50 border-t border-slate-200">
                    <p className="text-sm text-slate-600 leading-relaxed pt-3">{a}</p>
                </div>
            )}
        </div>
    );
};

const KeyBadge = ({ k }) => (
    <kbd className="inline-flex items-center px-2 py-0.5 rounded border border-slate-300 bg-white text-xs font-mono text-slate-700 shadow-sm">
        {k}
    </kbd>
);

// ── Main page ─────────────────────────────────────────────────────────────────

const HelpPage = () => {
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState('cases');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeVideo, setActiveVideo] = useState(null)
    const [showContact, setShowContact] = useState(false);
    const [contactForm, setContactForm] = useState({ subject: '', message: '', priority: 'normal' });
    const [submitted, setSubmitted] = useState(false);

    const faqs = FAQS[activeCategory] || [];

    const filteredFaqs = searchQuery.trim()
        ? Object.values(FAQS).flat().filter(f =>
            f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.a.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : faqs;

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') setActiveVideo(null);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const handleSubmit = () => {
        if (!contactForm.subject.trim() || !contactForm.message.trim()) return;
        // TODO: replace with real API call → POST /api/admin/contact
        console.log('Contact admin:', contactForm);
        setSubmitted(true);
    };

    const handleClose = () => {
        setShowContact(false);
        setSubmitted(false);
        setContactForm({ subject: '', message: '', priority: 'normal' });
    };

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-900 mt-14">
            <Header />

            <main className="max-w-6xl mx-auto px-4 lg:px-6 py-8 space-y-8">

                {/* Breadcrumb + back buttons */}
                <div className="flex items-center justify-between">
                    <nav className="flex items-center gap-1.5 text-xs text-slate-500">
                        <button onClick={() => navigate('/investigator')} className="hover:text-slate-800 transition-colors cursor-pointer">Dashboard</button>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-slate-800 font-medium">Help & Documentation</span>
                    </nav>
                </div>

                {/* Hero banner */}
                <div className="rounded-xl bg-deep-ocean px-8 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <HelpCircle className="h-5 w-5 text-blue-300" />
                            <span className="text-blue-300 text-sm font-medium uppercase tracking-wider">Documentation</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white">Help Center</h1>
                        <p className="text-slate-300 text-sm mt-1">Find answers, learn shortcuts, and get the most out of the system.</p>
                    </div>
                    {/* Search inside help */}
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search help articles…"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/15 transition-all"
                        />
                    </div>
                </div>

                {/* Quick links */}
                <section>
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Links</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {QUICK_LINKS.map(({ icon: Icon, label, path }) => (
                            <button
                                key={label}
                                onClick={() => navigate(path)}
                                className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg border border-slate-200 hover:border-deep-ocean hover:shadow-md transition-all group"
                            >
                                <Icon className="h-5 w-5 text-slate-400 group-hover:text-deep-ocean transition-colors" />
                                <span className="text-xs font-medium text-slate-600 group-hover:text-deep-ocean text-center leading-tight">{label}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* FAQ section */}
                <section>
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        {searchQuery ? `Search results for "${searchQuery}"` : 'Frequently Asked Questions'}
                    </h2>

                    <div className="flex flex-col lg:flex-row gap-4">

                        {/* Category sidebar — hidden when searching */}
                        {!searchQuery && (
                            <div className="lg:w-52 shrink-0">
                                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                    {CATEGORIES.map(({ id, icon: Icon, label }) => (
                                        <button
                                            key={id}
                                            onClick={() => setActiveCategory(id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-b border-slate-100 last:border-0
                                                ${activeCategory === id
                                                    ? 'bg-deep-ocean text-white'
                                                    : 'text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            <Icon className="h-4 w-4 shrink-0" />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* FAQ list */}
                        <div className="flex-1 space-y-2">
                            {filteredFaqs.length === 0 ? (
                                <div className="bg-white rounded-lg border border-slate-200 px-6 py-10 text-center">
                                    <HelpCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-slate-500">No results found for "{searchQuery}"</p>
                                    <p className="text-xs text-slate-400 mt-1">Try different keywords</p>
                                </div>
                            ) : (
                                filteredFaqs.map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} />)
                            )}
                        </div>
                    </div>
                </section>

                {/* Keyboard shortcuts */}
                <section>
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Keyboard className="h-4 w-4" /> Keyboard Shortcuts
                    </h2>
                    <Card className="p-0 overflow-hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                            {SHORTCUTS.map(({ keys, action }, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors
                                        ${i >= 2 ? 'border-t border-slate-100' : ''}`}
                                >
                                    <span className="text-sm text-slate-700">{action}</span>
                                    <div className="flex items-center gap-1">
                                        {keys.map((k, j) => (
                                            <span key={j} className="flex items-center gap-1">
                                                <KeyBadge k={k} />
                                                {j < keys.length - 1 && <span className="text-slate-400 text-xs">+</span>}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </section>

                {/* Getting started video placeholder */}
                <section>
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <PlayCircle className="h-4 w-4" /> Getting Started
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {GUIDES.map(({ title, duration, color, icon: Icon, src, description }) => (
                            <div key={title} className={`rounded-lg border ${color} p-5 flex items-start gap-4 cursor-pointer hover:shadow-md transition-shadow`}
                                onClick={() => setActiveVideo({ title, src, description })}>
                                <div className="p-2 bg-white rounded-lg border border-slate-200 shrink-0">
                                    <Icon className="h-5 w-5 text-deep-ocean" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">{title}</p>
                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                        <PlayCircle className="h-3 w-3" /> {duration} guide
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">{description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Contact / support footer */}
                <section className="rounded-xl border border-slate-200 bg-white px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-semibold text-slate-800">Still need help?</p>
                        <p className="text-xs text-slate-500 mt-0.5">Contact your system administrator or raise a support ticket.</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-deep-ocean text-white text-sm font-medium hover:bg-[#162f42] transition-colors shrink-0"
                    onClick={()=> setShowContact(true)}>
                        <Bell className="h-4 w-4" /> Contact Admin
                    </button>
                </section>

            </main>

            {/* Video Modal */}
            {activeVideo && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={() => setActiveVideo(null)}  // click backdrop to close
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden"
                        onClick={e => e.stopPropagation()}  // prevent closing when clicking inside
                    >
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">{activeVideo.title}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{activeVideo.description}</p>
                            </div>
                            <button
                                onClick={() => setActiveVideo(null)}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Video player */}
                        <div className="bg-black aspect-video">
                            <video
                                key={activeVideo.src}   // remounts player when switching videos
                                src={activeVideo.src}
                                controls
                                autoPlay
                                className="w-full h-full"
                                onError={() => alert('Video file not found. Add .mp4 files to public/videos/')}
                            >
                                Your browser does not support the video tag.
                            </video>
                        </div>

                        {/* Modal footer */}
                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                            <button
                                onClick={() => setActiveVideo(null)}
                                className="px-4 py-2 rounded-lg bg-deep-ocean text-white text-sm font-medium hover:bg-[#162f42] transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Contact Admin Modal */}
            {showContact && (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
    >
        <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-deep-ocean">
                <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-blue-300" />
                    <h3 className="text-base font-bold text-white">Contact Administrator</h3>
                </div>
                <button
                    onClick={handleClose}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 text-white transition-colors"
                >
                    ✕
                </button>
            </div>

            {submitted ? (
                /* ── Success state ── */
                <div className="px-6 py-10 text-center">
                    <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h4 className="text-base font-bold text-slate-800">Message Sent</h4>
                    <p className="text-sm text-slate-500 mt-1">
                        Your message has been sent to the administrator. You will be notified when they respond.
                    </p>
                    <button
                        onClick={handleClose}
                        className="mt-6 px-5 py-2 rounded-lg bg-deep-ocean text-white text-sm font-medium hover:bg-[#162f42] transition-colors"
                    >
                        Done
                    </button>
                </div>
            ) : (
                /* ── Form state ── */
                <div className="px-6 py-5 space-y-4">
                    <p className="text-xs text-slate-500">
                        Send a message to the system administrator. They will respond via the notifications panel.
                    </p>

                    {/* Priority */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Priority</label>
                        <div className="flex gap-2">
                            {[
                                { value: 'normal',  label: 'Normal',  color: 'bg-blue-50   border-blue-300   text-blue-700'   },
                                { value: 'urgent',  label: 'Urgent',  color: 'bg-orange-50 border-orange-300 text-orange-700' },
                                { value: 'critical',label: 'Critical',color: 'bg-red-50    border-red-300    text-red-700'    },
                            ].map(p => (
                                <button
                                    key={p.value}
                                    onClick={() => setContactForm(f => ({ ...f, priority: p.value }))}
                                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all
                                        ${contactForm.priority === p.value
                                            ? p.color + ' ring-2 ring-offset-1 ring-current'
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                        }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Subject</label>
                        <input
                            type="text"
                            placeholder="e.g. Cannot access case C-2053"
                            value={contactForm.subject}
                            onChange={e => setContactForm(f => ({ ...f, subject: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-deep-ocean focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Message */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Message</label>
                        <textarea
                            rows={4}
                            placeholder="Describe your issue or question in detail…"
                            value={contactForm.message}
                            onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-deep-ocean focus:border-transparent transition-all resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={handleClose}
                            className="flex-1 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!contactForm.subject.trim() || !contactForm.message.trim()}
                            className="flex-1 py-2 rounded-lg bg-deep-ocean text-white text-sm font-medium hover:bg-[#162f42] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            Send Message
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
)}
        </div>
    );
};

export default HelpPage;