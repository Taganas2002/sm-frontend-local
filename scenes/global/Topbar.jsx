// src/scenes/global/Topbar.jsx
import { Box, IconButton, useTheme, Menu, MenuItem } from "@mui/material";
import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ColorModeContext, tokens } from "../../theme";
import { useAuth } from "../../auth/AuthContext";

import InputBase from "@mui/material/InputBase";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import TranslateOutlinedIcon from "@mui/icons-material/TranslateOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import ReactCountryFlag from "react-country-flag";

const Topbar = ({ setLanguage }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);
  const navigate = useNavigate();
  const { isLogged, user, logout } = useAuth();

  // language menu
  const [langAnchor, setLangAnchor] = useState(null);
  const openLang = (e) => setLangAnchor(e.currentTarget);
  const closeLang = () => setLangAnchor(null);

  // profile menu
  const [profileAnchor, setProfileAnchor] = useState(null);
  const openProfile = (e) => setProfileAnchor(e.currentTarget);
  const closeProfile = () => setProfileAnchor(null);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    closeLang();
  };

  const handleLogout = () => {
    closeProfile();
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <Box display="flex" justifyContent="space-between" flexDirection="row-reverse" p={2}>
      {/* SEARCH BAR */}
        {/* <Box
            display="flex"
            backgroundColor={colors.primary[400]}
            borderRadius="3px"
        >
            <InputBase sx={{ ml: 2, flex: 1, textAlign: "center",  "& input::placeholder": {
        textAlign: "center", // specifically center the placeholder
        },}} placeholder="Search" />
            <IconButton type="button" sx={{ p: 1 }}>
            <SearchIcon />
            </IconButton>
        </Box> */}

      {/* ICONS */}
      <Box display="flex">
        {/* DARK/LIGHT MODE */}
        <IconButton onClick={colorMode.toggleColorMode}>
          {theme.palette.mode === "dark" ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
        </IconButton>

        {/* LANGUAGE SWITCHER */}
        <IconButton onClick={openLang}>
          <TranslateOutlinedIcon />
        </IconButton>
        <Menu anchorEl={langAnchor} open={Boolean(langAnchor)} onClose={closeLang}>
          <MenuItem onClick={() => handleLanguageChange("ar")}>
        <ReactCountryFlag countryCode="DZ" svg style={{ width: "1.5em", height: "1.5em" }} />
        &nbsp; العربية
      </MenuItem>
      <MenuItem onClick={() => handleLanguageChange("fr")}>
        <ReactCountryFlag countryCode="FR" svg style={{ width: "1.5em", height: "1.5em" }} />
        &nbsp; Français
      </MenuItem>

        </Menu>

        {/* SETTINGS (optional) */}
        {/* <IconButton onClick={() => navigate("/settings")}>
        <SettingsOutlinedIcon />
      </IconButton> */}

        {/* PROFILE / LOGOUT */}
        <IconButton onClick={openProfile}>
          <PersonOutlinedIcon />
        </IconButton>
        <Menu anchorEl={profileAnchor} open={Boolean(profileAnchor)} onClose={closeProfile}>
          {isLogged && (
            <MenuItem disabled>
              {user?.username || user?.email || user?.phone || "Signed in"}
            </MenuItem>
          )}
          {isLogged && <MenuItem onClick={handleLogout}><LogoutIcon sx={{ mr: 1 }} /> Logout</MenuItem>}
          {!isLogged && (
            <MenuItem
              onClick={() => {
                closeProfile();
                navigate("/login");
              }}
            >
              Login
            </MenuItem>
          )}
        </Menu>
      </Box>
    </Box>
  );
};

export default Topbar;
