// src/scenes/finances/TeacherPayList.jsx
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Button, Chip, Paper, Stack, TextField, Typography, useTheme } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import HistoryIcon from "@mui/icons-material/History";
import PaymentIcon from "@mui/icons-material/Payment";
import { tokens } from "../../theme";

import { searchTeachers } from "../../api/teachersApi";
import TeacherPayoutHistoryDialog from "./components/TeacherPayoutHistoryDialog";

const teacherActionButtonSx = (theme, variant = "primary") => {
  const palettes = {
    primary: {
      light: {
        border: "#1d4ed8",
        color: "#ffffff",
        background: "#2563eb",
        hover: "#1d4ed8",
      },
      dark: {
        border: "#60a5fa",
        color: "#f8fafc",
        background: "#2563eb",
        hover: "#3b82f6",
      },
    },
    neutral: {
      light: {
        border: "#64748b",
        color: "#334155",
        background: "#ffffff",
        hover: "#f8fafc",
      },
      dark: {
        border: "#cbd5e1",
        color: "#f8fafc",
        background: "rgba(30, 41, 59, 0.85)",
        hover: "rgba(51, 65, 85, 0.95)",
      },
    },
  };
  const tone = theme.palette.mode === "light" ? palettes[variant].light : palettes[variant].dark;

  return {
    textTransform: "none",
    borderRadius: 2,
    fontWeight: 700,
    minWidth: 96,
    borderColor: tone.border,
    color: tone.color,
    backgroundColor: tone.background,
    boxShadow: theme.palette.mode === "light" ? "0 2px 8px rgba(15, 23, 42, 0.08)" : "none",
    "& .MuiButton-startIcon svg": {
      color: tone.color,
    },
    "&:hover": {
      borderColor: tone.border,
      backgroundColor: tone.hover,
    },
  };
};

export default function TeacherPayList({ language }) {
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sort] = useState("fullName,asc");
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // history dialog state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTeacher, setHistoryTeacher] = useState({ id: null, name: "" });

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["teacherList", q, page, size, sort],
    queryFn: () => searchTeachers({ search: q, page, size, sort }),
    keepPreviousData: true,
  });

  const rows = useMemo(
    () =>
      (data?.content ?? []).map((t) => ({
        id: t.id,
        fullName: t.fullName,
        phone: t.phone,
        email: t.email,
      })),
    [data]
  );

  const openHistory = (row) => {
    setHistoryTeacher({ id: row.id, name: row.fullName || `#${row.id}` });
    setHistoryOpen(true);
  };

  const columns = [
    {
      field: "fullName",
      headerName: "Teacher",
      flex: 1.2,
      minWidth: 200,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "phone",
      headerName: "Phone",
      width: 160,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1,
      minWidth: 220,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 240,
      headerAlign: "center",
      align: "center",
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Stack direction="row" gap={1}>
          <Button
            size="small"
            variant="contained"
            startIcon={<PaymentIcon />}
            onClick={() => navigate(`/finances/teacher-pay/${p.row.id}`)}
            sx={teacherActionButtonSx(theme, "primary")}
          >
            Pay
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={() => openHistory(p.row)}
            sx={teacherActionButtonSx(theme, "neutral")}
          >
            History
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <Box p={2}>
      <Typography variant="h4" mb={2}>Teacher Pay</Typography>

      <Box display="flex" gap={1} mb={1.5} flexWrap="wrap">
        <TextField
          label="Search (name/phone/email)"
          size="small"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (setPage(0), refetch())}
          sx={{ minWidth: 320 }}
        />
        <Button
          variant="contained"
          onClick={() => {
            setPage(0);
            refetch();
          }}
        >
          Search
        </Button>
        <Chip label={`Teachers: ${data?.totalElements ?? 0}`} variant="outlined" />
      </Box>

      <Paper elevation={0} sx={{ border: `1px solid ${colors.primary[300]}`, borderRadius: 2, overflow: "hidden" }}>
      <Box
            height="clamp(420px, calc(100dvh - 280px), 760px)"
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
          loading={isFetching}
          paginationMode="server"
          rowCount={data?.totalElements ?? 0}
          paginationModel={{ page, pageSize: size }}
          onPaginationModelChange={(m) => {
            setPage(m.page);
            setSize(m.pageSize);
          }}
          pageSizeOptions={[10, 20, 50]}
          disableRowSelectionOnClick
        />
      </Box>
      </Paper>

      {/* history dialog */}
      {historyOpen && historyTeacher.id != null && (
        <TeacherPayoutHistoryDialog
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          teacherId={historyTeacher.id}
          teacherName={historyTeacher.name}
          language={language}
        />
      )}
    </Box>
  );
}

