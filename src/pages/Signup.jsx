import React, { useState } from "react";
import { useAuth } from "../auth/AuthContext";

export default function Signup() {
  const { signup, loading } = useAuth();
  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
  });
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setErr("");

    // Force admin on the way out (UI has no dropdown now)
    const res = await signup({
      ...form,
      role: ["admin"],
    });

    if (res.ok) setMsg("Signup successful! You can now log in.");
    else setErr(res.message);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">Fill the fields below to sign up.</p>

        <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              name="username"
              value={form.username}
              onChange={onChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              name="phone"
              value={form.phone}
              onChange={onChange}
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              name="email"
              value={form.email}
              onChange={onChange}
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <div className="mt-1 relative">
              <input
                type={show ? "text" : "password"}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 pr-10 focus:ring-2 focus:ring-indigo-500"
                name="password"
                value={form.password}
                onChange={onChange}
                required
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Removed the role selector entirely */}

          {msg && (
            <div className="sm:col-span-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {msg}
            </div>
          )}
          {err && (
            <div className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {err}
            </div>
          )}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
