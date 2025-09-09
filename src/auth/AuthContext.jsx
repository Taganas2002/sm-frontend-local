// src/auth/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loginApi, signupApi } from "../api/authApi";

const AuthContext = createContext(null);

// read token no matter the field name returned by API
const getToken = (d) => d?.accessToken || d?.token || d?.jwt || d?.access_token;

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("auth")) || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  // persist to localStorage
  useEffect(() => {
    if (auth) localStorage.setItem("auth", JSON.stringify(auth));
    else localStorage.removeItem("auth");
  }, [auth]);

  const login = async (phone, password) => {
    setLoading(true);
    try {
      const data = await loginApi(phone, password);

      // normalize roles + authorities from JWT
      const roles =
        Array.isArray(data?.roles)
          ? data.roles
          : Array.isArray(data?.authorities)
          ? data.authorities.filter((a) => String(a).startsWith("ROLE_"))
          : Array.isArray(data?.role)
          ? data.role
          : [];

      const authorities = Array.isArray(data?.authorities) ? data.authorities : [];

      const normalized = {
        ...data,
        accessToken: getToken(data),
        roles,
        authorities,
      };

      if (!normalized.accessToken) {
        throw new Error("No token received from server");
      }

      setAuth(normalized);
      return { ok: true, data: normalized };
    } catch (err) {
      return {
        ok: false,
        message: err?.response?.data?.message || err.message || "Login failed",
      };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (form) => {
    setLoading(true);
    try {
      const data = await signupApi(form);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, message: err?.response?.data?.message || "Signup failed" };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => setAuth(null);

  // helpers
  const token = getToken(auth || {});
  const isLogged = !!token;

  const roles = auth?.roles || [];
  const authorities = auth?.authorities || [];

  // super roles: see everything
  const isAdminLike = roles.includes("ROLE_ADMIN") || roles.includes("ROLE_PRINCIPAL");

  const hasRole = (r) => roles.includes(r);
  const can = (code) => isAdminLike || authorities.includes(code);

  const value = useMemo(
    () => ({
      user: auth,
      isLogged,
      loading,
      login,
      signup,
      logout,
      hasRole,
      can,
      roles,
      authorities,
      token,
    }),
    [auth, isLogged, loading, roles, authorities, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
