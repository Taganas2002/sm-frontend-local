import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getTranslations } from "../translations";
// If you don't use Heroicons, replace with a simple "←" text or your own SVG
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function Signup({ language }) {
  const { signup, loading } = useAuth(); // ⬅️ removed login here
  const t = getTranslations(language);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
  });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  const onChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    try {
      // ✅ Create account (admin or first user as you define server-side)
      const signupRes = await signup(form);
      if (!signupRes?.ok) {
        setErr(signupRes?.message || t.signupFailed || "Signup failed.");
        return;
      }

      // ✅ Show success then send user to Login to sign in
      toast.success(
        t.signupSuccess || "Account created successfully. Please sign in.",
        {
          position: "top-right",
          autoClose: 1800,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          onClose: () =>
            navigate("/login", {
              replace: true,
              state: { fromSignup: true, phone: form.phone }, // optional prefill
            }),
        }
      );
    } catch (error) {
      setErr(error?.message || t.somethingWentWrong || "Something went wrong");
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow relative">
        {/* 🔙 Back button top-left */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t.back || "Back"}
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mt-6">
          {t.createAccount || "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t.fillFields || "Fill the fields below to sign up."}
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.username || "Username"}
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-indigo-500 text-gray-900"
              name="username"
              placeholder={t.usernamePlaceholder || ""}
              value={form.username}
              onChange={onChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.phone || "Phone"}
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-indigo-500 text-gray-900"
              name="phone"
              placeholder={t.phonePlaceholder || "+1234567890"}
              value={form.phone}
              onChange={onChange}
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              {t.email || "Email"}
            </label>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-indigo-500 text-gray-900"
              placeholder={t.emailPlaceholder || ""}
              name="email"
              value={form.email}
              onChange={onChange}
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              {t.password || "Password"}
            </label>
            <div className="mt-1 relative">
              <input
                type={show ? "text" : "password"}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 pr-10 focus:ring-2 focus:ring-indigo-500 text-gray-900"
                name="password"
                value={form.password}
                onChange={onChange}
                placeholder={t.passwordPlaceholder || "••••••••"}
                required
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {show ? t.hide || "Hide" : t.show || "Show"}
              </button>
            </div>
          </div>

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
              {loading
                ? t.creating || "Creating..."
                : t.createAccountButton || "Create account"}
            </button>
          </div>
        </form>

        {/* Footer link */}
        <div className="mt-4 text-center text-sm text-gray-600">
          {t.alreadyHaveAccount || "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            {t.signIn || "Sign in"}
          </button>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
