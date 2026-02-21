import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {

    const { isAuth, userRole } = useContext(AuthContext);

    if (!isAuth) return <Navigate to="/" replace />;

    if (allowedRoles && !allowedRoles.includes(userRole)) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;