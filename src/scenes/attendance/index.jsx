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
  useTheme,
  CircularProgress,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import dayjs from "dayjs";
import * as XLSX from "xlsx";

import Header from "../../components/Header";
import { tokens } from "../../theme";
import translations from "../../translations";

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
  const groupColumns = [
    { field: "id", headerName: "ID", width: 90 },
    { field: "name", headerName: t.groupName || "Group", flex: 1.2 },
    { field: "teacherName", headerName: t.teacher || "Teacher", flex: 1 },
    { field: "subjectName", headerName: t.subject || "Subject", flex: 0.9 },
    { field: "levelName", headerName: t.level || "Level", flex: 0.8 },
    { field: "sectionName", headerName: t.section || "Section", flex: 0.8 },
    { field: "billingModel", headerName: t.billingModel || "Billing", width: 130 },
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
        <IconButton size="small" onClick={() => openMatrix(params.row)} title="View attendance">
          <VisibilityIcon />
        </IconButton>
      ),
    },
  ];

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
    aoa.push([ "Group", selectedGroup.name ?? "", "", "Academic Year", selectedGroup.academicYear ?? "" ]);
    aoa.push([ "Level", levelName, "", "Subject", subjectName, "", "Section", sectionName ]);
    aoa.push([ "Month", monthAnchor.format("MMMM YYYY") ]);
    aoa.push([]); // empty spacer row

    // Table header (only session dates, left->right; if none, one '–' column)
    const header = ["#", language === "ar" ? "الإسم" : "Nom"];
    if (hasSessions) {
      header.push(...sessionDates.map((d) => dayjs(d).format("DD/MM")));
    } else {
      header.push("–");
    }
    aoa.push(header);

    // Table rows (✓ / ✗ / –)
    studentsRows.forEach((s, idx) => {
      const row = [idx + 1, s.name];
      if (!hasSessions) {
        row.push("–");
      } else {
        sessionDates.forEach((d) => {
          const v = s.byDate?.[d] ?? null;
          row.push(v === "P" ? "✓" : v === "A" ? "✗" : "–");
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

  // ======== MATRIX (only session days, L→R) ========
  if (view === "MATRIX") {
    const monthTitle = monthAnchor.format("MMMM YYYY");
    const hasSessions = sessionDates.length > 0;

    return (
      <Box m="20px">
        <Header
          title={language === "ar" ? "الحضور والغياب" : "Présence & Absence"}
          subtitle={selectedGroup?.name ? String(selectedGroup.name) : ""}
        />

        {/* Top controls: arrows + month + export + back */}
        <Box display="flex" alignItems="center" gap={2} mb={2} flexWrap="wrap">
          <IconButton onClick={() => shiftMonth(-1)}>
            <ArrowBackIosNewIcon />
          </IconButton>

          <Typography
            variant="h6"
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              background: theme.palette.mode === "light" ? "#1f3b6d" : "#24407a",
              color: "#fff",
              fontWeight: "bold",
            }}
          >
            {monthTitle}
          </Typography>

          <IconButton onClick={() => shiftMonth(1)}>
            <ArrowForwardIosIcon />
          </IconButton>

          <Box sx={{ flex: 1 }} />

          <Button variant="contained" onClick={handleExportExcel} startIcon={<FileDownloadIcon />}>
            {language === "ar" ? "تصدير Excel" : "Export Excel"}
          </Button>

          <Button
            variant="outlined"
            startIcon={<ReplyIcon />}
            onClick={() => {
              setView("LIST");
              setSelectedGroup(null);
            }}
          >
            {language === "ar" ? "رجوع" : "Back"}
          </Button>
        </Box>

        {/* Matrix table */}
        <Paper sx={{ overflow: "auto", borderRadius: 2 }}>
          {matrixLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" p={6}>
              <CircularProgress />
            </Box>
          ) : (
            <Table size="small" stickyHeader>
              <TableHead>
                {/* Month bar */}
                <TableRow>
                  <TableCell sx={{ fontWeight: "bold", width: 60 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: "bold", minWidth: 220 }}>
                    {language === "ar" ? "الإسم" : "Nom"}
                  </TableCell>
                  <TableCell
                    align="center"
                    colSpan={hasSessions ? sessionDates.length : 1}
                    sx={{ fontWeight: "bold", backgroundColor: "#9AA3FF55" }}
                  >
                    {monthAnchor.format("MMMM")}
                  </TableCell>
                </TableRow>

                {/* Header dates (or single '–') */}
                <TableRow>
                  <TableCell />
                  <TableCell />
                  {hasSessions ? (
                    sessionDates.map((d) => (
                      <TableCell key={d} align="center" sx={{ whiteSpace: "nowrap" }}>
                        {dayjs(d).format("DD/MM")}
                      </TableCell>
                    ))
                  ) : (
                    <TableCell align="center">–</TableCell>
                  )}
                </TableRow>
              </TableHead>

              <TableBody>
                {studentsRows.map((s, idx) => (
                  <TableRow key={s.id || idx} hover>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{s.name}</TableCell>

                    {hasSessions ? (
                      sessionDates.map((d) => {
                        const v = s.byDate?.[d] ?? null;
                        return (
                          <TableCell key={`${s.id}-${d}`} align="center">
                            {v === "P" ? (
                              <CheckCircleIcon sx={{ color: "#22c55e" }} fontSize="small" />
                            ) : v === "A" ? (
                              <CancelIcon sx={{ color: "#ef4444" }} fontSize="small" />
                            ) : (
                              <Typography component="span" sx={{ opacity: 0.5 }}>
                                –
                              </Typography>
                            )}
                          </TableCell>
                        );
                      })
                    ) : (
                      <TableCell align="center">
                        <Typography component="span" sx={{ opacity: 0.5 }}>
                          –
                        </Typography>
                      </TableCell>
                    )}
                  </TableRow>
                ))}

                {studentsRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2 + (hasSessions ? sessionDates.length : 1)}>
                      <Box py={4} textAlign="center" sx={{ opacity: 0.7 }}>
                        {language === "ar" ? "لا توجد بيانات" : "No data"}
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Paper>
      </Box>
    );
  }

  // ======== LIST VIEW (Groups) ========
  return (
    <Box m="20px">
      <Header
        title={language === "ar" ? "الحضور والغياب" : "Présence & Absence"}
        subtitle={language === "ar" ? "قائمة الأفواج - اختيار فقط" : "Select a group to view attendance"}
      />

      {/* Filter Bar (read-only list + filters) */}
      <Box
        mb={2}
        display="grid"
        gridTemplateColumns="1.3fr 0.9fr 0.8fr 1fr 1fr 1fr 1fr 0.9fr 0.9fr"
        gap={1}
        alignItems="center"
        dir={language === "ar" ? "rtl" : "ltr"}
      >
        <TextField
          value={q}
          onChange={(e) => setQ(e.target.value)}
          label={language === "ar" ? "بحث بالإسم" : "Search by name"}
          placeholder={language === "ar" ? "اكتب اسم الفوج..." : "Type group name..."}
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
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
          label={language === "ar" ? "السنة الدراسية" : "Academic Year"}
          placeholder={language === "ar" ? "مثال: 2024-2025" : "e.g. 2024-2025"}
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
          select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          label={language === "ar" ? "الحالة" : "Status"}
        >
          <MenuItem value="">{language === "ar" ? "الكل" : "All"}</MenuItem>
          <MenuItem value="true">{language === "ar" ? "مفعل" : "Active"}</MenuItem>
          <MenuItem value="false">{language === "ar" ? "غير مفعل" : "Inactive"}</MenuItem>
        </TextField>

        <TextField select value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)} label={t.teacher}>
          <MenuItem value="">{language === "ar" ? "الكل" : "All"}</MenuItem>
          {teachers.map((x) => (
            <MenuItem key={x.id} value={x.id}>
              {x.fullName}
            </MenuItem>
          ))}
        </TextField>

        <TextField select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} label={t.subject}>
          <MenuItem value="">{language === "ar" ? "الكل" : "All"}</MenuItem>
          {subjects.map((x) => (
            <MenuItem key={x.id} value={x.id}>
              {x.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
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
          <MenuItem value="">{language === "ar" ? "الكل" : "All"}</MenuItem>
          {levels.map((x) => (
            <MenuItem key={x.id} value={x.id}>
              {x.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          label={t.section}
          disabled={!levelFilter}
        >
          <MenuItem value="">{language === "ar" ? "الكل" : "All"}</MenuItem>
          {sections.map((x) => (
            <MenuItem key={x.id} value={x.id}>
              {x.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          value={privateFilter}
          onChange={(e) => setPrivateFilter(e.target.value)}
          label={language === "ar" ? "خاصة" : "Private"}
        >
          <MenuItem value="">{language === "ar" ? "الكل" : "All"}</MenuItem>
          <MenuItem value="true">{language === "ar" ? "نعم" : "Yes"}</MenuItem>
          <MenuItem value="false">{language === "ar" ? "لا" : "No"}</MenuItem>
        </TextField>

        <TextField
          select
          value={revisionFilter}
          onChange={(e) => setRevisionFilter(e.target.value)}
          label={language === "ar" ? "مراجعة" : "Revision"}
        >
          <MenuItem value="">{language === "ar" ? "الكل" : "All"}</MenuItem>
          <MenuItem value="true">{language === "ar" ? "نعم" : "Yes"}</MenuItem>
          <MenuItem value="false">{language === "ar" ? "لا" : "No"}</MenuItem>
        </TextField>
      </Box>

      {/* Groups table (read-only) */}
      <Box
        height="75vh"
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
        }}
      >
        <DataGrid
          rows={groups}
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
    </Box>
  );
};

export default Attendance;
