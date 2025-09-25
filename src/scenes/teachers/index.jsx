import { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, useTheme, TextField, InputAdornment, IconButton,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

import Header from "../../components/Header";
import { tokens } from "../../theme";
import translations from "../../translations";
import { searchTeachers, deleteTeacher } from "../../api/teachersApi";
import TeacherDialog from "./TeacherDialog";

const Teachers = ({ language }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = translations[language] || translations["fr"];

  // filters + paging
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [rowCount, setRowCount] = useState(0);

  // data + dialogs
  const [deleteError, setDeleteError] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // debounce search (400ms)
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchText.trim()), 400);
    return () => clearTimeout(h);
  }, [searchText]);

  // load page
  const loadTeachers = async () => {
    try {
      const res = await searchTeachers({ search: debouncedSearch, page, size: pageSize });
      const content = Array.isArray(res) ? res : (res?.content || []);
      const total = res?.totalElements ?? content.length;
      const rows = content.map((row) => ({
        id: row.id,
        fullName: row.fullName || "",
        phone: row.phone || "",
        email: row.email || "",
      }));
      setTeachers(rows);
      setRowCount(total);
    } catch (err) {
      console.error("Failed to load teachers", err);
    }
  };

  // reload when filters/paging change
  useEffect(() => {
    loadTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page, pageSize]);

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setOpen(true);
  };
  const handleOpen = () => {
    setEditingTeacher(null);
    setOpen(true);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setDeleteId(null);
    setDeleteError("");
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteTeacher(deleteId);
      // after delete, reload current page
      await loadTeachers();
      setDeleteError("");
      setDeleteDialogOpen(false);
      setDeleteId(null);
    } catch (err) {
      let message =
        err.response?.data?.message ||
        err.message ||
        "Delete failed. Please try again later.";

      if (message.includes("Cannot delete or update a parent row")) {
        message =
          language === "ar"
            ? "لا يمكن حذف هذا الأستاذ لأنه مازال مرتبطًا بفصل دراسي."
            : "Impossible de supprimer cet enseignant car il est encore affecté à une classe.";
      }
      setDeleteError(message);
    }
  };

  const columns = useMemo(() => ([
    { field: "id", headerName: "ID", width: 80 },
    { field: "fullName", headerName: t.fullName || "Nom complet", flex: 1, minWidth: 200 },
    { field: "phone", headerName: t.phone || "Téléphone", width: 160 },
    { field: "email", headerName: t.email || "Email", width: 220 },
    {
      field: "actions",
      headerName: t.actions || "Actions",
      width: 180,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box display="flex" gap={1} mt={1}>
          <Button
            onClick={() => handleEdit(params.row)}
            variant="contained"
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
            startIcon={<EditIcon />}
          />
          <Button
            onClick={() => {
              setDeleteId(params.row.id);
              setDeleteDialogOpen(true);
            }}
            variant="contained"
            size="small"
            sx={{
              ml: 1,
              backgroundColor: theme.palette.error.main,
              color: "#fff",
              "&:hover": {
                backgroundColor: theme.palette.error.dark,
              },
            }}
            startIcon={<DeleteIcon />}
          />
        </Box>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [t, theme.palette.mode, colors.blueAccent]);

  return (
    <Box m="20px">
      <Header
        title={t.teachers || "Enseignants"}
        subtitle={t.dataManagement || "Gestion des données"}
      />

      {/* Top bar: Search + Add */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2}>
        <TextField
          size="small"
          value={searchText}
          onChange={(e) => { setPage(0); setSearchText(e.target.value); }}
          placeholder={t.searchTeachers || "Search (name / phone / email)"}
          sx={{ width: 360 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchText ? (
              <InputAdornment position="end">
                <IconButton
                  aria-label="clear"
                  onClick={() => { setSearchText(""); setPage(0); }}
                  edge="end"
                  size="small"
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        <Button
          variant="contained"
          sx={{
            backgroundColor:
              theme.palette.mode === "light"
                ? colors.blueAccent[800]
                : colors.blueAccent[400],
            color: "#fff",
            "& .MuiButton-startIcon": {
              marginInlineEnd: language === "ar" ? "8px" : "6px",
            },
            "&:hover": {
              backgroundColor:
                theme.palette.mode === "light"
                  ? colors.blueAccent[400]
                  : colors.blueAccent[800],
            },
          }}
          startIcon={<AddIcon />}
          onClick={handleOpen}
        >
          {t.addTeacher || "AJOUTER ENSEIGNANT"}
        </Button>
      </Box>

      {/* DataGrid */}
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
          rows={teachers}
          columns={columns}
          getRowId={(row) => row.id}
          pagination
          paginationMode="server"
          rowCount={rowCount}
          page={page}
          onPageChange={(newPage) => setPage(newPage)}
          pageSize={pageSize}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
          checkboxSelection
          disableSelectionOnClick
        />
      </Box>

      {/* Add/Edit Dialog */}
      <TeacherDialog
        open={open}
        onClose={() => setOpen(false)}
        language={language}
        onSaved={loadTeachers}
        teacher={editingTeacher}
        reloadTeachers={loadTeachers}
      />

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: "#1e3a8a",
            color: "#fff",
            textAlign: "center",
            borderRadius: 2,
            p: 2,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: "bold", fontSize: "1.5rem", mb: 1 }}>
          {t.confirmDeleteTitle || "Are you sure?"}
        </DialogTitle>
        <DialogContent>
          {deleteError ? (
            <Typography sx={{ color: "yellow", fontWeight: "bold" }}>
              {deleteError}
            </Typography>
          ) : (
            <Typography>
              {t.confirmDeleteMessage || "Do you want to delete this teacher?"}
            </Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: "center", gap: 2 }}>
          <Button
            onClick={handleCancelDelete}
            variant="outlined"
            sx={{
              borderColor: "#fff",
              color: "#fff",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" },
            }}
          >
            {t.cancel || "No"}
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            disabled={!!deleteError}
            sx={{
              backgroundColor: "#fff",
              color: "#1e3a8a",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.8)" },
            }}
          >
            {t.confirm || "Yes, Delete it!"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Teachers;
