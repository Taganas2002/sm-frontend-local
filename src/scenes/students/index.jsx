// src/scenes/students/Students.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  useTheme, TextField, InputAdornment, IconButton, MenuItem, CircularProgress
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import PrintIcon from "@mui/icons-material/Print";
import CloseIcon from "@mui/icons-material/Close";
import { QRCodeCanvas } from "qrcode.react";

import Header from "../../components/Header";
import { tokens } from "../../theme";
import translations from "../../translations";

import { searchStudents, deleteStudent } from "../../api/studentsApi";
import { listLevels } from "../../api/levelsApi";
import { listSections } from "../../api/sectionsApi";

import StudentDialog from "./StudentDialog";

const normalizeList = (list = []) => (list || []).map((x) => ({ ...x, id: Number(x.id) }));

/* ----------------------------- Card Modal (frontend only) ----------------------------- */
const StudentCardModal = ({ open, onClose, student, levels, language }) => {
  const theme = useTheme();
  const t = translations[language] || translations["fr"];

  const cardRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [levelName, setLevelName] = useState("");
  const [sectionName, setSectionName] = useState("");

  // Resolve level/section display names from the row;
  // if sectionName is missing, we fetch sections for the student's level to find it.
  useEffect(() => {
    if (!open || !student) return;

    (async () => {
      setLoading(true);
      try {
        // level
        const ln =
          student.levelName ||
          (levels || []).find((l) => Number(l.id) === Number(student.levelId))?.name ||
          "";
        setLevelName(ln);

        // section (prefer row, otherwise fetch for its level)
        if (student.sectionName) {
          setSectionName(student.sectionName);
        } else if (student.levelId && student.sectionId) {
          const secs = normalizeList(await listSections(student.levelId));
          const sec = secs.find((s) => Number(s.id) === Number(student.sectionId));
          setSectionName(sec?.name || "");
        } else {
          setSectionName("");
        }
      } catch {
        setLevelName(student.levelName || "");
        setSectionName(student.sectionName || "");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, student, levels]);

  const handlePrint = () => {
    if (!cardRef.current) return;
    const win = window.open("", "_blank", "width=900,height=600");
    if (!win) return;
    const html = `
      <html>
      <head>
        <title></title>
        <style>
          @page { margin: 12mm; }
          body { font-family: Arial, Helvetica, sans-serif; }
        </style>
      </head>
      <body>${cardRef.current.outerHTML}</body>
      </html>`;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.onload = () => win.print();
  };

  const line = (levelName || sectionName)
    ? `${levelName}${sectionName ? " - " + sectionName : ""}`
    : "";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {t.studentCard || "Student Card"}
      </DialogTitle>
      <DialogContent dividers>
        {loading || !student ? (
          <Box display="flex" alignItems="center" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <Box
            ref={cardRef}
            id="printable-student-card"
            sx={{
              width: 540,
              mx: "auto",
              p: 2.5,
              borderRadius: "16px",
              background: "#133C86",   // outer frame
              boxShadow: 6,
            }}
          >
            <Box
              sx={{
                background: "#fff",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <Box sx={{ background: "#EAEFFC", px: 2, py: 1 }}>
                <Typography variant="subtitle1" sx={{ color: "#103A8C", fontWeight: 700 }}>
                  {t.studentId || "Student ID"}
                </Typography>
              </Box>

              {/* Body */}
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, p: 2 }}>
                {/* Left: Photo + text */}
                <Box sx={{ display: "grid", gridTemplateRows: "auto auto auto", gap: 1 }}>
                  {/* Photo */}
                  <Box
                    sx={{
                      width: 170,
                      height: 170,
                      border: "2px solid #d0d6e6",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      background: "#fafbff",
                    }}
                  >
                    {student.photoUrl ? (
                      // eslint-disable-next-line
                      <img
                        src={student.photoUrl}
                        alt="avatar"
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <Typography sx={{ color: "#8590a7" }}>
                        {t.noPhoto || "No Photo"}
                      </Typography>
                    )}
                  </Box>

                  {/* Name */}
                  <Typography sx={{ fontWeight: 700, fontSize: 18 }}>
                    {student.fullName || ""}
                  </Typography>

                  {/* Level - Section */}
                  <Typography sx={{ color: "#4c5568" }}>
                    {line}
                  </Typography>
                </Box>

                {/* Right: QR (value = student id only) */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <QRCodeCanvas value={student.id ? String(student.id) : ""} size={180} includeMargin />
                </Box>
              </Box>

              {/* Footer */}
              <Box sx={{ px: 2, pb: 2 }}>
                <Typography variant="caption" sx={{ color: "#6c7893" }}>
                  {t.scanQrHint || "Scan QR to get student ID"}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} startIcon={<CloseIcon />}>
          {t.close || "Close"}
        </Button>
        <Button onClick={handlePrint} variant="contained" startIcon={<PrintIcon />}>
          {t.print || "Print"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
/* --------------------------- End Card Modal --------------------------- */

const Students = ({ language }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = translations[language] || translations["fr"];

  // filters
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");

  // paging
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [rowCount, setRowCount] = useState(0);

  // data
  const [students, setStudents] = useState([]);
  const [levels, setLevels] = useState([]);
  const [sections, setSections] = useState([]);

  // dialogs
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  // card modal
  const [cardOpen, setCardOpen] = useState(false);
  const [cardStudent, setCardStudent] = useState(null);

  // load levels once
  useEffect(() => {
    (async () => {
      try {
        const levelsData = normalizeList(await listLevels());
        setLevels(levelsData);
      } catch (e) {
        console.error("Failed to load levels", e);
      }
    })();
  }, []);

  // when level filter changes, refresh sections
  useEffect(() => {
    (async () => {
      if (!levelFilter) {
        setSections([]);
        setSectionFilter("");
        return;
      }
      try {
        const secs = normalizeList(await listSections(levelFilter));
        setSections(secs);
        setSectionFilter("");
      } catch (e) {
        console.error("Failed to load sections", e);
        setSections([]);
        setSectionFilter("");
      }
    })();
  }, [levelFilter]);

  // debounce search
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchText.trim()), 400);
    return () => clearTimeout(h);
  }, [searchText]);

  const loadStudents = async () => {
    try {
      const res = await searchStudents({
        search: debouncedSearch,
        levelId: levelFilter || null,
        sectionId: sectionFilter || null,
        gender: genderFilter || null,
        page,
        size: pageSize,
        sort: "fullName,asc",
      });
      const content = res?.content || [];
      const total = res?.totalElements ?? content.length;

      // Enrich rows with level/section names for quick use in the card
      const enriched = content.map((s) => ({
        ...s,
        id: Number(s.id),
        levelName: levels.find((l) => Number(l.id) === Number(s.levelId))?.name || "",
        sectionName: sections.find((sec) => Number(sec.id) === Number(s.sectionId))?.name || "",
      }));
      setStudents(enriched);
      setRowCount(total);
    } catch (err) {
      console.error("Failed to load students", err);
    }
  };

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, levelFilter, sectionFilter, genderFilter, page, pageSize, levels, sections]);

  const handleEdit = (student) => {
    setEditingStudent(student);
    setStudentDialogOpen(true);
  };
  const handleOpenAdd = () => {
    setEditingStudent(null);
    setStudentDialogOpen(true);
  };

  const handleOpenDelete = (studentId) => {
    setStudentToDelete(studentId);
    setDeleteDialogOpen(true);
  };
  const handleConfirmDelete = async () => {
    try {
      await deleteStudent(studentToDelete);
      await loadStudents();
      setDeleteError("");
      setDeleteDialogOpen(false);
      setStudentToDelete(null);
    } catch (err) {
      let message =
        err.response?.data?.message ||
        err.message ||
        "Delete failed. Please try again later.";
      if (message.includes("Cannot delete or update a parent row")) {
        message =
          language === "ar"
            ? "لا يمكن حذف هذا التلميذ لأنه مازال مسجلاً في فصل دراسي."
            : "Impossible de supprimer cet élève car il est encore inscrit à une classe.";
      }
      setDeleteError(message);
    }
  };
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setStudentToDelete(null);
  };

  const openCard = (row) => {
    setCardStudent(row);   // pass the whole student row (has fullName, ids, etc.)
    setCardOpen(true);
  };

  const columns = useMemo(
    () => [
      { field: "id", headerName: "ID", width: 70 },
      { field: "fullName", headerName: t.fullName, flex: 1, minWidth: 200 },
      { field: "dob", headerName: t.dob, width: 120 },
      { field: "gender", headerName: t.gender, width: 100 },
      { field: "phone", headerName: t.phone, width: 150 },
      { field: "guardianName", headerName: t.guardianName, width: 180 },
      { field: "levelName", headerName: t.levels, width: 160, flex: 1 },
      { field: "sectionName", headerName: t.sections, width: 160, flex: 1 },
      {
        field: "actions",
        headerName: t.actions,
        width: 260,
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
              onClick={() => handleOpenDelete(params.row.id)}
              variant="contained"
              size="small"
              sx={{
                ml: 1,
                backgroundColor: theme.palette.error.main,
                color: "#fff",
                "&:hover": { backgroundColor: theme.palette.error.dark },
              }}
              startIcon={<DeleteIcon />}
            />
            <Button
              onClick={() => openCard(params.row)}     // pass whole row
              variant="contained"
              size="small"
              sx={{
                ml: 1,
                backgroundColor: colors.blueAccent[700],
                color: "#fff",
                "&:hover": { backgroundColor: colors.blueAccent[500] },
                whiteSpace: "nowrap",
              }}
              startIcon={<QrCode2Icon />}
            >
              {t.studentCard || ""}
            </Button>
          </Box>
        ),
      },
    ],
    [t, theme.palette.mode, colors.blueAccent]
  );

  return (
    <Box m="20px">
      <Header title={t.studentsTitle} subtitle={t.studentsSubtitle} />

      {/* Filters bar */}
      <Box
        display="grid"
        gridTemplateColumns="1fr repeat(3, 220px) auto"
        gap={2}
        alignItems="center"
        mb={2}
      >
        {/* Search */}
        <TextField
          size="small"
          value={searchText}
          onChange={(e) => {
            setPage(0);
            setSearchText(e.target.value);
          }}
          placeholder={t.searchStudents || "Search (name/phone/guardian)"}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchText ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => {
                    setSearchText("");
                    setPage(0);
                  }}
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        {/* Level filter */}
        <TextField
          select
          size="small"
          label={t.levels}
          value={levelFilter}
          onChange={(e) => {
            setLevelFilter(e.target.value ? Number(e.target.value) : "");
            setPage(0);
          }}
        >
          <MenuItem value="">{t.allLevels || "All levels"}</MenuItem>
          {levels.map((lvl) => (
            <MenuItem key={lvl.id} value={lvl.id}>
              {lvl.name}
            </MenuItem>
          ))}
        </TextField>

        {/* Section filter */}
        <TextField
          select
          size="small"
          label={t.sections}
          value={sectionFilter}
          disabled={!levelFilter}
          onChange={(e) => {
            setSectionFilter(e.target.value ? Number(e.target.value) : "");
            setPage(0);
          }}
        >
          <MenuItem value="">{t.allSections || "All sections"}</MenuItem>
          {sections.map((sec) => (
            <MenuItem key={sec.id} value={sec.id}>
              {sec.name}
            </MenuItem>
          ))}
        </TextField>

        {/* Gender filter */}
        <TextField
          select
          size="small"
          label={t.gender}
          value={genderFilter}
          onChange={(e) => {
            setGenderFilter(e.target.value);
            setPage(0);
          }}
        >
          <MenuItem value="">{t.all || "All"}</MenuItem>
          <MenuItem value="M">{t.male || "Male"}</MenuItem>
          <MenuItem value="F">{t.female || "Female"}</MenuItem>
        </TextField>

        {/* Add button */}
        <Box textAlign="right">
          <Button
            variant="contained"
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
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
          >
            {t.addStudent || "Add Student"}
          </Button>
        </Box>
      </Box>

      {/* Grid */}
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
          "& .MuiDataGrid-cell": { textAlign: language === "ar" ? "right" : "left" },
          "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
          "& .MuiDataGrid-footerContainer": { borderTop: "none", backgroundColor: colors.blueAccent[400] },
          "& .MuiCheckbox-root.Mui-checked": {
            color: theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400],
          },
        }}
      >
        <DataGrid
          rows={students}
          columns={columns}
          getRowId={(row) => row.id}
          pagination
          paginationMode="server"
          rowCount={rowCount}
          page={page}
          onPageChange={(newPage) => setPage(newPage)}
          pageSize={pageSize}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50]}
          checkboxSelection
          disableSelectionOnClick
        />
      </Box>

      {/* Create / Edit Dialog */}
      <StudentDialog
        open={studentDialogOpen}
        onClose={() => setStudentDialogOpen(false)}
        language={language}
        student={editingStudent}
        reloadStudents={loadStudents}
      />

      {/* Delete dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: "#1e3a8a", color: "#fff", textAlign: "center", borderRadius: 2, p: 2 },
        }}
      >
        <DialogTitle sx={{ fontWeight: "bold", fontSize: "1.5rem", mb: 1 }}>
          {t.confirmDeleteTitle || "Are you sure?"}
        </DialogTitle>
        <DialogContent>
          {deleteError ? (
            <Typography sx={{ color: "yellow", fontWeight: "bold" }}>{deleteError}</Typography>
          ) : (
            <Typography>{t.confirmDeleteMessageStudent || "Do you want to delete this student?"}</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2 }}>
          <Button
            onClick={handleCancelDelete}
            variant="outlined"
            sx={{ borderColor: "#fff", color: "#fff", "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" } }}
          >
            {t.cancel || "No"}
          </Button>
          <Button
            onClick={handleConfirmDelete}
            disabled={!!deleteError}
            variant="contained"
            sx={{ backgroundColor: "#fff", color: "#1e3a8a", "&:hover": { backgroundColor: "rgba(255,255,255,0.8)" } }}
          >
            {t.confirm || "Yes, Delete it!"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Student Card modal (frontend) */}
      <StudentCardModal
        open={cardOpen}
        onClose={() => setCardOpen(false)}
        student={cardStudent}     // ✅ pass whole student row
        levels={levels}
        language={language}
      />
    </Box>
  );
};

export default Students;
