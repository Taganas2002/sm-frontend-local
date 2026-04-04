import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  useTheme, TextField, InputAdornment, IconButton, MenuItem, CircularProgress, Tooltip
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
import { getTranslations } from "../../translations";

import { searchStudents, deleteStudent } from "../../api/studentsApi";
import { listLevels } from "../../api/levelsApi";
import { listSections } from "../../api/sectionsApi";

import StudentDialog from "./StudentDialog";

const normalizeList = (list = []) => (list || []).map((x) => ({ ...x, id: Number(x.id) }));

const StudentCardModal = ({ open, onClose, student, levels, language }) => {
  const t = getTranslations(language);
  const cardRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [levelName, setLevelName] = useState("");
  const [sectionName, setSectionName] = useState("");

  useEffect(() => {
    if (!open || !student) return;

    (async () => {
      setLoading(true);
      try {
        const ln =
          student.levelName ||
          (levels || []).find((l) => Number(l.id) === Number(student.levelId))?.name ||
          "";
        setLevelName(ln);

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
    if (!cardRef.current || !student) return;

    const qrCanvas = cardRef.current.querySelector("canvas");
    const qrDataUrl = qrCanvas ? qrCanvas.toDataURL("image/png") : "";
    const name = (student.fullName || "").trim();
    const levelSection = (levelName || "") + (sectionName ? ` - ${sectionName}` : "");
    const mm = (px) => (px * 85.6) / 540;

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Card</title>
  <style>
    @page { size: 85.6mm 54mm; margin: 0; }
    html, body {
      margin: 0; padding: 0; background: #fff;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .frame {
      width: 85.6mm; height: 54mm;
      padding: ${mm(20)}mm;
      background: #133C86;
      border-radius: ${mm(16)}mm;
      display: flex; align-items: stretch; justify-content: stretch;
    }
    .inner {
      background: #fff;
      border-radius: ${mm(12)}mm;
      overflow: hidden;
      display: flex; flex-direction: column; width: 100%;
    }
    .header { background: #EAEFFC; padding: ${mm(8)}mm ${mm(16)}mm; }
    .title  { margin: 0; color: #103A8C; font-weight: 700; font-size: 4mm; }
    .body { display: flex; gap: ${mm(16)}mm; padding: ${mm(16)}mm; align-items: flex-start; }
    .left { display: flex; flex-direction: column; gap: ${mm(8)}mm; min-width: 0; }
    .photoBox {
      width: ${mm(170)}mm; height: ${mm(170)}mm;
      border: ${mm(2)}mm solid #d0d6e6; border-radius: ${mm(6)}mm;
      background: #fafbff;
      display: flex; align-items: center; justify-content: center; overflow: hidden;
    }
    .avatar { max-width: 100%; max-height: 100%; object-fit: cover; }
    .name { margin: 0; font-weight: 700; font-size: 4.2mm; color: #1a2233; }
    .lvl  { margin: 0; color: #4c5568; font-size: 3.2mm; }
    .qrCol { flex: 1; display: flex; align-items: center; justify-content: center; }
    .qr    { width: ${mm(180)}mm; height: ${mm(180)}mm; }
    .footer { padding: 0 ${mm(16)}mm ${mm(16)}mm; color: #6c7893; font-size: 2.6mm; }
  </style>
</head>
<body>
  <div class="frame">
    <div class="inner">
      <div class="header"><p class="title">${t.studentId || "Student ID"}</p></div>
      <div class="body">
        <div class="left">
          <div class="photoBox">
            ${student.photoUrl ? `<img class="avatar" src="${student.photoUrl}" alt="avatar"/>` : `<span style="color:#8590a7;font-size:3.2mm">${t.noPhoto || "No photo"}</span>`}
          </div>
          <p class="name">${name}</p>
          <p class="lvl">${levelSection}</p>
        </div>
        <div class="qrCol">
          ${qrDataUrl ? `<img class="qr" src="${qrDataUrl}" alt="QR" />` : ""}
        </div>
      </div>
      <div class="footer">${t.scanQrHint || "Scan the QR code to get the student ID"}</div>
    </div>
  </div>
  <script>window.onload = function(){ window.print(); };</script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
  };

  const line = (levelName || sectionName) ? `${levelName}${sectionName ? " - " + sectionName : ""}` : "";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {t.studentCard || "Student card"}
      </DialogTitle>
      <DialogContent dividers>
        {loading || !student ? (
          <Box display="flex" alignItems="center" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <Box ref={cardRef} id="printable-student-card" sx={{ width: 540, mx: "auto", p: 2.5, borderRadius: "16px", background: "#133C86", boxShadow: 6 }}>
            <Box sx={{ background: "#fff", borderRadius: "12px", overflow: "hidden" }}>
              <Box sx={{ background: "#EAEFFC", px: 2, py: 1 }}>
                <Typography variant="subtitle1" sx={{ color: "#103A8C", fontWeight: 700 }}>
                  {t.studentId || "Student ID"}
                </Typography>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, p: 2 }}>
                <Box sx={{ display: "grid", gridTemplateRows: "auto auto auto", gap: 1 }}>
                  <Box sx={{ width: 170, height: 170, border: "2px solid #d0d6e6", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "#fafbff" }}>
                    {student.photoUrl ? (
                      <img src={student.photoUrl} alt="avatar" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "cover" }} />
                    ) : (
                      <Typography sx={{ color: "#8590a7" }}>{t.noPhoto || "No photo"}</Typography>
                    )}
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 18, color: "#1a2233", mt: 0.5 }}>{(student.fullName || "").trim()}</Typography>
                  <Typography sx={{ color: "#4c5568" }}>{line}</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <QRCodeCanvas value={student.id ? String(student.id) : ""} size={180} includeMargin />
                </Box>
              </Box>
              <Box sx={{ px: 2, pb: 2 }}>
                <Typography variant="caption" sx={{ color: "#6c7893" }}>{t.scanQrHint || "Scan the QR code to get the student ID"}</Typography>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} startIcon={<CloseIcon />}>{t.close || "Close"}</Button>
        <Button onClick={handlePrint} variant="contained" startIcon={<PrintIcon />}>{t.print || "Print"}</Button>
      </DialogActions>
    </Dialog>
  );
};

const Students = ({ language }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = getTranslations(language);

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [rowCount, setRowCount] = useState(0);
  const [students, setStudents] = useState([]);
  const [levels, setLevels] = useState([]);
  const [sections, setSections] = useState([]);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [cardOpen, setCardOpen] = useState(false);
  const [cardStudent, setCardStudent] = useState(null);

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

  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchText.trim()), 400);
    return () => clearTimeout(h);
  }, [searchText]);

  const loadStudents = async () => {
    try {
      const res = await searchStudents({ search: debouncedSearch, levelId: levelFilter || null, sectionId: sectionFilter || null, gender: genderFilter || null, page, size: pageSize, sort: "fullName,asc" });
      const content = res?.content || [];
      const total = res?.totalElements ?? content.length;
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
  }, [debouncedSearch, levelFilter, sectionFilter, genderFilter, page, pageSize, levels, sections]);

  const handleEdit = (student) => { setEditingStudent(student); setStudentDialogOpen(true); };
  const handleOpenAdd = () => { setEditingStudent(null); setStudentDialogOpen(true); };
  const handleOpenDelete = (studentId) => { setStudentToDelete(studentId); setDeleteDialogOpen(true); };
  const handleConfirmDelete = async () => {
    try {
      await deleteStudent(studentToDelete);
      await loadStudents();
      setDeleteError("");
      setDeleteDialogOpen(false);
      setStudentToDelete(null);
    } catch (err) {
      let message = err.response?.data?.message || err.message || t.deleteFailed || "Delete failed. Please try again later.";
      if (message.includes("Cannot delete or update a parent row")) {
        message = t.studentDeleteBlocked || message;
      }
      setDeleteError(message);
    }
  };
  const handleCancelDelete = () => { setDeleteDialogOpen(false); setStudentToDelete(null); setDeleteError(""); };
  const openCard = (row) => { setCardStudent(row); setCardOpen(true); };

  const columns = useMemo(() => [
    { field: "id", headerName: "ID", width: 70 },
    { field: "fullName", headerName: t.fullName, flex: 1.2, minWidth: 180 },
    { field: "dob", headerName: t.dob, width: 110 },
    { field: "gender", headerName: t.gender, width: 90 },
    { field: "phone", headerName: t.phone, width: 130 },
    { field: "guardianName", headerName: t.guardianName, width: 150 },
    { field: "levelName", headerName: t.levels, width: 130, flex: 0.8 },
    { field: "sectionName", headerName: t.sections, width: 130, flex: 0.8 },
    {
      field: "actions",
      headerName: t.actions,
      width: 170,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={0.5}>
          <Tooltip title={t.edit || "Edit"}>
            <IconButton
              size="small"
              onClick={() => handleEdit(params.row)}
              sx={{
                color: "#fff",
                backgroundColor: theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400],
                "&:hover": { backgroundColor: theme.palette.mode === "light" ? colors.blueAccent[400] : colors.blueAccent[800] },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t.delete || "Delete"}>
            <IconButton
              size="small"
              onClick={() => handleOpenDelete(params.row.id)}
              sx={{
                color: "#fff",
                backgroundColor: theme.palette.error.main,
                "&:hover": { backgroundColor: theme.palette.error.dark },
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t.studentCard || "Student card"}>
            <IconButton
              size="small"
              onClick={() => openCard(params.row)}
              sx={{
                color: "#fff",
                backgroundColor: colors.blueAccent[700],
                "&:hover": { backgroundColor: colors.blueAccent[500] },
              }}
            >
              <QrCode2Icon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], [t, theme.palette.mode, colors.blueAccent]);

  return (
    <Box m="20px">
      <Header title={t.studentsTitle} subtitle={t.studentsSubtitle} />

      <Box
        display="grid"
        gap={2}
        alignItems="center"
        mb={2}
        sx={{
          gridTemplateColumns: {
            xs: "1fr",
            md: "1fr 1fr",
            lg: "1fr repeat(3, minmax(140px, 200px)) auto",
          },
        }}
      >
        <TextField size="small" value={searchText} onChange={(e) => { setPage(0); setSearchText(e.target.value); }} placeholder={t.searchStudents || "Search (name / phone / guardian)"} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>), endAdornment: searchText ? (<InputAdornment position="end"><IconButton size="small" onClick={() => { setSearchText(""); setPage(0); }}><ClearIcon /></IconButton></InputAdornment>) : null }} />
        <TextField select size="small" label={t.levels} value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value ? Number(e.target.value) : ""); setPage(0); }}>
          <MenuItem value="">{t.allLevels || "All levels"}</MenuItem>
          {levels.map((lvl) => <MenuItem key={lvl.id} value={lvl.id}>{lvl.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label={t.sections} value={sectionFilter} disabled={!levelFilter} onChange={(e) => { setSectionFilter(e.target.value ? Number(e.target.value) : ""); setPage(0); }}>
          <MenuItem value="">{t.allSections || "All sections"}</MenuItem>
          {sections.map((sec) => <MenuItem key={sec.id} value={sec.id}>{sec.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label={t.gender} value={genderFilter} onChange={(e) => { setGenderFilter(e.target.value); setPage(0); }}>
          <MenuItem value="">{t.all || "All"}</MenuItem>
          <MenuItem value="M">{t.male || "Male"}</MenuItem>
          <MenuItem value="F">{t.female || "Female"}</MenuItem>
        </TextField>
        <Box textAlign="right">
          <Button
            data-testid="students-add"
            variant="contained"
            sx={{
              backgroundColor: theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400],
              color: "#fff",
              "&:hover": { backgroundColor: theme.palette.mode === "light" ? colors.blueAccent[400] : colors.blueAccent[800] },
            }}
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
          >
            {t.addStudent || "Add student"}
          </Button>
        </Box>
      </Box>

      <Box
        height="calc(100vh - 255px)"
        minHeight={460}
        dir={language === "ar" ? "rtl" : "ltr"}
        sx={{
          "& .MuiDataGrid-root": { border: "none" },
          "& .MuiDataGrid-columnHeaders": { backgroundColor: colors.blueAccent[700], borderBottom: "none", textAlign: language === "ar" ? "right" : "left" },
          "& .MuiDataGrid-cell": { textAlign: language === "ar" ? "right" : "left" },
          "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
          "& .MuiDataGrid-footerContainer": { borderTop: "none", backgroundColor: colors.blueAccent[400] },
          "& .MuiCheckbox-root.Mui-checked": { color: theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400] },
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
          onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
          density="compact"
          disableSelectionOnClick
          columnVisibilityModel={{ id: false, guardianName: false }}
        />
      </Box>

      <StudentDialog open={studentDialogOpen} onClose={() => setStudentDialogOpen(false)} language={language} student={editingStudent} reloadStudents={loadStudents} />

      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete} maxWidth="xs" fullWidth PaperProps={{ sx: { backgroundColor: "#1e3a8a", color: "#fff", textAlign: "center", borderRadius: 2, p: 2 } }}>
        <DialogTitle sx={{ fontWeight: "bold", fontSize: "1.5rem", mb: 1 }}>{t.confirmDeleteTitle || "Are you sure?"}</DialogTitle>
        <DialogContent>
          {deleteError ? <Typography sx={{ color: "yellow", fontWeight: "bold" }}>{deleteError}</Typography> : <Typography>{t.confirmDeleteMessageStudent || "Do you want to delete this student?"}</Typography>}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", gap: 2 }}>
          <Button onClick={handleCancelDelete} variant="outlined" sx={{ borderColor: "#fff", color: "#fff", "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" } }}>{t.cancel || "No"}</Button>
          <Button onClick={handleConfirmDelete} disabled={!!deleteError} variant="contained" sx={{ backgroundColor: "#fff", color: "#1e3a8a", "&:hover": { backgroundColor: "rgba(255,255,255,0.8)" } }}>{t.confirm || "Yes, delete"}</Button>
        </DialogActions>
      </Dialog>

      <StudentCardModal open={cardOpen} onClose={() => setCardOpen(false)} student={cardStudent} levels={levels} language={language} />
    </Box>
  );
};

export default Students;
