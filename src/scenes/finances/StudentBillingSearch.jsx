import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  TextField,
  Tooltip,
  useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import PaymentOutlinedIcon from "@mui/icons-material/PaymentOutlined";
import Header from "../../components/Header";
import { searchCycleRange } from "../../api/billing";
import { lookupGroups } from "../../api/groups";
import StudentHistoryDialog from "./components/StudentHistoryDialog";
import translations from "../../translations";
import { tokens } from "../../theme";

const STATUSES = ["ALL", "UNPAID", "PARTIAL", "PAID"];
const yyyymm = () => new Date().toISOString().slice(0, 7);

const moneyFmt = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function MoneyChip({ value, kind }) {
  const v = Number(value ?? 0);
  const color =
    kind === "balance"
      ? v <= 0
        ? "success"
        : "error"
      : kind === "paid"
      ? "info"
      : "warning";
  return <Chip size="small" label={moneyFmt.format(v)} color={color} />;
}

// Infer billing model from a cycle row
const inferModel = (period, held, required) => {
  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(String(period || ""));
  return isDate && Number(required) === 1 && Number(held) >= 0
    ? "PER_SESSION"
    : "MONTHLY";
};

export default function StudentBillingSearch({ language = "fr" }) {
  const navigate = useNavigate();
  const t = translations[language] || translations["fr"];
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [start, setStart] = useState(yyyymm());
  const [end, setEnd] = useState(yyyymm());
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  const [groupValue, setGroupValue] = useState(null);
  const [groupInput, setGroupInput] = useState("");
  const [groupOptions, setGroupOptions] = useState([]);
  const typingTimer = useRef(null);

  useEffect(() => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(async () => {
      const opts = await lookupGroups({ q: groupInput.trim(), active: true, limit: 50 });
      setGroupOptions(opts || []);
    }, 250);
    return () => clearTimeout(typingTimer.current);
  }, [groupInput]);

  const groupId = groupValue?.id;

  const { data, isFetching, error } = useQuery({
    queryKey: ["dues-cycles-range", start, end, status, groupId, page, size],
    queryFn: () => searchCycleRange({ start, end, status, groupId, page, size }),
    keepPreviousData: true,
  });

  const [history, setHistory] = useState(null);
  const openHistory = (row) => {
    const rowsForStudent = (data?.content ?? []).filter((r) => r.studentId === row.studentId);
    const totals = rowsForStudent.reduce(
      (acc, r) => ({
        due: acc.due + Number(r.due || 0),
        paid: acc.paid + Number(r.paid || 0),
        balance: acc.balance + Number(r.balance || 0),
      }),
      { due: 0, paid: 0, balance: 0 }
    );
    setHistory({
      studentId: row.studentId,
      studentFullName: row.studentFullName || row.fullName || "",
      phone: row.phone || "",
      rangeLabel: `${start} → ${end}`,
      totals,
    });
  };

  const rows =
    (data?.content ?? []).map((r, i) => {
      const held = r.held ?? r.heldSessions ?? 0;
      const required = r.required ?? r.sessionsPerCycle ?? 0;
      const model = inferModel(r.period, held, required);
      return {
        id: `${r.studentId}-${r.groupId}-${r.period}-${i}`,
        ...r,
        studentFullName: r.studentFullName ?? r.fullName ?? "",
        phone: r.phone ?? r.studentPhone ?? "",
        held,
        required,
        model,
      };
    }) ?? [];

  const columns = useMemo(
    () => [
      {
        field: "studentFullName",
        headerName: t.student,
        flex: 1.2,
        minWidth: 120,
        headerAlign: "center",
        align: "center",
        renderCell: (p) => (p.value || p.row.fullName || "(unknown)"),
      },
      {
        field: "phone",
        headerName: t.phone,
        width: 140,
        headerAlign: "center",
        align: "center",
        renderCell: (p) => p.value || "",
      },
      {
        field: "groupName",
        headerName: t.group,
        flex: 1.2,
        minWidth: 120,
        headerAlign: "center",
        align: "center",
        renderCell: (p) => (
          <Tooltip title={p.value || "(no group)"} placement="top">
            <Chip size="small" variant="outlined" label={p.value || "(no group)"} sx={{ maxWidth: "100%" }} />
          </Tooltip>
        ),
      },
      { field: "period", headerName: t.period, width: 120, headerAlign: "center", align: "center" },
      {
        field: "model",
        headerName: t.model || "Model",
        width: 120,
        headerAlign: "center",
        align: "center",
        renderCell: (p) => (
          <Chip
            size="small"
            label={p.value}
            color={p.value === "PER_SESSION" ? "info" : "default"}
            variant="outlined"
          />
        ),
      },
      {
        field: "progress",
        headerName: t.progress || "Progress",
        width: 130,
        headerAlign: "center",
        align: "center",
        valueGetter: (params) => `${params?.row?.held ?? 0}/${params?.row?.required ?? 0}`,
        renderCell: (p) => {
          const held = p?.row?.held ?? 0;
          const req = p?.row?.required ?? 0;
          return (
            <Chip
              size="small"
              label={`${held}/${req}`}
              color={held >= req && req > 0 ? "success" : "default"}
              variant="outlined"
            />
          );
        },
      },
      {
        field: "due",
        headerName: t.due,
        width: 130,
        headerAlign: "center",
        align: "center",
        renderCell: (p) => <MoneyChip value={p.value} kind="due" />,
      },
      {
        field: "paid",
        headerName: t.paid,
        width: 130,
        headerAlign: "center",
        align: "center",
        renderCell: (p) => <MoneyChip value={p.value} kind="paid" />,
      },
      {
        field: "balance",
        headerName: t.balance,
        width: 140,
        headerAlign: "center",
        align: "center",
        renderCell: (p) => <MoneyChip value={p.value} kind="balance" />,
      },
      {
        field: "status",
        headerName: t.status,
        width: 120,
        headerAlign: "center",
        align: "center",
        renderCell: (p) => (
          <Chip
            size="small"
            label={p.value}
            color={p.value === "PAID" ? "success" : p.value === "PARTIAL" ? "warning" : "default"}
            variant="outlined"
          />
        ),
      },
      {
        field: "actions",
        headerName: t.actions,
        width: 180,
        sortable: false,
        filterable: false,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => (
          <Box display="flex" gap={1}>
            <Button
              startIcon={<PaymentOutlinedIcon />}
              variant="contained"
              onClick={() => navigate(`/finances/pay/${params.row.studentId}?period=${params.row.period}`)}
              sx={{ borderRadius: "20px", fontWeight: 600 }}
            />
            <Button
              startIcon={<HistoryOutlinedIcon />}
              variant="contained"
              onClick={() => openHistory(params.row)}
              sx={{ borderRadius: "20px", fontWeight: 600 }}
            />
          </Box>
        ),
      },
    ],
    [navigate, data?.content, start, end, t]
  );

  return (
    <Box m="20px">
      <Header title={t.studentPayment} />

      {/* Filters */}
      <Grid container spacing={2} alignItems="center" mb={3}>
        <Grid item xs={12} sm={3}>
          <TextField size="small" fullWidth label={t.start || "Start (YYYY-MM)"} value={start}
            onChange={(e) => setStart(e.target.value)} placeholder="2025-09" InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField size="small" fullWidth label={t.end || "End (YYYY-MM)"} value={end}
            onChange={(e) => setEnd(e.target.value)} placeholder="2025-10" InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField size="small" select fullWidth label={t.statusLabel} value={status}
            onChange={(e) => setStatus(e.target.value)} InputLabelProps={{ shrink: true }}>
            {STATUSES.map((s) => <MenuItem key={s} value={s}>{t[s.toLowerCase()] || s}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Autocomplete size="small" fullWidth options={groupOptions} value={groupValue}
            onChange={(_, v) => setGroupValue(v)} inputValue={groupInput} onInputChange={(_, v) => setGroupInput(v)}
            getOptionLabel={(o) => o?.name ?? ""} isOptionEqualToValue={(o, v) => o.id === v.id}
            renderInput={(params) => (<TextField {...params} label={t.groupFilter} variant="outlined" InputLabelProps={{ shrink: true }} />)}
            clearOnBlur={false}
          />
        </Grid>
      </Grid>

      {/* Grid */}
      <Box height="70vh" sx={{
        "& .MuiDataGrid-root": { border: "none" },
        "& .MuiDataGrid-columnHeaders": { backgroundColor: colors.blueAccent[700], borderBottom: "none" },
        "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
        "& .MuiDataGrid-footerContainer": { borderTop: "none", backgroundColor: colors.blueAccent[400] },
        "& .MuiDataGrid-cell, & .MuiDataGrid-columnHeader": { display: "flex", justifyContent: "center", alignItems: "center" },
      }}>
        <DataGrid
          rows={rows}
          columns={columns}
          rowCount={data?.total ?? 0}
          loading={isFetching}
          paginationMode="server"
          paginationModel={{ pageSize: size, page }}
          pageSizeOptions={[10, 20, 50]}
          onPaginationModelChange={(m) => { setPage(m.page); setSize(m.pageSize); }}
          disableRowSelectionOnClick
          slots={ error ? { noRowsOverlay: () => <div style={{ padding: 16 }}>{t.loadError}</div> } : undefined }
        />
      </Box>

      {/* History dialog */}
      {history && (
        <StudentHistoryDialog
          open={!!history}
          onClose={() => setHistory(null)}
          studentId={history.studentId}
          studentName={history.studentFullName}
          phone={history.phone}
          period={history.rangeLabel}
          totals={history.totals}
          language={language}
          onGoPay={() => { setHistory(null); navigate(`/finances/pay/${history.studentId}?period=${end}`); }}
          onGoFullHistory={() => { setHistory(null); navigate(`/finances/history/${history.studentId}`); }}
        />
      )}
    </Box>
  );
}
