import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import Header from "../../components/Header";
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
  useTheme,
  useMediaQuery,
  IconButton,                 // <-- added
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { arSD } from "@mui/x-data-grid/locales";
import {
  collectPayment,
  defaultBillingCycleSearchRange,
  searchCycleRange,
  studentReceipts,
  studentSummaryAll,
} from "../../api/billing";
import { lookupGroups } from "../../api/groups";
import ReceiptDialog from "./components/ReceiptDialog";
import { tokens } from "../../theme";
import { getTranslations, translateBillingModel, translateBillingStatus } from "../../translations";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew"; // <-- added
import { getPaymentErrorMessage } from "../../utils/paymentErrors";

const money = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const STATUSES = ["OPEN", "ALL", "UNPAID", "PARTIAL", "PAID"];
const OPEN_STATUSES = new Set(["UNPAID", "PARTIAL"]);

// Infer billing model from a cycle row
const inferModel = (period, held, required) => {
  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(String(period || ""));
  if (isDate && Number(held) === 1 && Number(required) === 0) return "PER_HOUR";
  return isDate && Number(required) === 1 && Number(held) >= 0
    ? "PER_SESSION"
    : "MONTHLY";
};

export default function StudentPayment({ language = "fr" }) {
  const t = getTranslations(language);
  const { studentId: studentIdStr } = useParams();
  const location = useLocation();
  const studentId = Number(studentIdStr);

  const theme = useTheme();
  const isCompactScreen = useMediaQuery(theme.breakpoints.down("lg"));
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate(); // <-- added
  const query = new URLSearchParams(location.search);
  const studentNameFromQuery = query.get("name") || "";
  const periodFromQuery = query.get("period") || "";

  // Filters
  const [status, setStatus] = useState("OPEN");
  const [groupValue, setGroupValue] = useState(null);
  const [groupInput, setGroupInput] = useState("");
  const [groupOptions, setGroupOptions] = useState([]);
  const typingTimer = useRef(null);

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

  const cycleSearchRange = useMemo(() => defaultBillingCycleSearchRange(), []);

  // Selection state
  const [selected, setSelected] = useState({});

  // Student cycles: cashier view shows all matching open cycles for the student
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["cycles-student", studentId, groupId, cycleSearchRange.start, cycleSearchRange.end],
    queryFn: () =>
      searchCycleRange({
        start: cycleSearchRange.start,
        end: cycleSearchRange.end,
        status: "ALL",
        groupId,
        studentId,
        page: 0,
        size: 1000,
      }),
    enabled: !!studentId,
    keepPreviousData: true,
  });

  // Summary (all-time; respects group filter)
  const {
    data: summary,
    isFetching: fetchingSummary,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["summary-all-student", studentId, groupId],
    queryFn: () => studentSummaryAll(studentId, groupId),
    enabled: !!studentId,
    keepPreviousData: true,
  });

  // History warm cache
  useQuery({
    queryKey: ["studentReceipts", studentId],
    queryFn: () => studentReceipts(studentId),
    enabled: !!studentId,
  });

  const [receipt, setReceipt] = useState(null);

  const rows = useMemo(() => {
    return (data?.content ?? []).map((r, i) => {
      const held = r.held ?? r.heldSessions ?? 0;
      const required = r.required ?? r.sessionsPerCycle ?? 0;
      const requiredDisplay = Number(required) > 0 ? Number(required) : 1;
      const model = r.billingModel || inferModel(r.period, held, required);
      return {
        id: `${r.groupId}:${r.period}:${i}`,
        studentFullName: r.studentFullName ?? r.fullName ?? "",
        studentId: r.studentId,
        groupId: r.groupId,
        groupName: r.groupName,
        periodLabel: r.period, // cycle key (YYYY-MM-DD or YYYY-MM-DD start / monthly label)
        held,
        required,
        requiredDisplay,
        due: Number(r.due || 0),
        paid: Number(r.paid || 0),
        balance: Number(r.balance || 0),
        status: r.status,
        model, // <-- used when submitting payment
      };
    });
  }, [data]);

  const studentName = rows[0]?.studentFullName || studentNameFromQuery || `#${studentId}`;
  const statusLabel = (value) =>
    value === "OPEN" ? t.unpaidPartial || "Unpaid + Partial" : t[value.toLowerCase()] || value;

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      const rowStatus = String(row.status || "").toUpperCase();
      if (status === "ALL") return true;
      if (status === "OPEN") return OPEN_STATUSES.has(rowStatus);
      return rowStatus === status;
    });
  }, [rows, status]);

  const rowSummary = useMemo(() => {
    return visibleRows.reduce(
      (acc, row) => ({
        cycles: acc.cycles + 1,
        due: acc.due + Number(row.due || 0),
        paid: acc.paid + Number(row.paid || 0),
        balance: acc.balance + Number(row.balance || 0),
      }),
      { cycles: 0, due: 0, paid: 0, balance: 0 }
    );
  }, [visibleRows]);

  // Reset selection if filters change
  useEffect(() => {
    setSelected({});
  }, [studentId, status, groupId]);

  // Selected cycles → pay full balances (and pass correct model)
  const payItems = useMemo(() => {
    return visibleRows
      .filter((r) => selected[r.id] && r.balance > 0)
      .map((r) => ({
        groupId: r.groupId,
        model: r.model, // "MONTHLY" | "PER_SESSION" (important!)
        period: r.periodLabel, // exact cycle/session key
        hours: r.model === "PER_HOUR" ? Number(r.held || 1) : undefined,
        amount: Number(Number(r.balance).toFixed(2)),
        _ui: { groupName: r.groupName, key: `${r.groupId}@${r.periodLabel}` },
      }));
  }, [visibleRows, selected]);

  /** Oldest cycle first so wallet/cash allocation matches backend FIFO intent. */
  const payItemsFifo = useMemo(() => {
    return [...payItems].sort((a, b) => {
      const pa = String(a.period || "");
      const pb = String(b.period || "");
      if (pa !== pb) return pa.localeCompare(pb);
      return Number(a.groupId || 0) - Number(b.groupId || 0);
    });
  }, [payItems]);

  const selectedTotal = useMemo(
    () => payItems.reduce((sum, it) => sum + (it.amount || 0), 0),
    [payItems]
  );

  // Wallet credit — applied when "use credit first" is on (see toggle).
  const credit = Number(summary?.totalCredit || 0);

  const [useWalletFirst, setUseWalletFirst] = useState(true);
  const [globalAmount, setGlobalAmount] = useState("");
  const [submitMode, setSubmitMode] = useState("items"); // "items" | "global"

  // Keep the summary aligned with the rows currently shown on screen.
  const totalDue = rowSummary.due;
  const totalPaid = rowSummary.paid;
  const totalBalance = rowSummary.balance;

  const globalAmountNumber = useMemo(() => {
    const n = Number(globalAmount);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [globalAmount]);

  /** Cash still needed for the current operation (selection FIFO or global amount). */
  const cashToCollectSelection = useMemo(() => {
    if (payItemsFifo.length > 0) {
      if (!useWalletFirst || credit <= 0) {
        return payItemsFifo.reduce((s, it) => s + (it.amount || 0), 0);
      }
      let walletAvail = Math.max(credit, 0);
      let cash = 0;
      for (const it of payItemsFifo) {
        let need = Number(it.amount || 0);
        if (walletAvail > 0 && need > 0) {
          const fromW = Math.min(walletAvail, need);
          walletAvail -= fromW;
          need -= fromW;
        }
        cash += need;
      }
      return cash;
    }

    // Global FIFO mode: the cashier collects the entered amount as cash.
    return globalAmountNumber;
  }, [payItemsFifo, credit, useWalletFirst, globalAmountNumber]);

  // -------- Confirm Plan (with FIFO lines) --------
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [plan, setPlan] = useState(null);

  // Build a preview that mirrors backend; mode is derived at click time to avoid stale state.
  const buildPlan = (mode) => {
    const hasItemSelection = mode === "items" && payItemsFifo.length > 0;
    const useGlobal = mode === "global" && !hasItemSelection && globalAmountNumber > 0;

    const currentOpenBalance = rows.reduce(
      (sum, row) => sum + Number(row.balance || 0),
      0
    );

    // Itemised selection mode (per-cycle items)
    if (hasItemSelection) {
      const shouldUseWalletFirst = useWalletFirst && credit > 0;
      let walletAvail = shouldUseWalletFirst ? Math.max(credit, 0) : 0;

      let cashFromItems = 0;
      let walletUsedOnItems = 0;
      const itemLines = payItemsFifo.map((it) => {
        let need = Number(it.amount || 0);
        let fromWallet = 0;
        let fromCash = 0;
        if (walletAvail > 0 && need > 0) {
          fromWallet = Math.min(walletAvail, need);
          walletAvail -= fromWallet;
          need -= fromWallet;
          walletUsedOnItems += fromWallet;
        }
        if (need > 0) {
          fromCash = need;
          cashFromItems += fromCash;
        }
        return {
          groupName: it._ui.groupName,
          label: it.period,
          cash: fromCash,
          fromWallet,
          note:
            it.model === "PER_SESSION"
              ? "per-session"
              : it.model === "PER_HOUR"
              ? `per-hour (${it.hours || 1}h)`
              : "monthly",
        };
      });

      const stillUnpaidAfter = Math.max(
        currentOpenBalance - (cashFromItems + walletUsedOnItems),
        0
      );

      const walletRemainingAfter = Math.max(credit - walletUsedOnItems, 0);

      return {
        studentName,
        itemLines,
        totals: {
          cashReceived: cashFromItems,
          cashAppliedToDues: cashFromItems,
          walletUsed: walletUsedOnItems,
          leftoverToWallet: walletRemainingAfter,
          stillUnpaidAfter,
        },
      };
    }

    // Global FIFO amount mode (matches allocateGlobal behaviour)
    if (useGlobal) {
      const amount = globalAmountNumber;
      let walletAvail = useWalletFirst ? Math.max(credit, 0) : 0;
      let remainingCash = amount;
      let walletUsed = 0;
      let cashApplied = 0;

      const fifoRows = [...rows]
        .filter((r) => Number(r.balance || 0) > 0)
        .sort((a, b) => {
          const pa = String(a.periodLabel || "");
          const pb = String(b.periodLabel || "");
          if (pa !== pb) return pa.localeCompare(pb);
          return Number(a.groupId || 0) - Number(b.groupId || 0);
        });

      const itemLines = [];

      for (const r of fifoRows) {
        if (walletAvail <= 0 && remainingCash <= 0) break;
        let need = Number(r.balance || 0);
        if (need <= 0) continue;

        let fromWallet = 0;
        let fromCash = 0;

        if (walletAvail > 0 && need > 0) {
          fromWallet = Math.min(walletAvail, need);
          walletAvail -= fromWallet;
          need -= fromWallet;
          walletUsed += fromWallet;
        }

        if (remainingCash > 0 && need > 0) {
          fromCash = Math.min(remainingCash, need);
          remainingCash -= fromCash;
          need -= fromCash;
          cashApplied += fromCash;
        }

        if (fromWallet > 0 || fromCash > 0) {
          itemLines.push({
            groupName: r.groupName,
            label: r.periodLabel,
            cash: fromCash,
            fromWallet,
            note: translateBillingModel(r.model, t),
          });
        }
      }

      const stillUnpaidAfter = Math.max(
        currentOpenBalance - (cashApplied + walletUsed),
        0
      );

      const leftoverToWallet = Math.max(remainingCash, 0);

      return {
        studentName,
        itemLines,
        totals: {
          cashReceived: amount,
          cashAppliedToDues: cashApplied,
          walletUsed,
          leftoverToWallet,
          stillUnpaidAfter,
        },
      };
    }

    // No selection and no global amount → no-op plan
    return null;
  };

  const openConfirm = () => {
    const mode = payItemsFifo.length > 0 ? "items" : "global";
    if (mode === "global" && globalAmountNumber <= 0) return;

    setSubmitMode(mode);
    const p = buildPlan(mode);
    setPlan(p);
    setConfirmOpen(true);
  };
  const closeConfirm = () => setConfirmOpen(false);

  // -------- Submit --------
  const cashierUserId = 1; // TODO: hook real user

  const { mutate: payCombined, isLoading: paying } = useMutation({
    mutationFn: () => {
      const base = {
        studentId,
        method: "CASH",
        reference: `FrontDesk-${Date.now()}`,
      };

      if (submitMode === "items") {
        const items = payItemsFifo.map(({ _ui, ...rest }) => rest);
        const payload = { ...base, items };
        if (items.length === 0) {
          throw new Error("No items selected for payment.");
        }
        if (useWalletFirst && credit > 0) {
          payload.useWalletFirst = true;
        }
        return collectPayment(payload, cashierUserId);
      }

      // Global FIFO payment / wallet top-up
      const amount = globalAmountNumber;
      const payload = {
        ...base,
        globalAmount: amount > 0 ? amount : undefined,
      };
      if (useWalletFirst && credit > 0) {
        payload.useWalletFirst = true;
      }
      return collectPayment(payload, cashierUserId);
    },
    onSuccess: (rec) => {
      setReceipt(rec);
      setSelected({});
      setConfirmOpen(false);
      refetch();
      refetchSummary();
    },
    onError: (e) => alert(getPaymentErrorMessage(e, t)),
  });

  // ---------- GRID ----------
  const columns = [
    {
      field: "groupName",
      headerName: t.group,
      flex: 1.2,
      minWidth: 150,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => (
        <Chip size="small" variant="outlined" label={p?.value || t.noGroup || "(no group)"} />
      ),
    },
    {
      field: "periodLabel",
      headerName: t.periodLabel || "Period",
      width: 120,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "model",
      headerName: t.model || "Model",
      width: 110,
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
      valueGetter: (params) =>
        `${params?.row?.held ?? 0}/${params?.row?.requiredDisplay ?? 1}`,
      renderCell: (p) => {
        const held = p?.row?.held ?? 0;
        const req = p?.row?.requiredDisplay ?? 1;
        return (
          <Chip
            size="small"
            label={`${held}/${req}`}
            color={held >= req ? "success" : "default"}
            variant="outlined"
          />
        );
      },
    },
    {
      field: "due",
      headerName: t.due,
      width: 105,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => (
        <Chip size="small" label={money.format(p?.value || 0)} color="warning" />
      ),
    },
    {
      field: "paid",
      headerName: t.paid,
      width: 105,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => (
        <Chip size="small" label={money.format(p?.value || 0)} color="info" />
      ),
    },
    {
      field: "balance",
      headerName: t.balance,
      width: 110,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => {
        const v = Number(p?.value || 0);
        return (
          <Chip
            size="small"
            label={money.format(v)}
            color={v <= 0 ? "success" : "error"}
          />
        );
      },
    },
    {
      field: "status",
      headerName: t.status,
      width: 100,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => (
        <Chip
          size="small"
          label={translateBillingStatus(p?.value, t)}
          color={
            p?.value === "PAID"
              ? "success"
              : p?.value === "PARTIAL"
              ? "warning"
              : "default"
          }
          variant="outlined"
        />
      ),
    },
    {
      field: "select",
      headerName: t.pay,
      width: 115,
      headerAlign: "center",
      align: "center",
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const key = params?.row?.id;
        const checked = !!selected[key];
        const canPay = Number(params?.row?.balance || 0) > 0;
        return (
          <Button
            size="small"
            variant={checked ? "contained" : "outlined"}
            disabled={!canPay}
            onClick={() => {
              setSelected((s) => ({
                ...s,
                [key]: !s[key],
              }));
            }}
            sx={{ borderRadius: "20px", fontWeight: 600, textTransform: "none" }}
          >
            {checked ? t.selected : t.select}
          </Button>
        );
      },
    },
  ];

  return (
    <Box m={2} pb={{ xs: 2, lg: 14 }}>
      {/* NEW: back arrow to Finances → Billing */}
      <Box mb={1}>
        <IconButton
          onClick={() => navigate("/finances/billing")}
          title={t.backToBilling || "Back to billing"}
          size="small"
        >
          <ArrowBackIosNewIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box display="flex" alignItems="center" gap={2}>
        <Header title={`${t.pay} — ${studentName}`} />
      </Box>

      {/* Filters */}
      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} sm={3}>
          <TextField
            size="small"
            select
            fullWidth
            label={t.statusLabel || "Status"}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            InputLabelProps={{ shrink: true }}
          >
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {statusLabel(s)}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Autocomplete
            size="small"
            fullWidth
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
                label={t.groupFilter || "Filter by group"}
                variant="outlined"
                InputLabelProps={{ shrink: true }}
              />
            )}
            renderOption={(props, option) => (
              <Box
                component="li"
                {...props}
                title={option?.name ?? ""}
                sx={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {option?.name ?? ""}
              </Box>
            )}
            sx={{
              "& .MuiAutocomplete-input": { overflow: "hidden", textOverflow: "ellipsis" },
              "& .MuiInputBase-input": { overflow: "hidden", textOverflow: "ellipsis" },
            }}
            clearOnBlur={false}
          />
        </Grid>
        <Grid item xs />
        <Grid item>
          <Button
            variant="contained"
            onClick={() => {
              refetch();
              refetchSummary();
            }}
            disabled={isFetching || fetchingSummary}
            sx={{
              backgroundColor:
                theme.palette.mode === "light"
                  ? colors.blueAccent[800]
                  : colors.blueAccent[400],
              color: "#fff",
              fontWeight: "bold",
              "&:hover": {
                backgroundColor:
                  theme.palette.mode === "light"
                    ? colors.blueAccent[400]
                    : colors.blueAccent[800],
              },
            }}
          >
            {t.refreshDues}
          </Button>
        </Grid>
      </Grid>

      {/* Summary */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" mb={1}>
            {t.summary || "Summary"} — {rowSummary.cycles}{" "}
            {t.cycles || "cycles"}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" useFlexGap>
            <Chip size="small" label={`${t.totalDue || "Total Due"}: ${money.format(totalDue)}`} color="warning" />
            <Chip size="small" label={`${t.totalPaid || "Total Paid"}: ${money.format(totalPaid)}`} color="info" />
            <Chip
              size="small"
              label={`${t.credit || "Credit"}: ${credit > 0 ? "+" : ""}${money.format(credit)}`}
              color="success"
              variant="outlined"
            />
            <Chip
              size="small"
              label={`${t.openBalance || "Open balance"}: ${money.format(totalBalance)}`}
              color={totalBalance > 0 ? "error" : "success"}
              variant="outlined"
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Grid */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" mb={1}>
            {(t.openCycles || t.unpaidGroups)} — {visibleRows.length}{" "}
            {visibleRows.length === 1 ? t.tableRowSingular || "row" : t.tableRowPlural || "rows"}
          </Typography>
          <DataGrid
            autoHeight
            rows={visibleRows}
            columns={columns}
            loading={isFetching}
            disableRowSelectionOnClick
            density="compact"
            pageSize={isCompactScreen ? 8 : 10}
            rowsPerPageOptions={isCompactScreen ? [8, 12, 20] : [10, 20, 30]}
            columnVisibilityModel={{
              paid: !isCompactScreen,
              status: !isCompactScreen,
            }}
            localeText={language === "ar" ? arSD : undefined}
            sx={{
              border: "none",
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: colors.blueAccent[700],
                borderBottom: "none",
              },
              "& .MuiDataGrid-virtualScroller": {
                backgroundColor: colors.primary[400],
              },
              "& .MuiDataGrid-footerContainer": {
                borderTop: "none",
                backgroundColor: colors.blueAccent[400],
              },
              "& .MuiDataGrid-cell, & .MuiDataGrid-columnHeader": {
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Bottom bar */}
      <Box
        mt={2}
        display="flex"
        flexWrap="wrap"
        alignItems="center"
        gap={2}
        justifyContent="space-between"
        sx={{
          position: { xs: "static", lg: "sticky" },
          bottom: { lg: 12 },
          zIndex: 5,
          p: 2,
          borderRadius: 2,
          bgcolor: colors.primary[400],
          border: `1px solid ${colors.primary[300]}`,
          boxShadow: { lg: "0 12px 28px rgba(15, 23, 42, 0.24)" },
        }}
      >
        <Stack spacing={0.5} sx={{ minWidth: 260 }}>
          <Typography variant="h6">
            {t.totalSelected || "Selected total"}: {money.format(selectedTotal)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t.cashToCollect || "Cash to collect"}: {money.format(cashToCollectSelection)}
          </Typography>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" sx={{ flex: 1, justifyContent: "flex-end" }}>
          <TextField
            type="number"
            size="small"
            label={t.amountGlobal || "Amount (global)"}
            helperText={
              t.amountGlobalHint ||
              (payItemsFifo.length > 0
                ? "Global amount is disabled while rows are selected."
                : "If rows are selected: pays only those rows. If none are selected: pays oldest dues first; extra cash goes to wallet.")
            }
            value={globalAmount}
            onChange={(e) => setGlobalAmount(e.target.value)}
            inputProps={{ min: 0, step: "0.01" }}
            sx={{ maxWidth: 260 }}
            disabled={payItemsFifo.length > 0}
          />
          <FormControlLabel
            control={
              <Switch
                checked={useWalletFirst}
                onChange={(_, v) => setUseWalletFirst(v)}
                disabled={credit <= 0}
                color="primary"
              />
            }
            label={t.useCreditFirst || "Use credit first"}
          />
          <Button
            variant="outlined"
            disabled={
              paying ||
              globalAmountNumber <= 0 ||
              totalBalance > 0 ||
              payItemsFifo.length > 0
            }
            onClick={openConfirm}
          >
            {t.addToWalletOnly || "Add to wallet only"}
          </Button>
          <Button
            data-testid="payment-pay-print"
            variant="contained"
            disabled={
              paying ||
              (payItemsFifo.length === 0 && globalAmountNumber <= 0)
            }
            onClick={openConfirm}
          >
            {t.payAndPrint || "Pay & Print"}
          </Button>
        </Stack>
      </Box>

      {/* Confirm dialog (with FIFO cycle details) */}
      <Dialog open={confirmOpen} onClose={closeConfirm} maxWidth="sm" fullWidth data-testid="payment-confirm-dialog">
        <DialogTitle>{`Confirm payment — ${studentName}`}</DialogTitle>
        <DialogContent dividers>
          {plan && (
            <>
              {plan.itemLines.length > 0 && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Selected cycles
                  </Typography>
                  <List dense sx={{ mb: 1 }}>
                    {plan.itemLines.map((ln, idx) => (
                      <ListItem key={`it-${idx}`} disableGutters>
                        <ListItemText
                          primary={`${ln.groupName} — ${ln.label}`}
                          secondary={[
                            ln.fromWallet > 0 ? `WALLET ${money.format(ln.fromWallet)}` : null,
                            ln.cash > 0 ? `CASH ${money.format(ln.cash)}` : null,
                            ln.note ? `· ${ln.note}` : null,
                          ].filter(Boolean).join(" ")}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}

              <Divider sx={{ my: 1 }} />
              <List dense>
                <ListItem disableGutters>
                  <ListItemText primary="Cash received" secondary={money.format(plan.totals.cashReceived)} />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText primary="Cash applied to dues" secondary={money.format(plan.totals.cashAppliedToDues)} />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText primary="Wallet used" secondary={money.format(plan.totals.walletUsed)} />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText primary="Leftover to wallet" secondary={money.format(plan.totals.leftoverToWallet)} />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText
                    primary="Still unpaid after payment"
                    secondary={money.format(plan.totals.stillUnpaidAfter)}
                    secondaryTypographyProps={{
                      sx: { color: plan.totals.stillUnpaidAfter > 0 ? "error.main" : "success.main" },
                    }}
                  />
                </ListItem>
              </List>

              {plan.totals.cashReceived === 0 && plan.totals.walletUsed > 0 && (
                <Typography color="success.main" sx={{ mt: 1 }}>
                  {t.walletOnlySettlement || "Open balances will be settled from credit/wallet (no cash)."}
                </Typography>
              )}
              {plan.itemLines.length === 0 && (
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  {t.selectCyclesToPay || "Select cycles with a balance to continue."}
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirm} color="inherit">Cancel</Button>
          <Button
            data-testid="payment-confirm-submit"
            onClick={() => payCombined()}
            variant="contained"
            disabled={paying || !plan}
          >
            Confirm & Pay
          </Button>
        </DialogActions>
      </Dialog>

      {receipt && <ReceiptDialog receipt={receipt} onClose={() => setReceipt(null)} language={language} />}
    </Box>
  );
}
















