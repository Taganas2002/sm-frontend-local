import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

const Item = ({ to, children }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `px-3 py-2 rounded-lg text-sm font-medium transition
       ${isActive ? "bg-indigo-600 text-white" : "text-gray-700 hover:bg-gray-100"}`
    }
  >
    {children}
  </NavLink>
);

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 grid place-items-center rounded-xl bg-indigo-600 font-bold text-white">
              SM
            </div>
            <span className="text-lg font-semibold text-gray-900">
              School Management
            </span>
          </Link>

          {/* Desktop */}
          <nav className="hidden md:flex items-center gap-2">
            <Item to="/login">Sign in</Item>
            <Item to="/signup">Sign up</Item>
          </nav>

          {/* Mobile toggle */}
          <button
            className="md:hidden rounded-lg p-2 hover:bg-gray-100"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-3">
            <div className="flex flex-col gap-2">
              <Item to="/login">Sign in</Item>
              <Item to="/signup">Sign up</Item>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
