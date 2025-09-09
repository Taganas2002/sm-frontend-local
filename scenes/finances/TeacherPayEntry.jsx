// src/scenes/finances/TeacherPayEntry.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  Grid,
  TextField,
  Typography,
  useTheme
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import api from "../../api/client";
import TeacherPayoutHistoryDialog from "./components/TeacherPayoutHistoryDialog";
import Header from "../../components/Header";
  import { tokens } from "../../theme";
  import translations from "../../translations";

/** Fetch teachers (paged) */
async function fetchTeachers({ q = "", page = 0, size = 10 }) {
  const params = { page, size, sort: "fullName,asc" };
  // if backend supports search param use it, harmless if ignored
  if (q) params.search = q;
  const { data } = await api.get("/api/teachers", { params });
  return data; // Spring Page {content,totalElements,...}
}

export default function TeacherPayEntry({ language }){
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const t = translations[language] || translations["fr"];
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["teachers", q, page, size],
    queryFn: () => fetchTeachers({ q, page, size }),
    keepPreviousData: true,
  });

  // History dialog state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTeacher, setHistoryTeacher] = useState({ id: null, name: "" });

  const openHistory = (row) => {
    setHistoryTeacher({ id: row.id, name: row.fullName || row.name || `#${row.id}` });
    setHistoryOpen(true);
  };

  const columns = useMemo(
    () => [
      {
        field: "fullName",
        headerName: "Teacher",
        flex: 1,
        valueGetter: (p) => p.row.fullName ?? p.row.name ?? "",
      },
      { field: "phone", headerName: "Phone", width: 160 },
      { field: "email", headerName: "Email", flex: 1 },
      {
        field: "actions",
        headerName: "Actions",
        width: 180,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Box display="flex" gap={1}>
            <Button
              size="small"
              variant="contained"
              onClick={() => navigate(`/finances/teacher-pay/${params.row.id}`)}
            >
              Pay
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => openHistory(params.row)}
            >
              History
            </Button>
          </Box>
        ),
      },
    ],
    [navigate]
  );

  const rows = (data?.content ?? []).map((t) => ({
    id: t.id,
    fullName: t.fullName,
    phone: t.phone,
    email: t.email,
  }));

  return (
      <Box m="20px">
        <Header
            title={t.teacherPay || "Teacher Pay"}
        />

      <Grid container spacing={2} alignItems="center" mb={1}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
          label={t.searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm="auto">
          <Button
  variant="contained"
  onClick={() => {
    setPage(0);
    refetch();
  }}
  sx={{
    borderRadius: "30px",
    px: 3,
    py: 1,
    textTransform: "none",
    fontWeight: "bold",
    color: "#fff !important",   // ✅ Always white text
    background: "linear-gradient(135deg, #6a11cb, #2575fc)",
    boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
    "&:hover": {
      background: "linear-gradient(135deg, #2575fc, #6a11cb)",
      boxShadow: "0 6px 14px rgba(0,0,0,0.3)",
    },
  }}
>
  {t.searchButton}
</Button>
        </Grid>
      </Grid>

      <Box height="80vh"
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
            }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isFetching}
          paginationMode="server"
          rowCount={data?.totalElements ?? 0}
          pageSizeOptions={[10, 20, 50]}
          paginationModel={{ page, pageSize: size }}
          onPaginationModelChange={(m) => {
            setPage(m.page);
            setSize(m.pageSize);
          }}
        />
      </Box>

      {/* History dialog */}
      {historyOpen && historyTeacher.id != null && (
        <TeacherPayoutHistoryDialog
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          teacherId={historyTeacher.id}
          teacherName={historyTeacher.name}
        />
      )}
    </Box>
  );
}
