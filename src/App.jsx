import { BrowserRouter, HashRouter, useNavigate } from 'react-router-dom'
import AppRoutes from './routes/page'
import { AuthProvider } from './context/AuthContext'
import { useEffect } from 'react';
import { ToastProvider, useToast } from './context/ToastContext';
import { ToastContainer } from './components/ToastContainer';
import { fetchPreferences } from "@/services/notificationApi";
import { RealtimeProvider } from './context/RealtimeContext';

function AuthenticatedShell({ children }) {
    const toast = useToast();

    useEffect(() => {
        fetchPreferences()
            .then(prefs => {
                if (prefs && typeof prefs.sound_alerts === "boolean") {
                    toast.setSoundEnabled(prefs.sound_alerts);
                }
            })
            .catch(() => { });
    }, []);   // run once after login

    return children;
}

const ShortcutHandler = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleKeyDown = (e) => {
            const tag = document.activeElement?.tagName;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

            const ctrl = e.ctrlKey || e.metaKey;

            if (ctrl && e.key === 'k') {
                e.preventDefault();
                navigate('/search-case');
            }

            if (ctrl && e.key === 'n') {
                e.preventDefault();
                navigate('/register-case');
            }

            if (ctrl && e.key === 'd') {
                e.preventDefault();
                navigate('/investigator');
            }

            if (ctrl && e.key === '/') {
                e.preventDefault();
                navigate('/investigator/help');
            }

            if (ctrl && e.key === 'p') {
                e.preventDefault();
                window.print();
            }

            // Esc is handled natively by modals/dropdowns already
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);

    return null; // renders nothing
};

function App() {
    // Show main application if authenticated
    return (
        <div className="min-h-screen bg-gray-100">
            <BrowserRouter>
                <AuthProvider>
                    <ToastProvider>
                        <AuthenticatedShell>
                            <RealtimeProvider>
                                <ShortcutHandler />
                                <AppRoutes />
                                <ToastContainer />
                            </RealtimeProvider>
                        </AuthenticatedShell>
                    </ToastProvider>
                </AuthProvider>
            </BrowserRouter>
        </div>
    )
}

export default App
