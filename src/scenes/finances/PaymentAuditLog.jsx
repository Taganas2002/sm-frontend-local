import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import Header from "../../components/Header";
import { tokens } from "../../theme";
import { getTranslations } from "../../translations";
import { searchAuditLogs } from "../../api/auditLogs";
import { fetchStudentNamesByIds } from "../../api/studentsApi";
import { fetchAccountLabelsByIds } from "../../api/usersApi";

const PAGE_SIZE = 25;

/** Maps UI scope dropdown → API query (only the four views you asked for). */
function scopeToQuery(scopeKey) {
  switch (scopeKey) {
    case "receipts":
      return { action: "BILLING_COLLECT", entityType: "Receipt" };
    case "teacherPayouts":
      return { action: "TEACHER_PAYOUT_CREATE", entityType: "TeacherPayout" };
    case "expenses":
      return { action: "", entityType: "Expense" };
    default:
      return { action: "", entityType: "" };
  }
}

/** @param {string|null|undefined} raw */
function parseMetadata(raw) {
  if (raw == null || String(raw).trim() === "") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return { _parseError: true, _raw: raw };
  }
}

function moneyish(v) {
  if (v == null) return "";
  const n = Number(v);
  if (Number.isFinite(n)) {
    return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }
  return String(v);
}

/**
 * Human-readable one-line summary for the grid (not a full "output" — see dialog).
 * @param {string} action
 * @param {object|null} meta
 * @param {Record<number, string>} [studentNames]
 */
function summarizeRow(action, meta, studentNames) {
  if (!meta || meta._parseError) return "—";
  const parts = [];
  if (meta.studentId != null) {
    const sid = Number(meta.studentId);
    const label = Number.isFinite(sid) && studentNames?.[sid] ? studentNames[sid] : `Student #${meta.studentId}`;
    parts.push(label);
  }
  if (meta.totalAmount != null) parts.push(moneyish(meta.totalAmount));
  if (meta.amount != null && action === "PAYMENT_ALLOCATE") parts.push(`Amt ${moneyish(meta.amount)}`);
  if (meta.method) parts.push(String(meta.method));
  if (meta.teacherId != null) parts.push(`Teacher #${meta.teacherId}`);
  if (meta.earningsCount != null) parts.push(`${meta.earningsCount} earning(s)`);
  if (meta.category) parts.push(String(meta.category));
  if (meta.itemsCount != null) parts.push(`${meta.itemsCount} line(s)`);
  return parts.length ? parts.join(" · ") : "—";
}

/**
 * @param {Record<string, string>} fieldLabels
 * @param {unknown} value
 */
function formatValueForDisplay(key, value, fieldLabels, boolLabels) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") {
    return value ? boolLabels.yes : boolLabels.no;
  }
  if (typeof value === "number" && (key.toLowerCase().includes("amount") || key.toLowerCase().includes("total"))) {
    return moneyish(value);
  }
  if (Array.isArray(value)) {
    return value.length ? JSON.stringify(value) : "[]";
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

export default function PaymentAuditLog({ language = "fr" }) {
  const t = getTranslations(language);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isNarrow = useMediaQuery(theme.breakpoints.down("md"));
  const dir = language === "ar" ? "rtl" : "ltr";

  const actionCatalog = useMemo(
    () => ({
      "": { label: t.auditLog_allActions, short: "—", desc: t.auditLog_allActionsDesc, chip: "default" },
      BILLING_COLLECT: {
        label: t.auditLog_action_billingCollect,
        short: t.auditLog_action_billingCollectShort,
        desc: t.auditLog_action_billingCollectDesc,
        chip: "primary",
      },
      PAYMENT_ALLOCATE: {
        label: t.auditLog_action_paymentAllocate,
        short: t.auditLog_action_paymentAllocateShort,
        desc: t.auditLog_action_paymentAllocateDesc,
        chip: "info",
      },
      TEACHER_PAYOUT_CREATE: {
        label: t.auditLog_action_teacherPayoutCreate,
        short: t.auditLog_action_teacherPayoutCreateShort,
        desc: t.auditLog_action_teacherPayoutCreateDesc,
        chip: "secondary",
      },
      TEACHER_EARN_SESSION_ACCRUE: {
        label: t.auditLog_action_teacherEarnAccrue,
        short: t.auditLog_action_teacherEarnAccrueShort,
        desc: t.auditLog_action_teacherEarnAccrueDesc,
        chip: "warning",
      },
      TEACHER_EARNINGS_REBUILD: {
        label: t.auditLog_action_teacherRebuild,
        short: t.auditLog_action_teacherRebuildShort,
        desc: t.auditLog_action_teacherRebuildDesc,
        chip: "warning",
      },
      TEACHER_FIXED_CYCLES_LOCK: {
        label: t.auditLog_action_teacherFixedLock,
        short: t.auditLog_action_teacherFixedLockShort,
        desc: t.auditLog_action_teacherFixedLockDesc,
        chip: "warning",
      },
      EXPENSE_CREATE: {
        label: t.auditLog_action_expenseCreate,
        short: t.auditLog_action_expenseCreateShort,
        desc: t.auditLog_action_expenseCreateDesc,
        chip: "error",
      },
      EXPENSE_UPDATE: {
        label: t.auditLog_action_expenseUpdate,
        short: t.auditLog_action_expenseUpdateShort,
        desc: t.auditLog_action_expenseUpdateDesc,
        chip: "error",
      },
      EXPENSE_DELETE: {
        label: t.auditLog_action_expenseDelete,
        short: t.auditLog_action_expenseDeleteShort,
        desc: t.auditLog_action_expenseDeleteDesc,
        chip: "error",
      },
    }),
    [t]
  );

  const fieldLabels = useMemo(
    () => ({
      studentId: t.auditLog_meta_studentId,
      totalAmount: t.auditLog_meta_totalAmount,
      method: t.auditLog_meta_method,
      allocateGlobal: t.auditLog_meta_allocateGlobal,
      useWalletFirst: t.auditLog_meta_useWalletFirst,
      idempotencyKey: t.auditLog_meta_idempotencyKey,
      amount: t.auditLog_meta_amount,
      itemsCount: t.auditLog_meta_itemsCount,
      reference: t.auditLog_meta_reference,
      teacherId: t.auditLog_meta_teacherId,
      earningsCount: t.auditLog_meta_earningsCount,
      earningId: t.auditLog_meta_earningId,
      recognizedAt: t.auditLog_meta_recognizedAt,
      shareAmount: t.auditLog_meta_shareAmount,
      shareType: t.auditLog_meta_shareType,
      paymentsScanned: t.auditLog_meta_paymentsScanned,
      earningsCreated: t.auditLog_meta_earningsCreated,
      cyclesRequested: t.auditLog_meta_cyclesRequested,
      earningIds: t.auditLog_meta_earningIds,
      category: t.auditLog_meta_category,
      expenseDate: t.auditLog_meta_expenseDate,
      cashierUserId: t.auditLog_meta_cashierUserId,
    }),
    [t]
  );

  const entityDisplay = useMemo(
    () => ({
      "": t.auditLog_entity_any,
      Receipt: t.auditLog_entity_receipt,
      Student: t.auditLog_entity_student,
      TeacherPayout: t.auditLog_entity_teacherPayout,
      Teacher: t.auditLog_entity_teacher,
      Expense: t.auditLog_entity_expense,
    }),
    [t]
  );

  const [scopeKey, setScopeKey] = useState("all");
  const [page, setPage] = useState(0);
  const [detailRow, setDetailRow] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const { action, entityType } = useMemo(() => scopeToQuery(scopeKey), [scopeKey]);

  const queryParams = useMemo(() => {
    const p = { page, size: PAGE_SIZE };
    if (action) p.action = action;
    if (entityType.trim()) p.entityType = entityType.trim();
    return p;
  }, [action, entityType, page]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["audit-logs", queryParams],
    queryFn: () => searchAuditLogs(queryParams),
  });

  const rows = useMemo(() => {
    const content = data?.content ?? [];
    return content.map((r, i) => ({
      id: r.id ?? i,
      _raw: r,
      createdAt: r.createdAt,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      actorUserId: r.actorUserId,
      metadataJson: r.metadataJson,
    }));
  }, [data]);

  const studentIdsOnPage = useMemo(() => {
    const ids = new Set();
    for (const r of rows) {
      const m = parseMetadata(r.metadataJson);
      if (m?.studentId != null) {
        const n = Number(m.studentId);
        if (Number.isFinite(n)) ids.add(n);
      }
    }
    return [...ids];
  }, [rows]);

  const { data: studentNameMap = {} } = useQuery({
    queryKey: ["audit-log-student-names", studentIdsOnPage.slice().sort((a, b) => a - b).join(",")],
    queryFn: () => fetchStudentNamesByIds(studentIdsOnPage),
    enabled: studentIdsOnPage.length > 0,
    staleTime: 60_000,
  });

  const actorIdsOnPage = useMemo(() => {
    const ids = new Set();
    for (const r of rows) {
      if (r.actorUserId != null) {
        const n = Number(r.actorUserId);
        if (Number.isFinite(n) && n > 0) ids.add(n);
      }
    }
    return [...ids];
  }, [rows]);

  const { data: actorNameMap = {} } = useQuery({
    queryKey: ["audit-log-actor-names", actorIdsOnPage.slice().sort((a, b) => a - b).join(",")],
    queryFn: () => fetchAccountLabelsByIds(actorIdsOnPage),
    enabled: actorIdsOnPage.length > 0,
    staleTime: 60_000,
  });

  const detailStudentIdForName = useMemo(() => {
    if (!detailRow) return null;
    const m = parseMetadata(detailRow.metadataJson);
    if (!m || m._parseError || m.studentId == null) return null;
    const n = Number(m.studentId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [detailRow]);

  const { data: detailStudentNameMap = {} } = useQuery({
    queryKey: ["audit-log-detail-student-name", detailStudentIdForName],
    queryFn: () => fetchStudentNamesByIds([detailStudentIdForName]),
    enabled:
      detailStudentIdForName != null && !studentNameMap[detailStudentIdForName],
    staleTime: 60_000,
  });

  const detailActorIdForName = useMemo(() => {
    if (!detailRow || detailRow.actorUserId == null) return null;
    const n = Number(detailRow.actorUserId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [detailRow]);

  const { data: detailActorNameMap = {} } = useQuery({
    queryKey: ["audit-log-detail-actor-name", detailActorIdForName],
    queryFn: () => fetchAccountLabelsByIds([detailActorIdForName]),
    enabled: detailActorIdForName != null && !actorNameMap[detailActorIdForName],
    staleTime: 60_000,
  });

  const mergedStudentNames = useMemo(
    () => ({ ...studentNameMap, ...detailStudentNameMap }),
    [studentNameMap, detailStudentNameMap]
  );

  const mergedActorNames = useMemo(
    () => ({ ...actorNameMap, ...detailActorNameMap }),
    [actorNameMap, detailActorNameMap]
  );

  const detailActorDisplay = useMemo(() => {
    if (!detailRow || detailRow.actorUserId == null) return null;
    const n = Number(detailRow.actorUserId);
    const idOk = Number.isFinite(n) && n > 0;
    return {
      primary: idOk && mergedActorNames[n] ? mergedActorNames[n] : t.auditLog_userUnknown,
      caption: idOk ? t.auditLog_userIdCaption.replace("%s", String(n)) : String(detailRow.actorUserId),
    };
  }, [detailRow, mergedActorNames, t]);

  const total = data?.total ?? 0;

  const columns = useMemo(
    () => [
      {
        field: "createdAt",
        headerName: t.auditLog_col_when,
        width: isNarrow ? 150 : 185,
        valueGetter: (value) => {
          if (!value) return "";
          try {
            return new Date(value).toLocaleString(undefined, {
              dateStyle: "short",
              timeStyle: "short",
            });
          } catch {
            return String(value);
          }
        },
      },
      {
        field: "action",
        headerName: t.auditLog_col_what,
        flex: 0.9,
        minWidth: 150,
        renderCell: (params) => {
          const code = params.value || "";
          const info = actionCatalog[code] || {
            label: code,
            short: code,
            desc: t.auditLog_unknownAction,
            chip: "default",
          };
          return (
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ py: 0.5 }}>
              <Tooltip title={info.desc}>
                <Chip size="small" label={info.short || info.label} color={info.chip === "default" ? "default" : info.chip} variant={info.chip === "default" ? "outlined" : "filled"} />
              </Tooltip>
            </Stack>
          );
        },
      },
      {
        field: "entitySummary",
        headerName: t.auditLog_col_record,
        flex: 0.95,
        minWidth: 160,
        sortable: false,
        renderCell: (params) => {
          const row = params.row;
          const et = row.entityType;
          const label = et ? entityDisplay[et] || et : "—";
          const eid = row.entityId != null ? `#${row.entityId}` : "";
          return (
            <Stack justifyContent="center" sx={{ minHeight: 52, py: 0.5 }}>
              <Typography variant="body2" lineHeight={1.25}>
                {label}
              </Typography>
              {eid ? (
                <Typography variant="caption" color="text.secondary">
                  {eid}
                </Typography>
              ) : null}
            </Stack>
          );
        },
      },
      {
        field: "actorUserId",
        headerName: t.auditLog_col_user,
        width: isNarrow ? 150 : 200,
        minWidth: 130,
        sortable: true,
        renderCell: (params) => {
          const raw = params.value;
          if (raw == null) {
            return (
              <Typography variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
                —
              </Typography>
            );
          }
          const n = Number(raw);
          const idOk = Number.isFinite(n) && n > 0;
          const label = idOk && mergedActorNames[n] ? mergedActorNames[n] : null;
          const caption = idOk ? t.auditLog_userIdCaption.replace("%s", String(n)) : String(raw);
          return (
            <Stack justifyContent="center" sx={{ minHeight: 52, py: 0.5, overflow: "hidden" }}>
              <Typography variant="body2" lineHeight={1.25} noWrap title={label || caption}>
                {label || t.auditLog_userUnknown}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap title={caption}>
                {caption}
              </Typography>
            </Stack>
          );
        },
      },
      {
        field: "summary",
        headerName: t.auditLog_col_summary,
        flex: 1.25,
        minWidth: 200,
        valueGetter: (_v, row) => summarizeRow(row.action, parseMetadata(row.metadataJson), mergedStudentNames),
      },
      {
        field: "actions",
        headerName: t.auditLog_col_details,
        width: 88,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <IconButton size="small" aria-label={t.auditLog_viewDetails} onClick={() => setDetailRow(params.row._raw)}>
            <VisibilityOutlinedIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    [actionCatalog, entityDisplay, isNarrow, mergedActorNames, mergedStudentNames, t]
  );

  const detailMeta = detailRow ? parseMetadata(detailRow.metadataJson) : null;
  const detailInfo = detailRow?.action ? actionCatalog[detailRow.action] : null;
  const detailEntityLabel = detailRow?.entityType ? entityDisplay[detailRow.entityType] || detailRow.entityType : "—";

  const rootLayoutSx = isNarrow
    ? {
        minHeight: "100%",
        height: "auto",
        display: "block",
        overflow: "visible",
        boxSizing: "border-box",
        px: { xs: 1, sm: 2 },
        py: { xs: 1, sm: 1.5 },
        pb: 3,
        maxWidth: "100%",
      }
    : {
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        px: { xs: 1, sm: 2 },
        py: { xs: 1, sm: 1.5 },
        gap: 1.5,
        maxWidth: "100%",
        overflow: "hidden",
      };

  return (
    <Box dir={dir} sx={rootLayoutSx}>
      <Box sx={{ flexShrink: 0, mb: isNarrow ? 1.5 : 0 }}>
        <Header title={t.auditLog_title} subtitle={t.auditLog_subtitle} />
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 0 }}>
            {t.auditLog_liveFiltersHint}
          </Typography>
          <Button size="small" variant="text" startIcon={<HelpOutlineIcon />} onClick={() => setHelpOpen(true)} sx={{ flexShrink: 0 }}>
            {t.auditLog_howToUse}
          </Button>
        </Stack>
      </Box>

      <Paper
        elevation={0}
        sx={{
          flexShrink: 0,
          mb: isNarrow ? 1.5 : 0,
          p: { xs: 1.5, sm: 2 },
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          background: theme.palette.mode === "light" ? "rgba(255,255,255,0.92)" : colors.primary[400],
        }}
      >
        <FormControl size="small" fullWidth>
          <InputLabel id="audit-view-scope-label">{t.auditLog_filter_whatToShow}</InputLabel>
          <Select
            labelId="audit-view-scope-label"
            label={t.auditLog_filter_whatToShow}
            value={scopeKey}
            onChange={(e) => {
              setPage(0);
              setScopeKey(e.target.value);
            }}
            MenuProps={{ PaperProps: { sx: { maxHeight: "min(70dvh, 400px)" } } }}
          >
            <MenuItem value="all">{t.auditLog_preset_all}</MenuItem>
            <MenuItem value="receipts">{t.auditLog_preset_receipts}</MenuItem>
            <MenuItem value="teacherPayouts">{t.auditLog_preset_teacherPay}</MenuItem>
            <MenuItem value="expenses">{t.auditLog_preset_expenses}</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          flex: isNarrow ? "none" : 1,
          minHeight: isNarrow ? 0 : 0,
          display: "flex",
          flexDirection: "column",
          overflow: isNarrow ? "visible" : "hidden",
          p: { xs: 0.5, sm: 1 },
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          background: theme.palette.mode === "light" ? "rgba(255,255,255,0.92)" : colors.primary[400],
        }}
      >
        <Box sx={{ flex: isNarrow ? "none" : 1, minHeight: isNarrow ? 360 : 280, width: "100%" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={isLoading || isFetching}
            paginationMode="server"
            rowCount={total}
            paginationModel={{ page, pageSize: PAGE_SIZE }}
            onPaginationModelChange={(m) => {
              setPage(m.page);
            }}
            pageSizeOptions={[PAGE_SIZE]}
            disableRowSelectionOnClick
            autoHeight={isNarrow}
            columnVisibilityModel={{
              actorUserId: !isNarrow,
              entitySummary: true,
              summary: true,
            }}
            sx={{
              ...(isNarrow
                ? {
                    minHeight: 360,
                    border: "none",
                  }
                : {
                    height: "100%",
                    border: "none",
                  }),
              width: "100%",
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: colors.blueAccent[700],
                borderBottom: "none",
              },
              "& .MuiDataGrid-footerContainer": {
                borderTop: "none",
                backgroundColor: colors.blueAccent[400],
              },
              "& .MuiDataGrid-cell": {
                alignItems: "center",
              },
              "& .MuiDataGrid-main": {
                overflow: "auto",
              },
            }}
            localeText={{
              noRowsLabel: isError ? t.auditLog_errorLoad : t.auditLog_noRows,
            }}
          />
        </Box>
      </Paper>

      {isError && (
        <Typography color="error" variant="body2" sx={{ flexShrink: 0 }}>
          {error?.message || String(error)}{" "}
          <Button size="small" onClick={() => refetch()}>
            {t.auditLog_retry}
          </Button>
        </Typography>
      )}

      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="sm" fullWidth dir={dir}>
        <DialogTitle>{t.auditLog_helpDialogTitle}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                {t.auditLog_introTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t.auditLog_introBody}
              </Typography>
            </Box>
            <Divider />
            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                {t.auditLog_legend_inputs}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t.auditLog_legend_inputsExpl}
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                {t.auditLog_legend_outputs}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t.auditLog_legend_outputsExpl}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpOpen(false)}>{t.close}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!detailRow} onClose={() => setDetailRow(null)} maxWidth="md" fullWidth dir={dir}>
        <DialogTitle>{t.auditLog_detailTitle}</DialogTitle>
        <DialogContent dividers>
          {detailRow && (
            <Stack spacing={2}>
              <Typography variant="body2">
                <strong>{t.auditLog_col_when}:</strong>{" "}
                {detailRow.createdAt
                  ? new Date(detailRow.createdAt).toLocaleString(undefined, {
                      dateStyle: "full",
                      timeStyle: "medium",
                    })
                  : "—"}
              </Typography>
              <Typography variant="body2">
                <strong>{t.auditLog_detail_event}:</strong> {detailInfo?.label || detailRow.action}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {detailInfo?.desc || ""}
              </Typography>
              <Typography variant="body2">
                <strong>{t.auditLog_col_record}:</strong> {detailEntityLabel}{" "}
                {detailRow.entityId != null ? `#${detailRow.entityId}` : ""}
              </Typography>
              <Box>
                <Typography variant="body2" component="div">
                  <strong>{t.auditLog_col_user}</strong>
                </Typography>
                {detailActorDisplay ? (
                  <Stack spacing={0.25} sx={{ mt: 0.25 }}>
                    <Typography variant="body2">{detailActorDisplay.primary}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {detailActorDisplay.caption}
                    </Typography>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    —
                  </Typography>
                )}
              </Box>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                {t.auditLog_detail_payloadTitle}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {t.auditLog_detail_payloadHint}
              </Typography>
              {!detailMeta && <Typography color="text.secondary">{t.auditLog_noMetadata}</Typography>}
              {detailMeta && detailMeta._parseError && (
                <Paper variant="outlined" sx={{ p: 1, fontFamily: "monospace", fontSize: 12, whiteSpace: "pre-wrap" }}>
                  {detailMeta._raw}
                </Paper>
              )}
              {detailMeta && !detailMeta._parseError && (
                <Stack component="dl" spacing={1} sx={{ m: 0 }}>
                  {Object.entries(detailMeta).map(([key, val]) => (
                    <Box key={key} component="div" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "200px 1fr" }, gap: 1 }}>
                      <Typography component="dt" variant="body2" fontWeight={600} color="text.secondary">
                        {fieldLabels[key] || key}
                      </Typography>
                      <Typography component="dd" variant="body2" sx={{ m: 0, wordBreak: "break-word" }}>
                        {key === "studentId" && Number.isFinite(Number(val)) && mergedStudentNames[Number(val)]
                          ? `${mergedStudentNames[Number(val)]} (#${val})`
                          : formatValueForDisplay(key, val, fieldLabels, { yes: t.yes, no: t.no })}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailRow(null)}>{t.close}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
