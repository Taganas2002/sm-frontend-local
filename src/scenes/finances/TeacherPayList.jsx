// src/scenes/finances/TeacherPayList.jsx
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Button, TextField, Typography ,useTheme} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import HistoryIcon from "@mui/icons-material/History";
import PaymentIcon from "@mui/icons-material/Payment";
import { tokens } from "../../theme";

import { listTeachers } from "../../api/teachers";
import TeacherPayoutHistoryDialog from "./components/TeacherPayoutHistoryDialog";

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
      width: 220,
      headerAlign: "center",
      align: "center",
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Box display="flex" gap={1}>
          <Button
            size="small"
            variant="contained"
            startIcon={<PaymentIcon />}
            onClick={() => navigate(`/finances/teacher-pay/${p.row.id}`)}
          >
            Pay
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={() => openHistory(p.row)}
          >
            History
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box p={2}>
      <Typography variant="h4" mb={2}>
        Teacher Pay
      </Typography>

      <Box display="flex" gap={1} mb={1}>
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
      </Box>

<Box
            height="80vh"
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
