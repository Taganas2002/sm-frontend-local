import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import translations from "../translations";


export default function Login({ language}) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const t = translations[language] || translations["fr"];


  const { login, loading, isLogged } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from?.pathname || "/dashboard";

  // if user is already logged in, push them to dashboard
  useEffect(() => {
    if (isLogged) navigate(from, { replace: true });
  }, [isLogged, from, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    const res = await login(phone, password);
    if (!res.ok) setErr(res.message);        // success path handled by useEffect
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-gray-900">{t.welcome}</h1>
        <p className="mt-1 text-sm text-gray-500">{t.signInMessage}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">{t.phone}</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-indigo-500 text-gray-900"
              placeholder={t.phonePlaceholder}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">{t.password}</label>
            <div className="mt-1 relative">
              <input
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

          {err && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? t.signingIn : t.signIn}
          </button>
        </form>
      </div>
    </div>
  );
}
