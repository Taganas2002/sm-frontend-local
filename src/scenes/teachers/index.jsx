import { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, useTheme, TextField, InputAdornment, IconButton,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

import Header from "../../components/Header";
import { tokens } from "../../theme";
import { getTranslations } from "../../translations";
import { searchTeachers, deleteTeacher } from "../../api/teachersApi";
import TeacherDialog from "./TeacherDialog";
import TeacherImportDialog from "./TeacherImportDialog";

const Teachers = ({ language }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = getTranslations(language);

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [rowCount, setRowCount] = useState(0);
  const [deleteError, setDeleteError] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchText.trim()), 400);
    return () => clearTimeout(h);
  }, [searchText]);

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

  useEffect(() => {
    loadTeachers();
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
      await loadTeachers();
      setDeleteError("");
      setDeleteDialogOpen(false);
      setDeleteId(null);
    } catch (err) {
      let message =
        err.response?.data?.message ||
        err.message ||
        t.deleteFailed ||
        "Delete failed. Please try again later.";

      if (message.includes("Cannot delete or update a parent row")) {
        message = t.teacherDeleteBlocked || message;
      }
      setDeleteError(message);
    }
  };

  const columns = useMemo(() => ([
    { field: "fullName", headerName: t.fullName || "Full name", flex: 1, minWidth: 200 },
    { field: "phone", headerName: t.phone || "Phone", width: 160 },
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
  ]), [t, theme.palette.mode, colors.blueAccent]);

  return (
    <Box
      p="20px"
      sx={{
        height: "calc(100dvh - 110px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Header title={t.teachers || "Teachers"} subtitle={t.dataManagement || "Data management"} />

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2} flexWrap="wrap">
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

        <Box display="flex" gap={1} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => setImportOpen(true)}
            sx={{
              borderColor: theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400],
              color: theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400],
              fontWeight: 600,
            }}
          >
            {t.importTeachers || "Import Excel"}
          </Button>
          <Button
            data-testid="teachers-add"
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
            {t.addTeacher || "Add teacher"}
          </Button>
        </Box>
      </Box>

      <Box
        dir={language === "ar" ? "rtl" : "ltr"}
        sx={{
          flex: 1,
          minHeight: 0,
          "& .MuiDataGrid-root": { border: "none", height: "100%" },
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

      <TeacherDialog
        open={open}
        onClose={() => setOpen(false)}
        language={language}
        onSaved={loadTeachers}
        teacher={editingTeacher}
        reloadTeachers={loadTeachers}
      />

      <TeacherImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        language={language}
        onImported={loadTeachers}
      />

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
            {t.confirm || "Yes, delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Teachers;



