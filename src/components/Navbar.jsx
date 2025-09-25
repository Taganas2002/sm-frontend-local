import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import translations from "../translations";


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

export default function Navbar({ language}) {
  const [open, setOpen] = useState(false);
  const t = translations[language] || translations["fr"];
  

  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src={`src/assets/logo.png`}
              alt="Madrasti Logo"
              className="h-25 w-25 rounded-xl object-cover"
            />
            <span className="text-lg font-semibold text-gray-900">
              Madrasti Management Software
            </span>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-2">
            <Item to="/login">{t.signin}</Item>
            <Item to="/signup">{t.signup}</Item>
          </nav>

          {/* Mobile toggle */}
          <button
            className="md:hidden rounded-lg p-2 hover:bg-gray-100"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
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

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-3">
            <div className="flex flex-col gap-2">
              <Item to="/login">{t.signin}</Item>
              <Item to="/signup">{t.signup}</Item>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
