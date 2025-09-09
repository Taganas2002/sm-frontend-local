import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function RoleRoute({ roles = [] }) {
  const { user } = useAuth();
  const ok = roles.some((r) => user?.roles?.includes(r));
  return ok ? <Outlet /> : <Navigate to="/forbidden" replace />;
}
