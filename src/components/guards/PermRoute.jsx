import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export default function PermRoute({ anyOf = [], allOf = [] }) {
  const { isLogged, can } = useAuth();
  const location = useLocation();

  if (!isLogged) return <Navigate to="/login" replace state={{ from: location }} />;
  const passAny = anyOf.length === 0 || anyOf.some(can);
  const passAll = allOf.every(can);
  return passAny && passAll ? <Outlet /> : <Navigate to="/forbidden" replace />;
}
