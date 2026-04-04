import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  MenuItem,
  Snackbar,
  TextField,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import PaymentOutlinedIcon from "@mui/icons-material/PaymentOutlined";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import Header from "../../components/Header";
import { searchCycleRange } from "../../api/billing";
import { lookupGroups } from "../../api/groups";
import StudentHistoryDialog from "./components/StudentHistoryDialog";
import { getTranslations, translateBillingModel, translateBillingStatus } from "../../translations";
import { tokens } from "../../theme";

const STATUSES = ["OPEN_DUE", "ALL", "UNPAID", "PARTIAL", "PAID", "PENDING_ATTENDANCE"];
const SCANNER_LS_KEY = "billing:studentSearchScannerOn";
const BILLING_DENSITY_LS_KEY = "billing:studentSearchDensity";
const ALL_TIME_START = "1900-01";
const ALL_TIME_END = "2999-12";

const moneyFmt = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const parseStudentIdFromScan = (raw) => {
  if (!raw) return null;
  const value = String(raw).trim();
  if (/^\d+$/.test(value)) return Number(value);
  try {
    const parsed = JSON.parse(value);
    const candidate = parsed?.studentId ?? parsed?.id ?? parsed?.sid;
    if (candidate != null && /^\d+$/.test(String(candidate))) return Number(candidate);
  } catch {}
  const match = value.match(/(?:studentId|sid|id)\s*[:=]\s*(\d+)/i);
  if (match) return Number(match[1]);
  return null;
};

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

const inferModel = (period, held, required) => {
  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(String(period || ""));
  if (isDate && Number(held) === 1 && Number(required) === 0) return "PER_HOUR";
  return isDate && Number(required) === 1 && Number(held) >= 0 ? "PER_SESSION" : "MONTHLY";
};

export default function StudentBillingSearch({ language = "fr" }) {
  const navigate = useNavigate();
  const t = getTranslations(language);
  const theme = useTheme();
  const isCompactScreen = useMediaQuery(theme.breakpoints.down("lg"));
  const colors = tokens(theme.palette.mode);

  const startLabel = language === "ar" ? "??????? (YYYY-MM)" : language === "en" ? "Start (YYYY-MM)" : "D�but (YYYY-MM)";
  const endLabel = language === "ar" ? "??????? (YYYY-MM)" : language === "en" ? "End (YYYY-MM)" : "Fin (YYYY-MM)";
  const scannerOnLabel = language === "ar" ? "????? ???? QR" : language === "en" ? "Turn QR scanner ON" : "Activer le scanner QR";
  const scannerOffLabel = language === "ar" ? "????? ???? QR" : language === "en" ? "Turn QR scanner OFF" : "D�sactiver le scanner QR";
  const scanNotRecognizedLabel = language === "ar" ? "?? ??? ?????? ??? ?????" : language === "en" ? "Scan not recognized" : "Scan non reconnu";
  const studentSelectedLabel = language === "ar" ? "?? ????? ??????" : language === "en" ? "Student selected" : "�l�ve s�lectionn�";

  const [status, setStatus] = useState("OPEN_DUE");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [search, setSearch] = useState("");
  const [scannerOn, setScannerOn] = useState(false);
  const [densityMode, setDensityMode] = useState("compact");
  const [scannedStudentId, setScannedStudentId] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "info" });

  const [groupValue, setGroupValue] = useState(null);
  const [groupInput, setGroupInput] = useState("");
  const [groupOptions, setGroupOptions] = useState([]);
  const typingTimer = useRef(null);
  const scanInputRef = useRef(null);

  useEffect(() => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(async () => {
      const opts = await lookupGroups({ q: groupInput.trim(), active: true, limit: 50 });
      setGroupOptions(opts || []);
    }, 250);
    return () => clearTimeout(typingTimer.current);
  }, [groupInput]);

  useEffect(() => {
    const saved = localStorage.getItem(SCANNER_LS_KEY);
    setScannerOn(saved === "1");
    const savedDensity = localStorage.getItem(BILLING_DENSITY_LS_KEY);
    if (savedDensity === "compact" || savedDensity === "standard") {
      setDensityMode(savedDensity);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SCANNER_LS_KEY, scannerOn ? "1" : "0");
  }, [scannerOn]);

  useEffect(() => {
    localStorage.setItem(BILLING_DENSITY_LS_KEY, densityMode);
  }, [densityMode]);

  useEffect(() => {
    if (!scannerOn || !scanInputRef.current) return;
    const keepFocus = () => scanInputRef.current?.focus();
    scanInputRef.current.focus();
    scanInputRef.current.addEventListener("blur", keepFocus);
    return () => scanInputRef.current?.removeEventListener("blur", keepFocus);
  }, [scannerOn]);

  const groupId = groupValue?.id;
  const q = search.trim();
  const effectiveStart = ALL_TIME_START;
  const effectiveEnd = ALL_TIME_END;

  const { data, isFetching, error } = useQuery({
    queryKey: ["dues-cycles-range", effectiveStart, effectiveEnd, status, groupId, q, scannedStudentId, page, size],
    queryFn: async () => {
      return searchCycleRange({
        start: effectiveStart,
        end: effectiveEnd,
        status: status === "OPEN_DUE" ? "ALL" : status,
        groupId,
        q: scannedStudentId != null ? "" : q,
        studentId: scannedStudentId ?? undefined,
        page,
        size,
      });
    },
    keepPreviousData: true,
  });

  const [history, setHistory] = useState(null);

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setScannedStudentId(null);
    setPage(0);
  };

  const handleScanString = (raw) => {
    const id = parseStudentIdFromScan(raw);
    if (!id) {
      setSnack({ open: true, msg: `${scanNotRecognizedLabel}: "${raw}"`, severity: "warning" });
      return;
    }
    setScannedStudentId(id);
    setSearch(String(id));
    setPage(0);
    setSnack({ open: true, msg: `${studentSelectedLabel} #${id}`, severity: "success" });
  };

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
      rangeLabel: t.allCycles || "All cycles",
      totals,
    });
  };

  const rows =
    (data?.content ?? []).map((r, i) => {
      const held = r.held ?? r.heldSessions ?? 0;
      const required = r.required ?? r.sessionsPerCycle ?? 0;
      const model = r.billingModel || inferModel(r.period, held, required);
      const requiredDisplay = Number(required) > 0 ? Number(required) : 1;
      return {
        id: `${r.studentId}-${r.groupId}-${r.period}-${i}`,
        ...r,
        studentFullName: r.studentFullName ?? r.fullName ?? "",
        phone: r.phone ?? r.studentPhone ?? "",
        held,
        required,
        requiredDisplay,
        model,
      };
    }) ?? [];

  const filteredRows = useMemo(() => {
    if (status !== "OPEN_DUE") return rows;
    return rows.filter((row) => {
      const s = String(row?.status || "").toUpperCase();
      return s === "UNPAID" || s === "PARTIAL";
    });
  }, [rows, status]);

  const pendingAttendanceLabel = t.pendingAttendance || "Pending attendance";
  const pendingAttendanceHelp =
    t.pendingAttendanceHelp ||
    "Some scheduled sessions are still missing attendance. They stay visible here so revenue is not hidden.";
  const payBlockedUntilAttendanceLabel =
    t.payBlockedUntilAttendance ||
    "Confirm attendance before collecting payment for this row.";
  const pendingRows = rows.filter((row) => row.status === "PENDING_ATTENDANCE");

  const columns = useMemo(
    () => [
      {
        field: "studentFullName",
        headerName: t.student,
        flex: 1.1,
        minWidth: 130,
        headerAlign: "center",
        align: "center",
        renderCell: (p) => p.value || p.row.fullName || t.notAvailable || "N/A",
      },
      {
        field: "phone",
        headerName: t.phone,
        width: 120,
        headerAlign: "center",
        align: "center",
        renderCell: (p) => p.value || "",
      },
      {
        field: "groupName",
        headerName: t.group,
        flex: 1,
        minWidth: 120,
        headerAlign: "center",
        align: "center",
        renderCell: (p) => (
          <Tooltip title={p.value || t.noGroup || "(no group)"} placement="top">
            <Chip size="small" variant="outlined" label={p.value || t.noGroup || "(no group)"} sx={{ maxWidth: "100%" }} />
          </Tooltip>
        ),
      },
      { field: "period", headerName: t.period, width: 110, headerAlign: "center", align: "center" },
      {
        field: "model",
        headerName: t.model || "Model",
        width: 105,
        headerAlign: "center",
        align: "center",
        renderCell: (p) => (
          <Chip
            size="small"
            label={translateBillingModel(p.value, t)}
            color={p.value === "PER_SESSION" ? "info" : p.value === "PER_HOUR" ? "secondary" : "default"}
            variant="outlined"
          />
        ),
      },
      {
        field: "progress",
        headerName: t.heldRequired || t.progress || "Held / Required",
        width: 110,
        headerAlign: "center",
        align: "center",
        valueGetter: (params) => `${params?.row?.held ?? 0}/${params?.row?.requiredDisplay ?? 1}`,
        renderCell: (p) => {
          const held = p?.row?.held ?? 0;
          const req = p?.row?.requiredDisplay ?? 1;
          return <Chip size="small" label={`${held}/${req}`} color={held >= req ? "success" : "default"} variant="outlined" />;
        },
      },
      {
        field: "due",
        headerName: t.due,
        width: 105,
        headerAlign: "center",
        align: "center",
        renderCell: (p) => <MoneyChip value={p.value} kind="due" />,
      },
      {
        field: "paid",
        headerName: t.paid,
        width: 105,
        headerAlign: "center",
        align: "center",
        renderCell: (p) => <MoneyChip value={p.value} kind="paid" />,
      },
      {
        field: "balance",
        headerName: t.balance,
        width: 110,
        headerAlign: "center",
        align: "center",
        renderCell: (p) => <MoneyChip value={p.value} kind="balance" />,
      },
      {
        field: "status",
        headerName: t.status,
        width: 105,
        headerAlign: "center",
        align: "center",
        renderCell: (p) => (
          <Chip
            size="small"
            label={translateBillingStatus(p.value, t)}
            color={p.value === "PAID" ? "success" : p.value === "PARTIAL" ? "warning" : p.value === "PENDING_ATTENDANCE" ? "info" : "default"}
            variant="outlined"
          />
        ),
      },
      {
        field: "actions",
        headerName: t.actions,
        width: 120,
        sortable: false,
        filterable: false,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => {
          const pendingAttendance = params.row.status === "PENDING_ATTENDANCE";
          return (
            <Box display="flex" gap={0.5}>
              <Tooltip title={pendingAttendance ? payBlockedUntilAttendanceLabel : ""}>
                <span>
                  <IconButton
                    data-testid={`billing-pay-${params.row.studentId}`}
                    disabled={pendingAttendance}
                    onClick={() => navigate(`/finances/pay/${params.row.studentId}?period=${params.row.period}&name=${encodeURIComponent(params.row.studentFullName || "")}`)}
                    size="small"
                    sx={{
                      border: "1px solid",
                      borderColor: "primary.main",
                      color: "primary.main",
                      borderRadius: "10px",
                    }}
                  >
                    <PaymentOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={t.history || "History"}>
                <IconButton
                onClick={() => openHistory(params.row)}
                  size="small"
                  sx={{
                    border: "1px solid",
                    borderColor: colors.blueAccent[300],
                    color: colors.blueAccent[100],
                    borderRadius: "10px",
                    backgroundColor: "rgba(255,255,255,0.03)",
                    "&:hover": { backgroundColor: "rgba(255,255,255,0.08)" },
                  }}
                >
                  <HistoryOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      },
    ],
    [navigate, openHistory, payBlockedUntilAttendanceLabel, t, colors.blueAccent]
  );

  return (
    <Box m="20px">
      <Header title={t.studentPayment} />

      <input
        ref={scanInputRef}
        type="text"
        autoComplete="off"
        style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }}
        onKeyDown={(e) => {
          if (!scannerOn) return;
          if (e.key === "Enter") {
            e.preventDefault();
            const raw = scanInputRef.current?.value ?? "";
            if (scanInputRef.current) scanInputRef.current.value = "";
            handleScanString(raw);
          }
        }}
      />

      <Grid container spacing={2} alignItems="center" mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            size="small"
            select
            fullWidth
            label={t.statusLabel}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
            InputLabelProps={{ shrink: true }}
          >
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s === "OPEN_DUE"
                  ? t.unpaidPartial || "Unpaid + Partial"
                  : translateBillingStatus(s, t)}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Autocomplete
            size="small"
            fullWidth
            options={groupOptions}
            value={groupValue}
            onChange={(_, v) => {
              setGroupValue(v);
              setPage(0);
            }}
            inputValue={groupInput}
            onInputChange={(_, v) => setGroupInput(v)}
            getOptionLabel={(o) => o?.name ?? ""}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            renderInput={(params) => <TextField {...params} label={t.groupFilter} variant="outlined" InputLabelProps={{ shrink: true }} />}
            clearOnBlur={false}
          />
        </Grid>
        <Grid item xs={12} md={5}>
          <TextField
            size="small"
            fullWidth
            label={t.search || "Search"}
            value={search}
            onChange={handleSearchChange}
            placeholder={t.searchPlaceholder || "name / email / phone"}
            InputLabelProps={{ shrink: true }}
            inputProps={{ "data-testid": "billing-search-input" }}
          />
        </Grid>
        <Grid item xs={12} md={1}>
          <Tooltip title={scannerOn ? scannerOffLabel : scannerOnLabel}>
            <IconButton
              onClick={() => setScannerOn((v) => !v)}
              sx={{
                border: 1,
                borderColor: scannerOn ? "primary.main" : "action.disabled",
                bgcolor: scannerOn ? "primary.main" : "transparent",
                color: scannerOn ? "primary.contrastText" : "text.secondary",
                borderRadius: "12px",
                width: "100%",
                height: 40,
                "&:hover": {
                  bgcolor: scannerOn ? "primary.dark" : "action.hover",
                },
              }}
            >
              <QrCodeScannerIcon />
            </IconButton>
          </Tooltip>
        </Grid>
        <Grid item xs={12} md={2}>
          <TextField
            size="small"
            select
            fullWidth
            label={t.viewDensity || "View"}
            value={densityMode}
            onChange={(e) => setDensityMode(e.target.value)}
            InputLabelProps={{ shrink: true }}
          >
            <MenuItem value="compact">{t.compact || "Compact"}</MenuItem>
            <MenuItem value="standard">{t.comfortable || "Comfortable"}</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      {pendingRows.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {`${pendingAttendanceLabel}: ${pendingRows.length}. ${pendingAttendanceHelp}`}
        </Alert>
      )}

      <Box
        height="calc(100vh - 255px)"
        minHeight={420}
        sx={{
          "& .MuiDataGrid-root": { border: "none" },
          "& .MuiDataGrid-columnHeaders": { backgroundColor: colors.blueAccent[700], borderBottom: "none" },
          "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
          "& .MuiDataGrid-footerContainer": { borderTop: "none", backgroundColor: colors.blueAccent[400] },
          "& .MuiDataGrid-cell, & .MuiDataGrid-columnHeader": {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          },
        }}
      >
        <DataGrid
          rows={filteredRows}
          columns={columns}
          rowCount={status === "OPEN_DUE" ? filteredRows.length : data?.total ?? 0}
          loading={isFetching}
          paginationMode={status === "OPEN_DUE" ? "client" : "server"}
          paginationModel={{ pageSize: size, page }}
          pageSizeOptions={[10, 20, 50]}
          density={densityMode}
          rowHeight={densityMode === "compact" ? 40 : 52}
          columnHeaderHeight={densityMode === "compact" ? 44 : 52}
          columnVisibilityModel={{
            phone: !isCompactScreen,
            progress: !isCompactScreen,
            status: !isCompactScreen,
          }}
          onPaginationModelChange={(m) => {
            setPage(m.page);
            setSize(m.pageSize);
          }}
          disableRowSelectionOnClick
          slots={error ? { noRowsOverlay: () => <div style={{ padding: 16 }}>{t.loadError}</div> } : undefined}
        />
      </Box>

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
          onGoPay={() => {
            setHistory(null);
            navigate(`/finances/pay/${history.studentId}?period=${history.rangeLabel}`);
          }}
          onGoFullHistory={() => {
            setHistory(null);
            navigate(`/finances/history/${history.studentId}`);
          }}
        />
      )}

      <Snackbar open={snack.open} autoHideDuration={2500} onClose={() => setSnack((prev) => ({ ...prev, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={() => setSnack((prev) => ({ ...prev, open: false }))} severity={snack.severity} variant="filled" sx={{ width: "100%" }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}



