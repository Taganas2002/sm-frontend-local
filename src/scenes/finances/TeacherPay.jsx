import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Autocomplete, Box, Button, Chip, MenuItem, TextField, Tooltip,
  Typography, Checkbox, useTheme, useMediaQuery,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { tokens } from "../../theme";
import {
  rebuildTeacherEarnings, getTeacherSummary, getTeacherEarnings,
  createTeacherPayout, getTeacherFixedAttendance, lockFixedCycles,
} from "../../api/teacherBilling";
import { lookupGroups, getGroup } from "../../api/groupsApi";
import { getTeacher } from "../../api/teachersApi";
import TeacherPayoutDialog from "./components/TeacherPayoutDialog";
import { getPaymentErrorMessage } from "../../utils/paymentErrors";

const moneyFmt = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isFixed = (t) => t === "FIXED" || t === "FIXED_PER_SESSION" || t === "FIXED_PER_HOUR";
const makeIdempotencyKey = (teacherId) =>
  `TPAY-${teacherId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const TEACHER_PAY_DENSITY_LS_KEY = "billing:teacherPayDensity";

const ShareCell = ({ type, value, cycleLabel, units }) => {
  const v = Number(value ?? 0);
  if (!type) return null;
  if (type === "PERCENT") return <span>{v}%</span>;
  if (type === "FIXED_PER_SESSION" || type === "FIXED") {
    return <span>{moneyFmt.format(v)} / session {cycleLabel ? `· ${cycleLabel}` : ""} {units ? `×${units}` : ""}</span>;
  }
  if (type === "FIXED_PER_HOUR") {
    return <span>{moneyFmt.format(v)} / hour {cycleLabel ? `· ${cycleLabel}` : ""} {units ? `×${units}` : ""}</span>;
  }
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
  const navigate = useNavigate();
  const { teacherId: teacherIdStr } = useParams();
  const teacherId = Number(teacherIdStr);

  const [status, setStatus] = useState("UNPAID"); // default actionable list
  const theme = useTheme();
  const isCompactScreen = useMediaQuery(theme.breakpoints.down("lg"));
  const colors = tokens(theme.palette.mode);
  const [densityMode, setDensityMode] = useState("compact");

  useEffect(() => {
    const savedDensity = localStorage.getItem(TEACHER_PAY_DENSITY_LS_KEY);
    if (savedDensity === "compact" || savedDensity === "standard") {
      setDensityMode(savedDensity);
      return;
    }
    setDensityMode("compact");
  }, [isCompactScreen]);

  useEffect(() => {
    localStorage.setItem(TEACHER_PAY_DENSITY_LS_KEY, densityMode);
  }, [densityMode]);

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

  const fromIso = undefined;
  const toIso = undefined;

  // Warm summary
  useQuery({
    queryKey: ["teacherSummary", teacherId, groupId, fromIso, toIso],
    queryFn: () => getTeacherSummary(teacherId, { groupId, from: fromIso, to: toIso }),
    enabled: !!teacherId,
  });

  // DB earnings (always ALL for stable production totals)
  const { data: dbRowsRaw, isFetching: fetchingDB, refetch: refetchDB } = useQuery({
    queryKey: ["teacherEarnings", teacherId, "ALL", groupId, fromIso, toIso],
    queryFn: () => getTeacherEarnings(teacherId, { status: "ALL", groupId, from: fromIso, to: toIso }),
    enabled: !!teacherId,
  });
  const { data: teacherMeta } = useQuery({
    queryKey: ["teacherMeta", teacherId],
    queryFn: () => getTeacher(teacherId),
    enabled: !!teacherId,
  });

  // Attendance → fixed virtual rows
  const { data: fixedRowsRaw, isFetching: fetchingFixed, refetch: refetchFixed } = useQuery({
    queryKey: ["teacherFixedAttendance", teacherId, groupId, fromIso, toIso],
    queryFn: () => getTeacherFixedAttendance(teacherId, { groupId, from: fromIso, to: toIso }),
    enabled: !!teacherId,
  });

  // ===== selection: allow BOTH db and fixed rows =====
  const [sel, setSel] = useState(() => new Set()); // stores unified row.id ("db-5" or "fx-<group>-<idx>")

  const toggleAll = (rows) => {
    const next = new Set(sel);
    const allIds = rows.map(r => r.id);
    const everySelected = allIds.every(id => next.has(id));
    if (everySelected) {
      allIds.forEach(id => next.delete(id));
    } else {
      allIds.forEach(id => next.add(id));
    }
    setSel(next);
  };
  const toggleOne = (rid) => setSel(prev => {
    const n = new Set(prev);
    n.has(rid) ? n.delete(rid) : n.add(rid);
    return n;
  });

  // ---- group meta (to display Modèle for ALL rows)
  const [groupMeta, setGroupMeta] = useState(() => new Map());
  useEffect(() => {
    const ids = new Set();
    (dbRowsRaw ?? []).forEach(r => r.groupId && ids.add(r.groupId));
    (fixedRowsRaw ?? []).forEach(r => r.groupId && ids.add(r.groupId));
    const toFetch = Array.from(ids).filter(id => !groupMeta.has(id));
    if (toFetch.length === 0) return;
    (async () => {
      const newMap = new Map(groupMeta);
      for (const id of toFetch) {
        try { newMap.set(id, await getGroup(id)); } catch {}
      }
      setGroupMeta(newMap);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbRowsRaw, fixedRowsRaw]);

  // ===== UNIFIED MERGE (DB rows + virtual fixed rows) =====
  const allRows = useMemo(() => {
    const dbRows = (dbRowsRaw ?? []).map((r) => {
      const g = groupMeta.get(r.groupId);
      return {
        id: `db-${r.id}`,
        _kind: "db",
        _selectable: r.status === "UNPAID",
        groupId: r.groupId,
        groupName: r.groupName || g?.name || "",
        modele: modeleLabel(g?.billingModel),
        shareType: r.shareType,       // PERCENT / FIXED* / etc. (from DB)
        shareValue: r.shareValue,
        cycleLabel: null,             // cycles shown only for virtual fixed rows
        units: null,
        net: Number(r.shareAmount || 0),
        status: r.status,
        studentName: r.studentName || "",
        paymentType: r.paymentType || "",
        periodKey: r.periodKey || "",
        _dbId: r.id,
        _fx: null,
        _sortDate: r.recognizedAt ? new Date(r.recognizedAt).getTime() : 0,
      };
    });

    const fxRows = (fixedRowsRaw ?? []).map((r, idx) => {
      const g = groupMeta.get(r.groupId);
      const firstDate = r.firstSessionDate ? `${r.firstSessionDate}` : null;
      return {
        id: `fx-${r.groupId}-${idx}`,
        _kind: "fx",
        _selectable: true, // ENABLE selection for virtual fixed rows
        groupId: r.groupId,
        groupName: r.groupName || g?.name || "",
        modele: modeleLabel(g?.billingModel) || (r.modele || "MONTHLY"),
        shareType: r.shareType,       // FIXED / FIXED_PER_SESSION / FIXED_PER_HOUR
        shareValue: r.shareValue,
        cycleLabel: r.cycleLabel || null,
        units: r.units ?? null,
        net: Number(r.net || 0),
        status: r.status || "UNPAID",
        studentName: "",
        paymentType: "ATTENDANCE_FIXED",
        periodKey: firstDate || "",
        _dbId: null,
        _fx: { groupId: r.groupId, units: r.units ?? 0, firstSessionDate: firstDate },
        _sortDate: firstDate ? new Date(`${firstDate}T00:00:00`).getTime() : 0,
      };
    });

    const merged = [...dbRows, ...fxRows];
    merged.sort((a, b) => {
      const ga = (a.groupName || "").toLowerCase(), gb = (b.groupName || "").toLowerCase();
      if (ga !== gb) return ga.localeCompare(gb);
      return (a._sortDate || 0) - (b._sortDate || 0);
    });
    return merged;
  }, [dbRowsRaw, fixedRowsRaw, groupMeta]);

  const unifiedRows = useMemo(() => {
    if (status === "ALL") return allRows;
    if (status === "PAID") return allRows.filter((r) => r.status === "PAID");
    // UNPAID view: include unpaid DB rows + attendance-fixed virtual rows
    return allRows.filter((r) => r.status !== "PAID");
  }, [allRows, status]);

  const loading = fetchingDB || fetchingFixed;

  // header checkbox support: toggles all selectable rows
  const selectableRows = useMemo(() => unifiedRows.filter(r => r._selectable), [unifiedRows]);
  const allSelected = selectableRows.length > 0 && selectableRows.every(r => sel.has(r.id));
  const someSelected = sel.size > 0 && !allSelected;

  // Production-safe UX: keep selection only for currently visible rows.
  useEffect(() => {
    const visibleIds = new Set(unifiedRows.map((r) => r.id));
    setSel((prev) => {
      const next = new Set(Array.from(prev).filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [unifiedRows]);

  // Totals (stable: all rows, not affected by status filter)
  const totals = useMemo(() => {
    const net = allRows.reduce((s, r) => s + Number(r.net || 0), 0);
    const paid = allRows.filter(r => r.status === "PAID").reduce((s, r) => s + Number(r.net || 0), 0);
    const unpaid = net - paid;
    const gross = (dbRowsRaw ?? []).reduce((s, r) => s + Number(r.grossAmount || 0), 0);
    return { gross, net, paid, unpaid };
  }, [allRows, dbRowsRaw]);

  // Selected amount (db uses shareAmount; fx uses virtual net)
  const netSelected = useMemo(() => {
    const byDbId = new Map((dbRowsRaw ?? []).map(r => [`db-${r.id}`, Number(r.shareAmount || 0)]));
    return Array.from(sel).reduce((sum, rid) => {
      const row = unifiedRows.find(r => r.id === rid);
      if (!row) return sum;
      if (row._kind === "db") return sum + (byDbId.get(rid) || 0);
      if (row._kind === "fx") return sum + Number(row.net || 0);
      return sum;
    }, 0);
  }, [sel, unifiedRows, dbRowsRaw]);

  // ===== payout flow: lock fixed first, then payout everything =====
  const [payout, setPayout] = useState(null);
  const cashierUserId = 1;

  const { mutateAsync: doLock } = useMutation({
    mutationFn: (fxCycles) => lockFixedCycles(teacherId, { cycles: fxCycles }),
  });

  const { mutate: doPayout, isLoading: paying } = useMutation({
    mutationFn: async () => {
      // split selection
      const selectedRows = unifiedRows.filter(r => sel.has(r.id));
      const dbIds = selectedRows.filter(r => r._kind === "db" && r._dbId).map(r => Number(r._dbId));
      const fxCycles = selectedRows
        .filter(r => r._kind === "fx" && r._fx && r._fx.units > 0 && r._fx.firstSessionDate)
        .map(r => r._fx);

      let newIds = [];
      if (fxCycles.length > 0) {
        const { earningIds } = await doLock(fxCycles);
        newIds = earningIds || [];
      }

      const payload = {
        earningIds: [...dbIds, ...newIds],
        method: "CASH",
        reference: `FrontDesk-${Date.now()}`,
        cashierUserId,
      };
      const resp = await createTeacherPayout(teacherId, payload, makeIdempotencyKey(teacherId));
      return resp;
    },
    onSuccess: (resp) => {
      setPayout(resp);
      setSel(new Set());
      refetchDB();
      refetchFixed();
    },
    onError: (e) => alert(getPaymentErrorMessage(e, { paymentFailedGeneric: "Payout failed. Please try again." })),
  });

  const columns = [
    {
      field: "__select", headerName: "", width: 60, sortable: false, filterable: false, disableColumnMenu: true,
      headerAlign: "center", align: "center",
      renderHeader: () => (
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected}
          onChange={() => toggleAll(selectableRows)}
        />
      ),
      renderCell: (p) => {
        const row = p?.row || {};
        return (
          <Checkbox
            checked={sel.has(row.id)}
            disabled={!row._selectable}
            onChange={() => row._selectable && toggleOne(row.id)}
          />
        );
      },
    },
    {
      field: "groupName", headerName: "Group", flex: 1.3, minWidth: 220, headerAlign: "center", align: "center",
      renderCell: (p) => <Tooltip title={p?.value}><Chip size="small" variant="outlined" label={p?.value || ""} /></Tooltip>,
    },
    {
      field: "studentName", headerName: "Student", flex: 1.1, minWidth: 180, headerAlign: "center", align: "center",
      renderCell: (p) => p?.value || (p?.row?._kind === "fx" ? "-" : ""),
    },
    {
      field: "paymentType", headerName: "Source", width: 150, headerAlign: "center", align: "center",
      renderCell: (p) => p?.value || "-",
    },
    {
      field: "periodKey", headerName: "Period Key", width: 130, headerAlign: "center", align: "center",
      renderCell: (p) => p?.value || "-",
    },
    { field: "modele", headerName: "Modèle", width: 130, headerAlign: "center", align: "center",
      renderCell: (p) => p?.value || "" },
    {
      field: "share", headerName: "Share", width: 240, headerAlign: "center", align: "center",
      sortable: false, filterable: false,
      renderCell: (p) => (
        <ShareCell
          type={p?.row?.shareType}
          value={p?.row?.shareValue}
          cycleLabel={isFixed(p?.row?.shareType) ? p?.row?.cycleLabel : null}
          units={isFixed(p?.row?.shareType) ? p?.row?.units : null}
        />
      ),
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

  return (
    <Box p={2}>
      <Box
        mb={1.5}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={1}
        sx={{
          p: 1,
          borderRadius: 1.5,
          backgroundColor: theme.palette.mode === "light" ? "#f5f8ff" : colors.primary[500],
          border: `1px solid ${colors.primary[300]}`,
        }}
      >
        <Button
          size="small"
          variant="contained"
          startIcon={<ArrowBackIosNewIcon />}
          onClick={() => navigate("/finances/teacher-pay")}
          sx={{
            minWidth: 112,
            fontWeight: 700,
            textTransform: "none",
            backgroundColor: theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400],
            color: "#fff",
            "&:hover": {
              backgroundColor: theme.palette.mode === "light" ? colors.blueAccent[600] : colors.blueAccent[600],
            },
          }}
        >
          Back
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Teacher Pay — {teacherMeta?.fullName || `#${teacherId}`}
        </Typography>
        <Box sx={{ width: 112 }} />
      </Box>

      {/* Filters */}
      <Box display="flex" flexWrap="wrap" gap={1.2} alignItems="center" mb={1.5}>
        <Autocomplete size="small" sx={{ minWidth: 260 }} options={groupOptions}
          value={groupValue} onChange={(_, v) => setGroupValue(v)}
          inputValue={groupInput} onInputChange={onGroupInputChange}
          getOptionLabel={(o) => o?.name ?? ""} isOptionEqualToValue={(o, v) => o.id === v.id}
          renderInput={(params) => <TextField {...params} label="Filter by group" />}
          clearOnBlur={false} />
        <TextField size="small" select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 140 }}>
          {["UNPAID", "PAID", "ALL"].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        <TextField
          size="small"
          select
          label="View"
          value={densityMode}
          onChange={(e) => setDensityMode(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="compact">Compact</MenuItem>
          <MenuItem value="standard">Comfortable</MenuItem>
        </TextField>
        <Button size="small" variant="outlined" onClick={() => rebuildTeacherEarnings(teacherId, { groupId, from: fromIso, to: toIso })}>
          Rebuild
        </Button>
        <Button size="small" variant="contained" onClick={() => { refetchDB(); refetchFixed(); }}>
          Search
        </Button>
      </Box>

      {/* Summary chips */}
      <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
        <Chip label={`Gross: ${moneyFmt.format(totals.gross || 0)}`} color="warning" />
        <Chip label={`Net: ${moneyFmt.format(totals.net || 0)}`}   color="success" />
        <Chip label={`Paid: ${moneyFmt.format(totals.paid || 0)}`} color="info" />
        <Chip label={`Unpaid: ${moneyFmt.format(totals.unpaid || 0)}`} color="error" />
      </Box>

      {/* Unified grid */}
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
          density={densityMode}
          rowHeight={densityMode === "compact" ? 40 : 52}
          columnHeaderHeight={densityMode === "compact" ? 44 : 52}
          hideFooter
          disableRowSelectionOnClick
        />
      </Box>

      {/* Footer actions (student-pay style) */}
      <Box
        mt={2}
        display="flex"
        flexWrap="wrap"
        alignItems="center"
        gap={2}
        justifyContent="space-between"
        sx={{
          position: "sticky",
          bottom: 12,
          zIndex: 5,
          p: 2,
          borderRadius: 2,
          bgcolor: colors.primary[400],
          border: `1px solid ${colors.primary[300]}`,
        }}
      >
        <Box display="flex" gap={1} alignItems="center">
          <Chip label={`Selected: ${sel.size}`} variant="outlined" />
          <Chip label={`To pay: ${moneyFmt.format(netSelected)}`} color="success" />
        </Box>
        <Button
          variant="contained"
          disabled={sel.size === 0 || paying}
          onClick={() => doPayout()}
        >
          Create payout
        </Button>
      </Box>

      {payout && <TeacherPayoutDialog payout={payout} onClose={() => setPayout(null)} />}
    </Box>
  );
}
