// src/scenes/global/Sidebar.jsx
import { useState } from "react";
import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import { Box, IconButton, Stack, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { tokens } from "../../theme";
import { getTranslations } from "../../translations/index";
import { useAuth } from "../../auth/AuthContext";
import defaultUserImg from "../../assets/user.png";

import CategoryIcon from "@mui/icons-material/Category";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import ContactsOutlinedIcon from "@mui/icons-material/ContactsOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import DoorFrontOutlinedIcon from "@mui/icons-material/DoorFrontOutlined";
import MenuBookTwoToneIcon from "@mui/icons-material/MenuBookTwoTone";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";

const Item = ({ title, to, icon, onClick, active, isRtl }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const textMain = theme.palette.mode === "light" ? "#1e293b" : colors.grey[900];
  return (
    <MenuItem
      component="button"
      type="button"
      active={!!active}
      style={{
        color: textMain,
        width: "100%",
        border: "none",
        background: "transparent",
        font: "inherit",
        textAlign: "inherit",
        cursor: "pointer",
      }}
      onClick={(e) => {
        onClick?.(e);
        navigate(to);
      }}
    >
      <Stack
        direction={isRtl ? "row-reverse" : "row"}
        alignItems="center"
        spacing={2}
        sx={{
          width: "100%",
          py: 0.75,
          px: { xs: 0.25, sm: 0.5 },
          textAlign: isRtl ? "right" : "left",
        }}
      >
        <Box
          aria-hidden
          sx={{
            flexShrink: 0,
            width: 44,
            height: 44,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            bgcolor: active
              ? alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.16 : 0.28)
              : alpha(theme.palette.action.hover, theme.palette.mode === "light" ? 0.5 : 0.12),
            color: active ? theme.palette.primary.dark : textMain,
            border: `1px solid ${
              active
                ? alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.35 : 0.45)
                : alpha(theme.palette.divider, theme.palette.mode === "light" ? 0.6 : 0.2)
            }`,
            boxShadow: active ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.2)}` : "none",
            transition: "background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
            "& .MuiSvgIcon-root": { fontSize: "1.35rem" },
          }}
        >
          {icon}
        </Box>
        <Typography
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: "1.05rem",
            fontWeight: 800,
            whiteSpace: "normal",
            lineHeight: 1.35,
            wordBreak: "break-word",
            color: textMain,
          }}
        >
          {title}
        </Typography>
      </Stack>
    </MenuItem>
  );
};

// map tiles to your MENU permission codes
const CAN = {
  HOME: "MENU:HOME_VIEW",
  ATTENDANCE: "MENU:ATTENDANCE_VIEW",
  TEACHERS: "MENU:TEACHERS_VIEW",
  STUDENTS: "MENU:STUDENTS_VIEW",
  GROUPS: "MENU:GROUPS_VIEW",
  CLASSES: "MENU:CLASSES_VIEW",
  SCHOOLS: "MENU:SCHOOLS_VIEW",
  LEVELS: "MENU:LEVELS_VIEW",
  SECTIONS: "MENU:SECTIONS_VIEW",
  SUBJECTS: "MENU:SUBJECTS_VIEW",
  TIMETABLE: "MENU:TIMETABLE_VIEW",
  // SPECIALTIES: "MENU:SPECIALTIES_VIEW",
  ENROLLMENTS: "MENU:ENROLLMENTS_VIEW", 
  FINANCE: "MENU:FINANCE_VIEW",
  REPORTS: "MENU:REPORTS_VIEW",
  ABOUT: "MENU:ABOUT_VIEW",
};

const financeNavTypographySx = (language) => ({
  fontSize: "1.05rem",
  fontWeight: "bold",
  whiteSpace: "normal",
  lineHeight: 1.25,
  wordBreak: "break-word",
  textAlign: language === "ar" ? "right" : "left",
  color: "#1e293b !important",
  maxWidth: "100%",
});

/** Same size/weight as top-level `Item` labels (Finance was using smaller body text). */
const financeSubmenuTitleSx = (language) => ({
  ...financeNavTypographySx(language),
  fontSize: "1.20rem",
});

const financeChildIconSx = { fontSize: "1.25rem", color: "#1e293b" };

const MySidebar = ({ language }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const t = getTranslations(language);
  const finNavSx = financeNavTypographySx(language);
  const financeTitleSx = financeSubmenuTitleSx(language);
  const isRtl = language === "ar";

  const { can, hasRole, user } = useAuth();
  const location = useLocation();
  const [logo, setLogo] = useState(() => {
    try {
      const s = localStorage.getItem("userLogo");
      if (s && s.startsWith("data:image")) return s;
    } catch (_) {
      /* ignore */
    }
    return defaultUserImg;
  });

// Handle logo upload
const handleLogoChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      setLogo(base64);
      localStorage.setItem("userLogo", base64);
    };
    reader.readAsDataURL(file);
  }
};


  // helper to keep active state synced to URL
  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const showUsers =
    hasRole("ROLE_ADMIN") ||
    hasRole("ROLE_PRINCIPAL") ||
    can("API:ACCOUNTS_READ") ||
    can("API:USER_PERMS_WRITE");
  const schoolName = user?.schoolName || user?.school?.name || "School";

  return (
    <Box
      sx={{
        "& .pro-sidebar-inner": {
          background: `${colors.primary[400]} !important`,
        },
        "& hr": {
          border: "none",
          height: "1px",
          margin: "8px 12px !important",
          backgroundColor: `${alpha(theme.palette.mode === "light" ? "#64748b" : "#94a3b8", 0.28)} !important`,
        },
        "& .pro-icon-wrapper": {
          backgroundColor: "transparent !important",
        },
        "& .pro-inner-item": {
          padding: "10px 14px !important",
          borderRadius: "12px !important",
          margin: "4px 8px !important",
          transition: "background-color 0.2s ease, box-shadow 0.2s ease",
        },
        "& .pro-inner-item:hover": {
          color: "inherit !important",
          backgroundColor: `${alpha(theme.palette.mode === "light" ? "#ffffff" : "#0f172a", theme.palette.mode === "light" ? 0.55 : 0.25)} !important`,
          boxShadow:
            theme.palette.mode === "light"
              ? `0 2px 10px ${alpha("#0f172a", 0.06)} !important`
              : `0 2px 12px ${alpha("#000", 0.35)} !important`,
        },
        "& .pro-menu-item.active .pro-inner-item": {
          backgroundColor: `${alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.12 : 0.22)} !important`,
          boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.35)}`,
        },
        "& .pro-menu-item.active": {
          color: "inherit !important",
        },
            "& .ps-submenu .ps-menu-button": {
            fontWeight: "normal !important",
            color: "#1e293b !important",
            padding: "10px 14px !important",
            borderRadius: "12px !important",
            margin: "4px 8px !important",
            gap: "14px !important",
            columnGap: "14px !important",
          },
          "& .ps-submenu .ps-menu-button svg": {
            color: "#1e293b !important",
          },
          "& .ps-submenu-content .ps-menu-button": {
            padding: "10px 14px !important",
            borderRadius: "10px !important",
            margin: "2px 8px !important",
            gap: "14px !important",
            columnGap: "14px !important",
          },
          "& .ps-submenu-content .ps-menu-icon": {
            marginInlineEnd: "4px !important",
            minWidth: "40px !important",
          },
          /* SubMenu row label: match other primary nav items (bold + full size) */
          "& .ps-submenu-root > .ps-menu-button .MuiTypography-root": {
            fontSize: "1.20rem !important",
            fontWeight: "700 !important",
          },
      }}
    >
      <Sidebar
        collapsed={isCollapsed}
        style={{
          backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#cbd5e1",
          height: "100dvh",
          overflowY: "auto",
        }}
      >
        <Menu iconShape="square">
          {/* LOGO + TOGGLE */}
          <MenuItem
            onClick={() => setIsCollapsed(!isCollapsed)}
            icon={isCollapsed ? <MenuOutlinedIcon /> : undefined}
            style={{
              margin: "10px 0 15px 0",
              color: theme.palette.mode === "dark" ? "#fff" : "#333",
            }}
          >
            {!isCollapsed && (
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                ml="10px"
              >
                  <Typography
                variant="h3"
                color="#0a3882ff"
                fontWeight={"bold"}
                style={{ textDecoration: "none" }}
              >
                MMS
              </Typography>
                <IconButton onClick={() => setIsCollapsed(!isCollapsed)}>
                  <MenuOutlinedIcon />
                </IconButton>
              </Box>
            )}
          </MenuItem>


          {/* PROFILE / LOGO UPLOAD */}
{!isCollapsed && (
  <Box mb="20px" textAlign="center">
    <Box display="flex" justifyContent="center" alignItems="center">
      <img
        alt="user-logo"
        width="120px"
        height="120px"
        src={logo}
        style={{
          cursor: "pointer",
          borderRadius: "50%",
          objectFit: "cover",
        }}
        onClick={() => document.getElementById("logoInput").click()}
      />
      <input
        type="file"
        accept="image/*"
        id="logoInput"
        style={{ display: "none" }}
        onChange={handleLogoChange}
      />
    </Box>
    {/* <Typography variant="h3" color="#1e293b" fontWeight="bold" mt={1}>
      {user?.username || user?.name || user?.email || "User"}
    </Typography> */}
    <Typography
  variant="h6"
  sx={{
    color: "#1e293b",
    mt: 1,
    fontWeight: "500",
  }}
>
  Click image to upload logo
</Typography>
  <Typography
    variant="body1"
    sx={{
      color: "#0f172a",
      mt: 1,
      px: 1,
      fontWeight: 800,
      fontSize: "1.05rem",
      lineHeight: 1.3,
      wordBreak: "break-word",
    }}
  >
    {schoolName}
  </Typography>

  </Box>
)}

<hr className="my-1 border-gray-300" />

          {/* MENU ITEMS */}
          <Box
            paddingLeft={isCollapsed ? undefined : "1%"}
            sx={{ fontSize: "1.5rem" }}
          >
            {can(CAN.HOME) && (
              <Item
                title={t.home}
                to="/dashboard"
                icon={<HomeOutlinedIcon />}
                active={isActive("/dashboard")}
                isRtl={isRtl}
              />
            )}
<hr className="my-1 border-gray-300" />

            {can(CAN.LEVELS) && (
              <Item
                title={t.level}
                to="/levels"
                icon={<LayersOutlinedIcon />}
                active={isActive("/levels")}
                isRtl={isRtl}
              />
            )}
<hr className="my-1 border-gray-300" />

            {can(CAN.SECTIONS) && (
              <Item
                title={t.sections}
                to="/sections"
                icon={<CategoryIcon />}
                active={isActive("/sections")}
                isRtl={isRtl}
              />
            )}
<hr className="my-1 border-gray-300" />

          {can(CAN.SUBJECTS) && (
              <Item
                title={t.subjects}
                to="/subjects"
                icon={<SchoolOutlinedIcon />}
                active={isActive("/subjects")}
                isRtl={isRtl}
              />
            )}
<hr className="my-1 border-gray-300" />

            {can(CAN.CLASSES) && (
              <Item
                title={t.classes}
                to="/classes"
                icon={<DoorFrontOutlinedIcon />}
                active={isActive("/classes")}
                isRtl={isRtl}
              />
            )}
<hr className="my-1 border-gray-300" />

            {can(CAN.TEACHERS) && (
              <Item
                title={t.teachers}
                to="/teachers"
                icon={<PeopleOutlinedIcon />}
                active={isActive("/teachers")}
                isRtl={isRtl}
              />
            )}
<hr className="my-1 border-gray-300" />

            {can(CAN.STUDENTS) && (
              <Item
                title={t.students}
                to="/students"
                icon={<ContactsOutlinedIcon />}
                active={isActive("/students")}
                isRtl={isRtl}
              />
            )}
<hr className="my-1 border-gray-300" />

            {can(CAN.GROUPS) && (
              <Item
                title={t.groups}
                to="/groups"
                icon={<MenuBookOutlinedIcon />}
                active={isActive("/groups")}
                isRtl={isRtl}
              />
            )}
<hr className="my-1 border-gray-300" />

{can(CAN.ENROLLMENTS) && (
              <Item
                title={t.enrollment}
                to="/enrollment"
                icon={<PeopleOutlinedIcon />}
                active={isActive("/enrollment")}
                isRtl={isRtl}
              />
            )}
<hr className="my-1 border-gray-300" />

            {can(CAN.TIMETABLE) && (
              <Item
                title={t.schedule}
                to="/calendar"
                icon={<CalendarTodayOutlinedIcon />}
                active={isActive("/calendar")}
                isRtl={isRtl}
              />
            )}
<hr className="my-1 border-gray-300" />

{can(CAN.ATTENDANCE) && (
              <Item
                title={t.presence}
                to="/attendance"
                icon={<CalendarTodayOutlinedIcon />}
                active={isActive("/attendance")}
                isRtl={isRtl}
              />
            )}
            <hr className="my-1 border-gray-300" />

{/* Finance submenu */}
            {can(CAN.FINANCE) && (
              <SubMenu
                label={
                  <Stack
                    direction={isRtl ? "row-reverse" : "row"}
                    alignItems="center"
                    spacing={2}
                    sx={{ width: "100%", py: 0.25 }}
                  >
                    <Box
                      sx={{
                        flexShrink: 0,
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        display: "grid",
                        placeItems: "center",
                        bgcolor: alpha("#1e293b", 0.06),
                        border: `1px solid ${alpha("#1e293b", 0.12)}`,
                        color: "#1e293b",
                        "& .MuiSvgIcon-root": { fontSize: "1.35rem" },
                      }}
                    >
                      <AccountBalanceOutlinedIcon />
                    </Box>
                    <Typography sx={{ ...financeTitleSx, flex: 1, minWidth: 0 }}>{t.finance}</Typography>
                  </Stack>
                }
              >
                <MenuItem
                  component={<Link to="/finances/billing" />}
                  icon={<PaymentsOutlinedIcon sx={financeChildIconSx} />}
                >
                  <Typography sx={finNavSx}>{t.income}</Typography>
                </MenuItem>

                <MenuItem
                  component={<Link to="/finances/expenses" />}
                  icon={<ReceiptLongOutlinedIcon sx={financeChildIconSx} />}
                >
                  <Typography sx={finNavSx}>{t.expense}</Typography>
                </MenuItem>

                <MenuItem
                  component={<Link to="/finances/profit-loss" />}
                  icon={<AssessmentOutlinedIcon sx={financeChildIconSx} />}
                >
                  <Typography sx={finNavSx}>{t.profitLoss}</Typography>
                </MenuItem>

                <MenuItem
                  component={<Link to="/finances/teacher-pay" />}
                  icon={<PaidOutlinedIcon sx={financeChildIconSx} />}
                >
                  <Typography sx={finNavSx}>{t.teacherPay}</Typography>
                </MenuItem>

                <MenuItem
                  component={<Link to="/finances/audit-log" />}
                  icon={<FactCheckOutlinedIcon sx={financeChildIconSx} />}
                >
                  <Typography sx={finNavSx}>{t.auditLog_nav || t.paymentAuditLog}</Typography>
                </MenuItem>
              </SubMenu>
            )}

<hr className="my-1 border-gray-300" />
        {showUsers && (
              <Item
                title={t.user}
                to="/admin/users"
                icon={<PeopleAltOutlinedIcon />}
                active={isActive("/admin/users")}
              />
            )}

<hr className="my-1 border-gray-300" />
            <Item
              title={t.cardDesigner || "Card designer"}
              to="/Settings"
              icon={<PaletteOutlinedIcon />}
              active={isActive("/Settings")}
              isRtl={isRtl}
            />

<hr className="my-1 border-gray-300" />

            {can(CAN.ABOUT) && (
              <Item
                title={t.about}
                to="/faq"
                icon={<HelpOutlineOutlinedIcon />}
                active={isActive("/faq")}
                isRtl={isRtl}
              />
            )}
          </Box>
        </Menu>
      </Sidebar>
    </Box>
  );
};

export default MySidebar;
