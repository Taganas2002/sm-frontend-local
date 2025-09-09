// src/scenes/finances/StudentPayment.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  unpaidMonthlyGroups,
  studentReceipts,
  collectPayment,
} from "../../api/billing";
import ReceiptDialog from "./components/ReceiptDialog";

const yyyymm = () => new Date().toISOString().slice(0, 7);
const money = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// handy nullish coalesce over a list
const firstDefined = (...vals) => {
  for (const v of vals) if (v !== undefined && v !== null) return v;
  return undefined;
};

export default function StudentPayment() {
  const { studentId: studentIdStr } = useParams();
  const studentId = Number(studentIdStr);
  const navigate = useNavigate();
  const qs = new URLSearchParams(useLocation().search);
  const initialPeriod = qs.get("period") || yyyymm();

  const [period, setPeriod] = useState(initialPeriod);
  const [selected, setSelected] = useState({}); // { [groupId]: true }
  const cashierUserId = 1; // TODO: wire to current user id

  // --- Load dues
  const { data: dues, isFetching: loadingDues, refetch } = useQuery({
    queryKey: ["unpaidMonthly", studentId, period],
    queryFn: () => unpaidMonthlyGroups(studentId, period),
    enabled: !!studentId,
  });

  // Cache receipts (elsewhere)
  useQuery({
    queryKey: ["studentReceipts", studentId],
    queryFn: () => studentReceipts(studentId),
    enabled: !!studentId,
  });

  const [receipt, setReceipt] = useState(null);

  // --- Normalize rows from either API shape
  const rows = useMemo(() => {
    const list = Array.isArray(dues?.groups) ? dues.groups : [];
    return list.map((g) => {
      const c = g.currentCycle || {};

      const held = Number(firstDefined(c.held, g.held, 0)) || 0;
      const required = Number(
        firstDefined(c.required, g.required, g.sessionsPerCycle, c.chargeableSessions, 0)
      ) || 0;

      const due = Number(firstDefined(c.due, g.amountDue, g.due, 0)) || 0;
      const paid = Number(firstDefined(c.paid, g.amountPaid, g.paid, 0)) || 0;
      const balance = Number(firstDefined(c.balance, g.balance, due - paid)) || 0;

      const periodLabel = String(firstDefined(c.periodLabel, dues?.period, period) || period);
      const status = String(firstDefined(c.status, g.status, "UNPAID"));

      return {
        id: g.groupId,
        groupId: g.groupId,
        groupName: g.groupName || "(no group)",
        periodLabel,
        held,
        required,
        due,
        paid,
        balance,
        status,
      };
    });
  }, [dues, period]);

  // --- Items to pay (only positive balances)
  const payItems = useMemo(
    () =>
      rows
        .filter((r) => selected[r.groupId] && r.balance > 0)
        .map((r) => ({
          groupId: r.groupId,
          model: "MONTHLY",
          period: r.periodLabel,
          amount: Number(r.balance.toFixed(2)),
        })),
    [rows, selected]
  );

  const total = useMemo(
    () => payItems.reduce((s, i) => s + (i.amount || 0), 0),
    [payItems]
  );

  // --- Pay & Print
  const { mutate: doCollect, isLoading: paying } = useMutation({
    mutationFn: () =>
      collectPayment(
        {
          studentId,
          method: "CASH",
          reference: `FrontDesk-${Date.now()}`,
          items: payItems,
        },
        cashierUserId
      ),
    onSuccess: (rec) => {
      setReceipt(rec);
      setSelected({});
      refetch();
    },
    onError: (e) => alert(e?.message || "Payment failed"),
  });

  useEffect(() => {
    setSelected({});
  }, [period]);

  // --- Columns
  const columns = [
    {
      field: "groupName",
      headerName: "Group",
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
      headerName: "Period",
      width: 120,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "progress",
      headerName: "Progress",
      width: 130,
      headerAlign: "center",
      align: "center",
      valueGetter: (params) => {
        const held = params?.row?.held ?? 0;
        const req = params?.row?.required ?? 0;
        return `${held}/${req}`;
      },
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
      headerName: "Due",
      width: 120,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => (
        <Chip size="small" label={money.format(p?.value || 0)} color="warning" />
      ),
    },
    {
      field: "paid",
      headerName: "Paid",
      width: 120,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => (
        <Chip size="small" label={money.format(p?.value || 0)} color="info" />
      ),
    },
    {
      field: "balance",
      headerName: "Balance",
      width: 130,
      headerAlign: "center",
      align: "center",
      renderCell: (p) => {
        const v = Number(p?.value || 0);
        const color = v <= 0 ? "success" : "error";
        return <Chip size="small" label={money.format(v)} color={color} />;
      },
    },
    {
      field: "status",
      headerName: "Status",
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
      headerName: "Pay",
      width: 140,
      headerAlign: "center",
      align: "center",
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const gid = params?.row?.groupId;
        const checked = !!selected[gid];
        const disabled = (params?.row?.balance ?? 0) <= 0; // enable only when balance > 0
        return (
          <Button
            size="small"
            variant={checked ? "contained" : "outlined"}
            disabled={disabled}
            onClick={() => gid && setSelected((s) => ({ ...s, [gid]: !s[gid] }))}
          >
            {checked ? "Selected" : "Select"}
          </Button>
        );
      },
    },
  ];

  return (
    <Box p={2}>
      <Button variant="text" onClick={() => navigate(-1)}>
        &larr; Back
      </Button>
      <Typography variant="h4" mt={1} mb={2}>
        Pay — {dues?.studentFullName || `Student #${studentId}`}
      </Typography>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} sm={3}>
          <TextField
            label="Period (YYYY-MM)"
            value={period}
            fullWidth
            onChange={(e) => setPeriod(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={9} display="flex" alignItems="center" gap={1}>
          <Button variant="outlined" onClick={() => refetch()} disabled={loadingDues}>
            Refresh dues
          </Button>
          <Button variant="outlined" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </Grid>
      </Grid>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" mb={1}>
            Unpaid Monthly Groups
          </Typography>
          <div style={{ height: 360, width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              hideFooter
              loading={loadingDues}
              disableRowSelectionOnClick
              sx={{
                "& .MuiDataGrid-cell, & .MuiDataGrid-columnHeader": {
                  justifyContent: "center",
                },
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Total: {money.format(total)}</Typography>
        <Button
          variant="contained"
          disabled={paying || payItems.length === 0}
          onClick={() => doCollect()}
        >
          Pay & Print
        </Button>
      </Box>

      {receipt && <ReceiptDialog receipt={receipt} onClose={() => setReceipt(null)} />}
    </Box>
  );
}
