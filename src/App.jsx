// src/App.jsx
import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { ColorModeContext, useMode } from "./theme";
import Settings from "./scenes/settings/Settings";

import { AuthProvider } from "./auth/AuthContext";

import ProtectedRoute from "./components/guards/ProtectedRoute";
import PublicOnlyRoute from "./components/guards/PublicOnlyRoute";
import RoleRoute from "./components/guards/RoleRoute";
import PermRoute from "./components/guards/PermRoute";
import RouteTracker from "./components/guards/RouteTracker";
import SuperAdminRoute from "./components/guards/SuperAdminRoute";
import Levels from "./scenes/levels";
import Sections from "./scenes/sections";
import Expired from "./pages/Expired";
import PublicForbidden from "./pages/PublicForbidden";
import PublicNotFound from "./pages/PublicNotFound";

import AppShell from "./scenes/global/AppShell";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SuperAdminLogin from "./pages/SuperAdminLogin";

import Dashboard from "./scenes/dashboard";
import Teachers from "./scenes/teachers";
import Contacts from "./scenes/contacts";
import Invoices from "./scenes/invoices";
import Calendar from "./scenes/calendar";
import Faq from "./scenes/faq";
import IncomeDialog from "./scenes/finances/IncomeDialog";

import UsersPage from "./scenes/admin/users/UsersPage";
import SuperAdminLicensesPage from "./scenes/admin/licenses/SuperAdminLicensesPage";
import SuperAdminShell from "./scenes/admin/SuperAdminShell";
import Students from "./scenes/students";
import Groups from "./scenes/groups";
import Classes from "./scenes/classes";
import Finances from "./scenes/finances";
import Subjects from "./scenes/subjects";
import Specialities from "./scenes/specialties";
import Schools from "./scenes/schools";
import Enrollments from "./scenes/enrollment/Enrollments";
import Attendance from "./scenes/attendance";

import StudentBillingSearch from "./scenes/finances/StudentBillingSearch";
import StudentPayment from "./scenes/finances/StudentPayment";
import StudentReceiptHistory from "./scenes/finances/StudentReceiptHistory";

import TeacherPayList from "./scenes/finances/TeacherPayList";
import TeacherPay from "./scenes/finances/TeacherPay";
import PaymentAuditLog from "./scenes/finances/PaymentAuditLog";

import Expenses from "./scenes/finances/Expenses";
import ProfitLoss from "./scenes/finances/ProfitLoss";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();
const LANGUAGE_LS_KEY = "app:language";

export default function App() {
  const [language, setLanguage] = useState(() => localStorage.getItem(LANGUAGE_LS_KEY) || "fr");
  const [theme, colorMode] = useMode(language);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_LS_KEY, language);
    document.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ColorModeContext.Provider value={colorMode}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <RouteTracker />

            <Routes>
              <Route path="/" element={<Home language={language} setLanguage={setLanguage} />} />
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<Login language={language} />} />
                <Route path="/signup" element={<Signup language={language} />} />
              </Route>
              <Route path="/super-admin/login" element={<SuperAdminLogin language={language} />} />

              <Route path="/expired" element={<Expired language={language} />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell setLanguage={setLanguage} language={language} />}>
                  <Route element={<PermRoute anyOf={["MENU:HOME_VIEW"]} />}>
                    <Route path="/dashboard" element={<Dashboard language={language} />} />
                  </Route>

                  <Route element={<PermRoute anyOf={["MENU:TEACHERS_VIEW"]} />}>
                    <Route path="/teachers" element={<Teachers language={language} />} />
                  </Route>

                  <Route element={<PermRoute anyOf={["MENU:STUDENTS_VIEW"]} />}>
                    <Route path="/students" element={<Students language={language} />} />
                  </Route>

                  <Route path="/groups" element={<Groups language={language} />} />
                  <Route path="/subjects" element={<Subjects language={language} />} />
                  <Route path="/classes" element={<Classes language={language} />} />
                  <Route path="/levels" element={<Levels language={language} />} />
                  <Route path="/sections" element={<Sections language={language} />} />
                  <Route path="/schools" element={<Schools language={language} />} />
                  <Route path="/enrollment" element={<Enrollments language={language} />} />
                  <Route path="/attendance" element={<Attendance language={language} />} />

                  <Route path="/finances" element={<Finances language={language} />} />
                  <Route path="/finances/IncomeDialog" element={<IncomeDialog language={language} />} />
                  <Route path="/finances/expenses" element={<Expenses language={language} />} />
                  <Route path="/finances/profit-loss" element={<ProfitLoss language={language} />} />
                  <Route path="/finances/billing" element={<StudentBillingSearch language={language} />} />
                  <Route path="/finances/pay/:studentId" element={<StudentPayment language={language} />} />
                  <Route path="/finances/history/:studentId" element={<StudentReceiptHistory language={language} />} />
                  <Route path="/finances/teacher-pay" element={<TeacherPayList language={language} />} />
                  <Route path="/finances/teacher-pay/:teacherId" element={<TeacherPay language={language} />} />
                  <Route path="/finances/audit-log" element={<PaymentAuditLog language={language} />} />

                  <Route path="/Settings" element={<Settings language={language} />} />

                  <Route path="/invoices" element={<Invoices language={language} />} />
                  <Route path="/specialities" element={<Specialities language={language} />} />
                  <Route path="/calendar" element={<Calendar language={language} />} />
                  <Route path="/faq" element={<Faq language={language} />} />

                  <Route element={<PermRoute anyOf={["API:ACCOUNTS_READ", "API:USER_PERMS_WRITE"]} />}>
                    <Route path="/admin/users" element={<UsersPage language={language} />} />
                  </Route>

                  <Route element={<RoleRoute roles={["ROLE_ADMIN", "ROLE_PRINCIPAL"]} />}>
                    <Route path="/admin" element={<div className="p-6">Admin Panel</div>} />
                  </Route>

                </Route>
              </Route>

              <Route element={<SuperAdminRoute />}>
                <Route path="/super-admin" element={<SuperAdminShell setLanguage={setLanguage} language={language} />}>
                  <Route index element={<Navigate to="/super-admin/licenses" replace />} />
                  <Route path="licenses" element={<SuperAdminLicensesPage />} />
                </Route>
              </Route>

              <Route path="/forbidden" element={<PublicForbidden language={language} />} />
              <Route path="*" element={<PublicNotFound language={language} />} />
            </Routes>
          </ThemeProvider>
        </ColorModeContext.Provider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
