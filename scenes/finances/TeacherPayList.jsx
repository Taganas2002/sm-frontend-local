// src/scenes/finances/TeacherPayList.jsx
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Button, TextField, Typography,useTheme } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import HistoryIcon from "@mui/icons-material/History";
import PaymentIcon from "@mui/icons-material/Payment";
  import Header from "../../components/Header";
  import { tokens } from "../../theme";
  import translations from "../../translations";

import { listTeachers } from "../../api/teachersApi";
import TeacherPayoutHistoryDialog from "./components/TeacherPayoutHistoryDialog";

export default function TeacherPayList({ language }){
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const t = translations[language] || translations["fr"];
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sort] = useState("fullName,asc");

  // history dialog state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTeacher, setHistoryTeacher] = useState({ id: null, name: "" });

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["teacherList", q, page, size, sort],
    queryFn: () => listTeachers({ q, page, size, sort }),
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
      headerName: t.teacherColumn,
      flex: 1.2,
      minWidth: 200,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "phone",
      headerName: t.phoneColumn,
      width: 160,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "email",
      headerName: t.emailColumn,
      flex: 1,
      minWidth: 220,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "actions",
      headerName: t.actionsColumn,
      width: 220,
      headerAlign: "center",
      align: "center",
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Box display="flex" gap={1}>
          <Button
            size="small"
            sx={{
                backgroundColor:
                    theme.palette.mode === "light"
                    ? colors.blueAccent[800]
                    : colors.blueAccent[400],
                color: "#fff",
                "&:hover": {
                    backgroundColor:
                    theme.palette.mode === "light"
                        ? colors.blueAccent[400]
                        : colors.blueAccent[800],
                },
                }}
            variant="contained"
            startIcon={<PaymentIcon />}
            onClick={() => navigate(`/finances/teacher-pay/${p.row.id}`)}
          >
            {t.payButton}
          </Button>
          <Button
            size="small"
            sx={{
                backgroundColor:
                    theme.palette.mode === "light"
                    ? colors.blueAccent[800]
                    : colors.blueAccent[400],
                color: "#fff",
                "&:hover": {
                    backgroundColor:
                    theme.palette.mode === "light"
                        ? colors.blueAccent[400]
                        : colors.blueAccent[800],
                },
                }}
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={() => openHistory(p.row)}
          >
            {t.historyButton}
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box m="20px">
        <Header
            title={t.teacherPay || "Teacher Pay"}
        />

      <Box display="flex" gap={1} mb={1}>
        <TextField
          label={t.searchPlaceholder}
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

      </Box>

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
          paginationModel={{ page, pageSize: size }}
          onPaginationModelChange={(m) => {
            setPage(m.page);
            setSize(m.pageSize);
          }}
          pageSizeOptions={[10, 20, 50]}
          disableRowSelectionOnClick
          sx={{
            "& .MuiDataGrid-cell, & .MuiDataGrid-columnHeader": {
              justifyContent: "center",
            },
          }}
        />
      </Box>

      {/* history dialog */}
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
