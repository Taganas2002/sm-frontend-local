import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { getTranslations } from "../translations";
import logoImg from "../assets/logo.png";


// Nav item component
const Item = ({ to, children }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `px-4 py-2 rounded-lg text-sm font-medium transition 
      ${isActive ? "bg-[#193d79] text-white" : "text-white bg-[#193d79] hover:bg-[#162f65]"}`
    }
  >
    {children}
  </NavLink>
);

export default function Navbar({ language, setLanguage }) {
  const [open, setOpen] = useState(false);
  const t = getTranslations(language);
  const langs = [
    { code: "fr", label: t.languageFr || "Français" },
    { code: "en", label: t.languageEn || "English" },
    { code: "ar", label: t.languageAr || "العربية" },
  ];

  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 min-w-0 flex-1">
            <img
              src={logoImg}
              alt={t.landingBrand || "Madrasti"}
              width={48}
              height={48}
              className="h-12 w-12 rounded-xl object-cover shrink-0"
            />
            <span className="text-lg font-semibold text-gray-900 truncate max-w-[min(52vw,280px)] sm:max-w-[min(40vw,320px)] md:max-w-none">
              {t.landingBrand || "Madrasti Management Software"}
            </span>
          </Link>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Mobile: language always visible (compact) */}
            {setLanguage && (
              <div className="flex md:hidden items-center gap-0.5 rounded-md border border-gray-200 p-0.5 bg-gray-50">
                {langs.map(({ code, label }) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    aria-pressed={language === code}
                    className={`rounded px-1.5 py-1 text-[10px] font-bold min-w-[1.75rem] transition ${
                      language === code
                        ? "bg-[#193d79] text-white shadow"
                        : "text-gray-700 hover:bg-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center gap-2 flex-wrap justify-end">
              {setLanguage && (
                <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5 bg-gray-50 me-1">
                  {langs.map(({ code, label }) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setLanguage(code)}
                      className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                        language === code
                          ? "bg-[#193d79] text-white shadow"
                          : "text-gray-700 hover:bg-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <Item to="/login">{t.signin}</Item>
              <Item to="/signup">{t.signup}</Item>
            </nav>

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="md:hidden rounded-lg p-2 hover:bg-gray-100"
              onClick={() => setOpen((v) => !v)}
              aria-label={t.navbarToggleMenu || "Toggle menu"}
              aria-expanded={open}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6">
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-3">
            <div className="flex flex-col gap-2">
              {setLanguage && (
                <div className="flex flex-wrap gap-1 pb-2 border-b border-gray-100">
                  {langs.map(({ code, label }) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setLanguage(code);
                        setOpen(false);
                      }}
                      className={`rounded-md px-3 py-2 text-sm font-semibold ${
                        language === code
                          ? "bg-[#193d79] text-white"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <Item to="/login">{t.signin}</Item>
              <Item to="/signup">{t.signup}</Item>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
