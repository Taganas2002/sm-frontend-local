// src/scenes/global/Sidebar.jsx
import { useEffect, useState } from "react";
import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import { Box, IconButton, Typography, useTheme } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import { tokens } from "../../theme";
import translations from "../../translations/index";
import { useAuth } from "../../auth/AuthContext";

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
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import DoorFrontOutlinedIcon from "@mui/icons-material/DoorFrontOutlined";
import MenuBookTwoToneIcon from "@mui/icons-material/MenuBookTwoTone";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";

const Item = ({ title, to, icon, onClick, active }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  return (
    <MenuItem
      component={<Link to={to} />}
      active={!!active}
      style={{
        color: theme.palette.mode === "light" ? "#334155" : colors.grey[900],
      }}
      icon={icon}
      onClick={onClick}
    >
      <Typography sx={{ fontSize: "1.20rem", fontWeight: "bold" }}>
        {title}
      </Typography>
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

const MySidebar = ({ language }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selected, setSelected] = useState("Dashboard"); // fallback
  const t = translations[language];

  const { user, can, hasRole } = useAuth();
  const location = useLocation();

  // helper to keep active state synced to URL
  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  // also keep the old "selected" updated so your previous logic still works
  useEffect(() => {
    const p = location.pathname;
    if (p.startsWith("/dashboard")) setSelected("Dashboard");
    else if (p.startsWith("/teachers")) setSelected("Teachers");
    else if (p.startsWith("/students")) setSelected("Students");
    else if (p.startsWith("/groups")) setSelected("Groups");
    else if (p.startsWith("/classes")) setSelected("Classes");
    else if (p.startsWith("/subjects")) setSelected("Subjects");
    else if (p.startsWith("/levels")) setSelected("Levels");
    else if (p.startsWith("/sections")) setSelected("Sections");
    else if (p.startsWith("/calendar")) setSelected("Calendar");
    else if (p.startsWith("/enrollment")) setSelected("Enrollments");
    // else if (p.startsWith("/Specialities")) setSelected("Specialities");
    else if (p.startsWith("/finances")) setSelected("Finance");
    else if (p.startsWith("/faq")) setSelected("About");
    else if (p.startsWith("/admin/users")) setSelected("Users");
  }, [location.pathname]);

  const showUsers =
    hasRole("ROLE_ADMIN") ||
    hasRole("ROLE_PRINCIPAL") ||
    can("API:ACCOUNTS_READ") ||
    can("API:USER_PERMS_WRITE");

  return (
    <Box
      sx={{
        "& .pro-sidebar-inner": {
          background: `${colors.primary[400]} !important`,
        },
        "& .pro-icon-wrapper": {
          backgroundColor: "transparent !important",
        },
        "& .pro-inner-item": {
          padding: "5px 35px 5px 20px !important",
        },
        "& .pro-inner-item:hover": {
          color: "#868dfb !important",
        },
        "& .pro-menu-item.active": {
          color: "#6870fa !important",
        },
            "& .ps-submenu .ps-menu-button": {
            fontWeight: "normal !important",
            color: "#1e293b !important", // Finance + children text
          },
          "& .ps-submenu .ps-menu-button svg": {
            color: "#1e293b !important", // Finance icon + arrow (chevron)
          },
      }}
    >
      <Sidebar
        collapsed={isCollapsed}
        style={{
          backgroundColor: theme.palette.mode === "dark" ? "#334155" : "#cbd5e1",
          height: "130vh",
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
        <hr className="my-2 border-gray-300" />


          {/* PROFILE */}
          {/* {!isCollapsed && (
            <Box mb="20px">
              <Box display="flex" justifyContent="center" alignItems="center">
                <img
                  alt="profile-user"
                  width="120px"
                  height="120px"
                  src={`src/assets/user.png`}
                  style={{ cursor: "pointer", borderRadius: "50%" }}
                />
              </Box>
              <Box textAlign="center">
                <Typography variant="h3" color="#1e293b" fontWeight="bold">
                  {user?.username || user?.name || user?.email || "User"}
                </Typography>
              </Box>
            </Box>
          )} */}

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
                onClick={() => setSelected("Dashboard")}
              />
            )}
<hr className="my-1 border-gray-300" />

            {can(CAN.TEACHERS) && (
              <Item
                title={t.teachers}
                to="/teachers"
                icon={<PeopleOutlinedIcon />}
                active={isActive("/teachers")}
                onClick={() => setSelected("Teachers")}
              />
            )}
<hr className="my-1 border-gray-300" />

            {can(CAN.STUDENTS) && (
              <Item
                title={t.students}
                to="/students"
                icon={<ContactsOutlinedIcon />}
                active={isActive("/students")}
                onClick={() => setSelected("Students")}
              />
            )}
{/* <hr className="my-1 border-gray-300" />

            {can(CAN.SCHOOLS) && (
              <Item
                title={t.schools}
                to="/schools"
                icon={<SchoolOutlinedIcon />}
                active={isActive("/schools")}
                onClick={() => setSelected("Schools")}
              />
            )} */}
<hr className="my-1 border-gray-300" />

            {can(CAN.GROUPS) && (
              <Item
                title={t.groups}
                to="/groups"
                icon={<MenuBookOutlinedIcon />}
                active={isActive("/groups")}
                onClick={() => setSelected("Groups")}
              />
            )}
<hr className="my-1 border-gray-300" />

{can(CAN.ATTENDANCE) && (
              <Item
                title={t.presence}
                to="/attendance"
                icon={<CalendarTodayOutlinedIcon />}
                active={isActive("/attendance")}
                onClick={() => setSelected("Attendance")}
              />
            )}
<hr className="my-1 border-gray-300" />


            {can(CAN.CLASSES) && (
              <Item
                title={t.classes}
                to="/classes"
                icon={<DoorFrontOutlinedIcon />}
                active={isActive("/classes")}
                onClick={() => setSelected("Classes")}
              />
            )}

<hr className="my-1 border-gray-300" />
          {can(CAN.SUBJECTS) && (
              <Item
                title={t.subjects}
                to="/subjects"
                icon={<SchoolOutlinedIcon />}
                active={isActive("/subjects")}
                onClick={() => setSelected("Subjects")}
              />
            )}
<hr className="my-1 border-gray-300" />

            {can(CAN.LEVELS) && (
              <Item
                title={t.levels}
                to="/levels"
                icon={<LayersOutlinedIcon />}
                active={isActive("/levels")}
                onClick={() => setSelected("Levels")}
              />
            )}
<hr className="my-1 border-gray-300" />

            {can(CAN.SECTIONS) && (
              <Item
                title={t.sections}
                to="/sections"
                icon={<CategoryIcon />}
                active={isActive("/sections")}
                onClick={() => setSelected("Sections")}
              />
            )}
<hr className="my-1 border-gray-300" />

            {can(CAN.TIMETABLE) && (
              <Item
                title={t.schedule}
                to="/calendar"
                icon={<CalendarTodayOutlinedIcon />}
                active={isActive("/calendar")}
                onClick={() => setSelected("Calendar")}
              />
            )}
<hr className="my-1 border-gray-300" />

            {/* {can(CAN.SPECIALTIES) && (
              <Item
                title={t.specialties}
                to="/Specialities"
                icon={<MenuBookTwoToneIcon />}
                active={isActive("/Specialities")}
                onClick={() => setSelected("Specialities")}
              />
            )}
<hr className="my-1 border-gray-300" /> */}

{/* Finance submenu */}
            {can(CAN.FINANCE) && (
              <SubMenu
                label={
                  <Typography
                    sx={{
                      fontSize: "1.20rem",
                      fontWeight: "bold",
                      color: "#1e293b !important",
                    }}
                  >
                    {t.finance}
                  </Typography>
                }
                icon={
                  <AccountBalanceOutlinedIcon sx={{ color: "#1e293b !important" }} />
                }
              >
                {/* Student billing */}
                <MenuItem component={<Link to="/finances/billing" />}>
                  <Typography
                    sx={{
                      fontSize: "1.20rem",
                      fontWeight: "bold",
                      textAlign: "center",
                      color: "#1e293b !important",
                    }}
                  >
                    {t.income}
                  </Typography>
                </MenuItem>

                {/* Expenses list */}
                <MenuItem component={<Link to="/finances/expenses" />}>
                  <Typography
                    sx={{
                      fontSize: "1.20rem",
                      fontWeight: "bold",
                      textAlign: "center",
                      color: "#1e293b !important",
                    }}
                  >
                    {t.expense}
                  </Typography>
                </MenuItem>

                {/* ✅ Profit & Loss (replaces Sales) */}
                <MenuItem component={<Link to="/finances/profit-loss" />}>
                  <Typography
                    sx={{
                      fontSize: "1.20rem",
                      fontWeight: "bold",
                      textAlign: "center",
                      color: "#1e293b !important",
                    }}
                  >
                    {t.profitLoss}
                  </Typography>
                </MenuItem>

                {/* Teacher pay */}
                <MenuItem component={<Link to="/finances/teacher-pay" />}>
                  <Typography
                    sx={{
                      fontSize: "1.20rem",
                      fontWeight: "bold",
                      textAlign: "center",
                      color: "#1e293b !important",
                    }}
                  >
                    {t.teacherPay}
                  </Typography>
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
                onClick={() => setSelected("Users")}
              />
            )}

<hr className="my-1 border-gray-300" />

            {can(CAN.ABOUT) && (
              <Item
                title={t.about}
                to="/faq"
                icon={<HelpOutlineOutlinedIcon />}
                active={isActive("/faq")}
                onClick={() => setSelected("About")}
              />
            )}
          </Box>
        </Menu>
      </Sidebar>
    </Box>
  );
};

export default MySidebar;
