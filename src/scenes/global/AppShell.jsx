import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";
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
        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
          <Outlet />
        </Box>
      </main>
    </div>
  );
}
