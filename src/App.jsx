// src/App.jsx
import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { ColorModeContext, useMode } from "./theme";
import Settings from "./scenes/settings/Settings";

import { AuthProvider } from "./auth/AuthContext";

import ProtectedRoute from "./components/guards/ProtectedRoute";
import PublicOnlyRoute from "./components/guards/PublicOnlyRoute";
import RoleRoute from "./components/guards/RoleRoute";
import PermRoute from "./components/guards/PermRoute";
import RouteTracker from "./components/guards/RouteTracker";
import Levels from "./scenes/levels";
import Sections from "./scenes/sections";

// Layout
import AppShell from "./scenes/global/AppShell";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import Dashboard from "./scenes/dashboard";
import Teachers from "./scenes/teachers";
import Contacts from "./scenes/contacts";
import Invoices from "./scenes/invoices";
import Calendar from "./scenes/calendar";
import Faq from "./scenes/faq";
import IncomeDialog from "./scenes/finances/IncomeDialog";

// Admin
import UsersPage from "./scenes/admin/users/UsersPage";
import Students from "./scenes/students";
import Groups from "./scenes/groups";
import Classes from "./scenes/classes";
import Finances from "./scenes/finances";
import Subjects from "./scenes/subjects";
import Specialities from "./scenes/specialties";
import Schools from "./scenes/schools";
import Enrollments from "./scenes/enrollment/Enrollments";
import Attendance from "./scenes/attendance"

// ✅ Student billing screens
import StudentBillingSearch from "./scenes/finances/StudentBillingSearch";
import StudentPayment from "./scenes/finances/StudentPayment";
import StudentReceiptHistory from "./scenes/finances/StudentReceiptHistory";

// ✅ Teacher pay screens (list + detail)
import TeacherPayList from "./scenes/finances/TeacherPayList";
import TeacherPay from "./scenes/finances/TeacherPay";

// ✅ NEW: Expenses page (list + create/edit dialog inside)
import Expenses from "./scenes/finances/Expenses";

// ✅ NEW: Profit & Loss page
import ProfitLoss from "./scenes/finances/ProfitLoss";

// ✅ React Query
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a client once for the whole app
const queryClient = new QueryClient();

export default function App() {
  const [theme, colorMode] = useMode();

  // ✅ Language state
  const [language, setLanguage] = useState("fr");

  // ✅ Update page direction on language change
  useEffect(() => {
    document.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ColorModeContext.Provider value={colorMode}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <RouteTracker />

            <Routes>
              {/* Public */}
              <Route path="/" element={<Home language={language}/>} />
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<Login language={language} />} />
                <Route path="/signup" element={<Signup language={language} />} />
              </Route>

              {/* Protected layout with AppShell */}
              <Route element={<ProtectedRoute />}>
                <Route
                  element={
                    <AppShell setLanguage={setLanguage} language={language} />
                  }
                >
                  {/* Example permission gates */}
                  <Route element={<PermRoute anyOf={["MENU:HOME_VIEW"]} />}>
                    <Route
                      path="/dashboard"
                      element={<Dashboard language={language} />}
                    />
                  </Route>

                  <Route element={<PermRoute anyOf={["MENU:TEACHERS_VIEW"]} />}>
                    <Route
                      path="/teachers"
                      element={<Teachers language={language} />}
                    />
                  </Route>

                  <Route element={<PermRoute anyOf={["MENU:STUDENTS_VIEW"]} />}>
                    <Route
                      path="/students"
                      element={<Students language={language} />}
                    />
                  </Route>

                  <Route path="/groups" element={<Groups language={language} />} />
                  <Route path="/subjects" element={<Subjects language={language} />} />
                  <Route path="/classes" element={<Classes language={language} />} />
                  <Route path="/levels" element={<Levels language={language} />} />
                  <Route path="/sections" element={<Sections language={language} />} />
                  <Route path="/schools" element={<Schools language={language} />} />
                  <Route path="/enrollment" element={<Enrollments language={language} />} />
                  <Route path="/attendance" element={<Attendance language={language} />} />
                  
                  {/* Finances + existing billing flow */}
                  <Route path="/finances" element={<Finances language={language} />} />
                  <Route
                    path="/finances/IncomeDialog"
                    element={<IncomeDialog language={language} />}
                  />

                  {/* 🔹 Expenses page */}
                  <Route path="/finances/expenses" element={<Expenses language={language}/>} />

                  {/* 🔹 Profit & Loss page */}
                  <Route path="/finances/profit-loss" element={<ProfitLoss language={language} />} />

                  {/* 🔹 Student billing */}
                  <Route path="/finances/billing" element={<StudentBillingSearch language={language} />} />
                  <Route path="/finances/pay/:studentId" element={<StudentPayment  language={language}/>} />
                  <Route path="/finances/history/:studentId" element={<StudentReceiptHistory language={language}/>} />

                  {/* 🔹 Teacher pay (list + detail) */}
                  <Route path="/finances/teacher-pay" element={<TeacherPayList language={language}/>} />
                  <Route path="/finances/teacher-pay/:teacherId" element={<TeacherPay language={language}/>} />

                  <Route path="/Settings" element={<Settings language={language} />} />


                  {/* Open pages */}
                  <Route path="/invoices" element={<Invoices  language={language}/>} />
                  <Route path="/specialities" element={<Specialities language={language} />} />
                  <Route path="/calendar" element={<Calendar language={language} />} />
                  <Route path="/faq" element={<Faq language={language} />} />

                  {/* Admin / Users management – permission based */}
                  <Route
                    element={
                      <PermRoute anyOf={["API:ACCOUNTS_READ", "API:USER_PERMS_WRITE"]} />
                    }
                  >
                    <Route path="/admin/users" element={<UsersPage language={language} />} />
                  </Route>

                  {/* Role based gate */}
                  <Route element={<RoleRoute roles={["ROLE_ADMIN", "ROLE_PRINCIPAL"]} />}>
                    <Route path="/admin" element={<div className="p-6">Admin Panel</div>} />
                  </Route>
                </Route>
              </Route>

              {/* Fallbacks */}
              <Route path="/forbidden" element={<div className="p-8">403 Forbidden</div>} />
              <Route path="*" element={<div className="p-8">Not Found</div>} />
            </Routes>
          </ThemeProvider>
        </ColorModeContext.Provider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
