import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getTranslations } from "../translations";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

/** Paths we can send the user back to after login (router state is lost on hash-only 401 redirects). */
function isUsableReturnPath(p) {
  if (!p || typeof p !== "string" || !p.startsWith("/")) return false;
  if (p === "/login" || p.startsWith("/login/")) return false;
  if (p === "/signup" || p.startsWith("/signup/")) return false;
  if (p.startsWith("/super-admin/login")) return false;
  return true;
}

function resolvePostLoginPath(location) {
  const statePath = location.state?.from?.pathname;
  if (isUsableReturnPath(statePath)) return statePath;
  try {
    const rt = sessionStorage.getItem("authReturnTo");
    if (isUsableReturnPath(rt)) return rt;
    const last = sessionStorage.getItem("last");
    if (isUsableReturnPath(last)) return last;
  } catch {
    /* ignore */
  }
  return "/dashboard";
}

export default function Login({ language }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const t = getTranslations(language);

  const { login, loading, isLogged } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  // If already logged in (e.g. after axios 401 hash jump), return to the page they were on — not always /dashboard.
  useEffect(() => {
    if (!isLogged) return;
    const target = resolvePostLoginPath(loc);
    navigate(target, { replace: true });
    try {
      sessionStorage.removeItem("authReturnTo");
    } catch {
      /* ignore */
    }
  }, [isLogged, loc, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    const res = await login(phone, password);
    if (!res.ok) setErr(res.message); // success path handled by useEffect
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow relative">
        {/* 🔙 Back button in top-left */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t.back || "Back"}
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mt-6">{t.welcome}</h1>
        <p className="mt-1 text-sm text-gray-500">{t.signInMessage}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.phone}
            </label>
            <input
              data-testid="login-phone"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-indigo-500 text-gray-900"
              placeholder={t.phonePlaceholder}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.password}
            </label>
            <div className="mt-1 relative">
              <input
                data-testid="login-password"
                type={show ? "text" : "password"}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 pr-10 focus:ring-2 focus:ring-indigo-500 text-gray-900"
                placeholder={t.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {show ? t.hide : t.show}
              </button>
            </div>
          </div>

          {err && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {err}
            </div>
          )}

          <button
            data-testid="login-submit"
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? t.signingIn : t.signIn}
          </button>
        </form>

        {/* Footer link */}
        <div className="mt-4 text-center text-sm text-gray-600">
          {t.noAccount || "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            {t.createAccountButton || "Create account"}
          </button>
        </div>
      </div>
    </div>
  );
}
