import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
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
  const recentActivityQ = useQuery({
    queryKey: ["dash-recent-activity"],
    queryFn: () => searchAuditLogs({ page: 0, size: 8 }),
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

  const activityRows = useMemo(() => {
    return (recentActivityQ.data?.content || []).map((r) => {
      const when = r?.createdAt ? new Date(r.createdAt).toLocaleString() : "—";
      const action = r?.action || "—";
      const entity = r?.entityType ? `${r.entityType}${r.entityId ? ` #${r.entityId}` : ""}` : "—";
      return { id: r?.id || `${action}-${when}`, when, action, entity };
    });
  }, [recentActivityQ.data]);

  return (
    <Box m="20px 0" p="0 20px" dir={isRtl ? "rtl" : "ltr"}>
      <Header title={t.schoolManagement} subtitle={t.dashboardSubtitle || t.dataManagement} />

      {loadingAny && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ my: 1 }}>
          <CircularProgress size={18} />
          <Typography variant="body2">{t.loading || "Loading..."}</Typography>
        </Stack>
      )}

      <Box
        mt={2}
        display="grid"
        gap={1.5}
        gridTemplateColumns={{ xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }}
      >
        {kpiCards.map((card) => (
          <Paper
            key={card.key}
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              border: `1px solid ${colors.primary[300]}`,
              background:
                theme.palette.mode === "light"
                  ? "linear-gradient(135deg, rgba(59,130,246,.12), rgba(59,130,246,.02))"
                  : "linear-gradient(135deg, rgba(30,58,138,.5), rgba(15,23,42,.3))",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {card.label}
              </Typography>
              <Box color={colors.blueAccent[300]}>{card.icon}</Box>
            </Stack>
            <Typography variant="h4" fontWeight={700} mt={1}>
              {card.value}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Paper elevation={0} sx={{ mt: 2, p: 2, borderRadius: 2, border: `1px solid ${colors.primary[300]}` }}>
        <Typography variant="h6" fontWeight={700} mb={1.5}>
          {t.dashboardQuickActions || "Quick actions"}
        </Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          {quickActions.map((action) => (
            <Button
              key={action.key}
              variant="contained"
              startIcon={action.icon}
              onClick={action.onClick}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                backgroundColor: colors.blueAccent[700],
                "&:hover": { backgroundColor: colors.blueAccent[600] },
              }}
            >
              {action.label}
            </Button>
          ))}
        </Stack>
      </Paper>

      <Box
        mt={2}
        display="grid"
        gap={1.5}
        gridTemplateColumns={{ xs: "1fr", lg: "1fr 1fr" }}
        alignItems="start"
      >
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${colors.primary[300]}` }}>
          <Typography variant="h6" fontWeight={700} mb={1}>
            {t.dashboardNeedsAttention || "Needs attention"}
          </Typography>
          {alerts.length === 0 ? (
            <Alert severity="success">{t.dashboardNoAlerts || "No urgent alerts right now."}</Alert>
          ) : (
            <Stack spacing={1}>
              {alerts.map((a, idx) => (
                <Alert
                  key={idx}
                  severity={a.severity}
                  action={
                    <Button color="inherit" size="small" onClick={a.onClick}>
                      {t.view || "View"}
                    </Button>
                  }
                >
                  {a.text}
                </Alert>
              ))}
            </Stack>
          )}
        </Paper>

        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${colors.primary[300]}` }}>
          <Typography variant="h6" fontWeight={700} mb={1}>
            {t.dashboardRecentActivity || "Recent activity"}
          </Typography>
          <Stack spacing={1}>
            {activityRows.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t.noData || "No data"}
              </Typography>
            ) : (
              activityRows.map((row) => (
                <Stack
                  key={row.id}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ p: 1, borderRadius: 1, backgroundColor: theme.palette.mode === "light" ? "#f8fafc" : colors.primary[400] }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={row.action} />
                    <Typography variant="body2">{row.entity}</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {row.when}
                  </Typography>
                </Stack>
              ))
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
