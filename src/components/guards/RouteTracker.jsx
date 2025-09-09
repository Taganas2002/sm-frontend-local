import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function RouteTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!pathname.startsWith("/login") && !pathname.startsWith("/signup")) {
      sessionStorage.setItem("last", pathname);
    }
  }, [pathname]);
  return null;
}
