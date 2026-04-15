import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  useTheme, TextField, InputAdornment, IconButton, MenuItem, CircularProgress, Tooltip
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import PrintIcon from "@mui/icons-material/Print";
import CloseIcon from "@mui/icons-material/Close";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import QRCode from "qrcode";

import Header from "../../components/Header";
import { tokens } from "../../theme";
import { getTranslations } from "../../translations";
import { useAuth } from "../../auth/AuthContext";

import { searchStudents, deleteStudent } from "../../api/studentsApi";
import { listLevels } from "../../api/levelsApi";
import { searchSections, listSections } from "../../api/sectionsApi";

import StudentDialog from "./StudentDialog";
import StudentImportDialog from "./StudentImportDialog";

const normalizeList = (list = []) => (list || []).map((x) => ({ ...x, id: Number(x.id) }));

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const toQrDataUrl = async (value) =>
  QRCode.toDataURL(String(value ?? ""), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
    color: { dark: "#000000", light: "#ffffff" },
  });

const resolveCardTheme = (user) => ({
  templateKey: user?.cardTemplateKey || "CLASSIC",
  primaryColor: user?.cardPrimaryColor || "#133C86",
  headerBg: user?.cardHeaderBg || "#EAEFFC",
  textColor: user?.cardTextColor || "#1A2233",
  bodyBg: (user?.cardTemplateKey || "CLASSIC") === "DARK" ? "#0F172A" : "#FFFFFF",
  bodyTextColor: (user?.cardTemplateKey || "CLASSIC") === "DARK"
    ? "#E5E7EB"
    : (user?.cardTextColor || "#1A2233"),
  qrFrameColor: user?.cardQrFrameColor || "#E5E7EB",
  showSchoolName: user?.cardShowSchoolName ?? true,
  showLogo: user?.cardShowLogo ?? true,
  showLevelSection: user?.cardShowLevelSection ?? true,
  nameFontScale: Number(user?.cardNameFontScale || 1),
});

const buildCardMarkup = ({ student, qrDataUrl, schoolName, schoolLogoUrl, cardTheme }) => {
  const name = escapeHtml((student.fullName || "").trim());
  const levelLine = escapeHtml(cardTheme.showLevelSection ? (student.levelSectionLine || "") : "");
  const school = escapeHtml(schoolName || "");
  const logo = (cardTheme.showLogo && schoolLogoUrl) ? `<img class="card__logo" src="${escapeHtml(schoolLogoUrl)}" alt="logo" />` : "";
  const schoolText = cardTheme.showSchoolName ? `<span class="card__school">${school}</span>` : "";
  const fontScale = Math.max(0.85, Math.min(1.35, Number(cardTheme.nameFontScale || 1)));
  const cardClass =
    cardTheme.templateKey === "PREMIUM" ? "card card--premium"
      : cardTheme.templateKey === "MODERN" ? "card card--modern"
        : cardTheme.templateKey === "DARK" ? "card card--dark"
          : "card";
  return `
    <article class="${cardClass}">
      <div class="card__inner">
        <header class="card__header">
          ${logo}
          ${schoolText}
        </header>
        <section class="card__body">
          <div class="card__left card__left--no-photo">
            <h3 class="card__name" style="font-size:${(3.7 * fontScale).toFixed(2)}mm">${name}</h3>
            ${levelLine ? `<p class="card__meta">${levelLine}</p>` : ""}
          </div>
          <div class="card__qr-wrap">
            <img class="card__qr" src="${qrDataUrl}" alt="qr" />
          </div>
        </section>
      </div>
    </article>
  `;
};

const openCardsPrintSheet = ({ cardsMarkup, title, cardTheme }) => {
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    html, body {
      margin: 0; padding: 0; background: #fff;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .sheet {
      display: grid;
      grid-template-columns: repeat(2, 85.6mm);
      gap: 4mm;
      justify-content: center;
      align-content: start;
      margin: 0 auto;
      width: 100%;
    }
    .card {
      width: 85.6mm;
      height: 54mm;
      background: ${cardTheme.primaryColor};
      border-radius: 3.2mm;
      padding: 2.4mm;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .card--premium { box-shadow: inset 0 0 0 0.4mm rgba(250, 204, 21, 0.5); }
    .card--modern { border-radius: 2.1mm; }
    .card--dark { box-shadow: inset 0 0 0 0.4mm rgba(255,255,255,0.2); }
    .card__inner {
      width: 100%;
      height: 100%;
      background: ${cardTheme.bodyBg || "#fff"};
      border-radius: 2.2mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .card__header {
      background: ${cardTheme.headerBg};
      color: ${cardTheme.textColor};
      font-size: 3mm;
      font-weight: 700;
      padding: 1.2mm 2mm;
      display: flex;
      align-items: center;
      gap: 1.4mm;
      min-height: 8.6mm;
    }
    .card__logo {
      width: 7mm;
      height: 7mm;
      object-fit: contain;
      border-radius: 0.7mm;
      background: #fff;
      border: 0.25mm solid ${cardTheme.qrFrameColor};
      padding: 0.4mm;
      flex-shrink: 0;
    }
    .card__school {
      max-width: 62mm;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .card__body {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 20mm;
      gap: 2.2mm;
      padding: 2.8mm 2.4mm 2.4mm;
      min-height: 0;
    }
    .card__left { min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 1.2mm; }
    .card__left--no-photo { padding-right: 1.2mm; }
    .card__name {
      margin: 0;
      font-size: 3.7mm;
      line-height: 1.15;
      color: ${cardTheme.bodyTextColor || cardTheme.textColor};
      font-weight: 700;
      max-width: 52mm;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card__meta {
      margin: 0;
      font-size: 2.55mm;
      line-height: 1.25;
      color: ${cardTheme.bodyTextColor || cardTheme.textColor};
      opacity: 0.75;
      max-height: 6.5mm;
      overflow: hidden;
    }
    .card__qr-wrap { display: flex; align-items: center; justify-content: center; }
    .card__qr {
      width: 19mm;
      height: 19mm;
      display: block;
      border: 0.25mm solid ${cardTheme.qrFrameColor};
      border-radius: 0.6mm;
      background: #fff;
      padding: 0.45mm;
    }
  </style>
</head>
<body>
  <section class="sheet">${cardsMarkup}</section>
  <script>window.onload = function(){ window.print(); };</script>
</body>
</html>`;
  const win = window.open("", "_blank", "width=1100,height=900");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
};

const StudentCardModal = ({ open, onClose, student, levels, language, schoolName, schoolLogoUrl, cardTheme, onEditDesign }) => {
  const t = getTranslations(language);
  const theme = useTheme();
  const cardRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
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

  const handlePrint = async () => {
    if (!student || printing) return;
    try {
      setPrinting(true);
      const qrDataUrl = await toQrDataUrl(student.id ?? "");
      const cardsMarkup = buildCardMarkup({
        student: { ...student, levelSectionLine: (levelName || "") + (sectionName ? ` - ${sectionName}` : "") },
        qrDataUrl,
        schoolName,
        schoolLogoUrl,
        cardTheme,
      });
      openCardsPrintSheet({ cardsMarkup, title: t.studentCard || "Student card", cardTheme });
    } finally {
      setPrinting(false);
    }
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
          <Box ref={cardRef} id="printable-student-card" sx={{ width: 540, height: 340, mx: "auto", p: 2.5, borderRadius: "16px", background: cardTheme.primaryColor, boxShadow: 6 }}>
            <Box sx={{ background: cardTheme.bodyBg || "#fff", borderRadius: "12px", overflow: "hidden" }}>
              <Box sx={{ background: cardTheme.headerBg, px: 2, py: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {(cardTheme.showLogo && schoolLogoUrl) ? (
                    <Box component="img" src={schoolLogoUrl} alt="logo" sx={{ width: 28, height: 28, objectFit: "contain", borderRadius: 1, background: "#fff", border: `1px solid ${cardTheme.qrFrameColor}`, p: 0.4 }} />
                  ) : null}
                  {cardTheme.showSchoolName ? (
                    <Typography variant="subtitle1" sx={{ color: cardTheme.textColor, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {schoolName}
                    </Typography>
                  ) : null}
                </Box>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 2, p: 2.2, alignItems: "center", minHeight: 245 }}>
                <Box sx={{ display: "grid", gap: 1.2, pr: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: `${(22 * cardTheme.nameFontScale).toFixed(1)}px`, color: cardTheme.bodyTextColor || cardTheme.textColor, mt: 0.2, lineHeight: 1.15 }}>
                    {(student.fullName || "").trim()}
                  </Typography>
                  {cardTheme.showLevelSection ? (
                    <Typography sx={{ color: cardTheme.bodyTextColor || cardTheme.textColor, opacity: 0.8, fontSize: 14.5, lineHeight: 1.25 }}>{line}</Typography>
                  ) : null}
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Box sx={{ border: `1px solid ${cardTheme.qrFrameColor}`, borderRadius: "6px", p: 0.5, background: "#fff" }}>
                    <QRCodeCanvas value={student.id ? String(student.id) : ""} size={160} includeMargin />
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          startIcon={<CloseIcon />}
          variant="outlined"
          sx={{
            borderColor: theme.palette.mode === "dark" ? "#94a3b8" : "#1e293b",
            color: theme.palette.mode === "dark" ? "#e2e8f0" : "#0f172a",
          }}
        >
          {t.close || "Close"}
        </Button>
        <Button
          onClick={handlePrint}
          variant="contained"
          disabled={printing}
          startIcon={<PrintIcon />}
          sx={{
            backgroundColor: theme.palette.mode === "dark" ? "#2563eb" : "#1d4ed8",
            color: "#fff",
            "&:hover": { backgroundColor: theme.palette.mode === "dark" ? "#3b82f6" : "#1e40af" },
          }}
        >
          {t.print || "Print"}
        </Button>
        <Button
          onClick={onEditDesign}
          variant="contained"
          startIcon={<PaletteOutlinedIcon />}
          sx={{
            backgroundColor: theme.palette.mode === "dark" ? "#1d4ed8" : "#1e40af",
            color: "#fff",
            "&:hover": { backgroundColor: theme.palette.mode === "dark" ? "#2563eb" : "#1d4ed8" },
          }}
        >
          {t.editCardDesign || "Edit card design"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const Students = ({ language }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = getTranslations(language);
  const { user } = useAuth();
  const navigate = useNavigate();

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
  const [importOpen, setImportOpen] = useState(false);
  const [selectionModel, setSelectionModel] = useState({ type: "include", ids: new Set() });
  const [bulkPrinting, setBulkPrinting] = useState(false);
  const cardTheme = resolveCardTheme(user);
  const schoolName =
    user?.schoolName
    || user?.school?.name
    || user?.school?.schoolName
    || "School";
  const schoolLogoUrl = (() => {
    if (user?.schoolLogoUrl) return user.schoolLogoUrl;
    try {
      const v = localStorage.getItem("userLogo");
      return v && v.startsWith("data:image") ? v : "";
    } catch {
      return "";
    }
  })();

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

  // All school sections for filter dropdown (backend lists by tenant; levelId is not required).
  useEffect(() => {
    (async () => {
      try {
        const data = await searchSections({ page: 0, size: 2000, sort: "name,asc" });
        const list = data?.content ?? data ?? [];
        setSections(normalizeList(Array.isArray(list) ? list : []));
      } catch (e) {
        console.error("Failed to load sections", e);
        setSections([]);
      }
    })();
  }, []);

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
        levelName:
          s.levelName || levels.find((l) => Number(l.id) === Number(s.levelId))?.name || "",
        sectionName:
          s.sectionName
          || sections.find((sec) => Number(sec.id) === Number(s.sectionId))?.name
          || "",
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
  const selectedStudents = students.filter((s) =>
    selectionModel.type === "exclude"
      ? !selectionModel.ids?.has(s.id)
      : selectionModel.ids?.has(s.id),
  );

  const printStudentCards = async (list) => {
    if (!Array.isArray(list) || !list.length || bulkPrinting) return;
    try {
      setBulkPrinting(true);
      const withQr = await Promise.all(
        list.map(async (s) => ({
          student: {
            ...s,
            levelSectionLine: (s.levelName || "") + (s.sectionName ? ` - ${s.sectionName}` : ""),
          },
          qrDataUrl: await toQrDataUrl(s.id ?? ""),
        })),
      );
      const cardsMarkup = withQr
        .map(({ student, qrDataUrl }) => buildCardMarkup({ student, qrDataUrl, schoolName, schoolLogoUrl, cardTheme }))
        .join("");
      openCardsPrintSheet({ cardsMarkup, title: t.studentCard || "Student cards", cardTheme });
    } finally {
      setBulkPrinting(false);
    }
  };

  const handleBulkPrint = async () => {
    if (!selectedStudents.length) return;
    await printStudentCards(selectedStudents);
  };

  const columns = useMemo(() => [
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
    <Box
      p="20px"
      sx={{
        height: "calc(100dvh - 110px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
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
        <TextField select size="small" label={t.levels} value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value ? Number(e.target.value) : ""); setSectionFilter(""); setPage(0); }}>
          <MenuItem value="">{t.allLevels || "All levels"}</MenuItem>
          {levels.map((lvl) => <MenuItem key={lvl.id} value={lvl.id}>{lvl.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label={t.sections} value={sectionFilter} onChange={(e) => { setSectionFilter(e.target.value ? Number(e.target.value) : ""); setPage(0); }}>
          <MenuItem value="">{t.allSections || "All sections"}</MenuItem>
          {sections.map((sec) => <MenuItem key={sec.id} value={sec.id}>{sec.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label={t.gender} value={genderFilter} onChange={(e) => { setGenderFilter(e.target.value); setPage(0); }}>
          <MenuItem value="">{t.all || "All"}</MenuItem>
          <MenuItem value="M">{t.male || "Male"}</MenuItem>
          <MenuItem value="F">{t.female || "Female"}</MenuItem>
        </TextField>
        <Box display="flex" gap={1} justifyContent="flex-end" flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => setImportOpen(true)}
            sx={{
              borderColor: theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400],
              color: theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400],
            }}
          >
            {t.importStudents || "Import Excel"}
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            disabled={!selectedStudents.length || bulkPrinting}
            onClick={handleBulkPrint}
            sx={{
              backgroundColor: theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[500],
              color: "#fff",
              borderColor: theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[500],
              "&:hover": {
                backgroundColor: theme.palette.mode === "light" ? colors.blueAccent[700] : colors.blueAccent[400],
                borderColor: theme.palette.mode === "light" ? colors.blueAccent[700] : colors.blueAccent[400],
              },
              "&.Mui-disabled": {
                opacity: 1,
                backgroundColor: theme.palette.mode === "light" ? "#90a4ae" : "#455a64",
                borderColor: theme.palette.mode === "light" ? "#90a4ae" : "#455a64",
                color: theme.palette.mode === "light" ? "#1a1a1a" : "#eceff1",
              },
            }}
          >
            {(t.print || "Print")} {selectedStudents.length ? `(${selectedStudents.length})` : ""}
          </Button>
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
        dir={language === "ar" ? "rtl" : "ltr"}
        sx={{
          flex: 1,
          minHeight: 0,
          "& .MuiDataGrid-root": { border: "none", height: "100%" },
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
          checkboxSelection
          checkboxSelectionVisibleOnly
          rowSelectionModel={selectionModel}
          onRowSelectionModelChange={(model) => {
            const nextIds = new Set(Array.from(model?.ids || []).map((x) => Number(x)));
            setSelectionModel({ type: model?.type || "include", ids: nextIds });
          }}
          disableRowSelectionOnClick
          columnVisibilityModel={{ id: false, guardianName: false }}
        />
      </Box>

      <StudentDialog open={studentDialogOpen} onClose={() => setStudentDialogOpen(false)} language={language} student={editingStudent} reloadStudents={loadStudents} />

      <StudentImportDialog open={importOpen} onClose={() => setImportOpen(false)} language={language} onImported={loadStudents} />

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

      <StudentCardModal
        open={cardOpen}
        onClose={() => setCardOpen(false)}
        onEditDesign={() => {
          setCardOpen(false);
          navigate("/Settings");
        }}
        student={cardStudent}
        levels={levels}
        language={language}
        schoolName={schoolName}
        schoolLogoUrl={schoolLogoUrl}
        cardTheme={cardTheme}
      />
    </Box>
  );
};

export default Students;



