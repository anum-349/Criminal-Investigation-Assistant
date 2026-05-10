import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import {
    User, Shield, Bell, Lock, Eye, EyeOff,
    ChevronRight, LayoutDashboard,
    Camera, Check, AlertTriangle,
    LogOut, Key, ToggleLeft, ToggleRight
} from 'lucide-react';
import Header from '@/components/Header';
import { Card } from '@/components/ui/Card';
import { AuthContext } from '@/context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;

const getAuthHeader = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// ── Tab definitions ────────────────────────────────────────────────────────────
const TABS = [
    { id: 'profile', label: 'Personal Info', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Bell },
];

// ── Reusable field ─────────────────────────────────────────────────────────────
const Field = ({ label, value, onChange, type = 'text', disabled = false, hint }) => (
    <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</label>
        <input
            type={type}
            value={value ?? ''}
            onChange={onChange}
            disabled={disabled}
            className={`w-full px-3 py-2.5 rounded-lg border text-sm transition-all focus:outline-none
                ${disabled
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white border-slate-300 text-slate-800 focus:ring-2 focus:ring-deep-ocean focus:border-transparent'
                }`}
        />
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
);

// ── Toggle ─────────────────────────────────────────────────────────────────────
const Toggle = ({ label, description, value, onChange }) => (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-slate-100 last:border-0">
        <div>
            <p className="text-sm font-medium text-slate-800">{label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
        <button onClick={() => onChange(!value)} className="shrink-0 mt-0.5 cursor-pointer">
            {value
                ? <ToggleRight className="h-6 w-6 text-deep-ocean" />
                : <ToggleLeft className="h-6 w-6 text-slate-300" />
            }
        </button>
    </div>
);

// ── Toast ──────────────────────────────────────────────────────────────────────
const Toast = ({ message, type }) => (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium
        ${type === 'success' ? 'bg-green-700 text-white' : 'bg-red-700 text-white'}`}>
        {type === 'success' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        {message}
    </div>
);

const photoSrc = (rawUrl) => {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('http')) return rawUrl;
    if (rawUrl.startsWith('/uploads')) return `${import.meta.env.VITE_API_URL}${rawUrl}`;
    return rawUrl;
};

// ═══════════════════════════════════════════════════════════════════════════════
const ProfilePage = () => {
    const navigate = useNavigate();
    const { logout } = useContext(AuthContext);

    const getTokenData = () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) return {};
        try { return jwtDecode(token); }
        catch { return {}; }
    };
    const tokenData = getTokenData();

    const [activeTab, setActiveTab] = useState('profile');
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ── Profile state ──────────────────────────────────────────────────────────
    // User fields (from /api/auth/me + investigator profile)
    const [profile, setProfile] = useState({
        username: '',
        badge_number: '',
        email: '',
        contact_info: '',
        address: '',
        picture_url: '',
        role: tokenData.role || 'investigator',
        department: '',
        rank: '',
        shift: '',
        specialization: '',
    });
    const [profileLoading, setProfileLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            setFetchLoading(true);
            try {
                const meRes = await axios.get(`${API_URL}/api/auth/investigator/profile`, {
                    headers: getAuthHeader(),
                });
                const me = meRes.data;

                setProfile(prev => ({
                    ...prev,
                    username: me.user.username || '',
                    badge_number: me.user.badge_number || '',
                    email: me.user.email || '',
                    contact_info: me.user.contact_info || '',
                    address: me.user.address || '',
                    picture_url: me.user.picture_url || '',
                    role: me.user.role || 'investigator',
                    department: me.investigator.department || '',
                    rank: me.investigator.rank || '',
                    shift: me.investigator.shift || '',
                    specialization: me.investigator.specialization || ''
                }));
            } catch (err) {
                console.error('Failed to load profile:', err);
                showToast('Could not load profile data', 'error');
            } finally {
                setFetchLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleProfileSave = async () => {
        setProfileLoading(true);
        try {
            // 1. Update common user fields via PUT /api/auth/profile
            await axios.put(
                `${API_URL}/api/auth/profile`,
                {
                    email: profile.email || undefined,
                    contact_info: profile.contact_info || undefined,
                    address: profile.address || undefined,
                    picture_url: profile.picture_url || undefined,
                },
                { headers: getAuthHeader() }
            );

            // 2. If investigator, also update investigator-specific fields
            if (profile.role === 'investigator') {
                await axios.put(
                    `${API_URL}/api/auth/investigator/profile`,
                    {
                        email: profile.email || undefined,
                        contact_info: profile.contact_info || undefined,
                        address: profile.address || undefined,
                        picture_url: profile.picture_url || undefined,
                        department: profile.department || undefined,
                        rank: profile.rank || undefined,
                        shift: profile.shift || undefined,
                        specialization: profile.specialization || undefined,
                    },
                    { headers: getAuthHeader() }
                );
            }

            showToast('Profile updated successfully');
        } catch (err) {
            const msg = err?.response?.data?.detail || 'Failed to update profile';
            showToast(msg, 'error');
        } finally {
            setProfileLoading(false);
        }
    };

    const handleImageUpload = async (file) => {
        // 1. Convert to base64 data URL
        const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        // 2. Send as JSON (matches your existing evidence pattern exactly)
        const res = await axios.put(`${API_URL}/api/auth/investigator/profile/picture`,
            { data_url: dataUrl },
            { headers: getAuthHeader() }
        );

        const data = res.data
        setProfile(prev => ({ ...prev, picture_url: data.picture_url }));
    };

    // ── Password state ─────────────────────────────────────────────────────────
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
    const [pwLoading, setPwLoading] = useState(false);

    const passwordStrength = (pw) => {
        if (!pw) return 0;
        let score = 0;
        if (pw.length >= 8) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        return score;
    };
    const strength = passwordStrength(passwords.new);
    const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const strengthColor = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];

    const handlePasswordChange = async () => {
        if (passwords.new !== passwords.confirm) {
            showToast('New passwords do not match', 'error');
            return;
        }
        if (strength < 2) {
            showToast('Password is too weak — add uppercase letters, numbers, or symbols', 'error');
            return;
        }
        setPwLoading(true);
        try {
            await axios.post(
                `${API_URL}/api/auth/change-password`,
                {
                    current_password: passwords.current,
                    new_password: passwords.new,
                },
                { headers: getAuthHeader() }
            );
            showToast('Password changed successfully');
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err) {
            const msg = err?.response?.data?.detail || 'Failed to change password';
            showToast(msg, 'error');
        } finally {
            setPwLoading(false);
        }
    };

    // ── Preferences state ──────────────────────────────────────────────────────
    const [prefs, setPrefs] = useState({
        email_notifications: true,
        case_update_alerts: true,
        ai_lead_notifications: true,
        sound_alerts: false,
        auto_save_drafts: true,
    });
    const [prefsLoading, setPrefsLoading] = useState(false);
    const [prefsFetching, setPrefsFetching] = useState(false);

    useEffect(() => {
        const fetchPrefs = async () => {
            setPrefsFetching(true);
            try {
                const res = await axios.get(`${API_URL}/api/auth/preferences`, {
                    headers: getAuthHeader(),
                });
                setPrefs(res.data.preferences);
            } catch {
                // fall through — defaults stay in place
            } finally {
                setPrefsFetching(false);
            }
        };
        fetchPrefs();
    }, []);

    const setPref = (key) => (val) => setPrefs(p => ({ ...p, [key]: val }));

    const handlePrefsSave = async () => {
        setPrefsLoading(true);
        try {
            const res = await axios.put(
                `${API_URL}/api/auth/preferences`,
                { preferences: prefs },
                { headers: getAuthHeader() },
            );
            setPrefs(res.data.preferences);   // sync with server-returned values
            showToast('Preferences saved');
        } catch (err) {
            const msg = err?.response?.data?.detail || 'Failed to save preferences';
            showToast(msg, 'error');
        } finally {
            setPrefsLoading(false);
        }
    };

    const handleLogout = () => { logout(); navigate('/'); };

    // Avatar: use picture_url if set, else initials
    const initials = profile.username
        ? profile.username.slice(0, 2).toUpperCase()
        : (tokenData.role === 'admin' ? 'AD' : 'IN');

    return (
        <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-14 py-4">
            <Header />

            <main className="max-w-6xl mx-auto px-4 lg:px-6 py-8 space-y-6 bg-white/70 rounded-lg border border-slate-300 shadow-sm">

                {/* Breadcrumb */}
                <div className="flex items-center justify-between">
                    <nav className="flex items-center gap-1.5 text-xs text-slate-500">
                        <button
                            onClick={() => navigate('/investigator')}
                            className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <LayoutDashboard className="h-3.5 w-3.5" />
                            Dashboard
                        </button>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-slate-800 font-medium">Profile</span>
                    </nav>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                    {/* ── Left sidebar ── */}
                    <div className="space-y-4">
                        <Card className="p-5 text-center space-y-3">
                            <div className="relative inline-block">
                                <div className="w-20 h-20 rounded-full bg-deep-ocean flex items-center justify-center mx-auto text-white text-2xl font-bold overflow-hidden">
                                    {profile.picture_url
                                        ? <img src={photoSrc(profile.picture_url)} alt="Profile" style={{ width: 100, borderRadius: "50%" }} />
                                        : <span>{initials}</span>
                                    }
                                </div>
                                <input
                                    id="avatar-upload"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(e) => {
                                        if (e.target.files[0]) handleImageUpload(e.target.files[0]);
                                    }}
                                    className="hidden"
                                />
                                <label
                                    htmlFor="avatar-upload"
                                    className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    <Camera className="h-3 w-3 text-slate-600" />
                                </label>
                            </div>
                            <div>
                                <p className="font-bold text-slate-800">{profile.username || 'Investigator'}</p>
                                <p className="text-xs text-slate-500">{profile.rank || profile.role}</p>
                                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-deep-ocean text-white uppercase tracking-wide">
                                    {profile.role || 'investigator'}
                                </span>
                            </div>
                            <div className="border-t border-slate-100 pt-3 space-y-1 text-xs text-slate-500">
                                <p>Badge: <span className="font-medium text-slate-700">{profile.badge_number || '—'}</span></p>
                                <p>Dept: <span className="font-medium text-slate-700">{profile.department || '—'}</span></p>
                            </div>
                        </Card>

                        <Card className="p-2">
                            {TABS.map(({ id, label, icon: Icon }) => (
                                <button key={id} onClick={() => setActiveTab(id)}
                                    className={`w-full flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                                        ${activeTab === id ? 'bg-deep-ocean text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                                    <Icon className="h-4 w-4 shrink-0" />
                                    {label}
                                </button>
                            ))}
                            <div className="border-t border-slate-100 mt-2 pt-2">
                                <button onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                                    <LogOut className="h-4 w-4 shrink-0" />
                                    Sign Out
                                </button>
                            </div>
                        </Card>
                    </div>

                    {/* ── Right content ── */}
                    <div className="lg:col-span-3 space-y-4">

                        {/* ── PERSONAL INFO TAB ── */}
                        {activeTab === 'profile' && (
                            <Card className="p-6 space-y-6">
                                <div className="border-b border-slate-200 pb-4">
                                    <h2 className="text-lg font-bold text-slate-800">Personal Information</h2>
                                    <p className="text-sm text-slate-500 mt-0.5">Update your contact details and investigator information.</p>
                                </div>

                                {fetchLoading ? (
                                    <div className="flex items-center justify-center py-10 text-slate-400 text-sm">
                                        <span className="w-5 h-5 border-2 border-slate-300 border-t-deep-ocean rounded-full animate-spin mr-2" />
                                        Loading profile…
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Field
                                                label="Username"
                                                value={profile.username}
                                                disabled
                                                hint="Username cannot be changed"
                                            />
                                            <Field
                                                label="Badge Number"
                                                value={profile.badge_number}
                                                disabled
                                                hint="Badge number cannot be changed"
                                            />
                                            <Field
                                                label="Email Address"
                                                type="email"
                                                value={profile.email}
                                                onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                                            />
                                            <Field
                                                label="Contact / Phone"
                                                value={profile.contact_info}
                                                onChange={e => setProfile(p => ({ ...p, contact_info: e.target.value }))}
                                            />
                                            <Field
                                                label="Role"
                                                value={profile.role}
                                                disabled
                                                hint="Role is assigned by administrator"
                                            />
                                            <Field
                                                label="Address"
                                                value={profile.address}
                                                onChange={e => setProfile(p => ({ ...p, address: e.target.value }))}
                                            />
                                        </div>

                                        {/* Investigator-only fields */}
                                        {profile.role === 'investigator' && (
                                            <>
                                                <div className="border-t border-slate-100 pt-4">
                                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Investigator Details</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <Field
                                                            label="Rank / Designation"
                                                            value={profile.rank}
                                                            onChange={e => setProfile(p => ({ ...p, rank: e.target.value }))}
                                                            hint="e.g. Inspector, Sub-Inspector"
                                                        />
                                                        <Field
                                                            label="Department"
                                                            value={profile.department}
                                                            onChange={e => setProfile(p => ({ ...p, department: e.target.value }))}
                                                            hint="e.g. Homicide, Cybercrime"
                                                        />
                                                        <Field
                                                            label="Shift"
                                                            value={profile.shift}
                                                            onChange={e => setProfile(p => ({ ...p, shift: e.target.value }))}
                                                            hint="e.g. Morning, Evening, Night"
                                                        />
                                                        <Field
                                                            label="Specialization"
                                                            value={profile.specialization}
                                                            onChange={e => setProfile(p => ({ ...p, specialization: e.target.value }))}
                                                            hint="e.g. Forensics, Narcotics"
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        <div className="flex justify-end pt-2">
                                            <button
                                                onClick={handleProfileSave}
                                                disabled={profileLoading}
                                                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-deep-ocean text-white text-sm font-medium hover:bg-[#162f42] disabled:opacity-50 transition-colors cursor-pointer"
                                            >
                                                {profileLoading
                                                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    : <Check className="h-4 w-4" />
                                                }
                                                {profileLoading ? 'Saving…' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </Card>
                        )}

                        {/* ── SECURITY TAB ── */}
                        {activeTab === 'security' && (
                            <Card className="p-6 space-y-5">
                                <div className="border-b border-slate-200 pb-4">
                                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <Key className="h-5 w-5 text-slate-600" /> Change Password
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        Must be at least 8 characters with uppercase, lowercase, and a number.
                                    </p>
                                </div>

                                {/* Current password */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Current Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPw.current ? 'text' : 'password'}
                                            value={passwords.current}
                                            onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
                                            className="w-full px-3 py-2.5 pr-10 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean focus:border-transparent"
                                            placeholder="Enter current password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw(p => ({ ...p, current: !p.current }))}
                                            className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPw.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* New password */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPw.new ? 'text' : 'password'}
                                            value={passwords.new}
                                            onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))}
                                            className="w-full px-3 py-2.5 pr-10 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-deep-ocean focus:border-transparent"
                                            placeholder="Enter new password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw(p => ({ ...p, new: !p.new }))}
                                            className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPw.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {passwords.new && (
                                        <div className="space-y-1">
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4].map(i => (
                                                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors
                                                        ${i <= strength ? strengthColor[strength] : 'bg-slate-200'}`} />
                                                ))}
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                Strength: <span className="font-medium">{strengthLabel[strength]}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm password */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Confirm New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPw.confirm ? 'text' : 'password'}
                                            value={passwords.confirm}
                                            onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                                            className={`w-full px-3 py-2.5 pr-10 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-colors
                                                ${passwords.confirm && passwords.new !== passwords.confirm
                                                    ? 'border-red-400 focus:ring-red-400'
                                                    : 'border-slate-300 focus:ring-deep-ocean'}`}
                                            placeholder="Confirm new password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))}
                                            className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPw.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    {passwords.confirm && passwords.new !== passwords.confirm && (
                                        <p className="text-xs text-red-500">Passwords do not match</p>
                                    )}
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        onClick={handlePasswordChange}
                                        disabled={pwLoading || !passwords.current || !passwords.new || !passwords.confirm}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-deep-ocean text-white text-sm font-medium hover:bg-[#162f42] disabled:opacity-50 transition-colors cursor-pointer"
                                    >
                                        {pwLoading
                                            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            : <Lock className="h-4 w-4" />
                                        }
                                        {pwLoading ? 'Updating…' : 'Update Password'}
                                    </button>
                                </div>
                            </Card>
                        )}

                        {/* ── PREFERENCES TAB ── */}
                        {activeTab === 'preferences' && (
                            <Card className="p-6 space-y-5">
                                <div className="border-b border-slate-200 pb-4">
                                    <h2 className="text-lg font-bold text-slate-800">Preferences</h2>
                                    <p className="text-sm text-slate-500 mt-0.5">Manage notifications and display settings.</p>
                                </div>
                                <div>
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notifications</h3>
                                    <div className="bg-slate-50 rounded-lg px-4 divide-y divide-slate-100">
                                        <Toggle label="Email Notifications" description="Receive case updates via email" value={prefs.email_notifications} onChange={setPref('email_notifications')} />
                                        <Toggle label="Case Update Alerts" description="Alert when a case status changes" value={prefs.case_update_alerts} onChange={setPref('case_update_alerts')} />
                                        <Toggle label="AI Lead Notifications" description="Notify when new AI leads are generated" value={prefs.ai_lead_notifications} onChange={setPref('ai_lead_notifications')} />
                                        <Toggle label="Sound Alerts" description="Play a sound for urgent notifications" value={prefs.sound_alerts} onChange={setPref('sound_alerts')} />
                                        <Toggle label="Auto Save Drafts" description="Auto Save draft while register case" value={prefs.auto_save_drafts} onChange={setPref('auto_save_drafts')} />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={handlePrefsSave}
                                        disabled={prefsLoading}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-deep-ocean text-white text-sm font-medium hover:bg-[#162f42] disabled:opacity-50 transition-colors cursor-pointer"
                                    >
                                        {prefsLoading
                                            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            : <Check className="h-4 w-4" />
                                        }
                                        {prefsLoading ? 'Saving…' : 'Save Preferences'}
                                    </button>
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </main>

            {toast && <Toast message={toast.message} type={toast.type} />}
        </div>
    );
};

export default ProfilePage;