import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Autocomplete, Box, Button, Chip, MenuItem, TextField, Tooltip,
  Typography, Checkbox, useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import {
  rebuildTeacherEarnings, getTeacherSummary, getTeacherEarnings,
  createTeacherPayout, getTeacherFixedAttendance,
} from "../../api/teacherBilling";
import { lookupGroups, getGroup } from "../../api/groupsApi";

import TeacherPayoutDialog from "./components/TeacherPayoutDialog";

const moneyFmt = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toLocalInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const localToIso = (local) => (local ? new Date(local).toISOString() : undefined);
const startOfMonthIso = () => { const d = new Date(); d.setUTCDate(1); d.setUTCHours(0,0,0,0); return d.toISOString(); };
const nowIso = () => new Date().toISOString();
const isFixed = (t) => t === "FIXED" || t === "FIXED_PER_SESSION" || t === "FIXED_PER_HOUR";

const ShareCell = ({ type, value }) => {
  const v = Number(value ?? 0);
  if (!type) return null;
  if (type === "PERCENT") return <span>{v}%</span>;
  if (type === "FIXED_PER_SESSION" || type === "FIXED") return <span>{moneyFmt.format(v)} / session</span>;
  if (type === "FIXED_PER_HOUR") return <span>{moneyFmt.format(v)} / hour</span>;
  return null;
};

// map API billingModel -> UI label
const modeleLabel = (bm) => {
  if (!bm) return "";
  if (bm === "MONTHLY") return "MONTHLY";
  if (bm === "PER_SESSION") return "SESSION";
  if (bm === "PER_HOUR") return "HOUR";
  return bm.toString();
};

export default function TeacherPay({ language }) {
  const { teacherId: teacherIdStr } = useParams();
  const teacherId = Number(teacherIdStr);

  const [status, setStatus] = useState("UNPAID"); // DB filter only
  const [fromLocal, setFromLocal] = useState(toLocalInput(startOfMonthIso()));
  const [toLocal, setToLocal] = useState(toLocalInput(nowIso()));
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // group filter
  const [groupValue, setGroupValue] = useState(null);
  const [groupInput, setGroupInput] = useState("");
  const [groupOptions, setGroupOptions] = useState([]);
  const [groupTimer, setGroupTimer] = useState(null);
  const groupId = groupValue?.id;

  useEffect(() => { (async () => {
    const opts = await lookupGroups({ q: "", active: true, limit: 50 });
    setGroupOptions(opts || []);
  })(); }, []);

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

  // Warm summary
  useQuery({
    queryKey: ["teacherSummary", teacherId, groupId, fromIso, toIso],
    queryFn: () => getTeacherSummary(teacherId, { groupId, from: fromIso, to: toIso }),
    enabled: !!teacherId,
  });

  // DB earnings (percent groups etc.)
  const { data: dbRowsRaw, isFetching: fetchingDB, refetch: refetchDB } = useQuery({
    queryKey: ["teacherEarnings", teacherId, status, groupId, fromIso, toIso],
    queryFn: () => getTeacherEarnings(teacherId, { status, groupId, from: fromIso, to: toIso }),
    enabled: !!teacherId,
  });

  // Attendance → fixed virtual rows
  const { data: fixedRowsRaw, isFetching: fetchingFixed, refetch: refetchFixed } = useQuery({
    queryKey: ["teacherFixedAttendance", teacherId, groupId, fromIso, toIso],
    queryFn: () => getTeacherFixedAttendance(teacherId, { groupId, from: fromIso, to: toIso }),
    enabled: !!teacherId,
  });

  // selection (only DB UNPAID are selectable)
  const [sel, setSel] = useState(() => new Set());
  const dbUnpaidIds = useMemo(
    () => (dbRowsRaw ?? []).filter(r => r.status === "UNPAID").map(r => r.id),
    [dbRowsRaw]
  );
  const allSelected = dbUnpaidIds.length > 0 && dbUnpaidIds.every(id => sel.has(id));
  const someSelected = sel.size > 0 && !allSelected;
  const toggleAll = () => setSel(prev => (allSelected ? new Set() : new Set(dbUnpaidIds)));
  const toggleOne = (dbId) => setSel(prev => {
    const n = new Set(prev);
    n.has(dbId) ? n.delete(dbId) : n.add(dbId);
    return n;
  });

  // payouts + rebuild
  const [payout, setPayout] = useState(null);
  const cashierUserId = 1;
  const { mutate: doPayout, isLoading: paying } = useMutation({
    mutationFn: () => createTeacherPayout(teacherId, {
      earningIds: Array.from(sel).map(Number),
      method: "CASH",
      reference: `FrontDesk-${Date.now()}`,
      cashierUserId,
    }),
    onSuccess: (resp) => { setPayout(resp); setSel(new Set()); refetchDB(); },
    onError: (e) => alert(e?.message || "Payout failed"),
  });

  const { mutate: rebuild, isLoading: rebuilding } = useMutation({
    mutationFn: () => rebuildTeacherEarnings(teacherId, { groupId, from: fromIso, to: toIso }),
    onSuccess: () => refetchDB(),
  });

  // ====== UNIFIED MERGE (decide source per group by shareType) ======

  // Build group->shareType map by scanning both datasets
  const groupShareType = useMemo(() => {
    const m = new Map();
    (dbRowsRaw ?? []).forEach(r => {
      if (r.groupId && r.shareType) m.set(r.groupId, r.shareType);
    });
    (fixedRowsRaw ?? []).forEach(r => {
      if (r.groupId && r.shareType) m.set(r.groupId, r.shareType);
    });
    return m;
  }, [dbRowsRaw, fixedRowsRaw]);

  // Filter DB rows: keep only groups whose shareType is NOT fixed
  const filteredDbRows = useMemo(() => {
    return (dbRowsRaw ?? []).filter(r => !isFixed(groupShareType.get(r.groupId)));
  }, [dbRowsRaw, groupShareType]);

  // ---- group meta (to display Modèle for ALL rows, including percent)
  const [groupMeta, setGroupMeta] = useState(() => new Map()); // id -> group dto
  useEffect(() => {
    // collect all groupIds from both datasets
    const ids = new Set();
    (filteredDbRows ?? []).forEach(r => r.groupId && ids.add(r.groupId));
    (fixedRowsRaw ?? []).forEach(r => r.groupId && ids.add(r.groupId));
    const toFetch = Array.from(ids).filter(id => !groupMeta.has(id));
    if (toFetch.length === 0) return;
    (async () => {
      const newMap = new Map(groupMeta);
      for (const id of toFetch) {
        try { newMap.set(id, await getGroup(id)); } catch { /* ignore */ }
      }
      setGroupMeta(newMap);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredDbRows, fixedRowsRaw]);

  // Normalize both datasets into a single shape (no Date column in UI)
  const unifiedRows = useMemo(() => {
    const dbRows = filteredDbRows.map((r) => {
      const g = groupMeta.get(r.groupId);
      return {
        id: `db-${r.id}`,
        _selectable: r.status === "UNPAID",
        groupName: r.groupName || g?.name || "",
        modele: modeleLabel(g?.billingModel),
        shareType: r.shareType,
        shareValue: r.shareValue,
        cycleLabel: null,   // percent/hours don’t show cycle
        units: null,
        net: Number(r.shareAmount || 0),
        status: r.status,
        _dbId: r.id,
        _sortDate: r.recognizedAt ? new Date(r.recognizedAt).getTime() : 0,
      };
    });

    const fxRows = (fixedRowsRaw ?? []).map((r, idx) => {
      const g = groupMeta.get(r.groupId);
      return {
        id: `fx-${r.groupId}-${idx}`,
        _selectable: false,
        groupName: r.groupName || g?.name || "",
        modele: modeleLabel(g?.billingModel) || (r.modele || "MONTHLY"),
        shareType: r.shareType,
        shareValue: r.shareValue,
        cycleLabel: r.cycleLabel || null,
        units: r.units ?? null,
        net: Number(r.net || 0),
        status: r.status || "UNPAID",
        _dbId: null,
        _sortDate: r.firstSessionDate ? new Date(`${r.firstSessionDate}T00:00:00`).getTime() : 0,
      };
    });

    const all = [...dbRows, ...fxRows];
    all.sort((a, b) => {
      const ga = (a.groupName || "").toLowerCase(), gb = (b.groupName || "").toLowerCase();
      if (ga !== gb) return ga.localeCompare(gb);
      return (a._sortDate || 0) - (b._sortDate || 0);
    });
    return all;
  }, [filteredDbRows, fixedRowsRaw, groupMeta]);

  // Totals from what the user sees => no double counting
  const totals = useMemo(() => {
    const net = unifiedRows.reduce((s, r) => s + Number(r.net || 0), 0);
    const paid = unifiedRows.filter(r => r.status === "PAID").reduce((s, r) => s + Number(r.net || 0), 0);
    const unpaid = net - paid;
    const gross = (filteredDbRows ?? []).reduce((s, r) => s + Number(r.grossAmount || 0), 0);
    return { gross, net, paid, unpaid };
  }, [unifiedRows, filteredDbRows]);

  // columns — NOTE: no Date column; Cycle/Units hidden for percentage
  const columns = [
    {
      field: "__select", headerName: "", width: 60, sortable: false, filterable: false, disableColumnMenu: true,
      headerAlign: "center", align: "center",
      renderHeader: () => (
        <Checkbox
          checked={dbUnpaidIds.length > 0 && dbUnpaidIds.every(id => sel.has(id))}
          indeterminate={sel.size > 0 && !dbUnpaidIds.every(id => sel.has(id))}
          onChange={toggleAll}
        />
      ),
      renderCell: (p) => {
        const row = p?.row || {};
        return (
          <Checkbox
            checked={row._selectable && sel.has(row._dbId)}
            disabled={!row._selectable}
            onChange={() => row._selectable && toggleOne(row._dbId)}
          />
        );
      },
    },
    {
      field: "groupName", headerName: "Group", flex: 1.3, minWidth: 220, headerAlign: "center", align: "center",
      renderCell: (p) => <Tooltip title={p?.value}><Chip size="small" variant="outlined" label={p?.value || ""} /></Tooltip>,
    },
    { field: "modele", headerName: "Modèle", width: 130, headerAlign: "center", align: "center",
      renderCell: (p) => p?.value || "" },
    {
      field: "share", headerName: "Share", width: 160, headerAlign: "center", align: "center",
      sortable: false, filterable: false,
      renderCell: (p) => <ShareCell type={p?.row?.shareType} value={p?.row?.shareValue} />,
    },
    {
      field: "cycleLabel", headerName: "Cycle", width: 90, headerAlign: "center", align: "center",
      renderCell: (p) => isFixed(p?.row?.shareType) ? (p?.value || "") : "",
    },
    {
      field: "units", headerName: "Units", width: 80, headerAlign: "center", align: "center",
      renderCell: (p) => isFixed(p?.row?.shareType) && p?.value ? `×${p.value}` : "",
    },
    {
      field: "net", headerName: "Net", width: 130, headerAlign: "center", align: "center",
      renderCell: (p) => <Chip size="small" label={moneyFmt.format(Number(p?.value ?? 0))} color="success" />,
    },
    {
      field: "status", headerName: "Status", width: 110, headerAlign: "center", align: "center",
      renderCell: (p) => {
        const v = p?.value || "UNPAID";
        const solid = v === "PAID";
        return <Chip size="small" label={v} color={solid ? "success" : "default"} variant={solid ? "filled" : "outlined"} />;
      },
    },
  ];

  const loading = fetchingDB || fetchingFixed;

  const netSelected = useMemo(() => {
    const byId = new Map((filteredDbRows ?? []).map(r => [r.id, Number(r.shareAmount || 0)]));
    return Array.from(sel).reduce((s, id) => s + (byId.get(id) || 0), 0);
  }, [sel, filteredDbRows]);

  return (
    <Box p={2}>
      <Typography variant="h4" mb={1}>Teacher Pay — #{teacherId}</Typography>

      {/* Filters */}
      <Box display="flex" flexWrap="wrap" gap={1.2} alignItems="center" mb={1.5}>
        <TextField size="small" type="datetime-local" label="From" value={fromLocal} onChange={(e) => setFromLocal(e.target.value)} />
        <TextField size="small" type="datetime-local" label="To"   value={toLocal}   onChange={(e) => setToLocal(e.target.value)} />
        <Autocomplete size="small" sx={{ minWidth: 260 }} options={groupOptions}
          value={groupValue} onChange={(_, v) => setGroupValue(v)}
          inputValue={groupInput} onInputChange={onGroupInputChange}
          getOptionLabel={(o) => o?.name ?? ""} isOptionEqualToValue={(o, v) => o.id === v.id}
          renderInput={(params) => <TextField {...params} label="Filter by group" />}
          clearOnBlur={false} />
        <TextField size="small" select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 140 }}>
          {["UNPAID", "PAID", "ALL"].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        <Button size="small" variant="outlined" onClick={() => rebuild()} disabled={rebuilding}>Rebuild</Button>
        <Button size="small" variant="contained" onClick={() => { refetchDB(); refetchFixed(); }}>Search</Button>
      </Box>

      {/* Summary chips (from unified rows -> no double counting) */}
      <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
        <Chip label={`Gross: ${moneyFmt.format(totals.gross || 0)}`} color="warning" />
        <Chip label={`Net: ${moneyFmt.format(totals.net || 0)}`}   color="success" />
        <Chip label={`Paid: ${moneyFmt.format(totals.paid || 0)}`} color="info" />
        <Chip label={`Unpaid: ${moneyFmt.format(totals.unpaid || 0)}`} color="error" />
      </Box>

      {/* ONE grid */}
      <Box height="78vh" dir={language === "ar" ? "rtl" : "ltr"} sx={{
        "& .MuiDataGrid-root": { border: "none" },
        "& .MuiDataGrid-columnHeaders": { backgroundColor: colors.blueAccent[700], borderBottom: "none", textAlign: language === "ar" ? "right" : "left" },
        "& .MuiDataGrid-cell": { textAlign: language === "ar" ? "right" : "left" },
        "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
        "& .MuiDataGrid-footerContainer": { borderTop: "none", backgroundColor: colors.blueAccent[400] },
        "& .MuiCheckbox-root.Mui-checked": { color: theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400] },
      }}>
        <DataGrid
          rows={unifiedRows}
          columns={columns}
          loading={loading}
          hideFooter
          disableRowSelectionOnClick
        />
      </Box>

      {/* Footer actions */}
      <Box mt={2} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Box display="flex" gap={1} alignItems="center">
          <Chip label={`Selected: ${sel.size}`} variant="outlined" />
          <Chip label={`To pay: ${moneyFmt.format(netSelected)}`} color="success" />
        </Box>
        <Button variant="contained" disabled={sel.size === 0 || paying} onClick={() => doPayout()}>
          Create payout
        </Button>
      </Box>

      {payout && <TeacherPayoutDialog payout={payout} onClose={() => setPayout(null)} />}
    </Box>
  );
}
