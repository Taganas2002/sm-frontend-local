import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../auth/AuthContext";

export default function Home() {
  const { isLogged } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600"></div>
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"></div>

        <div className="mx-auto max-w-7xl px-6 py-20 text-white">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs">
                🔒 Role-based access · JWT
              </span>
              <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
                Simple auth starter for <span className="underline decoration-white/60">real apps</span>
              </h1>
              <p className="mt-4 text-white/90">
                Clean login & signup, protected routes, and admin roles—all ready to ship.
                Plug in your API and go.
              </p>

              {/* CTA */}
              <div className="mt-8 flex flex-wrap gap-3">
                {!isLogged ? (
                  <>
                    <Link
                      to="/signup"
                      className="rounded-xl bg-white px-5 py-3 font-medium text-indigo-700 hover:bg-gray-100"
                    >
                      Create account
                    </Link>
                    <Link
                      to="/login"
                      className="rounded-xl bg-white/10 px-5 py-3 font-medium hover:bg-white/20"
                    >
                      Sign in
                    </Link>
                  </>
                ) : (
                  <Link
                    to="/dashboard"
                    className="rounded-xl bg-white px-5 py-3 font-medium text-indigo-700 hover:bg-gray-100"
                  >
                    Go to dashboard
                  </Link>
                )}
              </div>

              {!isLogged && (
                <p className="mt-3 text-xs text-white/80">No credit card required.</p>
              )}
            </div>

            {/* Mock preview card */}
            <div className="rounded-2xl bg-white/10 p-2 backdrop-blur">
              <div className="rounded-xl bg-white p-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="h-6 w-24 rounded bg-gray-100" />
                  <div className="flex gap-2">
                    <div className="h-6 w-6 rounded bg-gray-100" />
                    <div className="h-6 w-6 rounded bg-gray-100" />
                  </div>
                </div>
                <div className="mt-6 h-40 rounded-xl bg-gray-100" />
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="h-10 rounded-lg bg-gray-100" />
                  <div className="h-10 rounded-lg bg-gray-100" />
                  <div className="h-10 rounded-lg bg-gray-100" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-center text-sm text-gray-500">Trusted components & patterns</p>
        <div className="mt-4 grid grid-cols-2 place-items-center gap-6 opacity-70 sm:grid-cols-4">
          <div className="h-6 w-24 rounded bg-gray-200" />
          <div className="h-6 w-24 rounded bg-gray-200" />
          <div className="h-6 w-24 rounded bg-gray-200" />
          <div className="h-6 w-24 rounded bg-gray-200" />
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-14">
        <h2 className="text-center text-2xl font-bold text-gray-900">Everything you need to start</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-gray-500">
          Auth context, Axios with token headers, protected & role routes, and a polished UI.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "JWT + Axios Interceptor", desc: "Token attached to every request, stored safely, easy refresh extension." },
            { title: "Role-based Routing", desc: "Admins see extra pages; users see only what they need." },
            { title: "Protected Pages", desc: "Dashboard & Products hidden from guests. URL guard included." },
            { title: "Public-Only Guard", desc: "Logged-in users can’t open Login/Signup (even via URL bar)." },
            { title: "Tailwind UI", desc: "Modern, responsive design out of the box." },
            { title: "Vite + React 18", desc: "Fast dev, tiny bundles, great DX." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">★</div>
              <h3 className="font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-6 py-14">
        <h2 className="text-2xl font-bold text-gray-900">How it works</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            { n: "1", t: "Sign up or Sign in", d: "Create an account or log in with your phone + password." },
            { n: "2", t: "Access Dashboard", d: "Use protected pages instantly. Admins get extra options." },
            { n: "3", t: "Extend Easily", d: "Plug your API, add pages, drop in your branding." },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-gray-200 p-6">
              <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white">
                {s.n}
              </div>
              <h3 className="font-semibold text-gray-900">{s.t}</h3>
              <p className="mt-1 text-sm text-gray-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="mx-auto max-w-5xl px-6 py-14">
        <div className="rounded-3xl bg-gray-50 p-8 sm:p-12">
          <blockquote className="text-lg text-gray-700">
            “This starter saved me days—auth, roles, guards, and a usable UI from day one.”
          </blockquote>
          <div className="mt-4 text-sm text-gray-500">— Happy Developer</div>
        </div>
      </section>

      {/* CTA footer */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="flex flex-col items-center justify-between gap-4 rounded-3xl bg-indigo-600 px-6 py-10 text-white sm:flex-row">
          <div>
            <h3 className="text-xl font-semibold">
              {isLogged ? "Jump back in" : "Ready to start?"}
            </h3>
            <p className="text-white/90">
              {isLogged ? "Open your dashboard to continue." : "Create your account or sign in to the demo dashboard."}
            </p>
          </div>
          <div className="flex gap-3">
            {isLogged ? (
              <Link to="/dashboard" className="rounded-xl bg-white px-5 py-3 font-medium text-indigo-700 hover:bg-gray-100">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link to="/signup" className="rounded-xl bg-white px-5 py-3 font-medium text-indigo-700 hover:bg-gray-100">
                  Create account
                </Link>
                <Link to="/login" className="rounded-xl bg-white/10 px-5 py-3 font-medium hover:bg-white/20">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
