import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Box, IconButton, Typography, useTheme } from "@mui/material";
import { tokens } from "../../theme";
import Topbar from "../global/Topbar";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";

export default function SuperAdminShell({ setLanguage, language }) {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [collapsed, setCollapsed] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/super-admin/login", { replace: true });
  };

  return (
    <Box className="app" sx={{ backgroundColor: colors.primary[500], minHeight: "100vh" }}>
      <Box
        sx={{
          width: collapsed ? 96 : 250,
          transition: "width .2s ease",
          backgroundColor: "#b2b7c2",
          borderRight: "1px solid #c9ced9",
          minHeight: "100vh",
        }}
      >
        <Box sx={{ px: collapsed ? 0 : 2.2, py: 1.5, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between" }}>
          {!collapsed && <Typography fontWeight={700} color="#0a3882ff" fontSize={30}>MMS</Typography>}
          <IconButton onClick={() => setCollapsed((v) => !v)}>
            <MenuOutlinedIcon />
          </IconButton>
        </Box>

        <Box sx={{ mt: 2 }}>
          <NavLink to="/super-admin" style={{ textDecoration: "none" }}>
            {({ isActive }) => (
              <Box sx={{ py: 2.2, px: 2, borderTop: "1px solid #c9ced9", borderBottom: "1px solid #c9ced9", display: "flex", justifyContent: collapsed ? "center" : "flex-start", gap: 1.2, color: isActive ? "#1e3a8a" : "#0f172a" }}>
                <HomeOutlinedIcon />
                {!collapsed && <Typography fontWeight={700}>Dashboard</Typography>}
              </Box>
            )}
          </NavLink>
          <NavLink to="/super-admin/licenses" style={{ textDecoration: "none" }}>
            {({ isActive }) => (
              <Box sx={{ py: 2.2, px: 2, borderBottom: "1px solid #c9ced9", display: "flex", justifyContent: collapsed ? "center" : "flex-start", gap: 1.2, color: isActive ? "#1e3a8a" : "#0f172a", backgroundColor: isActive ? "rgba(37,99,235,.1)" : "transparent" }}>
                <WorkspacePremiumOutlinedIcon />
                {!collapsed && <Typography fontWeight={700}>License Management</Typography>}
              </Box>
            )}
          </NavLink>
          <NavLink to="/super-admin/licenses" style={{ textDecoration: "none" }}>
            <Box sx={{ py: 2.2, px: 2, borderBottom: "1px solid #c9ced9", display: "flex", justifyContent: collapsed ? "center" : "flex-start", gap: 1.2, color: "#0f172a" }}>
              <InsightsOutlinedIcon />
              {!collapsed && <Typography fontWeight={700}>Monitor</Typography>}
            </Box>
          </NavLink>
        </Box>

        <Box sx={{ px: 2, mt: 3 }}>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white"
            style={{ background: "#ef4444" }}
          >
            <LogoutOutlinedIcon fontSize="small" />
            {!collapsed && "Logout"}
          </button>
        </Box>
      </Box>

      <Box className="content" sx={{ backgroundColor: colors.primary[500] }}>
        <Topbar setLanguage={setLanguage} language={language} />
        <Box sx={{ p: "0 22px 18px" }}>
        <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
