// src/scenes/groups/Groups.jsx
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  useTheme,
  FormControlLabel,
  Checkbox,
  Typography,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useState, useEffect, useMemo } from "react";
import { Formik } from "formik";
import * as yup from "yup";

import { tokens } from "../../theme";
import Header from "../../components/Header";
import translations from "../../translations/index";

import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import UpdateIcon from "@mui/icons-material/Update";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

// APIs
import { listTeachers } from "../../api/teachersApi";
import { listSubjects } from "../../api/subjectsApi";
import { listLevels } from "../../api/levelsApi";
import { listSections } from "../../api/sectionsApi";
import {
  searchGroups,
  createGroup,
  updateGroup,
  getGroup,
  deleteGroup,
} from "../../api/groupsApi";

const DEBOUNCE_MS = 350;

/* ---------- helpers (format + compute preview) ---------- */
const fmtDA = (n, lang = "ar") =>
  n == null
    ? ""
    : new Intl.NumberFormat(lang === "ar" ? "ar-DZ" : "fr-DZ", {
        style: "currency",
        currency: "DZD",
        maximumFractionDigits: 2,
      }).format(Number(n));

const toNum = (v) => (v === "" || v == null || isNaN(v) ? null : Number(v));

/** Preview that mirrors backend logic. Returns { perHour, perSession, perMonth }. */
const calcShare = (v) => {
  const bm = v?.billingModel;
  const t = v?.teacherShareType;
  const val = toNum(v?.teacherShareValue);
  const monthlyFee = toNum(v?.monthlyFee);
  const sessionCost = toNum(v?.sessionCost);
  const hourlyCost = toNum(v?.hourlyCost);
  const spm = toNum(v?.sessionsPerMonth);
  const durMin = toNum(v?.sessionDurationMin);

  const res = { perHour: null, perSession: null, perMonth: null };
  if (!bm || !t || val == null) return res;

  if (bm === "MONTHLY") {
    if (t === "PERCENT" && monthlyFee != null) {
      res.perMonth = (monthlyFee * val) / 100;
      if (spm) res.perSession = res.perMonth / spm;
    }
    if (t === "FIXED") {
      res.perSession = val; // flat per session
      if (spm) res.perMonth = val * spm;
    }
  }

  if (bm === "PER_SESSION") {
    if (t === "PERCENT" && sessionCost != null) {
      res.perSession = (sessionCost * val) / 100;
    }
    if (t === "FIXED") {
      res.perSession = val;
    }
    if (spm && res.perSession != null) res.perMonth = res.perSession * spm; // not shown in UI
  }

  if (bm === "PER_HOUR") {
    if (t === "PERCENT" && hourlyCost != null) {
      res.perHour = (hourlyCost * val) / 100;
    }
    if (t === "FIXED") {
      res.perHour = val;
    }
    if (res.perHour != null && durMin) {
      res.perSession = res.perHour * (durMin / 60);
    }
  }

  return res;
};

// safe value formatter for DataGrid (prevents destructuring errors)
const currencyVF = (lang) => (params) => {
  const v = params?.value;
  return v == null ? "" : fmtDA(v, lang);
};

const Groups = ({ language = "ar" }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = translations[language] || translations["fr"];

  // style to force required asterisk red
  const requiredAsteriskSx = { "& .MuiFormLabel-asterisk": { color: theme.palette.error.main } };

  // data
  const [groups, setGroups] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [levels, setLevels] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);

  // dialogs
  const [openDialog, setOpenDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  // delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [activeFilter, setActiveFilter] = useState(""); // "", "true", "false"
  const [teacherFilter, setTeacherFilter] = useState(""); // id or ""
  const [subjectFilter, setSubjectFilter] = useState(""); // id or ""
  const [levelFilter, setLevelFilter] = useState(""); // id or ""
  const [sectionFilter, setSectionFilter] = useState(""); // id or ""
  const [privateFilter, setPrivateFilter] = useState(""); // "", "true", "false"
  const [revisionFilter, setRevisionFilter] = useState(""); // "", "true", "false"

  // debounce keys
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
    ]
  );

  // initial loads
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const [teachersList, subjectsList, levelsList, sectionsList] = await Promise.all([
          listTeachers(),
          listSubjects(),
          listLevels(),
          listSections(),
        ]);
        setTeachers(teachersList || []);
        setSubjects(subjectsList || []);
        setLevels(levelsList || []);
        setSections(sectionsList?.content ? sectionsList.content : sectionsList || []);
        await loadGroups();
      } catch (err) {
        console.error("Error loading dropdown data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reload on filters (debounced)
  useEffect(() => {
    const handle = setTimeout(() => {
      loadGroups();
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, debouncedKeys);

  const parseTri = (val) => (val === "true" ? true : val === "false" ? false : undefined);

  const loadGroups = async () => {
    setLoading(true);
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
        page: 0,
        size: 50,
        sort: "name,asc",
      });
      const raw = res?.content ? res.content : res ?? [];
      const enriched = raw.map((g) => {
        const preview = calcShare(g);
        return {
          ...g,
          teacherName: teachers.find((x) => x.id === g.teacherId)?.fullName || "",
          subjectName: subjects.find((x) => x.id === g.subjectId)?.name || "",
          levelName: levels.find((x) => x.id === g.levelId)?.name || "",
          sectionName: sections.find((x) => x.id === g.sectionId)?.name || "",
          teacherSharePerSession: g.teacherSharePerSession ?? preview.perSession ?? null,
          teacherSharePerHour: g.teacherSharePerHour ?? preview.perHour ?? null,
          teacherSharePerMonth: g.teacherSharePerMonth ?? preview.perMonth ?? null,
        };
      });
      setGroups(enriched);
    } catch (err) {
      console.error("Failed to load groups", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setEditingGroup(null);
    setOpenDialog(true);
  };

  const handleClose = () => {
    setEditingGroup(null);
    setOpenDialog(false);
  };

  // filter: when Level changes, refresh sections for that level
  const handleChangeLevelFilter = async (levelId) => {
    setLevelFilter(levelId);
    setSectionFilter(""); // reset section
    try {
      if (levelId) {
        const d = await listSections(levelId);
        const list = d?.content ? d.content : d;
        setSections(list || []);
      } else {
        const d = await listSections();
        const list = d?.content ? d.content : d;
        setSections(list || []);
      }
    } catch (e) {
      // ignore
    }
  };

  const fetchSectionsForLevel = async (levelId, setFieldValue) => {
    setFieldValue("levelId", levelId);
    try {
      const data = await listSections(levelId);
      const list = data?.content ? data.content : data;
      setSections(list || []);
    } catch (err) {
      console.error("Failed to load sections for level", err);
      setSections([]);
    }
  };

  const handleEdit = (row) => {
    setEditingGroup(row);
    setOpenDialog(true);
    if (row?.levelId) {
      listSections(row.levelId).then((d) => setSections(d?.content ? d.content : d || []));
    }
  };

  // Delete handlers
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setGroupToDelete(null);
    setDeleteError("");
  };

  const handleConfirmDelete = async () => {
    if (!groupToDelete) return;
    try {
      await deleteGroup(groupToDelete.id);
      await loadGroups();
      setDeleteError("");
      setDeleteDialogOpen(false);
      setGroupToDelete(null);
    } catch (err) {
      let message =
        err.response?.data?.message ||
        err.message ||
        t.deleteFailed ||
        "Delete failed. Please try again later.";

      if (
        message.includes("Cannot delete or update a parent row") ||
        message.includes("Full authentication is required")
      ) {
        message =
          language === "ar"
            ? "لا يمكن حذف هذا الفوج لأنه مرتبط بسجلات أخرى."
            : "Impossible de supprimer ce groupe car il est encore lié à d'autres enregistrements.";
      }

      setDeleteError(message);
    }
  };

  /* ---------- columns (with safe valueFormatters) ---------- */
  const columns = [
    { field: "id", headerName: "ID", width: 80 },
    { field: "name", headerName: t.groupName || "إسم الفوج", flex: 1.2 },
    { field: "teacherName", headerName: t.teacher, flex: 1 },
    { field: "subjectName", headerName: t.subject, flex: 0.9 },
    { field: "levelName", headerName: t.level, flex: 0.8 },
    { field: "sectionName", headerName: t.section, flex: 0.8 },
    { field: "billingModel", headerName: t.billingModel, width: 130 },

    {
      field: "teacherSharePerSession",
      headerName: language === "ar" ? "نصيب/حصة" : "Share/Session",
      width: 130,
      valueFormatter: currencyVF(language),
      sortComparator: (a, b) => (a ?? 0) - (b ?? 0),
    },
    {
      field: "teacherSharePerHour",
      headerName: language === "ar" ? "نصيب/ساعة" : "Share/Hour",
      width: 120,
      valueFormatter: currencyVF(language),
      sortComparator: (a, b) => (a ?? 0) - (b ?? 0),
    },
    {
      field: "teacherSharePerMonth",
      headerName: language === "ar" ? "نصيب/شهر" : "Share/Month",
      width: 130,
      valueFormatter: currencyVF(language),
      sortComparator: (a, b) => (a ?? 0) - (b ?? 0),
    },

    { field: "capacity", headerName: t.capacity, width: 110 },
    { field: "startDate", headerName: t.startDate, width: 130 },
    { field: "notes", headerName: t.notes, flex: 1 },
    {
      field: "actions",
      headerName: t.actions,
      width: 180,
      renderCell: (params) => (
        <Box display="flex" gap={1} mt={1}>
          <Button
            onClick={() => handleEdit(params.row)}
            variant="contained"
            size="small"
            sx={{
              backgroundColor:
                theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400],
              color: "#fff",
              "&:hover": {
                backgroundColor:
                  theme.palette.mode === "light" ? colors.blueAccent[400] : colors.blueAccent[800],
              },
            }}
            startIcon={<EditIcon />}
          />
          <Button
            onClick={() => {
              setGroupToDelete(params.row);
              setDeleteDialogOpen(true);
            }}
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
        </Box>
      ),
    },
  ];

  /* ---------- validation ---------- */
  const groupSchema = yup.object().shape({
    name: yup.string().required("مطلوب"),
    academicYear: yup.string().required("مطلوب"),
    teacherId: yup.number().typeError("اختر أستاذ").required("مطلوب"),
    subjectId: yup.number().typeError("اختر مادة").required("مطلوب"),
    levelId: yup.number().typeError("اختر مستوى").required("مطلوب"),
    sectionId: yup.number().typeError("اختر شعبة").required("مطلوب"),
    privateGroup: yup.boolean(),
    revisionGroup: yup.boolean(),
    active: yup.boolean(),
    capacity: yup
      .number()
      .transform((val, orig) => (orig === "" ? null : val))
      .nullable()
      .positive("يجب أن يكون أكبر من 0")
      .required("مطلوب"),
    billingModel: yup.string().required("مطلوب"),

    monthlyFee: yup
      .number()
      .transform((v, o) => (o === "" ? null : v))
      .nullable()
      .when("billingModel", { is: "MONTHLY", then: (s) => s.required("مطلوب") }),

    sessionsPerMonth: yup
      .number()
      .transform((v, o) => (o === "" ? null : v))
      .nullable()
      .when(["billingModel", "teacherShareType"], {
        is: (bm, ts) => bm === "MONTHLY" && ts === "FIXED",
        then: (s) => s.min(1, "أدخل عدد الحصص").required("مطلوب"),
      }),

    sessionCost: yup
      .number()
      .transform((v, o) => (o === "" ? null : v))
      .nullable()
      .when("billingModel", { is: "PER_SESSION", then: (s) => s.required("مطلوب") }),

    hourlyCost: yup
      .number()
      .transform((v, o) => (o === "" ? null : v))
      .nullable()
      .when("billingModel", { is: "PER_HOUR", then: (s) => s.required("مطلوب") }),

    sessionDurationMin: yup
      .number()
      .transform((v, o) => (o === "" ? null : v))
      .nullable()
      .when("billingModel", { is: "PER_HOUR", then: (s) => s.min(1).required("مطلوب") }),

    teacherShareType: yup.string().oneOf(["PERCENT", "FIXED"]).required("مطلوب"),
    teacherShareValue: yup
      .number()
      .transform((v, o) => (o === "" ? null : v))
      .nullable()
      .required("مطلوب")
      .when("teacherShareType", {
        is: "PERCENT",
        then: (s) => s.min(0, "0%").max(100, "100%").typeError("٪"),
      }),
  });

  const initialValues = {
    name: "",
    academicYear: "",
    teacherId: "",
    subjectId: "",
    levelId: "",
    sectionId: "",
    privateGroup: false,
    revisionGroup: false,
    active: true,
    capacity: 10,
    billingModel: "MONTHLY",
    sessionsPerMonth: "",
    monthlyFee: "",
    sessionCost: "",
    hourlyCost: "",
    sessionDurationMin: "",
    teacherShareType: "PERCENT",
    teacherShareValue: "",
    allowCheckInWithoutBalance: false,
    requireFirstLessonAttendance: false,
    registerFirstAbsence: false,
    lastLessonReminder: false,
    absenceStopThreshold: "",
    warnDuplicateCard: false,
    allowMultipleCheckinsPerDay: false,
    startDate: "",
    notes: "",
  };

  const handleSave = async (values, { setSubmitting }) => {
    try {
      const payload = {
        name: values.name,
        academicYear: values.academicYear,
        teacherId: Number(values.teacherId),
        subjectId: Number(values.subjectId),
        levelId: Number(values.levelId),
        sectionId: Number(values.sectionId),
        privateGroup: Boolean(values.privateGroup),
        revisionGroup: Boolean(values.revisionGroup),
        active: Boolean(values.active),
        capacity: Number(values.capacity),
        billingModel: values.billingModel,
        sessionsPerMonth: values.sessionsPerMonth ? Number(values.sessionsPerMonth) : null,
        monthlyFee: values.monthlyFee ? Number(values.monthlyFee) : null,
        sessionCost: values.sessionCost ? Number(values.sessionCost) : null,
        hourlyCost: values.hourlyCost ? Number(values.hourlyCost) : null,
        sessionDurationMin: values.sessionDurationMin ? Number(values.sessionDurationMin) : null,
        teacherShareType: values.teacherShareType,
        teacherShareValue: values.teacherShareValue ? Number(values.teacherShareValue) : null,
        allowCheckInWithoutBalance: Boolean(values.allowCheckInWithoutBalance),
        requireFirstLessonAttendance: Boolean(values.requireFirstLessonAttendance),
        registerFirstAbsence: Boolean(values.registerFirstAbsence),
        lastLessonReminder: Boolean(values.lastLessonReminder),
        absenceStopThreshold: values.absenceStopThreshold
          ? Number(values.absenceStopThreshold)
          : null,
        warnDuplicateCard: Boolean(values.warnDuplicateCard),
        allowMultipleCheckinsPerDay: Boolean(values.allowMultipleCheckinsPerDay),
        startDate: values.startDate || null,
        notes: values.notes || null,
      };

      if (editingGroup?.id) {
        const updated = await updateGroup(editingGroup.id, payload);
        const fresh = await getGroup(updated.id);
        const preview = calcShare(fresh);
        const enriched = {
          ...fresh,
          teacherName: teachers.find((x) => x.id === fresh.teacherId)?.fullName || "",
          subjectName: subjects.find((x) => x.id === fresh.subjectId)?.name || "",
          levelName: levels.find((x) => x.id === fresh.levelId)?.name || "",
          sectionName: sections.find((x) => x.id === fresh.sectionId)?.name || "",
          teacherSharePerSession: fresh.teacherSharePerSession ?? preview.perSession ?? null,
          teacherSharePerHour: fresh.teacherSharePerHour ?? preview.perHour ?? null,
          teacherSharePerMonth: fresh.teacherSharePerMonth ?? preview.perMonth ?? null,
        };
        setGroups((prev) => prev.map((g) => (g.id === enriched.id ? enriched : g)));
      } else {
        const created = await createGroup(payload);
        const fresh = await getGroup(created.id);
        const preview = calcShare(fresh);
        const enriched = {
          ...fresh,
          teacherName: teachers.find((x) => x.id === fresh.teacherId)?.fullName || "",
          subjectName: subjects.find((x) => x.id === fresh.subjectId)?.name || "",
          levelName: levels.find((x) => x.id === fresh.levelId)?.name || "",
          sectionName: sections.find((x) => x.id === fresh.sectionId)?.name || "",
          teacherSharePerSession: fresh.teacherSharePerSession ?? preview.perSession ?? null,
          teacherSharePerHour: fresh.teacherSharePerHour ?? preview.perHour ?? null,
          teacherSharePerMonth: fresh.teacherSharePerMonth ?? preview.perMonth ?? null,
        };
        setGroups((prev) => [...prev, enriched]);
      }

      setOpenDialog(false);
      setEditingGroup(null);
    } catch (err) {
      console.error("Save group failed", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box m="20px">
      <Header title={t.groups} subtitle={t.dataManagement} />

      {/* Filter Bar */}
      <Box
        mb={2}
        display="grid"
        gridTemplateColumns="1.3fr 0.9fr 0.8fr 1fr 1fr 1fr 1fr 0.9fr 0.9fr auto"
        gap={1}
        alignItems="center"
        dir={language === "ar" ? "rtl" : "ltr"}
      >
        {/* Name (q) */}
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

        {/* Academic Year */}
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

        {/* Active */}
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

        {/* Teacher */}
        <TextField select value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)} label={t.teacher}>
          <MenuItem value="">{language === "ar" ? "الكل" : "All"}</MenuItem>
          {teachers.map((x) => (
            <MenuItem key={x.id} value={x.id}>
              {x.fullName}
            </MenuItem>
          ))}
        </TextField>

        {/* Subject */}
        <TextField select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} label={t.subject}>
          <MenuItem value="">{language === "ar" ? "الكل" : "All"}</MenuItem>
          {subjects.map((x) => (
            <MenuItem key={x.id} value={x.id}>
              {x.name}
            </MenuItem>
          ))}
        </TextField>

        {/* Level */}
        <TextField select value={levelFilter} onChange={(e) => handleChangeLevelFilter(e.target.value)} label={t.level}>
          <MenuItem value="">{language === "ar" ? "الكل" : "All"}</MenuItem>
          {levels.map((x) => (
            <MenuItem key={x.id} value={x.id}>
              {x.name}
            </MenuItem>
          ))}
        </TextField>

        {/* Section (depends on level) */}
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

        {/* Private */}
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

        {/* Revision */}
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

        {/* Add Group */}
        <Box display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            sx={{
              backgroundColor:
                theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400],
              color: "#fff",
              "& .MuiButton-startIcon": {
                marginInlineEnd: language === "ar" ? "8px" : "6px",
              },
              "&:hover": {
                backgroundColor:
                  theme.palette.mode === "light" ? colors.blueAccent[400] : colors.blueAccent[800],
              },
            }}
            startIcon={<AddIcon />}
            onClick={handleOpen}
          >
            {t.addGroup || "Add Group"}
          </Button>
        </Box>
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
          "& .MuiDataGrid-cell": { textAlign: language === "ar" ? "right" : "left" },
          "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
          "& .MuiDataGrid-footerContainer": { borderTop: "none", backgroundColor: colors.blueAccent[400] },
          "& .MuiCheckbox-root.Mui-checked": {
            color: theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400],
          },
        }}
      >
        <DataGrid
          rows={groups}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
        />
      </Box>

      {/* Create / Edit Dialog */}
      <Dialog open={openDialog} onClose={handleClose} fullWidth maxWidth="md">
        <DialogTitle
          sx={{
            backgroundColor: theme.palette.mode === "light" ? "#0d47a1" : "#4274c7",
            color: "#fff",
            fontWeight: "bold",
          }}
        >
          {editingGroup ? t.editGroup : t.addGroup}
        </DialogTitle>

        <Formik
          initialValues={editingGroup || initialValues}
          validationSchema={groupSchema}
          enableReinitialize
          onSubmit={handleSave}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            handleSubmit,
            setFieldValue,
            isSubmitting,
          }) => {
            const preview = calcShare(values);
            const isPercent = values.teacherShareType === "PERCENT";
            let shareLabel = "قيمة نصيب الأستاذ";
            if (isPercent) {
              shareLabel = "نسبة نصيب الأستاذ (%)";
            } else {
              shareLabel =
                values.billingModel === "PER_HOUR"
                  ? "نصيب الأستاذ لكل ساعة (دج)"
                  : "نصيب الأستاذ لكل حصة (دج)";
            }

            const clampPercent = (e) => {
              if (!isPercent) return;
              const raw = Number(e.target.value);
              if (isNaN(raw)) return;
              const clamped = Math.max(0, Math.min(100, raw));
              setFieldValue("teacherShareValue", clamped);
            };

            return (
              <form onSubmit={handleSubmit}>
                <DialogContent>
                  <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                    {/* Group Name */}
                    <TextField
                      name="name"
                      label="إسم الفوج *"
                      value={values.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.name && Boolean(errors.name)}
                      helperText={touched.name && errors.name}
                      required
                      sx={requiredAsteriskSx}
                    />

                    {/* Academic Year */}
                    <TextField
                      name="academicYear"
                      label="السنة الدراسية *"
                      value={values.academicYear}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.academicYear && Boolean(errors.academicYear)}
                      helperText={touched.academicYear && errors.academicYear}
                      required
                      sx={requiredAsteriskSx}
                    />

                    {/* Teacher */}
                    <TextField
                      select
                      name="teacherId"
                      label="الأستاذ *"
                      value={values.teacherId || ""}
                      onChange={handleChange}
                      required
                      sx={requiredAsteriskSx}
                    >
                      <MenuItem value="">-- اختر --</MenuItem>
                      {teachers.map((tc) => (
                        <MenuItem key={tc.id} value={tc.id}>
                          {tc.fullName}
                        </MenuItem>
                      ))}
                    </TextField>

                    {/* Subject */}
                    <TextField
                      select
                      name="subjectId"
                      label="المادة *"
                      value={values.subjectId || ""}
                      onChange={handleChange}
                      required
                      sx={requiredAsteriskSx}
                    >
                      <MenuItem value="">-- اختر --</MenuItem>
                      {subjects.map((s) => (
                        <MenuItem key={s.id} value={s.id}>
                          {s.name}
                        </MenuItem>
                      ))}
                    </TextField>

                    {/* Level */}
                    <TextField
                      select
                      name="levelId"
                      label="المستوى *"
                      value={values.levelId || ""}
                      onChange={(e) => fetchSectionsForLevel(e.target.value, setFieldValue)}
                      required
                      sx={requiredAsteriskSx}
                    >
                      <MenuItem value="">-- اختر --</MenuItem>
                      {levels.map((lvl) => (
                        <MenuItem key={lvl.id} value={lvl.id}>
                          {lvl.name}
                        </MenuItem>
                      ))}
                    </TextField>

                    {/* Section */}
                    <TextField
                      select
                      name="sectionId"
                      label="الشعبة *"
                      value={values.sectionId || ""}
                      onChange={handleChange}
                      disabled={!values.levelId}
                      required
                      sx={requiredAsteriskSx}
                    >
                      <MenuItem value="">-- اختر --</MenuItem>
                      {sections.map((sec) => (
                        <MenuItem key={sec.id} value={sec.id}>
                          {sec.name}
                        </MenuItem>
                      ))}
                    </TextField>

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={Boolean(values.privateGroup)}
                          onChange={(e) => setFieldValue("privateGroup", e.target.checked)}
                        />
                      }
                      label="مجموعة خاصة"
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={Boolean(values.revisionGroup)}
                          onChange={(e) => setFieldValue("revisionGroup", e.target.checked)}
                        />
                      }
                      label="مجموعة مراجعة"
                    />

                    {/* Capacity */}
                    <TextField
                      type="number"
                      name="capacity"
                      label="سعة الفوج *"
                      value={values.capacity}
                      onChange={handleChange}
                      required
                      sx={requiredAsteriskSx}
                    />

                    {/* Billing Model */}
                    <TextField
                      select
                      name="billingModel"
                      label="نموذج الفوترة *"
                      value={values.billingModel}
                      onChange={handleChange}
                      required
                      sx={requiredAsteriskSx}
                    >
                      <MenuItem value="MONTHLY">شهري</MenuItem>
                      <MenuItem value="PER_SESSION">لكل حصة</MenuItem>
                      <MenuItem value="PER_HOUR">لكل ساعة</MenuItem>
                    </TextField>

                    {/* Billing conditional */}
                    {values.billingModel === "MONTHLY" && (
                      <>
                        <TextField
                          type="number"
                          name="monthlyFee"
                          label="الإشتراك الشهري *"
                          value={values.monthlyFee}
                          onChange={handleChange}
                          required
                          sx={requiredAsteriskSx}
                        />
                        <TextField
                          type="number"
                          name="sessionsPerMonth"
                          label={
                            values.teacherShareType === "FIXED"
                              ? "عدد الحصص في الشهر *"
                              : "عدد الحصص في الشهر"
                          }
                          value={values.sessionsPerMonth}
                          onChange={handleChange}
                          required={values.teacherShareType === "FIXED"}
                          sx={values.teacherShareType === "FIXED" ? requiredAsteriskSx : undefined}
                        />
                      </>
                    )}
                    {values.billingModel === "PER_SESSION" && (
                      <TextField
                        type="number"
                        name="sessionCost"
                        label="سعر الحصة *"
                        value={values.sessionCost}
                        onChange={handleChange}
                        required
                        sx={requiredAsteriskSx}
                      />
                    )}
                    {values.billingModel === "PER_HOUR" && (
                      <>
                        <TextField
                          type="number"
                          name="hourlyCost"
                          label="سعر الساعة *"
                          value={values.hourlyCost}
                          onChange={handleChange}
                          required
                          sx={requiredAsteriskSx}
                        />
                        <TextField
                          type="number"
                          name="sessionDurationMin"
                          label="مدة الحصة بالدقائق *"
                          value={values.sessionDurationMin}
                          onChange={handleChange}
                          required
                          sx={requiredAsteriskSx}
                        />
                      </>
                    )}

                    {/* Teacher Share */}
                    <TextField
                      select
                      name="teacherShareType"
                      label="نوع نصيب الأستاذ *"
                      value={values.teacherShareType}
                      onChange={handleChange}
                      required
                      sx={requiredAsteriskSx}
                    >
                      <MenuItem value="PERCENT">٪ نسبة</MenuItem>
                      <MenuItem value="FIXED">مبلغ ثابت</MenuItem>
                    </TextField>

                    <TextField
                      type="number"
                      name="teacherShareValue"
                      label={shareLabel + " *"}
                      value={values.teacherShareValue}
                      onChange={handleChange}
                      onBlur={clampPercent}
                      error={touched.teacherShareValue && Boolean(errors.teacherShareValue)}
                      helperText={
                        (touched.teacherShareValue && errors.teacherShareValue) ||
                        (isPercent
                          ? language === "ar"
                            ? "يُحسب كنسبة من السعر (شهري/حصة/ساعة حسب النموذج)"
                            : "Calculated as % of price (monthly/session/hour)."
                          : values.billingModel === "PER_HOUR"
                          ? language === "ar"
                            ? "مبلغ ثابت لكل ساعة"
                            : "Flat amount per hour"
                          : language === "ar"
                          ? "مبلغ ثابت لكل حصة"
                          : "Flat amount per session")
                      }
                      required
                      sx={requiredAsteriskSx}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            {isPercent ? "%" : language === "ar" ? "دج" : "DA"}
                          </InputAdornment>
                        ),
                        inputProps: isPercent ? { min: 0, max: 100, step: "any" } : { step: "any" },
                      }}
                    />

                    {/* Preview (live) — MONTHLY: per session + per month; PER_SESSION: per session only; PER_HOUR: per hour only */}
                    <Box
                      gridColumn="1 / span 2"
                      sx={{ mt: 1, p: 1.5, borderRadius: 1, background: "rgba(255,255,255,0.05)" }}
                    >
                      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                        {language === "ar" ? "معاينة نصيب الأستاذ" : "Teacher Share Preview"}
                      </Typography>

                      {values.billingModel === "MONTHLY" && (
                        <Box display="flex" gap={3} flexWrap="wrap">
                          <Typography variant="body2">
                            {language === "ar" ? "لكل حصة:" : "Per session:"}{" "}
                            <b>
                              {preview.perSession != null ? fmtDA(preview.perSession, language) : "-"}
                            </b>
                          </Typography>
                          <Typography variant="body2">
                            {language === "ar" ? "شهرياً:" : "Per month:"}{" "}
                            <b>
                              {preview.perMonth != null ? fmtDA(preview.perMonth, language) : "-"}
                            </b>
                          </Typography>
                        </Box>
                      )}

                      {values.billingModel === "PER_SESSION" && (
                        <Box display="flex" gap={3} flexWrap="wrap">
                          <Typography variant="body2">
                            {language === "ar" ? "لكل حصة:" : "Per session:"}{" "}
                            <b>
                              {preview.perSession != null ? fmtDA(preview.perSession, language) : "-"}
                            </b>
                          </Typography>
                        </Box>
                      )}

                      {values.billingModel === "PER_HOUR" && (
                        <Box display="flex" gap={3} flexWrap="wrap">
                          <Typography variant="body2">
                            {language === "ar" ? "لكل ساعة:" : "Per hour:"}{" "}
                            <b>
                              {preview.perHour != null ? fmtDA(preview.perHour, language) : "-"}
                            </b>
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Start Date */}
                    <TextField
                      type="date"
                      name="startDate"
                      label="تاريخ البداية"
                      value={values.startDate || ""}
                      onChange={handleChange}
                      InputLabelProps={{ shrink: true }}
                    />

                    {/* Notes */}
                    <TextField
                      name="notes"
                      label="ملاحظات"
                      multiline
                      value={values.notes}
                      onChange={handleChange}
                    />
                  </Box>
                </DialogContent>

                <DialogActions sx={{ gap: 2 }}>
                  <Button
                    onClick={handleClose}
                    variant="outlined"
                    sx={{
                      color: theme.palette.error.main,
                      borderColor: theme.palette.error.main,
                      "&:hover": {
                        backgroundColor: theme.palette.error.light,
                        borderColor: theme.palette.error.dark,
                        color: "#fff",
                        gap: "8px",
                      },
                    }}
                    startIcon={<CloseIcon />}
                  >
                    {t.cancel || "Cancel"}
                  </Button>

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isSubmitting}
                    sx={{
                      backgroundColor:
                        theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400],
                      color: "#fff",
                      gap: "8px",
                      "&:hover": {
                        backgroundColor:
                          theme.palette.mode === "light" ? colors.blueAccent[400] : colors.blueAccent[800],
                      },
                    }}
                    startIcon={isSubmitting ? null : editingGroup ? <UpdateIcon /> : <SaveIcon />}
                  >
                    {isSubmitting ? t.saving || "Saving..." : editingGroup ? t.update || "Update" : t.save || "Save"}
                  </Button>
                </DialogActions>
              </form>
            );
          }}
        </Formik>
      </Dialog>

      {/* Delete dialog */}
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
            <Typography sx={{ color: "yellow", fontWeight: "bold" }}>{deleteError}</Typography>
          ) : (
            <Typography>{t.confirmDeleteMessageGroup || "Do you want to delete this group?"}</Typography>
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
            variant="contained"
            disabled={!!deleteError}
            sx={{ backgroundColor: "#fff", color: "#1e3a8a", "&:hover": { backgroundColor: "rgba(255,255,255,0.8)" } }}
          >
            {t.confirm || "Yes, Delete it!"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Groups;
