// src/scenes/finances/TeacherPay.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
  Checkbox,useTheme
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import {
  rebuildTeacherEarnings,
  getTeacherSummary,
  getTeacherEarnings,
  createTeacherPayout,
  listTeacherPayouts,
} from "../../api/teacherBilling";
import { lookupGroups } from "../../api/groups";
import TeacherPayoutDialog from "./components/TeacherPayoutDialog";

// ---------- helpers ----------
const money = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const toLocalInput = (iso) =>
  iso ? new Date(iso).toISOString().slice(0, 16) : "";
const localToIso = (local) =>
  local ? new Date(local).toISOString() : undefined;
const startOfMonthIso = () => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
};
const nowIso = () => new Date().toISOString();

// defensive formatters (MUI can call with undefined params)
const fmtDate = ({ value } = {}) =>
  value ? new Date(value).toLocaleString() : "";
const fmtPercent = ({ value } = {}) => `${Number(value ?? 0)}%`;
// --------------------------------

export default function TeacherPay({ language }) {
  const { teacherId: teacherIdStr } = useParams();
  const teacherId = Number(teacherIdStr);

  const [status, setStatus] = useState("UNPAID");
  const [fromLocal, setFromLocal] = useState(toLocalInput(startOfMonthIso()));
  const [toLocal, setToLocal] = useState(toLocalInput(nowIso()));
const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  // Group lookup (typeahead + initial load)
  const [groupValue, setGroupValue] = useState(null);
  const [groupInput, setGroupInput] = useState("");
  const [groupOptions, setGroupOptions] = useState([]);
  const [groupTimer, setGroupTimer] = useState(null);
  const groupId = groupValue?.id;

  useEffect(() => {
    // initial load so the dropdown is not empty
    (async () => {
      const opts = await lookupGroups({ q: "", active: true, limit: 50 });
      setGroupOptions(opts || []);
    })();
  }, []);

  const onGroupInputChange = async (_, v) => {
    setGroupInput(v);
    if (groupTimer) clearTimeout(groupTimer);
    const t = setTimeout(async () => {
      const opts = await lookupGroups({ q: v, active: true, limit: 50 });
      setGroupOptions(opts || []);
    }, 250);
    setGroupTimer(t);
  };

  const fromIso = localToIso(fromLocal);
  const toIso = localToIso(toLocal);

  // Backfill / rebuild
  const { mutate: rebuild, isLoading: rebuilding } = useMutation({
    mutationFn: () =>
      rebuildTeacherEarnings(teacherId, { groupId, from: fromIso, to: toIso }),
  });

  // Summary
  const {
    data: summary,
    refetch: refetchSummary,
    isFetching: fetchingSummary,
  } = useQuery({
    queryKey: ["teacherSummary", teacherId, groupId, fromIso, toIso],
    queryFn: () =>
      getTeacherSummary(teacherId, { groupId, from: fromIso, to: toIso }),
    enabled: !!teacherId,
  });

  // Earnings rows (NOTE: your API returns array with keys: id, recognizedAt, groupName, grossAmount, shareValue, shareAmount, status)
  const {
    data: earnings,
    refetch: refetchRows,
    isFetching: fetchingRows,
  } = useQuery({
    queryKey: ["teacherEarnings", teacherId, status, groupId, fromIso, toIso],
    queryFn: () =>
      getTeacherEarnings(teacherId, {
        status,
        groupId,
        from: fromIso,
        to: toIso,
      }),
    enabled: !!teacherId,
  });

  // ---------- manual selection (avoid MUI selection plugin bugs) ----------
  const [sel, setSel] = useState(() => new Set());
  const allUnpaidIds = useMemo(
    () => (earnings ?? []).filter((r) => r.status === "UNPAID").map((r) => r.id),
    [earnings]
  );
  const allSelected = allUnpaidIds.length > 0 && allUnpaidIds.every((id) => sel.has(id));
  const someSelected = sel.size > 0 && !allSelected;

  const toggleAll = () => {
    setSel((prev) => {
      if (allSelected) return new Set();
      return new Set(allUnpaidIds);
    });
  };
  const toggleOne = (id) => {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const netSelected = useMemo(
    () =>
      (earnings ?? []).reduce(
        (s, r) => (sel.has(r.id) ? s + Number(r.shareAmount || 0) : s),
        0
      ),
    [sel, earnings]
  );
  // -----------------------------------------------------------------------

  // Payout
  const [payout, setPayout] = useState(null);
  const cashierUserId = 1; // TODO: wire to current user
  const { mutate: doPayout, isLoading: paying } = useMutation({
    mutationFn: () =>
      createTeacherPayout(teacherId, {
        earningIds: Array.from(sel).map(Number),
        method: "CASH",
        reference: `FrontDesk-${Date.now()}`,
        cashierUserId,
      }),
    onSuccess: (resp) => {
      setPayout(resp);
      setSel(new Set());
      refetchSummary();
      refetchRows();
      refetchPayouts();
    },
    onError: (e) => alert(e?.message || "Payout failed"),
  });

  // History
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data: payouts, refetch: refetchPayouts } = useQuery({
    queryKey: ["teacherPayouts", teacherId],
    queryFn: () => listTeacherPayouts(teacherId),
    enabled: historyOpen && !!teacherId,
  });

  // ---------- totals/chips ----------
  const computedTotals = useMemo(() => {
    const list = earnings ?? [];
    const gross = list.reduce((s, r) => s + Number(r.grossAmount || 0), 0);
    const net = list.reduce((s, r) => s + Number(r.shareAmount || 0), 0);
    const paid = list
      .filter((r) => r.status === "PAID")
      .reduce((s, r) => s + Number(r.shareAmount || 0), 0);
    const unpaid = list
      .filter((r) => r.status === "UNPAID")
      .reduce((s, r) => s + Number(r.shareAmount || 0), 0);
    const totalEarnings = list.length;
    const paidCount = list.filter((r) => r.status === "PAID").length;
    const unpaidCount = list.filter((r) => r.status === "UNPAID").length;
    return { totals: { gross, net, paid, unpaid }, counts: { totalEarnings, paidCount, unpaidCount } };
  }, [earnings]);

  const totals = summary?.totals ?? computedTotals.totals;
  const counts = summary?.counts ?? computedTotals.counts;

  // ---------- grid columns (aligned to YOUR payload) ----------
  const columns = [
    {
      field: "__select",
      headerName: "",
      width: 60,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      headerAlign: "center",
      align: "center",
      renderHeader: () => (
        <Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />
      ),
      renderCell: (p) => (
        <Checkbox
          checked={sel.has(p?.row?.id)}
          disabled={p?.row?.status === "PAID"}
          onChange={() => toggleOne(p?.row?.id)}
        />
      ),
    },
    {
      field: "recognizedAt",
      headerName: "Earned",
      width: 170,
      headerAlign: "center",
      align: "center",
      valueFormatter: fmtDate,
    },
    {
      field: "groupName",
      headerName: "Group",
      flex: 1.2,
      minWidth: 200,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => (
        <Tooltip title={p?.value || "(no group)"} placement="top">
          <Chip size="small" variant="outlined" label={p?.value || "(no group)"} />
        </Tooltip>
      ),
    },
    {
      field: "grossAmount",
      headerName: "Gross",
      width: 120,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => (
        <Chip size="small" label={money.format(Number(p?.value ?? 0))} color="warning" />
      ),
    },
    {
      field: "shareValue",
      headerName: "Share",
      width: 100,
      headerAlign: "center",
      align: "center",
      valueFormatter: fmtPercent,
    },
    {
      field: "shareAmount",
      headerName: "Net",
      width: 120,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => (
        <Chip size="small" label={money.format(Number(p?.value ?? 0))} color="success" />
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => (
        <Chip
          size="small"
          label={p?.value}
          color={p?.value === "PAID" ? "success" : "default"}
          variant="outlined"
        />
      ),
    },
  ];
  // -----------------------------------------------

  const rows = (earnings ?? []).map((r) => ({ id: r.id, ...r }));

  return (
    <Box p={2}>
      <Typography variant="h4" mb={1}>
        Teacher Pay — #{teacherId}
      </Typography>

      {/* Filters */}
      <Box display="flex" flexWrap="wrap" gap={1.2} alignItems="center" mb={1.5}>
        <TextField
          size="small"
          type="datetime-local"
          label="From"
          value={fromLocal}
          onChange={(e) => setFromLocal(e.target.value)}
        />
        <TextField
          size="small"
          type="datetime-local"
          label="To"
          value={toLocal}
          onChange={(e) => setToLocal(e.target.value)}
        />

        <Autocomplete
          size="small"
          sx={{ minWidth: 260 }}
          options={groupOptions}
          value={groupValue}
          onChange={(_, v) => setGroupValue(v)}
          inputValue={groupInput}
          onInputChange={onGroupInputChange}
          getOptionLabel={(o) => o?.name ?? ""}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          renderInput={(params) => <TextField {...params} label="Filter by group" />}
          clearOnBlur={false}
        />

        <TextField
          size="small"
          select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          {["UNPAID", "PAID", "ALL"].map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>

        <Button size="small" variant="outlined" onClick={() => rebuild()} disabled={rebuilding}>
          Rebuild
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={() => {
            refetchSummary();
            refetchRows();
          }}
        >
          Search
        </Button>
      </Box>

      {/* Summary chips */}
      <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
        <Chip label={`Gross: ${money.format(totals.gross || 0)}`} color="warning" />
        <Chip label={`Net: ${money.format(totals.net || 0)}`} color="success" />
        <Chip label={`Paid: ${money.format(totals.paid || 0)}`} color="info" />
        <Chip label={`Unpaid: ${money.format(totals.unpaid || 0)}`} color="error" />
        <Chip label={`Rows: ${counts.totalEarnings || 0}`} variant="outlined" />
      </Box>

      {/* Grid */}
      <Box
            height="80vh"
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
        >
        <DataGrid
          rows={rows}
          columns={columns}
          loading={fetchingSummary || fetchingRows}
          hideFooter
          disableRowSelectionOnClick
        />
      </Box>

      {/* Footer actions */}
      <Box
        mt={2}
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
      >
        <Box display="flex" gap={1} alignItems="center">
          <Chip label={`Selected: ${sel.size}`} variant="outlined" />
          <Chip label={`To pay: ${money.format(netSelected)}`} color="success" />
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" onClick={() => setHistoryOpen(true)}>
            View payouts
          </Button>
          <Button
            variant="contained"
            disabled={sel.size === 0 || paying}
            onClick={() => doPayout()}
          >
            Create payout
          </Button>
        </Box>
      </Box>

      {/* Payout dialog */}
      {payout && (
        <TeacherPayoutDialog payout={payout} onClose={() => setPayout(null)} />
      )}

      {/* Payout history */}
      {historyOpen && (
        <Box mt={2} p={2} sx={{ borderRadius: 2, bgcolor: "background.paper" }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6">Payouts</Typography>
            <Button size="small" onClick={() => setHistoryOpen(false)}>
              Close
            </Button>
          </Box>
          {(payouts ?? []).length === 0 && (
            <Typography color="text.secondary">No payouts yet.</Typography>
          )}
          {(payouts ?? []).map((p) => (
            <Box
              key={p.payoutId}
              display="flex"
              justifyContent="space-between"
              py={0.5}
              borderBottom="1px solid rgba(255,255,255,0.08)"
            >
              <div>
                #{p.payoutNo} — {new Date(p.createdAt).toLocaleString()}
              </div>
              <strong>{money.format(Number(p.total || 0))}</strong>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
