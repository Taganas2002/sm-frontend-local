// src/pages/Attendance.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Typography,
  TextField,
  MenuItem,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Stack,
  useTheme,
  CircularProgress,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { DataGrid } from "@mui/x-data-grid";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

import Header from "../../components/Header";
import { tokens } from "../../theme";
import translations, { translateBillingModel } from "../../translations";

import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ReplyIcon from "@mui/icons-material/Reply";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

import { searchGroups } from "../../api/groupsApi";
import { listTeachers } from "../../api/teachersApi";
import { listSubjects } from "../../api/subjectsApi";
import { listLevels } from "../../api/levelsApi";
import { listSections } from "../../api/sectionsApi";
import { getAttendanceMatrix } from "../../api/attendanceApi";

const DEBOUNCE_MS = 350;
const parseTri = (val) => (val === "true" ? true : val === "false" ? false : undefined);

/** Clamp server dates to the chosen month and build per-student map (P/A/null) */
const clampMatrixToMonth = (server, monthStartISO) => {
  const y = dayjs(monthStartISO).year();
  const m0 = dayjs(monthStartISO).month();

  const kept = (server?.dates || [])
    .map((d, i) => ({ d: dayjs(d), i }))
    .filter(({ d }) => d.year() === y && d.month() === m0)
    .sort((a, b) => a.d.valueOf() - b.d.valueOf());

  const sessionDates = kept.map(({ d }) => d.format("YYYY-MM-DD"));
  const idxs = kept.map(({ i }) => i);

  const students = (server?.students || []).map((s) => {
    const byDate = {};
    idxs.forEach((k, pos) => {
      const label = sessionDates[pos];
      const raw = (s.cells?.[k] ?? "").toString().toUpperCase();
      byDate[label] =
        raw.startsWith("P") || raw === "1" || raw === "TRUE"
          ? "P"
          : raw.startsWith("A") || raw === "0" || raw === "FALSE"
          ? "A"
          : null;
    });
    return {
      id: s.studentId ?? s.id,
      name: s.studentName ?? s.name ?? "",
      byDate,
    };
  });

  return { sessionDates, students };
};

const Attendance = ({ language = "fr" }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = translations[language] || translations["fr"];

  /* ---------- Views ---------- */
  const [view, setView] = useState("LIST");
  const [selectedGroup, setSelectedGroup] = useState(null);

  /* ---------- Month anchor (1st of month) ---------- */
  const [monthAnchor, setMonthAnchor] = useState(dayjs().startOf("month"));
  const startISO = monthAnchor.startOf("month").format("YYYY-MM-DD");
  const endISO = monthAnchor.add(1, "month").startOf("month").format("YYYY-MM-DD");
  const shiftMonth = (delta) => setMonthAnchor((d) => d.add(delta, "month").startOf("month"));

  /* ---------- Group list filters/data ---------- */
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [levels, setLevels] = useState([]);
  const [sections, setSections] = useState([]);

  const [q, setQ] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [privateFilter, setPrivateFilter] = useState("");
  const [revisionFilter, setRevisionFilter] = useState("");

  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [rowCount, setRowCount] = useState(0);

  const debouncedKeys = useMemo(
    () => [
      q,
      academicYear,
      activeFilter,
      teacherFilter,
      subjectFilter,
      levelFilter,
      sectionFilter,
      privateFilter,
      revisionFilter,
      page,
      pageSize,
    ],
    [
      q,
      academicYear,
      activeFilter,
      teacherFilter,
      subjectFilter,
      levelFilter,
      sectionFilter,
      privateFilter,
      revisionFilter,
      page,
      pageSize,
    ]
  );

  useEffect(() => {
    (async () => {
      try {
        const [ts, ss, lv, sc] = await Promise.all([
          listTeachers(),
          listSubjects(),
          listLevels(),
          listSections(),
        ]);
        setTeachers(ts || []);
        setSubjects(ss || []);
        setLevels(lv || []);
        setSections(sc?.content ? sc.content : sc || []);
      } catch {}
    })();
  }, []);

  const loadSectionsForLevel = async (lvlId) => {
    try {
      const d = await listSections(lvlId || undefined);
      const list = d?.content ? d.content : d;
      setSections(list || []);
    } catch {
      setSections([]);
    }
  };

  useEffect(() => {
    const h = setTimeout(fetchGroups, DEBOUNCE_MS);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, debouncedKeys);

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await searchGroups({
        q,
        academicYear,
        active: parseTri(activeFilter),
        teacherId: teacherFilter || undefined,
        subjectId: subjectFilter || undefined,
        levelId: levelFilter || undefined,
        sectionId: sectionFilter || undefined,
        privateGroup: parseTri(privateFilter),
        revisionGroup: parseTri(revisionFilter),
        page,
        size: pageSize,
        sort: "name,asc",
      });
      const content = res?.content ?? res ?? [];
      setGroups(content);
      setRowCount(res?.totalElements ?? content.length);
    } catch (e) {
      console.error("Failed to load groups", e);
      setGroups([]);
      setRowCount(0);
    } finally {
      setLoadingGroups(false);
    }
  };

  /** API returns ids only; resolve labels like the Groups screen. */
  const displayGroups = useMemo(
    () =>
      (groups || []).map((g) => ({
        ...g,
        teacherName: teachers.find((x) => x.id === g.teacherId)?.fullName || g.teacherName || "",
        subjectName: subjects.find((x) => x.id === g.subjectId)?.name || g.subjectName || "",
        levelName: levels.find((x) => x.id === g.levelId)?.name || g.levelName || "",
        sectionName:
          sections.find((x) => Number(x.id) === Number(g.sectionId))?.name || g.sectionName || "",
      })),
    [groups, teachers, subjects, levels, sections]
  );

  /* ---------- Matrix state ---------- */
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [sessionDates, setSessionDates] = useState([]);   // ONLY dates with sessions
  const [studentsRows, setStudentsRows] = useState([]);   // [{id,name,byDate:{[date]:P|A|null}}]

  const openMatrix = (row) => {
    setSelectedGroup(row);
    setView("MATRIX");
  };

  const fetchMatrix = async () => {
    if (!selectedGroup?.id) return;
    setMatrixLoading(true);
    try {
      const payload = await getAttendanceMatrix(selectedGroup.id, startISO, endISO);
      const { sessionDates, students } = clampMatrixToMonth(payload, startISO);
      setSessionDates(sessionDates);
      setStudentsRows(students);
    } catch (e) {
      console.error("load attendance matrix failed", e);
      setSessionDates([]);
      setStudentsRows([]);
    } finally {
      setMatrixLoading(false);
    }
  };

  useEffect(() => {
    if (view === "MATRIX" && selectedGroup?.id) fetchMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedGroup, monthAnchor]);

  /* ---------- Group columns ---------- */
  const groupColumns = useMemo(
    () => [
      { field: "name", headerName: t.groupName || "Group", flex: 1.2 },
      { field: "teacherName", headerName: t.teacher || "Teacher", flex: 1 },
      { field: "subjectName", headerName: t.subject || "Subject", flex: 0.9 },
      { field: "levelName", headerName: t.level || "Level", flex: 0.8 },
      { field: "sectionName", headerName: t.section || "Section", flex: 0.8 },
      {
        field: "billingModel",
        headerName: t.billingModel || "Billing",
        width: 130,
        valueFormatter: (value) => translateBillingModel(value, t),
      },
      {
        field: "capacity",
        headerName: t.capacity || "Capacity",
        width: 110,
        align: "center",
        headerAlign: "center",
      },
      {
        field: "actions",
        headerName: t.actions || "Actions",
        width: 140,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <IconButton
            size="medium"
            onClick={() => openMatrix(params.row)}
            title={t.presences}
            sx={{
              bgcolor: alpha(colors.blueAccent[500], 0.22),
              border: `1px solid ${alpha(colors.blueAccent[200], 0.45)}`,
              color: theme.palette.mode === "dark" ? "#e0f2fe" : colors.blueAccent[900],
              "&:hover": {
                bgcolor: alpha(colors.blueAccent[500], 0.38),
                borderColor: alpha(colors.blueAccent[100], 0.6),
              },
            }}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    [t, theme.palette.mode, colors]
  );

  /* ===================== EXPORT: EXACT TABLE ===================== */
  const safeName = (s) => (s || "").toString().replace(/[\\/:*?"<>|]/g, "_");
  const findById = (arr, id, prop) => arr.find((x) => x.id === id)?.[prop] || "";

  const handleExportExcel = () => {
    if (!selectedGroup) return;

    const teacherName =
      selectedGroup.teacherName || findById(teachers, selectedGroup.teacherId, "fullName");
    const subjectName =
      selectedGroup.subjectName || findById(subjects, selectedGroup.subjectId, "name");
    const levelName =
      selectedGroup.levelName || findById(levels, selectedGroup.levelId, "name");
    const sectionName =
      selectedGroup.sectionName || findById(sections, selectedGroup.sectionId, "name");

    const hasSessions = sessionDates.length > 0;

    // Build the AOA (Array of Arrays) exactly like UI
    const aoa = [];

    // Header block (above table)
    aoa.push([
      t.groupName || "Group",
      selectedGroup.name ?? "",
      "",
      t.academicYear || "Academic year",
      selectedGroup.academicYear ?? "",
    ]);
    aoa.push([t.level || "Level", levelName, "", t.subject || "Subject", subjectName, "", t.section || "Section", sectionName]);
    aoa.push([t.reportMonthLabel || "Month", monthAnchor.format("MMMM YYYY")]);
    aoa.push([]); // empty spacer row

    // Table header (only session dates, left->right; if none, one em dash column)
    const header = ["#", t.name || "Name"];
    if (hasSessions) {
      header.push(...sessionDates.map((d) => dayjs(d).format("DD/MM")));
    } else {
      header.push("\u2014");
    }
    aoa.push(header);

    // Table rows (P / A / em dash for Excel compatibility)
    studentsRows.forEach((s, idx) => {
      const row = [idx + 1, s.name];
      if (!hasSessions) {
        row.push("\u2014");
      } else {
        sessionDates.forEach((d) => {
          const v = s.byDate?.[d] ?? null;
          row.push(v === "P" ? "P" : v === "A" ? "A" : "\u2014");
        });
      }
      aoa.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Nice column widths (first two wider, date columns narrow)
    const widths = [5, 28, ...Array(Math.max(1, sessionDates.length)).fill(8)];
    ws["!cols"] = widths.map((w) => ({ wch: w }));

    // Workbook
    const wb = XLSX.utils.book_new();
    const sheetName = `Matrix_${monthAnchor.format("YYYY_MM")}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const filename = `AttendanceTable_${safeName(selectedGroup.name)}_${monthAnchor.format(
      "YYYY_MM"
    )}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  /* ===================== RENDER ===================== */

  // ======== MATRIX (only session days, Lâ†’R) ========
  if (view === "MATRIX") {
    const monthTitle = monthAnchor.format("MMMM YYYY");
    const hasSessions = sessionDates.length > 0;
    const isRtl = language === "ar";
    const borderSubtle = alpha(theme.palette.divider, theme.palette.mode === "light" ? 0.9 : 0.22);
    const headerBg =
      theme.palette.mode === "light"
        ? `linear-gradient(135deg, ${alpha(colors.blueAccent[700], 0.95)} 0%, ${alpha("#1e40af", 0.92)} 100%)`
        : `linear-gradient(135deg, ${alpha("#1e3a8a", 0.95)} 0%, ${alpha("#0f172a", 0.98)} 100%)`;
    const stickyCellBg =
      theme.palette.mode === "light" ? theme.palette.background.paper : alpha(theme.palette.background.paper, 0.98);

    const backToList = () => {
      setView("LIST");
      setSelectedGroup(null);
    };

    return (
      <Box m="20px" dir={isRtl ? "rtl" : "ltr"}>
        <Header title={t.presence} subtitle={selectedGroup?.name ? String(selectedGroup.name) : ""} />

        <Paper
          elevation={0}
          sx={{
            mt: 2,
            mb: 2,
            p: { xs: 1.5, sm: 2 },
            borderRadius: 3,
            border: `1px solid ${borderSubtle}`,
            background:
              theme.palette.mode === "light"
                ? alpha(theme.palette.primary.main, 0.04)
                : alpha(theme.palette.common.white, 0.04),
            backdropFilter: "blur(8px)",
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent="space-between"
            spacing={2}
          >
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" justifyContent={{ xs: "center", md: "flex-start" }}>
              <IconButton
                onClick={() => shiftMonth(-1)}
                size="small"
                sx={{
                  border: `1px solid ${borderSubtle}`,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.action.hover, 0.08),
                }}
                aria-label="previous month"
              >
                <ArrowBackIosNewIcon fontSize="small" sx={{ transform: isRtl ? "scaleX(-1)" : undefined }} />
              </IconButton>
              <Typography
                variant="subtitle1"
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  fontWeight: 800,
                  letterSpacing: 0.02,
                  color: "#fff",
                  background: headerBg,
                  boxShadow: `0 8px 24px ${alpha("#1e3a8a", 0.25)}`,
                  minWidth: 160,
                  textAlign: "center",
                }}
              >
                {monthTitle}
              </Typography>
              <IconButton
                onClick={() => shiftMonth(1)}
                size="small"
                sx={{
                  border: `1px solid ${borderSubtle}`,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.action.hover, 0.08),
                }}
                aria-label="next month"
              >
                <ArrowForwardIosIcon fontSize="small" sx={{ transform: isRtl ? "scaleX(-1)" : undefined }} />
              </IconButton>
            </Stack>

            <Stack
              direction="row"
              spacing={3}
              flexWrap="wrap"
              useFlexGap
              justifyContent={{ xs: "center", md: "flex-end" }}
              alignItems="center"
              sx={{ columnGap: 3, rowGap: 1.5 }}
            >
              <Button
                variant="contained"
                onClick={backToList}
                title={t.attendanceBackToGroups}
                sx={{
                  minHeight: 48,
                  minWidth: 132,
                  px: 2.5,
                  fontWeight: 800,
                  textTransform: "none",
                  borderRadius: 2.5,
                  color: theme.palette.mode === "dark" ? "#0f172a" : "#0f172a",
                  background: theme.palette.mode === "dark" ? "#e2e8f0" : "#f1f5f9",
                  border: theme.palette.mode === "dark" ? "2px solid #cbd5e1" : "2px solid #94a3b8",
                  boxShadow: theme.palette.mode === "dark" ? `0 4px 16px ${alpha("#000", 0.35)}` : `0 4px 14px ${alpha("#0f172a", 0.08)}`,
                  "&:hover": {
                    background: theme.palette.mode === "dark" ? "#f8fafc" : "#e2e8f0",
                    borderColor: theme.palette.mode === "dark" ? "#e2e8f0" : "#64748b",
                  },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ ...(isRtl ? { flexDirection: "row-reverse" } : {}) }}>
                  <ReplyIcon sx={{ fontSize: 22 }} />
                  <Typography component="span" variant="body2" sx={{ fontWeight: 800 }}>
                    {t.back}
                  </Typography>
                </Stack>
              </Button>
              <Button
                variant="contained"
                onClick={handleExportExcel}
                disabled={!selectedGroup}
                sx={{
                  minHeight: 48,
                  px: 2.75,
                  py: 1,
                  fontWeight: 800,
                  textTransform: "none",
                  borderRadius: 2.5,
                  color: "#fff",
                  background: "linear-gradient(180deg, #1d8f4a 0%, #107c41 45%, #0b5c30 100%)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  boxShadow: "0 6px 20px rgba(16, 124, 65, 0.42)",
                  "&:hover": {
                    background: "linear-gradient(180deg, #22a855 0%, #107c41 55%, #0b5c30 100%)",
                    boxShadow: "0 10px 28px rgba(16, 124, 65, 0.5)",
                  },
                  "&.Mui-disabled": {
                    color: alpha("#fff", 0.65),
                    background: alpha("#107c41", 0.35),
                  },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ ...(isRtl ? { flexDirection: "row-reverse" } : {}) }}>
                  <FileDownloadIcon sx={{ fontSize: 22 }} />
                  <Typography component="span" variant="body2" sx={{ fontWeight: 800 }}>
                    {t.attendanceExportExcel}
                  </Typography>
                </Stack>
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            border: `1px solid ${borderSubtle}`,
            boxShadow:
              theme.palette.mode === "light"
                ? `0 12px 40px ${alpha("#0f172a", 0.06)}`
                : `0 16px 48px ${alpha("#000", 0.35)}`,
          }}
        >
          {matrixLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" p={6}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: "calc(100vh - 320px)" }}>
              <Table size="small" stickyHeader sx={{ borderCollapse: "separate", borderSpacing: 0 }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontWeight: 800,
                        width: 52,
                        minWidth: 52,
                        borderBottom: `1px solid ${borderSubtle}`,
                        background: headerBg,
                        color: "#fff",
                        position: "sticky",
                        left: isRtl ? "auto" : 0,
                        right: isRtl ? 0 : "auto",
                        zIndex: 4,
                        boxShadow: isRtl ? `-4px 0 12px ${alpha("#000", 0.12)}` : `4px 0 12px ${alpha("#000", 0.12)}`,
                      }}
                    >
                      #
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 800,
                        minWidth: 200,
                        maxWidth: 280,
                        borderBottom: `1px solid ${borderSubtle}`,
                        background: headerBg,
                        color: "#fff",
                        position: "sticky",
                        left: isRtl ? "auto" : 52,
                        right: isRtl ? 52 : "auto",
                        zIndex: 4,
                        boxShadow: isRtl ? `-4px 0 12px ${alpha("#000", 0.12)}` : `4px 0 12px ${alpha("#000", 0.12)}`,
                      }}
                    >
                      {t.name}
                    </TableCell>
                    {hasSessions ? (
                      sessionDates.map((d) => (
                        <TableCell
                          key={d}
                          align="center"
                          sx={{
                            whiteSpace: "nowrap",
                            fontWeight: 800,
                            fontVariantNumeric: "tabular-nums",
                            borderBottom: `1px solid ${borderSubtle}`,
                            bgcolor: alpha(theme.palette.info.main, theme.palette.mode === "light" ? 0.14 : 0.22),
                            color: theme.palette.text.primary,
                            minWidth: 58,
                            py: 1.25,
                          }}
                        >
                          <Box component="span" sx={{ display: "block", lineHeight: 1.2 }}>
                            {dayjs(d).format("DD/MM")}
                          </Box>
                        </TableCell>
                      ))
                    ) : (
                      <TableCell
                        align="center"
                        sx={{
                          borderBottom: `1px solid ${borderSubtle}`,
                          bgcolor: alpha(theme.palette.info.main, theme.palette.mode === "light" ? 0.12 : 0.18),
                          fontWeight: 700,
                        }}
                      >
                        {"\u2014"}
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {studentsRows.map((s, idx) => (
                    <TableRow
                      key={s.id || idx}
                      hover
                      sx={{
                        "&:nth-of-type(even) .MuiTableCell-root": {
                          bgcolor: alpha(theme.palette.action.hover, theme.palette.mode === "light" ? 0.35 : 0.08),
                        },
                        "&:hover .MuiTableCell-root": {
                          bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.06 : 0.1),
                        },
                      }}
                    >
                      <TableCell
                        sx={{
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          borderRight: isRtl ? undefined : `1px solid ${borderSubtle}`,
                          borderLeft: isRtl ? `1px solid ${borderSubtle}` : undefined,
                          borderBottom: `1px solid ${borderSubtle}`,
                          position: "sticky",
                          left: isRtl ? "auto" : 0,
                          right: isRtl ? 0 : "auto",
                          zIndex: 2,
                          bgcolor: stickyCellBg,
                          boxShadow: isRtl ? `-2px 0 6px ${alpha("#000", 0.06)}` : `2px 0 6px ${alpha("#000", 0.06)}`,
                        }}
                      >
                        {idx + 1}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          borderRight: isRtl ? undefined : `1px solid ${borderSubtle}`,
                          borderLeft: isRtl ? `1px solid ${borderSubtle}` : undefined,
                          borderBottom: `1px solid ${borderSubtle}`,
                          maxWidth: 280,
                          position: "sticky",
                          left: isRtl ? "auto" : 52,
                          right: isRtl ? 52 : "auto",
                          zIndex: 2,
                          bgcolor: stickyCellBg,
                          boxShadow: isRtl ? `-2px 0 6px ${alpha("#000", 0.06)}` : `2px 0 6px ${alpha("#000", 0.06)}`,
                        }}
                      >
                        {s.name}
                      </TableCell>

                      {hasSessions ? (
                        sessionDates.map((d) => {
                          const v = s.byDate?.[d] ?? null;
                          return (
                            <TableCell
                              key={`${s.id}-${d}`}
                              align="center"
                              sx={{
                                borderBottom: `1px solid ${borderSubtle}`,
                                py: 1,
                              }}
                            >
                              {v === "P" ? (
                                <Box
                                  sx={{
                                    display: "inline-grid",
                                    placeItems: "center",
                                    width: 34,
                                    height: 34,
                                    borderRadius: "50%",
                                    bgcolor: alpha("#22c55e", 0.18),
                                    border: `1px solid ${alpha("#22c55e", 0.45)}`,
                                  }}
                                >
                                  <CheckCircleIcon sx={{ color: "#16a34a", fontSize: 22 }} />
                                </Box>
                              ) : v === "A" ? (
                                <Box
                                  sx={{
                                    display: "inline-grid",
                                    placeItems: "center",
                                    width: 34,
                                    height: 34,
                                    borderRadius: "50%",
                                    bgcolor: alpha("#ef4444", 0.16),
                                    border: `1px solid ${alpha("#ef4444", 0.45)}`,
                                  }}
                                >
                                  <CancelIcon sx={{ color: "#dc2626", fontSize: 22 }} />
                                </Box>
                              ) : (
                                <Typography component="span" variant="body2" sx={{ opacity: 0.45, fontWeight: 600 }}>
                                  {"\u2014"}
                                </Typography>
                              )}
                            </TableCell>
                          );
                        })
                      ) : (
                        <TableCell align="center" sx={{ borderBottom: `1px solid ${borderSubtle}` }}>
                          <Typography component="span" sx={{ opacity: 0.5 }}>
                            {"\u2014"}
                          </Typography>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}

                  {studentsRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2 + (hasSessions ? sessionDates.length : 1)}>
                        <Box py={6} textAlign="center" sx={{ opacity: 0.75 }}>
                          <Typography variant="body1" fontWeight={600}>
                            {t.noData}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
    );
  }

  // ======== LIST VIEW (Groups) ========
  const listIsRtl = language === "ar";
  const listBorder = alpha(theme.palette.divider, theme.palette.mode === "light" ? 0.9 : 0.25);
  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === "light" ? 1 : 0.55),
    },
    "& .MuiInputLabel-root": { fontWeight: 600 },
  };

  return (
    <Box m="20px" dir={listIsRtl ? "rtl" : "ltr"}>
      <Header title={t.presence} subtitle={t.attendancePickGroup} />

      <Paper
        elevation={0}
        sx={{
          mb: 2,
          p: { xs: 1.5, sm: 2 },
          borderRadius: 3,
          border: `1px solid ${listBorder}`,
          background:
            theme.palette.mode === "light"
              ? alpha(theme.palette.primary.main, 0.03)
              : alpha(theme.palette.common.white, 0.04),
          boxShadow:
            theme.palette.mode === "light"
              ? `0 8px 24px ${alpha("#0f172a", 0.05)}`
              : `0 10px 28px ${alpha("#000", 0.25)}`,
        }}
      >
        <Box
          display="grid"
          gap={1.25}
          alignItems="stretch"
          sx={{
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "repeat(3, minmax(0, 1fr))",
              lg: "repeat(4, minmax(0, 1fr))",
              xl: "repeat(5, minmax(0, 1fr))",
            },
          }}
        >
        <TextField
          sx={{ ...fieldSx, gridColumn: { xs: "1 / -1", md: "span 2" } }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          label={t.attendanceSearchGroup}
          placeholder={t.attendanceSearchGroupPh}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: q ? (
              <InputAdornment position="end">
                <IconButton onClick={() => setQ("")} size="small">
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        <TextField
          sx={fieldSx}
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
          label={t.academicYear}
          placeholder={t.academicYearHint}
          InputProps={{
            endAdornment: academicYear ? (
              <InputAdornment position="end">
                <IconButton onClick={() => setAcademicYear("")} size="small">
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        <TextField
          sx={fieldSx}
          select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          label={t.status}
        >
          <MenuItem value="">{t.all}</MenuItem>
          <MenuItem value="true">{t.active}</MenuItem>
          <MenuItem value="false">{t.inactive}</MenuItem>
        </TextField>

        <TextField sx={fieldSx} select value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)} label={t.teacher}>
          <MenuItem value="">{t.all}</MenuItem>
          {teachers.map((x) => (
            <MenuItem key={x.id} value={x.id}>
              {x.fullName}
            </MenuItem>
          ))}
        </TextField>

        <TextField sx={fieldSx} select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} label={t.subject}>
          <MenuItem value="">{t.all}</MenuItem>
          {subjects.map((x) => (
            <MenuItem key={x.id} value={x.id}>
              {x.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          sx={fieldSx}
          select
          value={levelFilter}
          onChange={(e) => {
            const v = e.target.value;
            setLevelFilter(v);
            setSectionFilter("");
            void (async () => {
              try {
                const d = await listSections(v || undefined);
                const list = d?.content ? d.content : d;
                setSections(list || []);
              } catch {
                setSections([]);
              }
            })();
          }}
          label={t.level}
        >
          <MenuItem value="">{t.all}</MenuItem>
          {levels.map((x) => (
            <MenuItem key={x.id} value={x.id}>
              {x.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          sx={fieldSx}
          select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          label={t.section}
          disabled={!levelFilter}
        >
          <MenuItem value="">{t.all}</MenuItem>
          {sections.map((x) => (
            <MenuItem key={x.id} value={x.id}>
              {x.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          sx={fieldSx}
          select
          value={privateFilter}
          onChange={(e) => setPrivateFilter(e.target.value)}
          label={t.privateGroup}
        >
          <MenuItem value="">{t.all}</MenuItem>
          <MenuItem value="true">{t.yes}</MenuItem>
          <MenuItem value="false">{t.no}</MenuItem>
        </TextField>

        <TextField
          sx={fieldSx}
          select
          value={revisionFilter}
          onChange={(e) => setRevisionFilter(e.target.value)}
          label={t.revisionGroup}
        >
          <MenuItem value="">{t.all}</MenuItem>
          <MenuItem value="true">{t.yes}</MenuItem>
          <MenuItem value="false">{t.no}</MenuItem>
        </TextField>
        </Box>
      </Paper>

      {/* Groups table (read-only) */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: `1px solid ${listBorder}`,
          overflow: "hidden",
          boxShadow:
            theme.palette.mode === "light"
              ? `0 8px 24px ${alpha("#0f172a", 0.06)}`
              : `0 12px 32px ${alpha("#000", 0.3)}`,
        }}
      >
      <Box
        height="min(72vh, 720px)"
        minHeight={420}
        dir={listIsRtl ? "rtl" : "ltr"}
        sx={{
          width: "100%",
          "& .MuiDataGrid-root": {
            border: "none",
            fontSize: "0.875rem",
          },
          "& .MuiDataGrid-columnHeaders": {
            background: `linear-gradient(180deg, ${colors.blueAccent[700]} 0%, ${alpha(colors.blueAccent[800], 0.98)} 100%)`,
            borderBottom: `2px solid ${alpha("#000", 0.15)}`,
            color: "#f8fafc",
            fontWeight: 700,
            textAlign: listIsRtl ? "right" : "left",
          },
          "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 700 },
          "& .MuiDataGrid-cell": {
            textAlign: listIsRtl ? "right" : "left",
            borderBottom: `1px solid ${listBorder}`,
          },
          "& .MuiDataGrid-row": {
            minHeight: "52px !important",
            "&:hover": { bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "light" ? 0.06 : 0.12) },
          },
          "& .MuiDataGrid-columnSeparator": {
            color: alpha("#fff", 0.35),
          },
          "& .MuiDataGrid-virtualScroller": {
            backgroundColor: theme.palette.mode === "light" ? colors.primary[100] : colors.primary[400],
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: `1px solid ${listBorder}`,
            backgroundColor: theme.palette.mode === "light" ? colors.blueAccent[100] : colors.blueAccent[400],
          },
        }}
      >
        <DataGrid
          rows={displayGroups}
          columns={groupColumns}
          getRowId={(r) => r.id}
          loading={loadingGroups}
          disableRowSelectionOnClick
          onRowDoubleClick={(params) => openMatrix(params.row)}
          paginationMode="server"
          rowCount={rowCount}
          page={page}
          onPageChange={(p) => setPage(p)}
          pageSizeOptions={[25, 50, 100]}
          paginationModel={{ pageSize, page }}
          onPaginationModelChange={(m) => {
            setPage(m.page);
            setPageSize(m.pageSize);
          }}
        />
      </Box>
      </Paper>
    </Box>
  );
};

export default Attendance;

