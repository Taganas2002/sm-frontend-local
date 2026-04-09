import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getTranslations } from "../translations";

export default function SuperAdminLogin({ language = "fr" }) {
  const t = getTranslations(language);
  const isRtl = language === "ar";

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const { login, loading, isLogged, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/super-admin";

  useEffect(() => {
    if (isLogged && hasRole("ROLE_SUPER_ADMIN")) {
      navigate(from.startsWith("/super-admin") ? from : "/super-admin", { replace: true });
    }
  }, [isLogged, hasRole, from, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    const res = await login(phone, password);
    if (!res.ok) {
      setErr(res.message || t.somethingWentWrong || "Login failed");
      return;
    }
    if (!res.data?.roles?.includes("ROLE_SUPER_ADMIN")) {
      setErr(t.superAdminLoginNotAllowed);
      return;
    }
    navigate("/super-admin", { replace: true });
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10">
        <div className="grid w-full gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-indigo-700/40 to-cyan-700/30 p-8 shadow-2xl">
            <p
              className={`inline-block rounded-full bg-white/15 px-3 py-1 text-xs ${isRtl ? "" : "tracking-wider"}`}
            >
              {t.superAdminLoginBadge}
            </p>
            <h1 className="mt-4 text-3xl font-bold">{t.superAdminLoginTitle}</h1>
            <p className="mt-3 text-sm text-slate-200">{t.superAdminLoginSubtitle}</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-2xl"
          >
            <h2 className="text-2xl font-semibold">{t.superAdminLoginFormTitle}</h2>
            <p className="mt-1 text-sm text-slate-400">{t.superAdminLoginFormHint}</p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  {t.superAdminLoginPhone}
                </label>
                <input
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none ring-indigo-500 focus:ring-2"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t.phonePlaceholder || ""}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  {t.superAdminLoginPassword}
                </label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 pe-14 outline-none ring-indigo-500 focus:ring-2"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    {show ? t.superAdminLoginHide : t.superAdminLoginShow}
                  </button>
                </div>
              </div>
            </div>

            {err && (
              <div className="mt-4 rounded-xl bg-rose-900/40 p-3 text-sm text-rose-200">{err}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400 disabled:opacity-60"
            >
              {loading ? t.superAdminLoginSigningIn : t.superAdminLoginSubmit}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
