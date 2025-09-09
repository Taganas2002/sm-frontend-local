// src/components/guards/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function ProtectedRoute() {
  const { isLogged } = useAuth();
  const location = useLocation();
  return isLogged
    ? <Outlet />
    : <Navigate to="/login" replace state={{ from: location }} />;
}
