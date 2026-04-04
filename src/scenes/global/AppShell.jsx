import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Topbar from "./Topbar";
import MySidebar from "./Sidebar";

export default function AppShell({ language, setLanguage }) {
  const [isSidebar, setIsSidebar] = useState(true);

  return (
    <div className="app">
      <MySidebar isSidebar={isSidebar} language={language} />
      <main className="content">
        <Topbar
          setIsSidebar={setIsSidebar}
          setLanguage={setLanguage}
          language={language}
        />
        <Outlet />
      </main>
    </div>
  );
}
