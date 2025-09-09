import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function PublicOnlyRoute() {
  const { isLogged } = useAuth();
  return isLogged ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
