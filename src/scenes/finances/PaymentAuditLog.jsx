import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import Header from "../../components/Header";
import { tokens } from "../../theme";
import { getTranslations } from "../../translations";
import { searchAuditLogs } from "../../api/auditLogs";

const PAGE_SIZE = 25;

/** @param {string|null|undefined} raw */
function parseMetadata(raw) {
  if (raw == null || String(raw).trim() === "") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return { _parseError: true, _raw: raw };
  }
}

function startOfDayIso(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T12:00:00");
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** `to` is exclusive on the API — use day after selected end date */
function exclusiveEndIso(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
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
 */
function summarizeRow(action, meta) {
  if (!meta || meta._parseError) return "—";
  const parts = [];
  if (meta.studentId != null) parts.push(`Student #${meta.studentId}`);
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

  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const [detailRow, setDetailRow] = useState(null);

  const queryParams = useMemo(() => {
    const p = { page, size: PAGE_SIZE };
    if (action) p.action = action;
    if (entityType.trim()) p.entityType = entityType.trim();
    const idNum = entityId.trim() ? Number(entityId) : NaN;
    if (Number.isFinite(idNum)) p.entityId = idNum;
    const from = startOfDayIso(fromDate);
    const to = exclusiveEndIso(toDate);
    if (from) p.from = from;
    if (to) p.to = to;
    return p;
  }, [action, entityType, entityId, fromDate, toDate, page]);

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

  const resetFilters = useCallback(() => {
    setAction("");
    setEntityType("");
    setEntityId("");
    setFromDate("");
    setToDate("");
    setPage(0);
  }, []);

  const total = data?.total ?? 0;

  const columns = useMemo(
    () => [
      {
        field: "createdAt",
        headerName: t.auditLog_col_when,
        width: isNarrow ? 160 : 200,
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
        flex: 1,
        minWidth: 200,
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
        flex: 1,
        minWidth: 160,
        valueGetter: (_v, row) => {
          const et = row.entityType ?? "—";
          const eid = row.entityId != null ? `#${row.entityId}` : "";
          return `${et} ${eid}`.trim();
        },
      },
      {
        field: "actorUserId",
        headerName: t.auditLog_col_user,
        width: 110,
        valueFormatter: (value) => (value == null ? "—" : String(value)),
      },
      {
        field: "summary",
        headerName: t.auditLog_col_summary,
        flex: 1,
        minWidth: 200,
        valueGetter: (_v, row) => summarizeRow(row.action, parseMetadata(row.metadataJson)),
      },
      {
        field: "actions",
        headerName: t.auditLog_col_details,
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <IconButton size="small" aria-label={t.auditLog_viewDetails} onClick={() => setDetailRow(params.row._raw)}>
            <VisibilityOutlinedIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    [actionCatalog, isNarrow, t]
  );

  const detailMeta = detailRow ? parseMetadata(detailRow.metadataJson) : null;
  const detailInfo = detailRow?.action ? actionCatalog[detailRow.action] : null;

  return (
    <Box m="20px" dir={dir}>
      <Header title={t.auditLog_title} subtitle={t.auditLog_subtitle} />

      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          background: theme.palette.mode === "light" ? "rgba(255,255,255,0.9)" : colors.primary[400],
        }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 1 }}>
          <InfoOutlinedIcon color="info" sx={{ mt: 0.25 }} />
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>
              {t.auditLog_introTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t.auditLog_introBody}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Alert severity="info" sx={{ mb: 2 }} variant="outlined">
        <Typography variant="body2" component="span">
          <strong>{t.auditLog_legend_inputs}</strong> {t.auditLog_legend_inputsExpl}
        </Typography>
        <Typography variant="body2" component="div" sx={{ mt: 1 }}>
          <strong>{t.auditLog_legend_outputs}</strong> {t.auditLog_legend_outputsExpl}
        </Typography>
      </Alert>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ mb: 2 }}
        flexWrap="wrap"
        useFlexGap
      >
        <FormControl size="small" sx={{ minWidth: 280 }}>
          <InputLabel id="audit-action-label">{t.auditLog_filter_eventType}</InputLabel>
          <Select
            labelId="audit-action-label"
            value={action}
            label={t.auditLog_filter_eventType}
            onChange={(e) => {
              setPage(0);
              setAction(e.target.value);
            }}
          >
            {Object.keys(actionCatalog).map((key) => (
              <MenuItem key={key === "" ? "all" : key} value={key}>
                {actionCatalog[key].label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          label={t.auditLog_filter_entityType}
          placeholder="Receipt, Student, …"
          value={entityType}
          onChange={(e) => {
            setPage(0);
            setEntityType(e.target.value);
          }}
          sx={{ minWidth: 160 }}
        />
        <TextField
          size="small"
          label={t.auditLog_filter_entityId}
          type="number"
          value={entityId}
          onChange={(e) => {
            setPage(0);
            setEntityId(e.target.value);
          }}
          sx={{ width: 120 }}
        />
        <TextField
          size="small"
          type="date"
          label={t.auditLog_filter_from}
          InputLabelProps={{ shrink: true }}
          value={fromDate}
          onChange={(e) => {
            setPage(0);
            setFromDate(e.target.value);
          }}
          sx={{ minWidth: 160 }}
        />
        <TextField
          size="small"
          type="date"
          label={t.auditLog_filter_to}
          InputLabelProps={{ shrink: true }}
          value={toDate}
          onChange={(e) => {
            setPage(0);
            setToDate(e.target.value);
          }}
          sx={{ minWidth: 160 }}
        />
        <Button variant="outlined" onClick={resetFilters}>
          {t.auditLog_reset}
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        {t.auditLog_quickPresets}
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Chip
          size="small"
          label={t.auditLog_preset_receipts}
          onClick={() => {
            setPage(0);
            setAction("BILLING_COLLECT");
          }}
          variant={action === "BILLING_COLLECT" ? "filled" : "outlined"}
          color="primary"
        />
        <Chip
          size="small"
          label={t.auditLog_preset_allocate}
          onClick={() => {
            setPage(0);
            setAction("PAYMENT_ALLOCATE");
          }}
          variant={action === "PAYMENT_ALLOCATE" ? "filled" : "outlined"}
          color="info"
        />
        <Chip
          size="small"
          label={t.auditLog_preset_teacherPay}
          onClick={() => {
            setPage(0);
            setAction("TEACHER_PAYOUT_CREATE");
          }}
          variant={action === "TEACHER_PAYOUT_CREATE" ? "filled" : "outlined"}
          color="secondary"
        />
        <Chip
          size="small"
          label={t.auditLog_preset_expenses}
          onClick={() => {
            setPage(0);
            setAction("EXPENSE_CREATE");
          }}
          variant={action === "EXPENSE_CREATE" ? "filled" : "outlined"}
          color="error"
        />
        <Chip
          size="small"
          label={t.auditLog_preset_all}
          onClick={() => {
            setPage(0);
            setAction("");
          }}
          variant={action === "" ? "filled" : "outlined"}
        />
      </Stack>

      <Box
        height="62vh"
        sx={{
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: colors.blueAccent[700],
            borderBottom: "none",
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: "none",
            backgroundColor: colors.blueAccent[400],
          },
        }}
      >
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
          localeText={{
            noRowsLabel: isError ? t.auditLog_errorLoad : t.auditLog_noRows,
          }}
        />
      </Box>

      {isError && (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {error?.message || String(error)}
          <Button size="small" onClick={() => refetch()}>
            {t.auditLog_retry}
          </Button>
        </Typography>
      )}

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
                <strong>{t.auditLog_col_record}:</strong> {detailRow.entityType}{" "}
                {detailRow.entityId != null ? `#${detailRow.entityId}` : ""}
              </Typography>
              <Typography variant="body2">
                <strong>{t.auditLog_col_user}:</strong>{" "}
                {detailRow.actorUserId != null ? `#${detailRow.actorUserId}` : "—"}
              </Typography>
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
                        {formatValueForDisplay(key, val, fieldLabels, { yes: t.yes, no: t.no })}
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
