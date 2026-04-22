import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { motion } from "framer-motion";
import PersonIcon from "@mui/icons-material/Person";
import SchoolIcon from "@mui/icons-material/School";
import GroupsIcon from "@mui/icons-material/Groups";
import PaymentsIcon from "@mui/icons-material/Payments";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import Header from "../../components/Header";
import { getTranslations } from "../../translations";
import { tokens } from "../../theme";
import { searchStudents } from "../../api/studentsApi";
import { searchTeachers } from "../../api/teachersApi";
import { searchGroups } from "../../api/groupsApi";
import { searchCycleRange } from "../../api/billing";
import { searchAuditLogs } from "../../api/auditLogs";
import { useAuth } from "../../auth/AuthContext";

function moneyFormat(v) {
  const n = Number(v || 0);
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function getTotalFromPageLike(data) {
  return (
    Number(data?.totalElements) ||
    Number(data?.total) ||
    Number(data?.totalItems) ||
    Number(data?.count) ||
    0
  );
}

function startAndEndOfTodayIso() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

const MotionBox = motion.create(Box);
const MotionPaper = motion.create(Paper);

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard({ language = "fr" }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = getTranslations(language);
  const { can } = useAuth();
  const isRtl = language === "ar";
  const todayRange = useMemo(() => startAndEndOfTodayIso(), []);

  const studentsQ = useQuery({
    queryKey: ["dash-students-total"],
    queryFn: () => searchStudents({ page: 0, size: 1 }),
  });
  const teachersQ = useQuery({
    queryKey: ["dash-teachers-total"],
    queryFn: () => searchTeachers({ page: 0, size: 1 }),
  });
  const groupsQ = useQuery({
    queryKey: ["dash-groups-total"],
    queryFn: () => searchGroups({ page: 0, size: 1 }),
  });
  const unpaidQ = useQuery({
    queryKey: ["dash-unpaid-cycles"],
    queryFn: () =>
      searchCycleRange({
        status: "UNPAID",
        page: 0,
        size: 1,
      }),
  });
  const pendingAttendanceQ = useQuery({
    queryKey: ["dash-pending-attendance-cycles"],
    queryFn: () =>
      searchCycleRange({
        status: "PENDING_ATTENDANCE",
        page: 0,
        size: 1,
      }),
  });
  const collectionsTodayQ = useQuery({
    queryKey: ["dash-collections-today", todayRange.from, todayRange.to],
    queryFn: () =>
      searchAuditLogs({
        action: "BILLING_COLLECT",
        entityType: "Receipt",
        from: todayRange.from,
        to: todayRange.to,
        page: 0,
        size: 200,
      }),
  });

  const loadingAny =
    studentsQ.isLoading ||
    teachersQ.isLoading ||
    groupsQ.isLoading ||
    unpaidQ.isLoading ||
    pendingAttendanceQ.isLoading ||
    collectionsTodayQ.isLoading;

  const stats = useMemo(() => {
    const students = getTotalFromPageLike(studentsQ.data);
    const teachers = getTotalFromPageLike(teachersQ.data);
    const groups = getTotalFromPageLike(groupsQ.data);
    const unpaid = getTotalFromPageLike(unpaidQ.data);
    const pendingAttendance = getTotalFromPageLike(pendingAttendanceQ.data);
    const collectedToday = (collectionsTodayQ.data?.content || []).reduce((sum, r) => {
      try {
        const m = r?.metadataJson ? JSON.parse(r.metadataJson) : null;
        return sum + Number(m?.totalAmount || 0);
      } catch {
        return sum;
      }
    }, 0);
    return { students, teachers, groups, unpaid, pendingAttendance, collectedToday };
  }, [
    studentsQ.data,
    teachersQ.data,
    groupsQ.data,
    unpaidQ.data,
    pendingAttendanceQ.data,
    collectionsTodayQ.data,
  ]);

  const kpiCards = [
    { key: "students", label: t.dashboardKpiStudents || t.students, value: stats.students, icon: <PersonIcon /> },
    { key: "teachers", label: t.dashboardKpiTeachers || t.teachers, value: stats.teachers, icon: <SchoolIcon /> },
    { key: "groups", label: t.dashboardKpiGroups || t.groups, value: stats.groups, icon: <GroupsIcon /> },
    {
      key: "collectedToday",
      label: t.dashboardKpiCollectedToday || t.dashboardCollectedToday || "Collected today",
      value: moneyFormat(stats.collectedToday),
      icon: <PaymentsIcon />,
    },
    {
      key: "unpaid",
      label: t.dashboardKpiUnpaidCycles || t.unpaidGroups || "Unpaid cycles",
      value: stats.unpaid,
      icon: <WarningAmberIcon />,
    },
    {
      key: "pendingAttendance",
      label: t.dashboardKpiPendingAttendance || t.pendingAttendance || "Pending attendance",
      value: stats.pendingAttendance,
      icon: <FactCheckIcon />,
    },
  ];

  const quickActions = [
    {
      key: "addStudent",
      label: t.addStudent,
      icon: <PersonAddIcon />,
      onClick: () => navigate("/students"),
      enabled: can("MENU:STUDENTS_VIEW"),
    },
    {
      key: "addTeacher",
      label: t.addTeacher,
      icon: <GroupAddIcon />,
      onClick: () => navigate("/teachers"),
      enabled: can("MENU:TEACHERS_VIEW"),
    },
    {
      key: "collect",
      label: t.dashboardActionCollect || "Collect payment",
      icon: <PointOfSaleIcon />,
      onClick: () => navigate("/finances/billing"),
      enabled: can("MENU:FINANCE_VIEW"),
    },
    {
      key: "attendance",
      label: t.dashboardActionAttendance || "Attendance",
      icon: <EventAvailableIcon />,
      onClick: () => navigate("/attendance"),
      enabled: can("MENU:ATTENDANCE_VIEW"),
    },
    {
      key: "expenses",
      label: t.dashboardActionExpense || t.expense || "Expenses",
      icon: <ReceiptLongIcon />,
      onClick: () => navigate("/finances/expenses"),
      enabled: can("MENU:FINANCE:EXPENSES_VIEW") || can("MENU:FINANCE_VIEW"),
    },
    {
      key: "audit",
      label: t.dashboardActionAudit || "Audit log",
      icon: <FactCheckIcon />,
      onClick: () => navigate("/finances/audit-log"),
      enabled: can("MENU:FINANCE_VIEW"),
    },
  ].filter((x) => x.enabled);

  const alerts = [
    stats.pendingAttendance > 0
      ? {
          severity: "warning",
          text: `${t.dashboardAlertPendingAttendance || "Cycles waiting for attendance confirmation"}: ${stats.pendingAttendance}`,
          onClick: () => navigate("/attendance"),
        }
      : null,
    stats.unpaid > 0
      ? {
          severity: "info",
          text: `${t.dashboardAlertUnpaid || "Unpaid student cycles"}: ${stats.unpaid}`,
          onClick: () => navigate("/finances/billing"),
        }
      : null,
  ].filter(Boolean);

  return (
    <Box
      m="20px 0"
      p="0 20px"
      dir={isRtl ? "rtl" : "ltr"}
      sx={{
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: "-20% -10% auto -10%",
          height: 320,
          background:
            "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.28), transparent 50%), radial-gradient(circle at 80% 40%, rgba(14,165,233,0.22), transparent 45%)",
          filter: "blur(30px)",
          pointerEvents: "none",
          zIndex: 0,
          animation: "floatAura 8s ease-in-out infinite alternate",
          "@keyframes floatAura": {
            from: { transform: "translateY(-6px)" },
            to: { transform: "translateY(12px)" },
          },
        }}
      />

      <MotionBox
        variants={fadeUp}
        initial="hidden"
        animate="show"
        transition={{ duration: 0.45 }}
        sx={{ position: "relative", zIndex: 1 }}
      >
        <Header title={t.schoolManagement} subtitle={t.dashboardSubtitle || t.dataManagement} />
      </MotionBox>

      {loadingAny && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ my: 1 }}>
          <CircularProgress size={18} />
          <Typography variant="body2">{t.loading || "Loading..."}</Typography>
        </Stack>
      )}

      <MotionPaper
        variants={fadeUp}
        initial="hidden"
        animate="show"
        transition={{ duration: 0.5, delay: 0.05 }}
        elevation={0}
        sx={{
          mt: 2,
          p: { xs: 2, md: 2.5 },
          borderRadius: 3,
          border: `1px solid ${colors.primary[300]}`,
          background:
            theme.palette.mode === "light"
              ? "linear-gradient(145deg, rgba(255,255,255,0.95), rgba(239,246,255,0.88))"
              : "linear-gradient(145deg, rgba(15,23,42,0.88), rgba(30,41,59,0.75))",
          backdropFilter: "blur(12px)",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          spacing={1.2}
          alignItems={{ xs: "flex-start", md: "center" }}
          mb={1}
        >
          <Typography variant="h6" fontWeight={800}>
            {t.dashboardQuickActions || "Quick actions"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t.dashboardHeroHint || "Launch your most used actions in one click"}
          </Typography>
        </Stack>
        <Stack direction="row" gap={1} flexWrap="wrap">
          {quickActions.map((action, index) => (
            <MotionBox
              key={action.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 + 0.12 }}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                variant="contained"
                startIcon={action.icon}
                onClick={action.onClick}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 2,
                  background:
                    "linear-gradient(135deg, rgba(37,99,235,1), rgba(14,116,144,0.95))",
                  boxShadow: "0 10px 24px rgba(2,6,23,.28)",
                  border: "1px solid rgba(147,197,253,.35)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, rgba(30,64,175,1), rgba(8,145,178,0.98))",
                  },
                }}
              >
                {action.label}
              </Button>
            </MotionBox>
          ))}
        </Stack>
      </MotionPaper>

      <Box
        mt={2}
        display="grid"
        gap={1.5}
        gridTemplateColumns={{ xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }}
      >
        {kpiCards.map((card, index) => (
          <MotionPaper
            key={card.key}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, delay: index * 0.06 + 0.18 }}
            whileHover={{ y: -6 }}
            elevation={0}
            sx={{
              p: 2.2,
              borderRadius: 3,
              border: "1px solid rgba(96,165,250,.2)",
              background:
                theme.palette.mode === "light"
                  ? "linear-gradient(150deg, rgba(248,250,252,.98), rgba(219,234,254,.68))"
                  : "linear-gradient(150deg, rgba(15,23,42,.85), rgba(30,41,59,.7))",
              boxShadow:
                theme.palette.mode === "light"
                  ? "0 16px 34px rgba(30,64,175,.08)"
                  : "0 18px 36px rgba(2,6,23,.4)",
              position: "relative",
              overflow: "hidden",
              "&::before": {
                content: '""',
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(120deg, transparent 20%, rgba(59,130,246,.18) 50%, transparent 80%)",
                transform: "translateX(-120%)",
                transition: "transform .7s ease",
              },
              "&:hover::before": {
                transform: "translateX(120%)",
              },
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {card.label}
              </Typography>
              <Box
                color={colors.blueAccent[300]}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  backgroundColor:
                    theme.palette.mode === "light" ? "rgba(59,130,246,.12)" : "rgba(59,130,246,.22)",
                }}
              >
                {card.icon}
              </Box>
            </Stack>
            <Typography variant="h4" fontWeight={800} mt={1.2}>
              {card.value}
            </Typography>
          </MotionPaper>
        ))}
      </Box>

      <MotionPaper
        variants={fadeUp}
        initial="hidden"
        animate="show"
        transition={{ duration: 0.45, delay: 0.35 }}
        elevation={0}
        sx={{
          mt: 2,
          p: 2.2,
          borderRadius: 3,
          border: "1px solid rgba(56,189,248,.24)",
          background:
            theme.palette.mode === "light"
              ? "linear-gradient(145deg, rgba(239,246,255,.96), rgba(240,249,255,.86))"
              : "linear-gradient(145deg, rgba(2,6,23,.92), rgba(15,23,42,.82))",
        }}
      >
        <Typography variant="h6" fontWeight={800} mb={1.2}>
          {t.dashboardNeedsAttention || "Needs attention"}
        </Typography>
        {alerts.length === 0 ? (
          <Alert severity="success">{t.dashboardNoAlerts || "No urgent alerts right now."}</Alert>
        ) : (
          <Stack spacing={1}>
            {alerts.map((a, idx) => (
              <MotionBox
                key={idx}
                initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.28, delay: idx * 0.07 + 0.42 }}
              >
                <Alert
                  severity={a.severity}
                  action={
                    <Button color="inherit" size="small" onClick={a.onClick}>
                      {t.view || "View"}
                    </Button>
                  }
                  sx={{
                    borderRadius: 2,
                    "& .MuiAlert-message": { fontWeight: 600 },
                  }}
                >
                  {a.text}
                </Alert>
              </MotionBox>
            ))}
          </Stack>
        )}
      </MotionPaper>
    </Box>
  );
}
