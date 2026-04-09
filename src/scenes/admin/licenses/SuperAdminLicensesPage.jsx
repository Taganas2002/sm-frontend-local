import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import Header from "../../../components/Header";
import { tokens } from "../../../theme";
import {
  activateLicensePlan,
  deactivateLicensePlan,
  listSchoolLicenses,
  searchLicenseTarget,
} from "../../../api/adminLicenseApi";

const planOptions = [
  { label: "30 days (1 month)", value: 30 },
  { label: "90 days (3 months)", value: 90 },
  { label: "365 days (1 year)", value: 365 }
];

function statusLabel(state) {
  switch (state) {
    case "OK":
      return "Active";
    case "TRIAL":
      return "Trial";
    case "EXPIRED":
      return "Expired";
    case "INVALID":
      return "Invalid";
    default:
      return state || "—";
  }
}

function daysLeftLabel(license) {
  if (!license?.state) return "—";
  if (license.state === "TRIAL") {
    return license.daysLeft != null ? String(license.daysLeft) : "—";
  }
  if (license.state === "OK") {
    return "Paid";
  }
  if (license.state === "EXPIRED") {
    return license.daysLeft != null ? String(license.daysLeft) : "0";
  }
  return "—";
}

export default function SuperAdminLicensesPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [planDays, setPlanDays] = useState(30);
  const [result, setResult] = useState(null);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchDebounced, setSearchDebounced] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);

  const stats = useMemo(() => {
    const active = schools.filter((s) => s.license?.state === "OK").length;
    const trial = schools.filter((s) => s.license?.state === "TRIAL").length;
    const expired = schools.filter((s) => s.license?.state === "EXPIRED").length;
    return { active, trial, expired, total: schools.length };
  }, [schools]);

  const refreshList = async () => {
    if (unauthorized) return;
    try {
      const rows = await listSchoolLicenses(schoolSearch);
      setUnauthorized(false);
      setSchools(rows || []);
      if (selectedSchool?.schoolId) {
        const latest = (rows || []).find((r) => r.schoolId === selectedSchool.schoolId);
        if (latest) setSelectedSchool(latest);
      }
    } catch (e) {
      if (e?.status === 401) {
        setUnauthorized(true);
        setToast({ severity: "error", msg: "Session expired. Please login again." });
        navigate("/super-admin/login", { replace: true });
        return;
      }
      setToast({ severity: "error", msg: e?.message || "Failed to load schools list." });
    }
  };

  const applySchoolSelection = (school) => {
    setSelectedSchool(school || null);
    if (!school) return;
    setPhone(school.adminPhone || "");
    setEmail(school.adminEmail || "");
    setResult({
      schoolId: school.schoolId,
      schoolName: school.schoolName,
      username: school.adminName || "-",
      phone: school.adminPhone || "-",
      email: school.adminEmail || "-",
      status: school.license || null,
    });
  };

  const onSearch = async () => {
    setLoading(true);
    try {
      const data = await searchLicenseTarget({ phone, email });
      setResult(data);
      setToast({ severity: "success", msg: "Account found." });
      refreshList();
    } catch (e) {
      if (e?.status === 401) {
        setUnauthorized(true);
        setToast({ severity: "error", msg: "Session expired. Please login again." });
        navigate("/super-admin/login", { replace: true });
        return;
      }
      setResult(null);
      setToast({ severity: "error", msg: e?.message || "Search failed." });
    } finally {
      setLoading(false);
    }
  };

  const onActivate = async () => {
    setLoading(true);
    try {
      const data = await activateLicensePlan({ phone, email, planDays: Number(planDays) });
      setResult((prev) => ({ ...(prev || {}), status: data.status, schoolId: data.schoolId, schoolName: data.schoolName }));
      setToast({ severity: "success", msg: "Plan activated/extended successfully." });
      refreshList();
    } catch (e) {
      if (e?.status === 401) {
        setUnauthorized(true);
        setToast({ severity: "error", msg: "Session expired. Please login again." });
        navigate("/super-admin/login", { replace: true });
        return;
      }
      setToast({ severity: "error", msg: e?.message || "Activation failed." });
    } finally {
      setLoading(false);
    }
  };

  const onDeactivate = async () => {
    setLoading(true);
    try {
      const data = await deactivateLicensePlan({ phone, email });
      setResult((prev) => ({ ...(prev || {}), status: data.status, schoolId: data.schoolId, schoolName: data.schoolName }));
      setToast({ severity: "success", msg: "License deactivated." });
      refreshList();
    } catch (e) {
      if (e?.status === 401) {
        setUnauthorized(true);
        setToast({ severity: "error", msg: "Session expired. Please login again." });
        navigate("/super-admin/login", { replace: true });
        return;
      }
      setToast({ severity: "error", msg: e?.message || "Deactivation failed." });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const h = setTimeout(() => setSearchDebounced(schoolSearch.trim()), 350);
    return () => clearTimeout(h);
  }, [schoolSearch]);

  React.useEffect(() => {
    if (unauthorized) return;
    const load = async () => {
      try {
        const rows = await listSchoolLicenses(searchDebounced);
        setUnauthorized(false);
        setSchools(rows || []);
      } catch (e) {
        if (e?.status === 401) {
          setUnauthorized(true);
          setToast({ severity: "error", msg: "Session expired. Please login again." });
          navigate("/super-admin/login", { replace: true });
        }
      }
    };
    load();
  }, [searchDebounced, navigate, unauthorized]);

  React.useEffect(() => {
    if (unauthorized) return;
    const id = setInterval(() => {
      refreshList();
    }, 12000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDebounced, unauthorized]);

  const gridRows = useMemo(
    () =>
      schools.map((row) => ({
        id: row.schoolId,
        schoolName: row.schoolName,
        adminContact: `${row.adminPhone || "-"} / ${row.adminEmail || "-"}`,
        status: row.license?.state || "UNKNOWN",
        daysLeft: daysLeftLabel(row.license),
        raw: row,
      })),
    [schools]
  );

  const gridColumns = useMemo(
    () => [
      { field: "schoolName", headerName: "School", flex: 1, minWidth: 210 },
      { field: "adminContact", headerName: "Admin Contact", flex: 1, minWidth: 260 },
      {
        field: "status",
        headerName: "Status",
        width: 160,
        renderCell: (params) => {
          const code = params.value;
          const color =
            code === "OK" ? "success" : code === "TRIAL" ? "info" : code === "EXPIRED" ? "error" : "warning";
          return <Chip label={statusLabel(code)} color={color} size="small" variant="outlined" sx={{ fontWeight: 600 }} />;
        },
      },
      {
        field: "daysLeft",
        headerName: "Trial / paid",
        width: 130,
        renderCell: (params) => (
          <Typography variant="body2" color={colors.grey[100]}>
            {params.value}
          </Typography>
        ),
      },
    ],
    [theme.palette.mode]
  );

  return (
    <Box m="20px">
      <Header
        title="Super Admin Licenses"
        subtitle="Select a school, activate/deactivate plans, and monitor licenses."
      />

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={3}>
          <Card sx={{ backgroundColor: colors.primary[400], borderRadius: 3 }}>
            <CardContent>
              <Typography color={colors.grey[300]}>Created Schools</Typography>
              <Typography variant="h3" color={colors.grey[100]}>{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ backgroundColor: colors.primary[400], borderRadius: 3 }}>
            <CardContent>
              <Typography color={colors.grey[300]}>Active</Typography>
              <Typography variant="h3" color={colors.greenAccent[400]}>{stats.active}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ backgroundColor: colors.primary[400], borderRadius: 3 }}>
            <CardContent>
              <Typography color={colors.grey[300]}>Trial</Typography>
              <Typography variant="h3" color={colors.blueAccent[300]}>{stats.trial}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ backgroundColor: colors.primary[400], borderRadius: 3 }}>
            <CardContent>
              <Typography color={colors.grey[300]}>Expired</Typography>
              <Typography variant="h3" color={colors.redAccent[300]}>{stats.expired}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, borderRadius: 3, mb: 3, backgroundColor: colors.primary[400] }}>
        <Typography variant="h6" mb={2}>School License Actions</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Autocomplete
              options={schools}
              value={selectedSchool}
              onChange={(_, value) => applySchoolSelection(value)}
              getOptionLabel={(option) => `${option.schoolName || "Unknown"} (#${option.schoolId})`}
              renderInput={(params) => <TextField {...params} label="Select Created School" fullWidth />}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0555..." fullWidth />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@school.com" fullWidth />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField select label="Plan" value={planDays} onChange={(e) => setPlanDays(Number(e.target.value))} fullWidth>
              {planOptions.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
            </TextField>
          </Grid>
        </Grid>
        <Stack direction="row" spacing={1.5} mt={2} flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            onClick={onSearch}
            disabled={loading}
            sx={{
              borderColor: colors.blueAccent[400],
              color: colors.grey[100],
              "&:hover": { borderColor: colors.blueAccent[200], bgcolor: `${colors.blueAccent[900]}55` },
            }}
          >
            Search
          </Button>
          <Button
            variant="contained"
            onClick={onActivate}
            disabled={loading}
            sx={{
              bgcolor: theme.palette.mode === "dark" ? colors.blueAccent[500] : colors.blueAccent[700],
              color: "#fff",
              "&:hover": { bgcolor: theme.palette.mode === "dark" ? colors.blueAccent[400] : colors.blueAccent[800] },
            }}
          >
            Activate / Extend
          </Button>
          <Button color="error" variant="contained" onClick={onDeactivate} disabled={loading}>
            Deactivate
          </Button>
        </Stack>
        {result && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <div><strong>School:</strong> {result.schoolName} (ID: {result.schoolId})</div>
            <div><strong>User:</strong> {result.username} | {result.phone} | {result.email}</div>
            <div><strong>Status:</strong> {result.status?.state} {result.status?.daysLeft != null ? `| daysLeft: ${result.status.daysLeft}` : ""}</div>
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 2, borderRadius: 3, backgroundColor: colors.primary[400] }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} mb={2}>
          <TextField
            label="Search schools by name"
            value={schoolSearch}
            onChange={(e) => setSchoolSearch(e.target.value)}
            fullWidth
          />
          <Button variant="outlined" onClick={refreshList}>Refresh</Button>
        </Stack>
        <Box
          height="52vh"
          sx={{
            "& .MuiDataGrid-root": { border: "none", bgcolor: colors.primary[400] },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: colors.blueAccent[800],
              borderBottom: `1px solid ${colors.primary[300]}`,
            },
            "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 700, color: colors.grey[100] },
            "& .MuiDataGrid-cell": { color: colors.grey[100], borderColor: `${colors.primary[300]}88` },
            "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
            "& .MuiDataGrid-footerContainer": {
              borderTop: `1px solid ${colors.primary[300]}`,
              backgroundColor: colors.primary[400],
            },
            "& .MuiDataGrid-iconSeparator": { color: colors.grey[500] },
            "& .super-admin-selected-row": {
              backgroundColor: `${colors.blueAccent[800]}55`,
              outline: `2px solid ${colors.blueAccent[400]}`,
              outlineOffset: "-2px",
            },
          }}
        >
          <DataGrid
            rows={gridRows}
            columns={gridColumns}
            getRowId={(row) => row.id}
            pagination
            paginationMode="client"
            pageSizeOptions={[10, 20, 50]}
            initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
            onRowClick={(params) => applySchoolSelection(params.row.raw)}
            disableRowSelectionOnClick
            hideFooterSelectedRowCount
            getRowClassName={(params) =>
              selectedSchool?.schoolId === params.id ? "super-admin-selected-row" : ""
            }
            slotProps={{
              basePagination: {
                sx: {
                  color: colors.grey[200],
                  bgcolor: colors.primary[400],
                  "& .MuiTablePagination-toolbar": {
                    minHeight: "48px !important",
                    px: 2,
                    bgcolor: colors.primary[400],
                  },
                  "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                    color: colors.grey[300],
                    fontSize: "0.8125rem",
                  },
                  "& .MuiIconButton-root": { color: colors.grey[200] },
                  "& .MuiSvgIcon-root": { color: colors.grey[300] },
                  "& .MuiInputBase-root": {
                    color: colors.grey[100],
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: `${colors.grey[500]}` },
                  },
                  "& .MuiSelect-select": { color: colors.grey[100] },
                },
              },
            }}
          />
        </Box>
      </Paper>

      <Snackbar open={!!toast} autoHideDuration={2500} onClose={() => setToast(null)}>
        {toast ? <Alert severity={toast.severity}>{toast.msg}</Alert> : <span />}
      </Snackbar>
    </Box>
  );
}
