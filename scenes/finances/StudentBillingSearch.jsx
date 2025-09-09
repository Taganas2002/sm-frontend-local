// src/scenes/finances/StudentBillingSearch.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Autocomplete,
  Box,
  Button,
  ButtonGroup,
  Chip,
  Grid,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import PaymentOutlinedIcon from "@mui/icons-material/PaymentOutlined";
import Header from "../../components/Header";
import { searchMonthly } from "../../api/billing";
import { lookupGroups } from "../../api/groups";
import StudentHistoryDialog from "./components/StudentHistoryDialog";
import translations from "../../translations";
import { useTheme } from "@mui/material/styles";




const STATUSES = ["ALL", "UNPAID", "PARTIAL", "PAID"];
const yyyymm = () => new Date().toISOString().slice(0, 7);

const moneyFmt = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function MoneyChip({ value, kind }) {
  const v = Number(value ?? 0);
  const color =
    kind === "balance" ? (v <= 0 ? "success" : "error") : kind === "paid" ? "info" : "warning";
  return <Chip size="small" label={moneyFmt.format(v)} color={color} />;
}

export default function StudentBillingSearch({ language = "fr" }) {
  const navigate = useNavigate();

  // Filters
  const [period, setPeriod] = useState(yyyymm());
  const [status, setStatus] = useState("UNPAID");
  // removed q/search as requested
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  // Group filter (async autocomplete)
  const [groupValue, setGroupValue] = useState(null); // {id,name} | null
  const [groupInput, setGroupInput] = useState("");
  const [groupOptions, setGroupOptions] = useState([]);
  const typingTimer = useRef(null);
  const t = translations[language] || translations["fr"];
    const theme = useTheme();
  const isDark = theme.palette.mode === "dark";



  const textFieldColors = {
    period: {
      bg: isDark ? "#2a2a3d" : "#f0f4ff",
      border: isDark ? "#5c8ef8" : "#8ab4f8",
      hover: isDark ? "#3c3c5a" : "#5c8ef8",
      label: isDark ? "#8ab4ff" : "#1a73e8",
    },
    status: {
      bg: isDark ? "#3c2a1a" : "#fff4e0",
      border: isDark ? "#fbbc04" : "#fbbc04",
      hover: isDark ? "#5c3e1f" : "#f9ab00",
      label: isDark ? "#fbbc04" : "#f57c00",
    },
    group: {
      bg: isDark ? "#1f2a1f" : "#e6f4ea",
      border: isDark ? "#34a853" : "#34a853",
      hover: isDark ? "#276a3a" : "#0f9d58",
      label: isDark ? "#34e873" : "#0f9d58",
    },
  };

  const buttonColors = {
    search: {
      bg: isDark ? "#3a7fff" : "#1a73e8",
      hover: isDark ? "#2f5acc" : "#155ab6",
      color: "#fff",
    },
    clear: {
      bg: isDark ? "transparent" : "transparent",
      border: isDark ? "#ff7a7a" : "#d93025",
      hoverBg: isDark ? "#4f1f1f" : "#fce8e6",
      hoverBorder: isDark ? "#ff4a4a" : "#a52714",
      hoverColor: isDark ? "#ff4a4a" : "#a52714",
      color: isDark ? "#ff7a7a" : "#d93025",
    },
  };

  // Debounced group lookup
  useEffect(() => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(async () => {
      const opts = await lookupGroups({
        q: groupInput.trim(),
        active: true,
        limit: 50,
      });
      setGroupOptions(opts || []);
    }, 250);
    return () => clearTimeout(typingTimer.current);
  }, [groupInput]);

  const groupId = groupValue?.id;

  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["dues", period, status, groupId, page, size],
    queryFn: () => searchMonthly({ period, status, groupId, page, size }),
    keepPreviousData: true,
  });

  // ---- History dialog state
  const [history, setHistory] = useState(null); // { studentId, studentFullName, phone, totals }
  const openHistory = (row) => {
    const rowsForStudent = (data?.content ?? []).filter(
      (r) => r.studentId === row.studentId
    );
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
      studentFullName: row.studentFullName,
      phone: row.phone,
      totals,
    });
  };

  const columns = useMemo(
    () => [
      {
        field: "studentFullName",
        headerName: t.student,
        flex: 1.2,
        minWidth: 180,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "phone",
        headerName: t.phone,
        width: 150,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "groupName",
        headerName: t.group,
        flex: 1.2,
        minWidth: 200,
        headerAlign: "center",
        align: "center",
        renderCell: (p) => (
          <Tooltip title={p.value || "(no group)"} placement="top">
            <Chip
              size="small"
              variant="outlined"
              label={p.value || "(no group)"}
              sx={{ maxWidth: "100%" }}
            />
          </Tooltip>
        ),
      },
      {
        field: "period",
        headerName: t.period,
        width: 110,
        headerAlign: "center",
        align: "center",
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
            color={
              p.value === "PAID"
                ? "success"
                : p.value === "PARTIAL"
                ? "warning"
                : "default"
            }
            variant="outlined"
          />
        ),
      },
      {
        field: "actions",
        headerName: t.actions,
        width: 100,
        sortable: false,
        filterable: false,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => (
          <ButtonGroup variant="outlined" size="small">
            <Button
              startIcon={<PaymentOutlinedIcon />}
              variant="contained"
              onClick={() =>
                navigate(`/finances/pay/${params.row.studentId}?period=${period}`)
              }
            >
            {t.pay}
            </Button>
            <Button
              startIcon={<HistoryOutlinedIcon />}
              onClick={() => openHistory(params.row)}
            >
              {t.history}
            </Button>
          </ButtonGroup>
        ),
      },
    ],
    [navigate, period, data?.content]
  );

  const rows =
    (data?.content ?? []).map((r, i) => ({
      id: `${r.studentId}-${r.groupId}-${i}`,
      ...r,
    })) ?? [];

  return (
    <Box m="20px">
      <Header
            title={t.studentPayment}
        />
      {/* Filters row */}
      <Grid container spacing={2} alignItems="center" mb={3}>
  {/* Period */}
  <Grid item xs={12} sm={3}>
    <TextField
      size="small"
      label={t.periodLabel}
      value={period}
      fullWidth
      onChange={(e) => setPeriod(e.target.value)}
      placeholder="2025-09"
      sx={{
        "& .MuiInputBase-root": {
          borderRadius: 3,
          padding: "4px 12px",
          backgroundColor: textFieldColors.period.bg,
        },
        "& .MuiOutlinedInput-notchedOutline": { borderColor: textFieldColors.period.border },
        "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": { borderColor: textFieldColors.period.hover },
        "& .MuiInputLabel-root": { color: textFieldColors.period.label, fontWeight: 500 },
      }}
    />
  </Grid>

  {/* Status */}
  <Grid item xs={12} sm={3}>
    <TextField
      size="small"
      select
      label={t.statusLabel}
      fullWidth
      value={status}
      onChange={(e) => setStatus(e.target.value)}
      sx={{
        "& .MuiInputBase-root": {
          borderRadius: 3,
          padding: "4px 12px",
          backgroundColor: textFieldColors.status.bg,
        },
        "& .MuiOutlinedInput-notchedOutline": { borderColor: textFieldColors.status.border },
        "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": { borderColor: textFieldColors.status.hover },
        "& .MuiInputLabel-root": { color: textFieldColors.status.label, fontWeight: 500 },
      }}
    >
      {STATUSES.map((s) => (
        <MenuItem key={s} value={s}>
          {t[s.toLowerCase()] || s}
        </MenuItem>
      ))}
    </TextField>
  </Grid>

  {/* Group */}
  <Grid item xs={12} sm={3}>
    <Autocomplete
  size="small"
  options={groupOptions}
  value={groupValue}
  onChange={(_, v) => setGroupValue(v)}
  inputValue={groupInput}
  onInputChange={(_, v) => setGroupInput(v)}
  getOptionLabel={(o) => o?.name ?? ""}
  isOptionEqualToValue={(o, v) => o.id === v.id}
  renderInput={(params) => (
    <TextField
      {...params}
      label={t.groupFilter}
      variant="outlined"
      InputLabelProps={{ shrink: true }} // ✅ keeps label above border
      sx={{
        "& .MuiOutlinedInput-root": {
          borderRadius: 3,             // pill style
          backgroundColor: textFieldColors.group.bg,
        },
        "& .MuiOutlinedInput-input": {
          padding: "6px 12px",                 // ✅ correct place for padding
        },
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: textFieldColors.group.border,
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: textFieldColors.group.hover,
        },
        "& .MuiInputLabel-root": {
          color: textFieldColors.group.label,
          fontWeight: 500,
        },
      }}
    />
  )}
  fullWidth
  clearOnBlur={false}
/>

  </Grid>

  {/* Buttons */}
  <Grid item xs={12} sm={3} display="flex" gap={1} justifyContent="flex-end">
    {/* <Button
      size="small"
      variant="contained"
      onClick={() => { setPage(0); refetch(); }}
      sx={{
        borderRadius: 3,
        backgroundColor: buttonColors.search.bg,
        color: buttonColors.search.color,
        fontWeight: "bold",
        textTransform: "none",
        "&:hover": { backgroundColor: buttonColors.search.hover },
      }}
    >
      {t.search}
    </Button>

    <Button
      size="small"
      variant="outlined"
      onClick={() => { setGroupValue(null); setGroupInput(""); setPage(0); refetch(); }}
      sx={{
        borderRadius: 3,
        color: buttonColors.clear.color,
        borderColor: buttonColors.clear.border,
        fontWeight: "bold",
        textTransform: "none",
        "&:hover": {
          backgroundColor: buttonColors.clear.hoverBg,
          borderColor: buttonColors.clear.hoverBorder,
          color: buttonColors.clear.hoverColor,
        },
      }}
    >
      {t.clear}
    </Button> */}
  </Grid>
</Grid>



      <Box
        sx={{
          height: "70vh",
          "& .MuiDataGrid-cell": { display: "flex", alignItems: "center", justifyContent: "center" },
          "& .MuiDataGrid-columnHeaders": { textAlign: "center" },
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          rowCount={data?.total ?? 0}
          loading={isFetching}
          paginationMode="server"
          paginationModel={{ pageSize: size, page }}
          pageSizeOptions={[10, 20, 50]}
          onPaginationModelChange={(m) => {
            setPage(m.page);
            setSize(m.pageSize);
          }}
          disableRowSelectionOnClick
          slots={
            error
              ? {
                  noRowsOverlay: () => (
                    <div style={{ padding: 16 }}>{t.loadError}</div>
                  ),
                }
              : undefined
          }
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
          period={period}
          totals={history.totals}
          onGoPay={() => {
            setHistory(null);
            navigate(`/finances/pay/${history.studentId}?period=${period}`);
          }}
          onGoFullHistory={() => {
            setHistory(null);
            navigate(`/finances/history/${history.studentId}`);
          }}
        />
      )}
    </Box>
  );
}
