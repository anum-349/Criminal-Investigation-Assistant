import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import {
    User, Shield, Bell, Lock, Eye, EyeOff,
    ChevronRight, ArrowLeft, LayoutDashboard,
    Camera, Check, AlertTriangle, Clock,
    LogOut, Key, ToggleLeft, ToggleRight
} from 'lucide-react';
import Header from '../../../components/Header';
import { Card } from '../../../components/ui/Card';
import { AuthContext } from '../../../context/AuthContext';

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
    { id: 'profile', label: 'Personal Info', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Bell },
];

// ── Input field component ─────────────────────────────────────────────────────
const Field = ({ label, value, onChange, type = 'text', disabled = false, hint }) => (
    <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</label>
        <input
            type={type}
            value={value}
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

// ── Toggle component ──────────────────────────────────────────────────────────
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

// ── Toast notification ────────────────────────────────────────────────────────
const Toast = ({ message, type }) => (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium
        ${type === 'success' ? 'bg-green-700 text-white' : 'bg-red-700 text-white'}`}>
        {type === 'success' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        {message}
    </div>
);

// ═════════════════════════════════════════════════════════════════════════════
const ProfilePage = () => {
    const navigate = useNavigate();
    const { logout } = useContext(AuthContext);

    // ── Decode token to get base user info ────────────────────────────────
    const getTokenData = () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) return {};
        try { return jwtDecode(token); }
        catch { return {}; }
    };
    const tokenData = getTokenData();

    // ── Tab state ─────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('profile');

    // ── Toast state ───────────────────────────────────────────────────────
    const [toast, setToast] = useState(null);
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // ── Profile form state ────────────────────────────────────────────────
    const [profile, setProfile] = useState({
        image: '/profile.jpg',
        full_name: '',
        badge_number: tokenData.badge_number || '',
        email: '',
        phone: '',
        department: '',
        rank: '',
        station: '',
    });
    const [profileLoading, setProfileLoading] = useState(false);

    // Fetch profile from API on mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const url = import.meta.env.VITE_API_URL;
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                const res = await axios.get(`${url}/api/profile`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setProfile(prev => ({ ...prev, ...res.data }));
            } catch {
                // API not ready — use token data as fallback
                setProfile(prev => ({
                    ...prev,
                    badge_number: tokenData.badge_number || 'INV-0001',
                    rank: tokenData.rank || 'Inspector',
                    department: tokenData.department || 'Criminal Investigation',
                }));
            }
        };
        fetchProfile();
    }, []);

    const handleProfileSave = async () => {
        setProfileLoading(true);
        console.log(profile)
        // const formData = new FormData();
        // formData.append('full_name', profile.full_name);
        // formData.append('email', profile.email);
        // if (profile.imageFile) {
        //     formData.append('image', profile.imageFile);  // ← only if changed
        // }
        // try {
        //     const url = import.meta.env.VITE_API_URL;
        //     const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        //     await axios.put(`${url}/api/profile`, profile, {
        //         headers: { Authorization: `Bearer ${token}`, 'Content-type': 'multipart/form-data' }
        //     });
        //     showToast('Profile updated successfully');
        // } catch {
        //     showToast('Failed to update profile', 'error');
        // } finally {
        //     setProfileLoading(false);
        // }
    };

    // ── Password form state ───────────────────────────────────────────────
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
    const [pwLoading, setPwLoading] = useState(false);

    const passwordStrength = (pw) => {
        if (!pw) return null;
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
            showToast('New passwords do not match', 'error'); return;
        }
        if ((strength || 0) < 2) {
            showToast('Password is too weak', 'error'); return;
        }
        setPwLoading(true);
        try {
            const url = import.meta.env.VITE_API_URL;
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            await axios.put(`${url}/api/profile/password`,
                { current_password: passwords.current, new_password: passwords.new },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showToast('Password changed successfully');
            setPasswords({ current: '', new: '', confirm: '' });
        } catch {
            showToast('Current password is incorrect', 'error');
        } finally {
            setPwLoading(false);
        }
    };

    // ── Preferences state ─────────────────────────────────────────────────
    const [prefs, setPrefs] = useState({
        emailNotifications: true,
        caseUpdateAlerts: true,
        aiLeadNotifications: true,
        soundAlerts: false,
        compactView: false,
        autoSaveDrafts: true,
    });
    const setPref = (key) => (val) => setPrefs(p => ({ ...p, [key]: val }));

    const handlePrefsSave = () => showToast('Preferences saved');

    // ── Logout ────────────────────────────────────────────────────────────
    const handleLogout = () => { logout(); navigate('/'); };

    // ── Avatar initials ───────────────────────────────────────────────────
    const initials = profile.full_name
        ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : (tokenData.role === 'admin' ? 'AD' : 'IN');

    return (
        <div className="min-h-screen bg-soft-mist font-sans text-slate-900 mt-14 py-4">
            <Header />

            <main className="max-w-6xl  mx-auto px-4 lg:px-6 py-8 space-y-6 bg-white/70 rounded-lg border border-slate-300 shadow-sm">

                {/* Breadcrumb + nav buttons */}
                <div className="flex items-center justify-between">
                    <nav className="flex items-center gap-1.5 text-xs text-slate-500">
                        <button
                            onClick={() => navigate("/investigator")}
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

                        {/* Avatar card */}
                        <Card className="p-5 text-center space-y-3">
                            <div className="relative inline-block">
                                {/* Avatar wrapper */}
                                <div className="relative inline-block">
                                    <div className="w-20 h-20 rounded-full bg-deep-ocean flex items-center justify-center mx-auto text-white text-2xl font-bold overflow-hidden">
                                        {profile.image
                                            ? <img src={profile.image} className="w-full h-full object-cover" />
                                            : initials
                                        }
                                    </div>

                                    {/* Hidden file input */}
                                    <input
                                        id="avatar-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            // Store file for upload
                                            setProfile(p => ({ ...p, image: file }));
                                            // Create preview URL
                                            const reader = new FileReader();
                                            reader.onload = () => setProfile(p => ({ ...p, image: reader.result }));
                                            reader.readAsDataURL(file);
                                        }}
                                    />

                                    {/* Camera button — label triggers the hidden input */}
                                    <label
                                        htmlFor="avatar-upload"
                                        className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
                                    >
                                        <Camera className="h-3 w-3 text-slate-600" />
                                    </label>
                                </div>
                            </div>
                            <div>
                                <p className="font-bold text-slate-800">{profile.full_name || 'Investigator'}</p>
                                <p className="text-xs text-slate-500">{profile.rank || 'Inspector'}</p>
                                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-deep-ocean text-white uppercase tracking-wide">
                                    {tokenData.role || 'investigator'}
                                </span>
                            </div>
                            <div className="border-t border-slate-100 pt-3 space-y-1 text-xs text-slate-500">
                                <p>Badge: <span className="font-medium text-slate-700">{profile.badge_number || '—'}</span></p>
                                <p>Dept: <span className="font-medium text-slate-700">{profile.department || '—'}</span></p>
                            </div>
                        </Card>

                        {/* Tab nav */}
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
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
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
                                    <p className="text-sm text-slate-500 mt-0.5">Update your personal details and contact information.</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Full Name"
                                        value={profile.full_name}
                                        onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} />
                                    <Field label="Badge Number"
                                        value={profile.badge_number}
                                        disabled
                                        hint="Badge number cannot be changed" />
                                    <Field label="Email Address"
                                        type="email"
                                        value={profile.email}
                                        onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
                                    <Field label="Phone Number"
                                        type="tel"
                                        value={profile.phone}
                                        onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
                                    <Field label="Rank / Designation"
                                        value={profile.rank}
                                        onChange={e => setProfile(p => ({ ...p, rank: e.target.value }))} />
                                    <Field label="Department"
                                        value={profile.department}
                                        onChange={e => setProfile(p => ({ ...p, department: e.target.value }))} />
                                    <Field label="Station / Unit"
                                        value={profile.station}
                                        onChange={e => setProfile(p => ({ ...p, station: e.target.value }))}
                                        hint="e.g. Clifton Police Station" />
                                    <Field label="Role"
                                        value={tokenData.role || 'investigator'}
                                        disabled
                                        hint="Role is assigned by administrator" />
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button onClick={handleProfileSave} disabled={profileLoading}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-deep-ocean text-white text-sm font-medium hover:bg-[#162f42] disabled:opacity-50 transition-colors">
                                        {profileLoading ? (
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Check className="h-4 w-4" />
                                        )}
                                        {profileLoading ? 'Saving…' : 'Save Changes'}
                                    </button>
                                </div>
                            </Card>
                        )}

                        {/* ── SECURITY TAB ── */}
                        {activeTab === 'security' && (
                            <div className="space-y-4">
                                {/* Change password */}
                                <Card className="p-6 space-y-5">
                                    <div className="border-b border-slate-200 pb-4">
                                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <Key className="h-5 w-5 text-slate-600" /> Change Password
                                        </h2>
                                        <p className="text-sm text-slate-500 mt-0.5">Use a strong password with at least 8 characters.</p>
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
                                            <button onClick={() => setShowPw(p => ({ ...p, current: !p.current }))}
                                                className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
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
                                            <button onClick={() => setShowPw(p => ({ ...p, new: !p.new }))}
                                                className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                {showPw.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {/* Strength bar */}
                                        {passwords.new && (
                                            <div className="space-y-1">
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4].map(i => (
                                                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors
                                                            ${i <= (strength || 0) ? strengthColor[strength || 0] : 'bg-slate-200'}`} />
                                                    ))}
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    Strength: <span className="font-medium">{strengthLabel[strength || 0]}</span>
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
                                            <button onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))}
                                                className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                {showPw.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        {passwords.confirm && passwords.new !== passwords.confirm && (
                                            <p className="text-xs text-red-500">Passwords do not match</p>
                                        )}
                                    </div>

                                    <div className="flex justify-end">
                                        <button onClick={handlePasswordChange} disabled={pwLoading || !passwords.current || !passwords.new || !passwords.confirm}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-deep-ocean text-white text-sm font-medium hover:bg-[#162f42] disabled:opacity-50 transition-colors">
                                            {pwLoading
                                                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                : <Lock className="h-4 w-4" />
                                            }
                                            {pwLoading ? 'Updating…' : 'Update Password'}
                                        </button>
                                    </div>
                                </Card>
                            </div>
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
                                        <Toggle label="Email Notifications" description="Receive case updates via email" value={prefs.emailNotifications} onChange={setPref('emailNotifications')} />
                                        <Toggle label="Case Update Alerts" description="Alert when a case status changes" value={prefs.caseUpdateAlerts} onChange={setPref('caseUpdateAlerts')} />
                                        <Toggle label="AI Lead Notifications" description="Notify when new AI leads are generated" value={prefs.aiLeadNotifications} onChange={setPref('aiLeadNotifications')} />
                                        <Toggle label="Sound Alerts" description="Play a sound for urgent notifications" value={prefs.soundAlerts} onChange={setPref('soundAlerts')} />
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button onClick={handlePrefsSave}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-deep-ocean text-white text-sm font-medium hover:bg-[#162f42] transition-colors">
                                        <Check className="h-4 w-4" /> Save Preferences
                                    </button>
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </main>

            {/* Toast */}
            {toast && <Toast message={toast.message} type={toast.type} />}
        </div>
    );
};

export default ProfilePage;