import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
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
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  collectPayment,
  searchCycleAll,
  studentReceipts,
  studentSummaryAll,
} from "../../api/billing";
import { lookupGroups } from "../../api/groups";
import ReceiptDialog from "./components/ReceiptDialog";
import { tokens } from "../../theme";
import translations from "../../translations";

const money = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const STATUSES = ["ALL", "UNPAID", "PARTIAL", "PAID"];

export default function StudentPayment({ language = "fr" }) {
  const t = translations[language] || translations["fr"];
  const { studentId: studentIdStr } = useParams();
  const studentId = Number(studentIdStr);

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // Filters
  const [status, setStatus] = useState("ALL");
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

  // Selection state
  const [selected, setSelected] = useState({});

  // All-time cycles for this student
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["cycles-all-student", studentId, status, groupId],
    queryFn: () =>
      searchCycleAll({ studentId, status, groupId, page: 0, size: 1000 }),
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
    return (data?.content ?? []).map((r, i) => ({
      id: `${r.groupId}:${r.period}:${i}`,
      studentFullName: r.studentFullName ?? r.fullName ?? "",
      studentId: r.studentId,
      groupId: r.groupId,
      groupName: r.groupName,
      periodLabel: r.period, // cycle key (YYYY-MM-DD or YYYY-MM)
      held: r.held ?? r.heldSessions ?? 0,
      required: r.required ?? r.sessionsPerCycle ?? 0,
      due: Number(r.due || 0),
      paid: Number(r.paid || 0),
      balance: Number(r.balance || 0),
      status: r.status,
    }));
  }, [data]);

  const studentName = rows[0]?.studentFullName || `#${studentId}`;

  // Reset selection if filters change
  useEffect(() => {
    setSelected({});
  }, [studentId, status, groupId]);

  // Selected cycles → pay full balances
  const payItems = useMemo(() => {
    return rows
      .filter((r) => selected[r.id] && r.balance > 0)
      .map((r) => ({
        groupId: r.groupId,
        model: "MONTHLY",
        period: r.periodLabel, // exact cycle key
        amount: Number(Number(r.balance).toFixed(2)),
        _ui: { groupName: r.groupName, key: `${r.groupId}@${r.periodLabel}` },
      }));
  }, [rows, selected]);

  const selectedTotal = useMemo(
    () => payItems.reduce((sum, it) => sum + (it.amount || 0), 0),
    [payItems]
  );

  // Global amount & wallet toggle
  const [globalAmount, setGlobalAmount] = useState("");
  const [useWalletFirst, setUseWalletFirst] = useState(false);
  const credit = Number(summary?.totalCredit || 0);

  // Needs to pay from open balances
  const netPayable = Number(
    (summary?.totalBalance ?? summary?.netPayable ?? 0)
  );
  const totalDue = Number(summary?.totalDue || 0);
  const totalPaid = Number(summary?.totalPaid || 0);

  // -------- Confirm Plan (with FIFO lines) --------
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [plan, setPlan] = useState(null);

  // Build a preview that mirrors backend:
  // 1) selected items pay exact cycles,
  // 2) wallet-first + global FIFO across remaining unpaid rows (grid order).
  const buildPlan = () => {
    const selectedKeys = new Set(payItems.map((it) => it._ui.key));

    const fifoCycles = rows
      .filter(
        (r) => r.balance > 0 && !selectedKeys.has(`${r.groupId}@${r.periodLabel}`)
      )
      .slice()
      .sort((a, b) => {
        const pa = String(a.periodLabel);
        const pb = String(b.periodLabel);
        if (pa < pb) return -1;
        if (pa > pb) return 1;
        return String(a.groupName).localeCompare(String(b.groupName));
      })
      .map((r) => ({
        key: `${r.groupId}@${r.periodLabel}`,
        groupId: r.groupId,
        groupName: r.groupName,
        label: r.periodLabel,
        balance: Number(r.balance || 0),
      }));

    const cashFromItems = payItems.reduce((s, it) => s + (it.amount || 0), 0);
    let walletAvail = useWalletFirst ? Math.max(credit, 0) : 0;
    let cashGlobal = Number(globalAmount || 0) > 0 ? Number(globalAmount) : 0;

    const itemLines = payItems.map((it) => ({
      groupName: it._ui.groupName,
      label: it.period,
      cash: it.amount,
    }));

    const fifoLines = []; // {groupName, label, fromWallet, fromCash}

    for (const c of fifoCycles) {
      if (walletAvail <= 0 && cashGlobal <= 0) break;

      let need = c.balance;
      let fromWallet = 0;
      let fromCash = 0;

      if (walletAvail > 0 && need > 0) {
        fromWallet = Math.min(walletAvail, need);
        walletAvail -= fromWallet;
        need -= fromWallet;
      }
      if (cashGlobal > 0 && need > 0) {
        fromCash = Math.min(cashGlobal, need);
        cashGlobal -= fromCash;
        need -= fromCash;
      }

      if (fromWallet > 0 || fromCash > 0) {
        fifoLines.push({
          groupName: c.groupName,
          label: c.label,
          fromWallet,
          fromCash,
        });
      }
    }

    const cashFromGlobalApplied = fifoLines.reduce((s, l) => s + l.fromCash, 0);
    const walletUsed = fifoLines.reduce((s, l) => s + l.fromWallet, 0);
    const leftoverToWallet = Math.max(
      (Number(globalAmount || 0) || 0) - cashFromGlobalApplied,
      0
    );

    const stillUnpaidAfter = Math.max(
      netPayable - (cashFromItems + cashFromGlobalApplied + walletUsed),
      0
    );

    return {
      studentName,
      itemLines,
      fifoLines,
      totals: {
        cashReceived: cashFromItems + (Number(globalAmount || 0) || 0),
        cashAppliedToDues: cashFromItems + cashFromGlobalApplied,
        walletUsed,
        leftoverToWallet,
        stillUnpaidAfter,
      },
    };
  };

  const openConfirm = () => {
    const p = buildPlan();
    setPlan(p);
    setConfirmOpen(true);
  };
  const closeConfirm = () => setConfirmOpen(false);

  // -------- Submit --------
  const cashierUserId = 1; // TODO: hook real user

  const { mutate: payCombined, isLoading: paying } = useMutation({
    mutationFn: () => {
      const payload = {
        studentId,
        method: "CASH",
        reference: `FrontDesk-${Date.now()}`,
        items: payItems, // selected cycles (full balances)
      };
      const g = Number(globalAmount || 0);
      if (!Number.isNaN(g) && g > 0) payload.globalAmount = g;
      if (useWalletFirst) payload.useWalletFirst = true;

      return collectPayment(payload, cashierUserId);
    },
    onSuccess: (rec) => {
      setReceipt(rec);
      setSelected({});
      setGlobalAmount("");
      setConfirmOpen(false);
      refetch();
      refetchSummary();
    },
    onError: (e) =>
      alert(e?.message || (t && t.paymentFailed) || "Payment failed"),
  });

  // ---------- GRID ----------
  const columns = [
    {
      field: "groupName",
      headerName: t.group,
      flex: 1.5,
      minWidth: 220,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => (
        <Chip size="small" variant="outlined" label={p?.value || "(no group)"} />
      ),
    },
    {
      field: "periodLabel",
      headerName: t.periodLabel || "Period",
      width: 140,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "progress",
      headerName: t.progress || "Progress",
      width: 130,
      headerAlign: "center",
      align: "center",
      valueGetter: (params) =>
        `${params?.row?.held ?? 0}/${params?.row?.required ?? 0}`,
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
      width: 120,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => (
        <Chip size="small" label={money.format(p?.value || 0)} color="warning" />
      ),
    },
    {
      field: "paid",
      headerName: t.paid,
      width: 120,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => (
        <Chip size="small" label={money.format(p?.value || 0)} color="info" />
      ),
    },
    {
      field: "balance",
      headerName: t.balance,
      width: 130,
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
      width: 120,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => (
        <Chip
          size="small"
          label={p?.value}
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
      width: 140,
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
              // 👉 Selecting any row clears the global amount (mutually exclusive)
              if (globalAmount && Number(globalAmount) > 0) {
                setGlobalAmount("");
              }
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

  const anySelection = payItems.length > 0;
  const globalNum = Number(globalAmount || 0);
  const validGlobal = !Number.isNaN(globalNum) && globalNum >= 0;
  const canSubmit =
    anySelection || (validGlobal && (globalNum > 0 || useWalletFirst));

  return (
    <Box m={2}>
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
                {t[s.toLowerCase()] || s}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={5}>
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
            {t.summary || "Summary"} — {summary?.cycles ?? 0}{" "}
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
              label={`${t.needsToPay || "Needs to pay"}: ${money.format(netPayable)}`}
              color={netPayable > 0 ? "error" : "success"}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Grid */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" mb={1}>
            {t.unpaidGroups} — {(data?.content ?? []).length}{" "}
            {(data?.content ?? []).length === 1 ? "row" : "rows"}
          </Typography>
          <div style={{ height: 460, width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              hideFooter
              loading={isFetching}
              disableRowSelectionOnClick
              sx={{
                "& .MuiDataGrid-root": { border: "none" },
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
          </div>
        </CardContent>
      </Card>

      {/* Bottom bar */}
      <Box mt={2} display="flex" flexWrap="wrap" alignItems="center" gap={2} justifyContent="space-between">
        <Typography variant="h6" sx={{ minWidth: 260 }}>
          {t.totalSelected || "Selected total"}: {money.format(selectedTotal)}
        </Typography>

        <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1 }}>
          <TextField
            size="small"
            type="number"
            label={t.globalAmount || "Amount (optional)"}
            value={globalAmount}
            onChange={(e) => {
              const val = e.target.value;
              // 👉 Typing any amount clears selection (mutual exclusivity)
              if (val !== "" && !Number.isNaN(Number(val))) {
                if (Object.keys(selected).length > 0) setSelected({});
              }
              setGlobalAmount(val);
            }}
            inputProps={{ min: 0, step: "0.01" }}
            sx={{ width: 220 }}
            helperText={t.fifoHint || "FIFO: oldest unpaid cycles first. Extra goes to credit."}
          />

          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="body2">{t.useWalletFirst || "Use credit first"}</Typography>
            <Switch
              checked={useWalletFirst}
              onChange={(e) => setUseWalletFirst(e.target.checked)}
              size="small"
              disabled={credit <= 0}
            />
          </Stack>

          <Button
            variant="contained"
            disabled={paying || !(anySelection || (validGlobal && (globalNum > 0 || useWalletFirst)))}
            onClick={openConfirm}
          >
            {t.payAndPrint || "Pay & Print"}
          </Button>
        </Stack>
      </Box>

      {/* Confirm dialog (with FIFO cycle details) */}
      <Dialog open={confirmOpen} onClose={closeConfirm} maxWidth="sm" fullWidth>
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
                            secondary={`CASH ${money.format(ln.cash)}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                </>
              )}

              {plan.fifoLines.length > 0 && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    FIFO allocation (remaining unpaid)
                  </Typography>
                  <List dense sx={{ mb: 1 }}>
                    {plan.fifoLines.map((ln, idx) => (
                      <ListItem key={`fifo-${idx}`} disableGutters>
                        <ListItemText
                          primary={`${ln.groupName} — ${ln.label}`}
                          secondary={[
                            ln.fromWallet > 0 ? `WALLET ${money.format(ln.fromWallet)}` : null,
                            ln.fromCash > 0 ? `CASH ${money.format(ln.fromCash)}` : null,
                          ]
                            .filter(Boolean)
                            .join("  ·  ")}
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

              {plan.totals.cashReceived === 0 && (
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Nothing will be paid. Select cycles or enter an amount.
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirm} color="inherit">Cancel</Button>
          <Button
            onClick={() => payCombined()}
            variant="contained"
            disabled={paying || !(canSubmit && plan)}
          >
            Confirm & Pay
          </Button>
        </DialogActions>
      </Dialog>

      {receipt && <ReceiptDialog receipt={receipt} onClose={() => setReceipt(null)} />}
    </Box>
  );
}
