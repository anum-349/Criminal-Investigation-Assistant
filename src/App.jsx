import { BrowserRouter, HashRouter, useNavigate } from 'react-router-dom'
import AppRoutes from './routes/page'
import { AuthProvider } from './context/AuthContext'
import { useEffect } from 'react';

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
          <ShortcutHandler />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </div>
  )
}

export default App
