// src/scenes/finances/components/TeacherPayoutHistoryDialog.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Switch,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useQuery } from "@tanstack/react-query";
import { listTeacherPayouts } from "../../../api/teacherBilling";
import translations from "../../../translations";
import { tokens } from "../../../theme";


function fmtMoney(n) {
  const v = Number(n ?? 0);
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toCsv(rows) {
  const header = ["Group", "Student", "Source", "Period", "PaymentId", "EarnedAt", "Net"];
  const body = rows.map((r) => [
    r.group, r.student, r.source, r.period, r.paymentId, r.earnedAt, r.amount,
  ]);
  return [header, ...body]
    .map((line) => line.map((v) => `"${String(v ?? "").replaceAll("\"", "\"\"")}"`).join(","))
    .join("\n");
}

const payoutActionButtonSx = (theme, variant = "primary") => {
  const palettes = {
    primary: {
      light: { bg: "#2563eb", fg: "#ffffff", border: "#1d4ed8", hover: "#1d4ed8" },
      dark: { bg: "#2563eb", fg: "#f8fafc", border: "#60a5fa", hover: "#3b82f6" },
    },
    secondary: {
      light: { bg: "#0f766e", fg: "#ffffff", border: "#0f766e", hover: "#0d9488" },
      dark: { bg: "#0f766e", fg: "#f8fafc", border: "#5eead4", hover: "#0d9488" },
    },
    neutral: {
      light: { bg: "#f8fafc", fg: "#0f172a", border: "#64748b", hover: "#e2e8f0" },
      dark: { bg: "rgba(30,41,59,.9)", fg: "#f8fafc", border: "#cbd5e1", hover: "rgba(51,65,85,.95)" },
    },
  };
  const tone = theme.palette.mode === "light" ? palettes[variant].light : palettes[variant].dark;
  return {
    textTransform: "none",
    fontWeight: 700,
    borderRadius: 2,
    minWidth: 104,
    borderColor: tone.border,
    color: tone.fg,
    backgroundColor: tone.bg,
    "&:hover": {
      borderColor: tone.border,
      backgroundColor: tone.hover,
    },
  };
};

export default function TeacherPayoutHistoryDialog({
  open,
  onClose,
  teacherId,
  teacherName,
  language = "fr",
}) {
  const [report, setReport] = useState(null);
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showGroupSummary, setShowGroupSummary] = useState(false);
  const reportRows = (report?.lines || []).map((l, idx) => ({
    id: l.earningId || idx,
    group: l.groupName || "-",
    student: l.studentName || "-",
    source: l.paymentType || "-",
    period: l.periodKey || "-",
    paymentId: l.studentPaymentId || "-",
    earnedAt: l.earnedAt ? new Date(l.earnedAt).toLocaleString() : "-",
    amount: Number(l.amountNet || 0),
  }));
  const { data, isFetching } = useQuery({
    queryKey: ["teacherPayouts", teacherId],
    queryFn: () => listTeacherPayouts(teacherId),
    enabled: open && !!teacherId,
  });
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = translations[language] || translations["fr"];
  const rows = useMemo(
    () =>
      (data ?? []).map((p) => {
        const d = p.issuedAt ? new Date(p.issuedAt) : null;
        const date = d ? d.toLocaleDateString() : "";
        const time = d
          ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "";
        return {
          id: p.payoutId,
          payoutNo: p.payoutNo,
          date,
          time,
          method: p.method,
          raw: p,
          // 👇 normalize to a single "total" field the column will read
          total: Number(p.totalAmount ?? p.total ?? 0),
          groups: (p.items ?? [])
            .map((it) => `${it.groupName ?? t.noGroup} ×${it.lines}`)
            .join(", "),
        };
      }),
    [data, t.noGroup]
  );

  const groupOptions = useMemo(() => {
    const names = new Set();
    (data ?? []).forEach((p) => (p.items ?? []).forEach((it) => names.add(it.groupName || t.noGroup || "No group")));
    return ["ALL", ...Array.from(names).sort((a, b) => String(a).localeCompare(String(b)))];
  }, [data, t.noGroup]);

  const normalizedRows = useMemo(() => {
    return rows.map((r) => {
      const raw = r.raw;
      const groups = raw?.items ?? [];
      return {
        ...r,
        issuedAt: raw?.issuedAt ? new Date(raw.issuedAt) : null,
        groupsRaw: groups,
      };
    });
  }, [rows]);

  const minMax = useMemo(() => {
    if (!normalizedRows.length) return { min: "", max: "" };
    const times = normalizedRows
      .map((r) => r.issuedAt?.getTime())
      .filter((v) => Number.isFinite(v));
    if (!times.length) return { min: "", max: "" };
    const min = new Date(Math.min(...times));
    const max = new Date(Math.max(...times));
    const toYmd = (d) => d.toISOString().slice(0, 10);
    return { min: toYmd(min), max: toYmd(max) };
  }, [normalizedRows]);

  useEffect(() => {
    if (!open) return;
    if (!fromDate && !toDate && minMax.min && minMax.max) {
      setFromDate(minMax.min);
      setToDate(minMax.max);
    }
  }, [open, minMax, fromDate, toDate]);

  const filteredRows = useMemo(() => {
    const fromTs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toTs = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
    return normalizedRows.filter((r) => {
      const rowTs = r.issuedAt?.getTime() ?? null;
      if (fromTs != null && rowTs != null && rowTs < fromTs) return false;
      if (toTs != null && rowTs != null && rowTs > toTs) return false;
      if (groupFilter !== "ALL") {
        return (r.groupsRaw || []).some((g) => (g.groupName || t.noGroup || "No group") === groupFilter);
      }
      return true;
    });
  }, [normalizedRows, fromDate, toDate, groupFilter, t.noGroup]);

  const rangeLabel = useMemo(() => {
    if (!filteredRows.length) return "-";
    const sorted = [...filteredRows].sort((a, b) => (a.issuedAt?.getTime() || 0) - (b.issuedAt?.getTime() || 0));
    const f = sorted[0]?.issuedAt ? sorted[0].issuedAt.toLocaleDateString() : "-";
    const l = sorted[sorted.length - 1]?.issuedAt ? sorted[sorted.length - 1].issuedAt.toLocaleDateString() : "-";
    return `${f} -> ${l}`;
  }, [filteredRows]);

  const totals = useMemo(() => {
    const payoutsCount = filteredRows.length;
    const groupsCount = new Set(
      filteredRows.flatMap((r) => (r.groupsRaw || []).map((g) => g.groupName || t.noGroup || "No group"))
    ).size;
    const amount = filteredRows.reduce((sum, r) => {
      if (groupFilter === "ALL") return sum + Number(r.total || 0);
      const groupAmount = (r.groupsRaw || [])
        .filter((g) => (g.groupName || t.noGroup || "No group") === groupFilter)
        .reduce((s, g) => s + Number(g.amount || 0), 0);
      return sum + groupAmount;
    }, 0);
    return { payoutsCount, amount, groupsCount };
  }, [filteredRows, groupFilter, t.noGroup]);

  const groupSummaryRows = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((r) => {
      (r.groupsRaw || []).forEach((g) => {
        const name = g.groupName || t.noGroup || "No group";
        const prev = map.get(name) || { id: name, group: name, payouts: 0, lines: 0, amount: 0 };
        prev.payouts += 1;
        prev.lines += Number(g.lines || 0);
        prev.amount += Number(g.amount || 0);
        map.set(name, prev);
      });
    });
    return Array.from(map.values()).sort((a, b) => String(a.group).localeCompare(String(b.group)));
  }, [filteredRows, t.noGroup]);

  const columns = [
    { field: "payoutNo", headerName: t.payoutNo, width: 170, headerAlign: "center", align: "center" },
    { field: "date", headerName: t.date, width: 130, headerAlign: "center", align: "center" },
    { field: "time", headerName: t.time, width: 110, headerAlign: "center", align: "center" },
    { field: "method", headerName: t.method, width: 110, headerAlign: "center", align: "center" },
    {
      field: "total",
      headerName: t.total,
      width: 120,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => <span>{fmtMoney(params.row.total)}</span>,
      sortable: false,
    },
    { field: "groups", headerName: t.groupsLines, flex: 1, minWidth: 260 },
    {
      field: "report",
      headerName: "Report",
      width: 120,
      sortable: false,
      filterable: false,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Button
          size="small"
          variant="contained"
          onClick={() => setReport(params.row.raw)}
          sx={payoutActionButtonSx(theme, "primary")}
        >
          {t.view || "View"}
        </Button>
      ),
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
{t.payoutHistory} — {teacherName} 
    </DialogTitle>
      <DialogContent dividers>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Report Filters
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="body2" color="text.secondary">Group summary</Typography>
            <Switch size="small" checked={showGroupSummary} onChange={(e) => setShowGroupSummary(e.target.checked)} />
          </Stack>
        </Stack>
        <Stack direction="row" gap={1} mb={1.25} flexWrap="wrap">
          <TextField
            size="small"
            type="date"
            label={t.from || "From"}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            type="date"
            label={t.to || "To"}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Autocomplete
            size="small"
            options={groupOptions}
            value={groupFilter}
            onChange={(_, v) => setGroupFilter(v || "ALL")}
            sx={{ minWidth: 220 }}
            renderInput={(params) => <TextField {...params} label={t.group || "Group"} />}
          />
          <Button
            size="small"
            variant="contained"
            sx={payoutActionButtonSx(theme, "neutral")}
            onClick={() => { setGroupFilter("ALL"); setFromDate(""); setToDate(""); }}
          >
            {t.clear || "Clear"}
          </Button>
          <Button
            size="small"
            variant="contained"
            sx={payoutActionButtonSx(theme, "secondary")}
            onClick={() => {
              const d = new Date();
              const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
              const to = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
              setFromDate(from);
              setToDate(to);
            }}
          >
            {t.thisMonth || "This month"}
          </Button>
        </Stack>

        <Stack direction="row" gap={1} mb={1.5} flexWrap="wrap">
          <Chip label={`Period: ${rangeLabel}`} />
          <Chip label={`Payouts: ${totals.payoutsCount}`} />
          <Chip label={`Groups: ${totals.groupsCount}`} />
          <Chip label={`Total: ${fmtMoney(totals.amount)}`} color="success" />
        </Stack>

        {showGroupSummary && (
        <Box mb={1.5} sx={{ border: `1px solid ${colors.primary[300]}`, borderRadius: 1, overflow: "hidden" }}>
          <DataGrid
            autoHeight
            rows={groupSummaryRows}
            columns={[
              { field: "group", headerName: "Group", minWidth: 180, flex: 1 },
              { field: "payouts", headerName: "Payouts", width: 110, align: "center", headerAlign: "center" },
              { field: "lines", headerName: "Lines", width: 110, align: "center", headerAlign: "center" },
              { field: "amount", headerName: "Total", width: 140, renderCell: (p) => fmtMoney(p.row.amount) },
            ]}
            disableRowSelectionOnClick
            hideFooter
          />
        </Box>
        )}

<Box height="360"
            dir={language === "ar" ? "rtl" : "ltr"}
            sx={{
            "& .MuiDataGrid-root": { border: "none" },
            "& .MuiDataGrid-columnHeaders": {
                backgroundColor: colors.blueAccent[700],
                borderBottom: "none",
                textAlign: language === "ar" ? "right" : "left",
            },
            "& .MuiDataGrid-cell": {
                textAlign: language === "ar" ? "right" : "left",
            },
            "& .MuiDataGrid-virtualScroller": {
                backgroundColor: colors.primary[400],
            },
            "& .MuiDataGrid-footerContainer": {
                borderTop: "none",
                backgroundColor: colors.blueAccent[400],
            },
            "& .MuiCheckbox-root.Mui-checked": {
                color:
                theme.palette.mode === "light"
                    ? colors.blueAccent[800]
                    : colors.blueAccent[400],
            },
            }}
        >          <DataGrid
            rows={filteredRows}
            columns={columns}
            loading={isFetching}
            disableRowSelectionOnClick
            pageSizeOptions={[5, 10]}
            initialState={{
              pagination: { paginationModel: { page: 0, pageSize: 10 } },
            }}
            sx={{
              "& .MuiDataGrid-columnHeader, & .MuiDataGrid-cell": {
                whiteSpace: "nowrap",
              },
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">{t.close}
</Button>
      </DialogActions>

      <Dialog open={!!report} onClose={() => setReport(null)} fullWidth maxWidth="lg">
        <DialogTitle>
          Payout Report — {report?.payoutNo || ""}
        </DialogTitle>
        <DialogContent dividers>
          <Stack direction="row" gap={1} mb={2} flexWrap="wrap">
            <Chip label={`Teacher: ${report?.teacherName || "-"}`} />
            <Chip label={`Method: ${report?.method || "-"}`} />
            <Chip label={`Reference: ${report?.reference || "-"}`} />
            <Chip label={`Total: ${fmtMoney(report?.totalAmount || 0)}`} color="success" />
          </Stack>
          <Box sx={{ border: `1px solid ${colors.primary[300]}`, borderRadius: 1, overflow: "hidden" }}>
            <DataGrid
              autoHeight
              rows={reportRows}
              columns={[
                { field: "group", headerName: "Group", minWidth: 150, flex: 1 },
                { field: "student", headerName: "Student", minWidth: 160, flex: 1 },
                { field: "source", headerName: "Source", width: 140 },
                { field: "period", headerName: "Period", width: 130 },
                { field: "paymentId", headerName: "Payment #", width: 110 },
                { field: "earnedAt", headerName: "Earned At", width: 170 },
                { field: "amount", headerName: "Net", width: 120, renderCell: (p) => fmtMoney(p.row.amount) },
              ]}
              disableRowSelectionOnClick
              hideFooter={report?.lines?.length <= 15}
              pageSizeOptions={[15, 30, 50]}
            />
          </Box>
          {(!report?.lines || report.lines.length === 0) && (
            <Typography mt={1.5} color="text.secondary">No line-level details found for this payout.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            sx={payoutActionButtonSx(theme, "secondary")}
            onClick={() => {
              const csv = toCsv(reportRows);
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `teacher-payout-${report?.payoutNo || report?.payoutId || "report"}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            Export CSV
          </Button>
          <Button onClick={() => setReport(null)} variant="contained" sx={payoutActionButtonSx(theme, "primary")}>
            {t.close || "Close"}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
