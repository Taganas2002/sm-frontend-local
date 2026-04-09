import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function SuperAdminRoute() {
  const { isLogged, hasRole } = useAuth();
  const location = useLocation();

  if (!isLogged) {
    return <Navigate to="/super-admin/login" replace state={{ from: location }} />;
  }

  if (!hasRole("ROLE_SUPER_ADMIN")) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}
