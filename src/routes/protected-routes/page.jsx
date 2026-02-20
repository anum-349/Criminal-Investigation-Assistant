import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, isAuth, isAdmin }) => {
    if (!isAuth) return <Navigate to="/" replace />;
    if (isAdmin === false && isAdmin !== undefined) return <Navigate to="/investigator" replace />;
    return children;
};

export default ProtectedRoute;