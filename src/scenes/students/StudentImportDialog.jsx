import { useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";

import { tokens } from "../../theme";
import { getTranslations } from "../../translations";
import { createStudent } from "../../api/studentsApi";
import { createLevel, listLevels } from "../../api/levelsApi";
import { createSection, listSections } from "../../api/sectionsApi";
import { readStudentImportFile } from "../../utils/studentImportParse";
import { downloadStudentImportTemplate } from "../../utils/importTemplateWorkbook";
import { primaryImportBtnSx } from "../../utils/importUi";

const todayYMD = () => new Date().toLocaleDateString("en-CA");
const normName = (v) => String(v || "").trim().toLowerCase().replace(/\s+/g, " ");

const StudentImportDialog = ({ open, onClose, language, onImported }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = getTranslations(language);
  const inputRef = useRef(null);

  const [parsed, setParsed] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [fileLabel, setFileLabel] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);

  const reset = () => {
    setParsed([]);
    setParseErrors([]);
    setFileLabel("");
    setImporting(false);
    setProgress({ done: 0, total: 0 });
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const translateParseError = (code) => {
    if (code === "emptyWorkbook") return t.studentImportEmptyWorkbook || "The file has no sheets.";
    if (code === "emptySheet") return t.studentImportEmptySheet || "The sheet is empty.";
    if (code === "noRows") return t.studentImportNoRows || "No student names were found.";
    return code;
  };

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileLabel(file.name);
    setResult(null);
    try {
      const { rows, errors } = await readStudentImportFile(file);
      setParseErrors(errors.map(translateParseError));
      setParsed(rows);
    } catch {
      setParseErrors([t.studentImportReadFailed || "Could not read this file. Use .xlsx."]);
      setParsed([]);
    }
  };

  const toImport = parsed.filter((r) => r.payload && !r.skipReason);

  const runImport = async () => {
    if (!toImport.length || importing) return;
    setImporting(true);
    setResult(null);
    setProgress({ done: 0, total: toImport.length });
    const failures = [];
    let ok = 0;
    let levels = [];
    let sections = [];
    try {
      levels = await listLevels();
      sections = await listSections();
    } catch {
      // keep empty, we can still create on-demand
    }
    const levelMap = new Map(
      (levels || [])
        .filter((x) => x?.id && x?.name)
        .map((x) => [normName(x.name), { id: x.id, name: x.name }])
    );
    const sectionMap = new Map(
      (sections || [])
        .filter((x) => x?.id && x?.name)
        .map((x) => [normName(x.name), { id: x.id, name: x.name }])
    );

    for (let i = 0; i < toImport.length; i++) {
      const row = toImport[i];
      const payload = {
        ...row.payload,
        enrollmentDate: row.payload.enrollmentDate || todayYMD(),
      };

      try {
        if (!payload.levelId && payload.levelName) {
          const key = normName(payload.levelName);
          let found = levelMap.get(key);
          if (!found) {
            const created = await createLevel({ name: payload.levelName.trim() });
            found = { id: created?.id, name: created?.name || payload.levelName.trim() };
            if (found?.id) levelMap.set(key, found);
          }
          if (found?.id) payload.levelId = found.id;
        }
        if (!payload.sectionId && payload.sectionName) {
          const key = normName(payload.sectionName);
          let found = sectionMap.get(key);
          if (!found) {
            const created = await createSection({ name: payload.sectionName.trim() });
            found = { id: created?.id, name: created?.name || payload.sectionName.trim() };
            if (found?.id) sectionMap.set(key, found);
          }
          if (found?.id) payload.sectionId = found.id;
        }
      } catch (resolveErr) {
        const msg =
          resolveErr?.response?.data?.message ||
          resolveErr?.response?.data?.error ||
          resolveErr?.message ||
          "Could not resolve level/section";
        failures.push({ sheetRow: row.sheetRow, fullName: row.fullName, message: String(msg) });
        setProgress({ done: i + 1, total: toImport.length });
        continue;
      }

      delete payload.levelName;
      delete payload.sectionName;
      try {
        await createStudent(payload);
        ok += 1;
      } catch (err) {
        const msg =
          err.response?.data?.message
          || err.response?.data?.error
          || err.message
          || "Error";
        failures.push({ sheetRow: row.sheetRow, fullName: row.fullName, message: String(msg) });
      }
      setProgress({ done: i + 1, total: toImport.length });
    }
    setImporting(false);
    setResult({ ok, failures });
    if (ok > 0 && onImported) await onImported();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          backgroundColor:
            theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400],
          color: "#fff",
          fontWeight: "bold",
        }}
      >
        {t.importStudents || "Import students from Excel"}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" paragraph>
          {t.importStudentsHint
            || "Only the student name is required. Level and branch are optional. Dates: YYYY-MM-DD."}
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={1.5} alignItems="center" mb={2}>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={onPickFile}
          />
          <Button
            variant="contained"
            startIcon={<UploadFileIcon />}
            onClick={() => inputRef.current?.click()}
            sx={primaryImportBtnSx(theme, colors)}
          >
            {t.chooseExcelFile || "Choose Excel file"}
          </Button>
          <Button
            variant="outlined"
            size="medium"
            startIcon={<DownloadIcon />}
            onClick={() => downloadStudentImportTemplate(language)}
            sx={{
              borderWidth: 2,
              fontWeight: 600,
              borderColor: theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[300],
              color: theme.palette.mode === "light" ? colors.blueAccent[900] : "#e3f2fd",
              backgroundColor: theme.palette.mode === "light" ? "rgba(25, 118, 210, 0.08)" : "rgba(100, 181, 246, 0.12)",
              "&:hover": {
                borderColor: theme.palette.mode === "light" ? colors.blueAccent[700] : "#90caf9",
                backgroundColor: theme.palette.mode === "light" ? "rgba(25, 118, 210, 0.14)" : "rgba(100, 181, 246, 0.2)",
              },
            }}
          >
            {t.downloadStudentTemplate || "Download template"}
          </Button>
          {fileLabel ? (
            <Typography variant="caption" color="text.secondary">
              {fileLabel}
            </Typography>
          ) : null}
        </Box>

        {parseErrors.length > 0 ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {parseErrors.join(" ")}
          </Alert>
        ) : null}

        {importing ? (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              {t.importingStudents || "Importing…"} {progress.done}/{progress.total}
            </Typography>
            <LinearProgress variant="determinate" value={progress.total ? (100 * progress.done) / progress.total : 0} />
          </Box>
        ) : null}

        {result ? (
          <Alert severity={result.failures.length ? "warning" : "success"} sx={{ mb: 2 }}>
            {(t.importStudentsResult || "{{ok}} created, {{fail}} failed.")
              .replace("{{ok}}", String(result.ok))
              .replace("{{fail}}", String(result.failures.length))}
            {result.failures.length ? (
              <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                {result.failures.slice(0, 12).map((f) => (
                  <li key={`${f.sheetRow}-${f.fullName}`}>
                    {t.row || "Row"} {f.sheetRow}: {f.fullName} — {f.message}
                  </li>
                ))}
                {result.failures.length > 12 ? (
                  <li>{t.importErrorsTruncated || "…more errors omitted"}</li>
                ) : null}
              </Box>
            ) : null}
          </Alert>
        ) : null}

        {parsed.length > 0 ? (
          <>
            <Typography variant="subtitle2" gutterBottom>
              {(t.importPreview || "Preview").concat(` (${parsed.length})`)}
            </Typography>
            <TableContainer sx={{ maxHeight: 320, border: 1, borderColor: "divider", borderRadius: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>{t.row || "Row"}</TableCell>
                    <TableCell>{t.fullName}</TableCell>
                    <TableCell>{t.status || "Status"}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsed.slice(0, 100).map((r) => (
                    <TableRow key={`${r.sheetRow}-${r.fullName}`}>
                      <TableCell>{r.sheetRow}</TableCell>
                      <TableCell>{r.fullName || "—"}</TableCell>
                      <TableCell>
                        {r.skipReason === "missingName"
                          ? (t.studentImportMissingName || "Missing name")
                          : r.payload
                            ? (t.importReady || "Ready")
                            : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {parsed.length > 100 ? (
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                {t.importPreviewTruncated || "Showing first 100 rows."}
              </Typography>
            ) : null}
          </>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={handleClose}
          startIcon={<CloseIcon />}
          variant="outlined"
          sx={{
            borderWidth: 2,
            fontWeight: 600,
            borderColor: theme.palette.mode === "light" ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.65)",
            color: theme.palette.mode === "light" ? "#111" : "#fff",
            "&:hover": {
              borderColor: theme.palette.mode === "light" ? "#000" : "#fff",
              backgroundColor: theme.palette.mode === "light" ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.08)",
            },
          }}
        >
          {t.close || "Close"}
        </Button>
        <Button
          variant="contained"
          disabled={!toImport.length || importing}
          onClick={runImport}
          sx={primaryImportBtnSx(theme, colors)}
        >
          {t.importStart || "Import"}{toImport.length ? ` (${toImport.length})` : ""}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StudentImportDialog;
