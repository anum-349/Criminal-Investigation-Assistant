import { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole }) => {
    const { user, isAuth, loading } = useContext(AuthContext);
    const location = useLocation();

    // Still checking the stored token? Don't redirect yet — wait.
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-deep-ocean-900">
                <div className="text-white text-sm flex items-center">
                    <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Verifying session…
                </div>
            </div>
        );
    }

    // Not logged in → bounce to login, remember intended destination
    if (!isAuth) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Wrong role → send to user's own dashboard
    if (requiredRole && user.role !== requiredRole) {
        const homePath = user.role === 'admin' ? '/admin' : '/investigator';
        return <Navigate to={homePath} replace />;
    }

    return children;
};

export default ProtectedRoute;