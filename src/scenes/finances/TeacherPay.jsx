import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Checkbox, Chip, Grid,
  MenuItem, TextField, Tooltip, Typography, useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import { getTranslations } from "../../translations";
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
/** Sum of column widths — grid scrolls horizontally when viewport is narrower than this */
const TEACHER_PAY_TABLE_MIN_PX = 1288;

const ShareCell = ({ type, value, cycleLabel, units, language }) => {
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

const localizedLabel = (language, en, fr, ar) => {
  if (language === "ar") return ar;
  if (language === "fr") return fr;
  return en;
};

const formatStatus = (value, unpaidLabel, paidLabel, allLabel) => {
  if (value === "PAID") return paidLabel;
  if (value === "ALL") return allLabel;
  return unpaidLabel;
};

const formatPaymentType = (value, language) => {
  if (!value) return "";
  const upper = String(value).toUpperCase();
  if (upper === "MONTHLY") return localizedLabel(language, "Monthly", "Mensuel", "شهري");
  if (upper === "ATTENDANCE_FIXED") return localizedLabel(language, "Attendance", "Présence", "الحضور");
  if (upper === "PER_SESSION") return localizedLabel(language, "Session", "Par séance", "بالحصة");
  if (upper === "PER_HOUR") return localizedLabel(language, "Hour", "Par heure", "بالساعة");
  return value;
};

const formatModele = (value, language) => {
  if (!value) return "";
  const upper = String(value).toUpperCase();
  if (upper === "MONTHLY") return localizedLabel(language, "Monthly", "Mensuel", "شهري");
  if (upper === "SESSION") return localizedLabel(language, "Session", "Par séance", "بالحصة");
  if (upper === "HOUR") return localizedLabel(language, "Hour", "Par heure", "بالساعة");
  return value;
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
  const hasValidTeacherId = Number.isFinite(teacherId) && teacherId > 0;
  const t = getTranslations(language);

  const [status, setStatus] = useState("UNPAID"); // default actionable list
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [densityMode, setDensityMode] = useState("compact");

  useEffect(() => {
    const savedDensity = localStorage.getItem(TEACHER_PAY_DENSITY_LS_KEY);
    if (savedDensity === "compact" || savedDensity === "standard") {
      setDensityMode(savedDensity);
      return;
    }
    setDensityMode("compact");
  }, []);

  useEffect(() => {
    localStorage.setItem(TEACHER_PAY_DENSITY_LS_KEY, densityMode);
  }, [densityMode]);

  const teacherPayTitle = t.teacherPayTitle || t.teacherPay || "Teacher Pay";
  const backLabel = t.back || "Back";
  const groupFilterLabel = t.filterByGroup || t.groupFilter || t.group || "Group";
  const statusLabel = t.status || "Status";
  const viewLabel = t.view || "View";
  const searchLabel = t.searchButton || t.search || "Search";
  const rebuildLabel = t.rebuildButton || t.rebuild || "Rebuild";
  const grossLabel = t.grossLabel || t.gross || "Gross";
  const paidLabel = t.paidLabel || t.paid || "Paid";
  const remainingLabel = t.remainingBalance || t.unpaidLabel || t.unpaid || "Remaining";
  const groupColumnLabel = t.groupLabel || t.group || "Group";
  const studentColumnLabel = t.student || "Student";
  const sourceColumnLabel = language === "ar" ? "المصدر" : language === "fr" ? "Source" : "Source";
  const periodColumnLabel = t.period || "Period";
  const modeleColumnLabel = language === "ar" ? "النموذج" : language === "fr" ? "Modèle" : "Modele";
  const shareColumnLabel = t.shareLabel || t.share || "Share";
  const amountColumnLabel = t.shareAmount || t.amount || "Amount";
  const statusColumnLabel = t.statusColumn || t.status || "Status";
  const selectedLabel = t.selectedLabel || t.selected || "Selected";
  const createPayoutLabel = t.createPayout || "Create payout";
  const compactLabel = language === "ar" ? "مضغوط" : language === "fr" ? "Compact" : "Compact";
  const comfortableLabel = language === "ar" ? "مريح" : language === "fr" ? "Confortable" : "Comfortable";
  const unpaidStatusLabel = t.statusUnpaid || t.unpaid || "Unpaid";
  const paidStatusLabel = t.statusPaid || t.paid || "Paid";
  const allStatusLabel = t.statusAll || t.all || "All";
  const summaryLabel = language === "ar" ? "الملخص" : language === "fr" ? "Résumé" : "Summary";
  const openEarningsLabel = language === "ar" ? "المستحقات المفتوحة" : language === "fr" ? "Gains ouverts" : "Open earnings";
  const entryLabel = language === "ar" ? "إدخال" : language === "fr" ? "entrée" : "entry";
  const entriesLabel = language === "ar" ? "إدخالات" : language === "fr" ? "entrées" : "entries";
  const rowLabel = language === "ar" ? "سطر" : language === "fr" ? "ligne" : "row";
  const rowsLabel = language === "ar" ? "سطور" : language === "fr" ? "lignes" : "rows";
  const toPayLabel = language === "ar" ? "للدفع" : language === "fr" ? "À payer" : "To pay";

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
  const { error: summaryError } = useQuery({
    queryKey: ["teacherSummary", teacherId, groupId, fromIso, toIso],
    queryFn: () => getTeacherSummary(teacherId, { groupId, from: fromIso, to: toIso }),
    enabled: hasValidTeacherId,
  });

  // DB earnings (always ALL for stable production totals)
  const { data: dbRowsRaw, isFetching: fetchingDB, refetch: refetchDB } = useQuery({
    queryKey: ["teacherEarnings", teacherId, "ALL", groupId, fromIso, toIso],
    queryFn: () => getTeacherEarnings(teacherId, { status: "ALL", groupId, from: fromIso, to: toIso }),
    enabled: hasValidTeacherId,
  });
  const { data: teacherMeta, error: teacherMetaError } = useQuery({
    queryKey: ["teacherMeta", teacherId],
    queryFn: () => getTeacher(teacherId),
    enabled: hasValidTeacherId,
    retry: false,
  });

  // Attendance → fixed virtual rows
  const { data: fixedRowsRaw, isFetching: fetchingFixed, refetch: refetchFixed } = useQuery({
    queryKey: ["teacherFixedAttendance", teacherId, groupId, fromIso, toIso],
    queryFn: () => getTeacherFixedAttendance(teacherId, { groupId, from: fromIso, to: toIso }),
    enabled: hasValidTeacherId,
  });
  const teacherMissing =
    teacherMetaError?.status === 404 ||
    summaryError?.status === 404 ||
    teacherMetaError?.status === 400 ||
    summaryError?.status === 400;

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
    const earned = allRows.reduce((s, r) => s + Number(r.net || 0), 0);
    const paid = allRows.filter(r => r.status === "PAID").reduce((s, r) => s + Number(r.net || 0), 0);
    const unpaid = Math.max(earned - paid, 0);
    const gross = (dbRowsRaw ?? []).reduce((s, r) => s + Number(r.grossAmount || 0), 0);
    return { gross, earned, paid, unpaid };
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
      field: "__select",
      headerName: "",
      width: 58,
      minWidth: 58,
      maxWidth: 58,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      resizable: false,
      headerAlign: "center",
      align: "center",
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
      field: "groupName",
      headerName: groupColumnLabel,
      width: 280,
      minWidth: 200,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => (
        <Tooltip title={p?.value}>
          <Chip size="small" variant="outlined" label={p?.value || ""} sx={{ maxWidth: 260, "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }} />
        </Tooltip>
      ),
    },
    {
      field: "studentName",
      headerName: studentColumnLabel,
      width: 160,
      minWidth: 120,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => p?.value || (p?.row?._kind === "fx" ? "-" : ""),
    },
    {
      field: "paymentType",
      headerName: sourceColumnLabel,
      width: 130,
      minWidth: 110,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => formatPaymentType(p?.value, language) || "-",
    },
    {
      field: "periodKey",
      headerName: periodColumnLabel,
      width: 120,
      minWidth: 100,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => p?.value || "-",
    },
    {
      field: "modele",
      headerName: modeleColumnLabel,
      width: 110,
      minWidth: 90,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => formatModele(p?.value, language) || "",
    },
    {
      field: "share",
      headerName: shareColumnLabel,
      width: 200,
      minWidth: 160,
      headerAlign: "center",
      align: "center",
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <ShareCell
          type={p?.row?.shareType}
          value={p?.row?.shareValue}
          cycleLabel={isFixed(p?.row?.shareType) ? p?.row?.cycleLabel : null}
          units={isFixed(p?.row?.shareType) ? p?.row?.units : null}
          language={language}
        />
      ),
    },
    {
      field: "net",
      headerName: amountColumnLabel,
      width: 115,
      minWidth: 100,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => <Chip size="small" label={moneyFmt.format(Number(p?.value ?? 0))} color="success" />,
    },
    {
      field: "status",
      headerName: statusColumnLabel,
      width: 115,
      minWidth: 100,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => {
        const v = p?.value || "UNPAID";
        const solid = v === "PAID";
        return <Chip size="small" label={formatStatus(v, unpaidStatusLabel, paidStatusLabel, allStatusLabel)} color={solid ? "success" : "default"} variant={solid ? "filled" : "outlined"} />;
      },
    },
  ];

  if (!hasValidTeacherId) {
    return (
      <Box p={2}>
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={() => navigate("/finances/teacher-pay", { replace: true })}>
              {teacherPayTitle}
            </Button>
          }
        >
          {language === "ar"
            ? "رابط الأستاذ غير صالح. افتح الأستاذ مرة أخرى من قائمة دفع الأساتذة."
            : language === "fr"
              ? "Lien enseignant invalide. Ouvrez à nouveau l'enseignant depuis la liste des paiements enseignants."
              : "Invalid teacher route. Open a teacher again from the teacher pay list."}
        </Alert>
      </Box>
    );
  }

  if (teacherMissing) {
    return (
      <Box p={2}>
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={() => navigate("/finances/teacher-pay", { replace: true })}>
              {teacherPayTitle}
            </Button>
          }
        >
          {language === "ar"
            ? "سجل هذا الأستاذ لم يعد متاحًا للمؤسسة الحالية. حدّث قائمة دفع الأساتذة ثم افتح الأستاذ من جديد."
            : language === "fr"
              ? "La fiche de cet enseignant n'est plus disponible pour l'école actuelle. Actualisez la liste des paiements enseignants puis rouvrez l'enseignant."
              : "This teacher record is no longer available for the current school. Refresh the teacher pay list and open the teacher again."}
        </Alert>
      </Box>
    );
  }

  return (
    <Box m={2} pb={{ xs: 2, lg: 14 }}>
      <Box mb={1}>
        <Button
          size="small"
          onClick={() => navigate("/finances/teacher-pay")}
          title={backLabel}
          sx={{ minWidth: "auto", p: 1, color: "inherit" }}
        >
          <ArrowBackIosNewIcon fontSize="small" />
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 700, display: "none" }}>
          Teacher Pay — {teacherMeta?.fullName || `#${teacherId}`}
        </Typography>
        <Box sx={{ width: 112, display: "none" }} />
      </Box>

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Header title={`${teacherPayTitle} - ${teacherMeta?.fullName || `#${teacherId}`}`} />
      </Box>

      {/* Filters */}
      <Grid container spacing={2} mb={2} alignItems="flex-end">
        <Grid item xs={12} md={5} lg={4}>
          <Autocomplete
            size="small"
            fullWidth
            options={groupOptions}
            value={groupValue}
            onChange={(_, v) => setGroupValue(v)}
            inputValue={groupInput}
            onInputChange={onGroupInputChange}
            getOptionLabel={(o) => o?.name ?? ""}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            renderInput={(params) => <TextField {...params} label={groupFilterLabel} InputLabelProps={{ shrink: true }} />}
            clearOnBlur={false}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <TextField
            size="small"
            select
            fullWidth
            label={statusLabel}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            InputLabelProps={{ shrink: true }}
          >
            {[
              ["UNPAID", unpaidStatusLabel],
              ["PAID", paidStatusLabel],
              ["ALL", allStatusLabel],
            ].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <TextField
            size="small"
            select
            fullWidth
            label={viewLabel}
            value={densityMode}
            onChange={(e) => setDensityMode(e.target.value)}
            InputLabelProps={{ shrink: true }}
          >
            <MenuItem value="compact">{compactLabel}</MenuItem>
            <MenuItem value="standard">{comfortableLabel}</MenuItem>
          </TextField>
        </Grid>
        <Grid
          item
          xs={12}
          md={12}
          lg={4}
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 1,
            justifyContent: { lg: "flex-end" },
            alignItems: "stretch",
          }}
        >
          <Button
            variant="outlined"
            fullWidth
            onClick={() => rebuildTeacherEarnings(teacherId, { groupId, from: fromIso, to: toIso })}
            sx={{ borderColor: colors.primary[300], color: "inherit", flex: { sm: "1 1 0", lg: "0 1 auto" } }}
          >
            {rebuildLabel}
          </Button>
          <Button
            variant="contained"
            fullWidth
            onClick={() => { refetchDB(); refetchFixed(); }}
            sx={{
              flex: { sm: "1 1 0", lg: "0 1 auto" },
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
            {searchLabel}
          </Button>
        </Grid>
      </Grid>

      {/* Summary */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" mb={1}>
            {summaryLabel} - {unifiedRows.length} {unifiedRows.length === 1 ? entryLabel : entriesLabel}
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
            <Chip size="small" label={`${grossLabel}: ${moneyFmt.format(totals.gross || 0)}`} color="warning" />
            <Chip size="small" label={`${paidLabel}: ${moneyFmt.format(totals.paid || 0)}`} color="info" />
            <Chip size="small" label={`${remainingLabel}: ${moneyFmt.format(totals.unpaid || 0)}`} color="error" variant="outlined" />
          </Box>
        </CardContent>
      </Card>

      {/* Unified grid */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" mb={1}>
            {openEarningsLabel} - {unifiedRows.length} {unifiedRows.length === 1 ? rowLabel : rowsLabel}
          </Typography>
          <Box
            dir={language === "ar" ? "rtl" : "ltr"}
            sx={{
              width: "100%",
              maxWidth: "100%",
              overflowX: "auto",
              overflowY: "visible",
              WebkitOverflowScrolling: "touch",
              borderRadius: 1,
            }}
          >
            <DataGrid
              autoHeight
              rows={unifiedRows}
              columns={columns}
              loading={loading}
              density={densityMode}
              rowHeight={densityMode === "compact" ? 40 : 52}
              columnHeaderHeight={densityMode === "compact" ? 44 : 52}
              hideFooter
              disableRowSelectionOnClick
              sx={{
                minWidth: TEACHER_PAY_TABLE_MIN_PX,
                border: "none",
                "& .MuiDataGrid-columnHeaders": {
                  backgroundColor: colors.blueAccent[700],
                  borderBottom: "none",
                  textAlign: language === "ar" ? "right" : "left",
                },
                "& .MuiDataGrid-cell": { textAlign: language === "ar" ? "right" : "left" },
                "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
                "& .MuiDataGrid-footerContainer": { borderTop: "none", backgroundColor: colors.blueAccent[400] },
                "& .MuiCheckbox-root.Mui-checked": {
                  color: theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400],
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Footer actions (student-pay style) */}
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
        <Box sx={{ minWidth: 260 }}>
          <Typography variant="h6">
            {selectedLabel}: {sel.size}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {toPayLabel}: {moneyFmt.format(netSelected)}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" justifyContent="flex-end" sx={{ flex: 1 }}>
          <Button
            variant="contained"
            disabled={sel.size === 0 || paying}
            onClick={() => doPayout()}
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
            {createPayoutLabel}
          </Button>
        </Box>
      </Box>

      {payout && <TeacherPayoutDialog payout={payout} onClose={() => setPayout(null)} />}
    </Box>
  );
}
