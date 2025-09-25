// src/scenes/finances/components/TeacherPayoutHistoryDialog.jsx
import { useMemo } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useQuery } from "@tanstack/react-query";
import { listTeacherPayouts } from "../../../api/teacherBilling";
import translations from "../../../translations";
import { tokens } from "../../../theme";


function fmtMoney(n) {
  const v = Number(n ?? 0);
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function TeacherPayoutHistoryDialog({
  open,
  onClose,
  teacherId,
  teacherName,
  language = "fr",
}) {
  const { data, isFetching } = useQuery({
    queryKey: ["teacherPayouts", teacherId],
    queryFn: () => listTeacherPayouts(teacherId),
    enabled: open && !!teacherId,
  });
const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const t = translations[language] || translations["fr"];
  const rows = useMemo(
    () =>
      (data ?? []).map((p) => {
        const d = p.issuedAt ? new Date(p.issuedAt) : null;
        const date = d ? d.toLocaleDateString() : "";
        const time = d
          ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "";
        return {
          id: p.payoutId,
          payoutNo: p.payoutNo,
          date,
          time,
          method: p.method,
          // 👇 normalize to a single "total" field the column will read
          total: Number(p.totalAmount ?? p.total ?? 0),
          groups: (p.items ?? [])
            .map((it) => `${it.groupName ?? t.noGroup} ×${it.lines}`)
            .join(", "),
        };
      }),
    [data, t.noGroup]
    );

  const columns = [
    { field: "payoutNo", headerName: t.payoutNo, width: 170, headerAlign: "center", align: "center" },
    { field: "date", headerName: t.date, width: 130, headerAlign: "center", align: "center" },
    { field: "time", headerName: t.time, width: 110, headerAlign: "center", align: "center" },
    { field: "method", headerName: t.method, width: 110, headerAlign: "center", align: "center" },
    {
      field: "total",
      headerName: t.total,
      width: 120,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => <span>{fmtMoney(params.row.total)}</span>,
      sortable: false,
    },
    { field: "groups", headerName: t.groupsLines, flex: 1, minWidth: 260 },
  ];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
{t.payoutHistory} — {teacherName} 
    </DialogTitle>
      <DialogContent dividers>
<Box height="420"
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
        >          <DataGrid
            rows={rows}
            columns={columns}
            loading={isFetching}
            disableRowSelectionOnClick
            pageSizeOptions={[5, 10]}
            initialState={{
              pagination: { paginationModel: { page: 0, pageSize: 10 } },
            }}
            sx={{
              "& .MuiDataGrid-columnHeader, & .MuiDataGrid-cell": {
                whiteSpace: "nowrap",
              },
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">{t.close}
</Button>
      </DialogActions>
    </Dialog>
  );
}
