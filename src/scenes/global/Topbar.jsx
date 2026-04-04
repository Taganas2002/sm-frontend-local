// src/scenes/global/Topbar.jsx
import { Box, IconButton, useTheme, Menu, MenuItem, Typography } from "@mui/material";
import { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ColorModeContext, tokens } from "../../theme";
import { useAuth } from "../../auth/AuthContext";
import { getLicenseStatus } from "../../api/license";
import translations, { getTranslations } from "../../translations";

import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import TranslateOutlinedIcon from "@mui/icons-material/TranslateOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import ReactCountryFlag from "react-country-flag";

const LANG_OPTIONS = [
  { code: "ar", country: "DZ" },
  { code: "fr", country: "FR" },
  { code: "en", country: "US" },
];

const Topbar = ({ setLanguage, language = "fr" }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const colorMode = useContext(ColorModeContext);
  const navigate = useNavigate();
  const { isLogged, user, logout } = useAuth();
  const t = getTranslations(language);

  const [langAnchor, setLangAnchor] = useState(null);
  const openLang = (e) => setLangAnchor(e.currentTarget);
  const closeLang = () => setLangAnchor(null);

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

  const [license, setLicense] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchStatus = async () => {
      try {
        const data = await getLicenseStatus();
        if (!mounted) return;
        setLicense(data);
        if (data?.state === "EXPIRED") {
          navigate("/expired", { replace: true });
        }
      } catch {
      }
    };

    fetchStatus();
    const id = setInterval(fetchStatus, 60 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [navigate]);

  const trialBanner = (t.trialBanner || "Trial version: {days} day(s) remaining.").replace(
    "{days}",
    String(license?.daysLeft ?? 0)
  );

  return (
    <>
      <Box display="flex" justifyContent="space-between" flexDirection="row-reverse" p={2}>
        <Box display="flex">
          <IconButton onClick={colorMode.toggleColorMode}>
            {theme.palette.mode === "dark" ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
          </IconButton>

          <IconButton onClick={openLang}>
            <TranslateOutlinedIcon />
          </IconButton>
          <Menu anchorEl={langAnchor} open={Boolean(langAnchor)} onClose={closeLang}>
            {LANG_OPTIONS.map((option) => (
              <MenuItem key={option.code} onClick={() => handleLanguageChange(option.code)}>
                <ReactCountryFlag countryCode={option.country} svg style={{ width: "1.5em", height: "1.5em" }} />
                &nbsp; {t.languageNames?.[option.code] || option.code.toUpperCase()}
              </MenuItem>
            ))}
          </Menu>

          <IconButton onClick={openProfile}>
            <PersonOutlinedIcon />
          </IconButton>
          <Menu anchorEl={profileAnchor} open={Boolean(profileAnchor)} onClose={closeProfile}>
            {isLogged && (
              <MenuItem disabled>
                {user?.username || user?.email || user?.phone || t.signedIn || "Signed in"}
              </MenuItem>
            )}
            {isLogged && (
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 1 }} /> {t.logout || "Logout"}
              </MenuItem>
            )}
            {!isLogged && (
              <MenuItem
                onClick={() => {
                  closeProfile();
                  navigate("/login");
                }}
              >
                {t.login || "Login"}
              </MenuItem>
            )}
          </Menu>
        </Box>
      </Box>

      {license?.state === "TRIAL" && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Box
            sx={{
              mx: "auto",
              maxWidth: 2000,
              bgcolor: "#e3f2fd",
              border: "1px solid #90caf9",
              borderRadius: 1.5,
              p: 1.2,
              textAlign: "center",
              color: "#0d47a1",
              fontWeight: 600,
              boxShadow: "0px 3px 6px rgba(0,0,0,0.1)",
            }}
          >
            <Typography variant="body1">{trialBanner}</Typography>
          </Box>
        </Box>
      )}

      {license?.state === "EXPIRED" && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Box
            sx={{
              mx: "auto",
              maxWidth: 1200,
              bgcolor: "#ffebee",
              border: "1px solid #ef9a9a",
              borderRadius: 1.5,
              p: 1.2,
              textAlign: "center",
              color: "#b71c1c",
              fontWeight: 600,
              boxShadow: "0px 3px 6px rgba(0,0,0,0.1)",
            }}
          >
            <Typography variant="body1">{t.expiredBanner || "Your trial period has expired. Contact the administrator to activate the license."}</Typography>
          </Box>
        </Box>
      )}
    </>
  );
};

export default Topbar;
