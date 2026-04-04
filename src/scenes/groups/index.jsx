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
import { getTranslations, translateBillingModel } from "../../translations";

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
  deleteGroup,
} from "../../api/groupsApi";

const DEBOUNCE_MS = 350;

/* ---------- helpers (format + compute preview) ---------- */
const fmtDA = (n, lang = "fr") =>
  n == null
    ? ""
    : new Intl.NumberFormat(lang === "ar" ? "ar-DZ" : lang === "en" ? "en-DZ" : "fr-DZ", {
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

const Groups = ({ language = "fr" }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = getTranslations(language);
  const isArabic = language === "ar";
  const searchNameLabel = t.searchByName || "Search by name";
  const searchNamePlaceholder = t.typeGroupName || "Type group name...";
  const academicYearPlaceholder = language === "en" ? "e.g. 2024-2025" : language === "ar" ? "????: 2024-2025" : "ex. 2024-2025";
  const statusFilterLabel = t.status || "Status";
  const allLabel = t.all || "All";
  const activeLabel = t.activeStatus || t.active || "Active";
  const inactiveLabel = t.inactiveStatus || t.inactive || "Inactive";
  const privateLabel = t.privateStatus || t.privateGroup;
  const revisionLabel = t.revisionStatus || t.revisionGroup;
  const yesLabel = t.yes || "Yes";
  const noLabel = t.no || "No";
  const selectOptionLabel = t.selectOption || "-- Select --";
  const shareSessionHeader = t.sharePerSession || "Share/Session";
  const shareHourHeader = t.sharePerHour || "Share/Hour";
  const shareMonthHeader = t.sharePerMonth || "Share/Month";

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
        // Keep payload reasonable; very large pages can make unfiltered requests fail/timeout.
        size: 50,
        // Show newest first so a freshly created group remains visible after refresh/navigation.
        sort: "id,desc",
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
        message = t.groupDeleteBlocked || message;
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
    { field: "billingModel", headerName: t.billingModel, width: 130, valueFormatter: (value) => translateBillingModel(value, t) },

    {
      field: "teacherSharePerSession",
      headerName: shareSessionHeader,
      width: 130,
      valueFormatter: currencyVF(language),
      sortComparator: (a, b) => (a ?? 0) - (b ?? 0),
    },
    {
      field: "teacherSharePerHour",
      headerName: shareHourHeader,
      width: 120,
      valueFormatter: currencyVF(language),
      sortComparator: (a, b) => (a ?? 0) - (b ?? 0),
    },
    {
      field: "teacherSharePerMonth",
      headerName: shareMonthHeader,
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

  const [columnVisibilityModel, setColumnVisibilityModel] = useState({
    notes: false,
    id: false,
  });

  /* ---------- validation ---------- */
  const groupSchema = yup.object().shape({
    name: yup.string().required(t.requiredGroupName || "Required"),
    academicYear: yup.string().required(t.requiredAcademicYear || "Required"),
    teacherId: yup.number().typeError(t.requiredTeacher || "Teacher is required").required(t.requiredTeacher || "Teacher is required"),
    subjectId: yup.number().typeError(t.requiredSubject || "Subject is required").required(t.requiredSubject || "Subject is required"),
    levelId: yup.number().typeError(t.requiredLevel || "Level is required").required(t.requiredLevel || "Level is required"),
    sectionId: yup.number().typeError(t.requiredSection || "Section is required").required(t.requiredSection || "Section is required"),
    privateGroup: yup.boolean(),
    revisionGroup: yup.boolean(),
    active: yup.boolean(),
    capacity: yup.number().transform((val, orig) => (orig === "" ? null : val)).nullable().positive(t.min1 || "Value must be >= 1").required(t.requiredCapacity || "Capacity is required"),
    billingModel: yup.string().required(t.requiredBillingModel || "Billing model is required"),
    monthlyFee: yup.number().transform((v, o) => (o === "" ? null : v)).nullable().when("billingModel", { is: "MONTHLY", then: (schema) => schema.required(t.requiredMonthlyFee || "Monthly fee is required") }),
    sessionsPerMonth: yup.number().transform((v, o) => (o === "" ? null : v)).nullable().when(["billingModel", "teacherShareType"], { is: (bm, ts) => bm === "MONTHLY" && ts === "FIXED", then: (schema) => schema.min(1, t.min1 || "Value must be >= 1").required(t.sessionsPerMonth || "Sessions per month") }),
    sessionCost: yup.number().transform((v, o) => (o === "" ? null : v)).nullable().when("billingModel", { is: "PER_SESSION", then: (schema) => schema.required(t.requiredSessionCost || "Session price is required") }),
    hourlyCost: yup.number().transform((v, o) => (o === "" ? null : v)).nullable().when("billingModel", { is: "PER_HOUR", then: (schema) => schema.required(t.requiredHourlyCost || "Hourly price is required") }),
    sessionDurationMin: yup.number().transform((v, o) => (o === "" ? null : v)).nullable().when("billingModel", { is: "PER_HOUR", then: (schema) => schema.min(1, t.min1 || "Value must be >= 1").required(t.requiredSessionDuration || "Session duration is required") }),
    teacherShareType: yup.string().oneOf(["PERCENT", "FIXED"]).required(t.requiredTeacherShareType || "Teacher share type is required"),
    teacherShareValue: yup.number().transform((v, o) => (o === "" ? null : v)).nullable().required(t.requiredTeacherShareValue || "Teacher share value is required").when("teacherShareType", { is: "PERCENT", then: (schema) => schema.min(0, t.min0 || "Value must be >= 0").max(100, t.max100 || "Value must be <= 100") }),
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
        await updateGroup(editingGroup.id, payload);
      } else {
        await createGroup(payload);
      }

      // Always refresh from server so the grid stays consistent with active filters/sort.
      await loadGroups();

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
          label={searchNameLabel}
          placeholder={searchNamePlaceholder}
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
          label={t.academicYear}
          placeholder={academicYearPlaceholder}
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
          label={statusFilterLabel}
        >
          <MenuItem value="">{allLabel}</MenuItem>
          <MenuItem value="true">{activeLabel}</MenuItem>
          <MenuItem value="false">{inactiveLabel}</MenuItem>
        </TextField>

        {/* Teacher */}
        <TextField select value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)} label={t.teacher}>
          <MenuItem value="">{allLabel}</MenuItem>
          {teachers.map((x) => (
            <MenuItem key={x.id} value={x.id}>
              {x.fullName}
            </MenuItem>
          ))}
        </TextField>

        {/* Subject */}
        <TextField select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} label={t.subject}>
          <MenuItem value="">{allLabel}</MenuItem>
          {subjects.map((x) => (
            <MenuItem key={x.id} value={x.id}>
              {x.name}
            </MenuItem>
          ))}
        </TextField>

        {/* Level */}
        <TextField select value={levelFilter} onChange={(e) => handleChangeLevelFilter(e.target.value)} label={t.level}>
          <MenuItem value="">{allLabel}</MenuItem>
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
          <MenuItem value="">{allLabel}</MenuItem>
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
          label={t.privateGroup}
        >
          <MenuItem value="">{allLabel}</MenuItem>
          <MenuItem value="true">{yesLabel}</MenuItem>
          <MenuItem value="false">{noLabel}</MenuItem>
        </TextField>

        {/* Revision */}
        <TextField
          select
          value={revisionFilter}
          onChange={(e) => setRevisionFilter(e.target.value)}
          label={t.revisionGroup}
        >
          <MenuItem value="">{allLabel}</MenuItem>
          <MenuItem value="true">{yesLabel}</MenuItem>
          <MenuItem value="false">{noLabel}</MenuItem>
        </TextField>

        {/* Add Group */}
        <Box display="flex" justifyContent="flex-end">
          <Button
            data-testid="groups-add"
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
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={setColumnVisibilityModel}
          density="compact"
          pageSizeOptions={[25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25, page: 0 } },
          }}
        />
      </Box>

      {/* Create / Edit Dialog */}
      <Dialog open={openDialog} onClose={handleClose} fullWidth maxWidth="md" data-testid="groups-dialog">
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
            let shareLabel = t.teacherShareValue || "Teacher share value";
            if (isPercent) {
              shareLabel = t.teacherSharePercentLabel || "Teacher share percentage (%)";
            } else {
              shareLabel =
                values.billingModel === "PER_HOUR"
                  ? t.teacherShareHourAmountLabel || "Teacher share per hour (DZD)"
                  : t.teacherShareSessionAmountLabel || "Teacher share per session (DZD)";
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
                    <TextField
                      inputProps={{ "data-testid": "groups-name" }}
                      name="name"
                      label={(t.groupName || "") + " *"}
                      value={values.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.name && Boolean(errors.name)}
                      helperText={touched.name && errors.name}
                      required
                      sx={requiredAsteriskSx}
                    />

                    <TextField
                      inputProps={{ "data-testid": "groups-academicYear" }}
                      name="academicYear"
                      label={(t.academicYear || "") + " *"}
                      value={values.academicYear}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.academicYear && Boolean(errors.academicYear)}
                      helperText={touched.academicYear && errors.academicYear}
                      required
                      sx={requiredAsteriskSx}
                    />

                    <TextField
                      inputProps={{ "data-testid": "groups-teacherId" }}
                      select
                      name="teacherId"
                      label={(t.teacher || "") + " *"}
                      value={values.teacherId || ""}
                      onChange={handleChange}
                      error={touched.teacherId && Boolean(errors.teacherId)}
                      helperText={touched.teacherId && errors.teacherId}
                      required
                      sx={requiredAsteriskSx}
                    >
                      <MenuItem value="">{selectOptionLabel}</MenuItem>
                      {teachers.map((tc) => (
                        <MenuItem key={tc.id} value={tc.id}>
                          {tc.fullName}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      inputProps={{ "data-testid": "groups-subjectId" }}
                      select
                      name="subjectId"
                      label={(t.subject || "") + " *"}
                      value={values.subjectId || ""}
                      onChange={handleChange}
                      error={touched.subjectId && Boolean(errors.subjectId)}
                      helperText={touched.subjectId && errors.subjectId}
                      required
                      sx={requiredAsteriskSx}
                    >
                      <MenuItem value="">{selectOptionLabel}</MenuItem>
                      {subjects.map((subject) => (
                        <MenuItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      inputProps={{ "data-testid": "groups-levelId" }}
                      select
                      name="levelId"
                      label={(t.level || "") + " *"}
                      value={values.levelId || ""}
                      onChange={(e) => fetchSectionsForLevel(e.target.value, setFieldValue)}
                      error={touched.levelId && Boolean(errors.levelId)}
                      helperText={touched.levelId && errors.levelId}
                      required
                      sx={requiredAsteriskSx}
                    >
                      <MenuItem value="">{selectOptionLabel}</MenuItem>
                      {levels.map((lvl) => (
                        <MenuItem key={lvl.id} value={lvl.id}>
                          {lvl.name}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      inputProps={{ "data-testid": "groups-sectionId" }}
                      select
                      name="sectionId"
                      label={(t.section || "") + " *"}
                      value={values.sectionId || ""}
                      onChange={handleChange}
                      error={touched.sectionId && Boolean(errors.sectionId)}
                      helperText={touched.sectionId && errors.sectionId}
                      disabled={!values.levelId}
                      required
                      sx={requiredAsteriskSx}
                    >
                      <MenuItem value="">{selectOptionLabel}</MenuItem>
                      {sections.map((sec) => (
                        <MenuItem key={sec.id} value={sec.id}>
                          {sec.name}
                        </MenuItem>
                      ))}
                    </TextField>

                    <FormControlLabel control={<Checkbox checked={Boolean(values.privateGroup)} onChange={(e) => setFieldValue("privateGroup", e.target.checked)} />} label={t.privateGroup} />
                    <FormControlLabel control={<Checkbox checked={Boolean(values.revisionGroup)} onChange={(e) => setFieldValue("revisionGroup", e.target.checked)} />} label={t.revisionGroup} />

                    <TextField
                      inputProps={{ "data-testid": "groups-capacity" }}
                      type="number"
                      name="capacity"
                      label={(t.capacity || "") + " *"}
                      value={values.capacity}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.capacity && Boolean(errors.capacity)}
                      helperText={touched.capacity && errors.capacity}
                      required
                      sx={requiredAsteriskSx}
                    />

                    <TextField
                      inputProps={{ "data-testid": "groups-billingModel" }}
                      select
                      name="billingModel"
                      label={(t.billingModel || "") + " *"}
                      value={values.billingModel}
                      onChange={handleChange}
                      required
                      sx={requiredAsteriskSx}
                    >
                      <MenuItem value="MONTHLY">{t.monthly}</MenuItem>
                      <MenuItem value="PER_SESSION">{t.perSession}</MenuItem>
                      <MenuItem value="PER_HOUR">{t.perHour}</MenuItem>
                    </TextField>

                    {values.billingModel === "MONTHLY" && (
                      <>
                        <TextField
                          inputProps={{ "data-testid": "groups-monthlyFee" }}
                          type="number"
                          name="monthlyFee"
                          label={(t.monthlyFee || "") + " *"}
                          value={values.monthlyFee}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={touched.monthlyFee && Boolean(errors.monthlyFee)}
                          helperText={touched.monthlyFee && errors.monthlyFee}
                          required
                          sx={requiredAsteriskSx}
                        />
                        <TextField
                          inputProps={{ "data-testid": "groups-sessionsPerMonth" }}
                          type="number"
                          name="sessionsPerMonth"
                          label={values.teacherShareType === "FIXED" ? (t.sessionsPerMonth || "") + " *" : t.sessionsPerMonth}
                          value={values.sessionsPerMonth}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={touched.sessionsPerMonth && Boolean(errors.sessionsPerMonth)}
                          helperText={touched.sessionsPerMonth && errors.sessionsPerMonth}
                          required={values.teacherShareType === "FIXED"}
                          sx={values.teacherShareType === "FIXED" ? requiredAsteriskSx : undefined}
                        />
                      </>
                    )}

                    {values.billingModel === "PER_SESSION" && (
                      <TextField
                        inputProps={{ "data-testid": "groups-sessionCost" }}
                        type="number"
                        name="sessionCost"
                        label={(t.sessionCost || "") + " *"}
                        value={values.sessionCost}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.sessionCost && Boolean(errors.sessionCost)}
                        helperText={touched.sessionCost && errors.sessionCost}
                        required
                        sx={requiredAsteriskSx}
                      />
                    )}

                    {values.billingModel === "PER_HOUR" && (
                      <>
                        <TextField
                          inputProps={{ "data-testid": "groups-hourlyCost" }}
                          type="number"
                          name="hourlyCost"
                          label={(t.hourlyCost || "") + " *"}
                          value={values.hourlyCost}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={touched.hourlyCost && Boolean(errors.hourlyCost)}
                          helperText={touched.hourlyCost && errors.hourlyCost}
                          required
                          sx={requiredAsteriskSx}
                        />
                        <TextField
                          inputProps={{ "data-testid": "groups-sessionDurationMin" }}
                          type="number"
                          name="sessionDurationMin"
                          label={(t.sessionDurationMin || "") + " *"}
                          value={values.sessionDurationMin}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={touched.sessionDurationMin && Boolean(errors.sessionDurationMin)}
                          helperText={touched.sessionDurationMin && errors.sessionDurationMin}
                          required
                          sx={requiredAsteriskSx}
                        />
                      </>
                    )}

                    <TextField
                      inputProps={{ "data-testid": "groups-teacherShareType" }}
                      select
                      name="teacherShareType"
                      label={(t.teacherShareType || "") + " *"}
                      value={values.teacherShareType}
                      onChange={handleChange}
                      required
                      sx={requiredAsteriskSx}
                    >
                      <MenuItem value="PERCENT">{t.percentOption || "% percentage"}</MenuItem>
                      <MenuItem value="FIXED">{t.fixedAmount || "Fixed amount"}</MenuItem>
                    </TextField>

                    <TextField
                      type="number"
                      name="teacherShareValue"
                      label={shareLabel + " *"}
                      value={values.teacherShareValue}
                      onChange={handleChange}
                      onBlur={clampPercent}
                      error={touched.teacherShareValue && Boolean(errors.teacherShareValue)}
                      helperText={(touched.teacherShareValue && errors.teacherShareValue) || (isPercent ? t.teacherShareCalculatedHint || "Calculated as a percentage of the price (monthly/session/hour)." : values.billingModel === "PER_HOUR" ? t.flatAmountPerHour || "Flat amount per hour" : t.flatAmountPerSession || "Flat amount per session")}
                      required
                      sx={requiredAsteriskSx}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">{isPercent ? "%" : "DZD"}</InputAdornment>,
                        inputProps: {
                          "data-testid": "groups-teacherShareValue",
                          ...(isPercent ? { min: 0, max: 100, step: "any" } : { step: "any" }),
                        },
                      }}
                    />

                    <Box gridColumn="1 / span 2" sx={{ mt: 1, p: 1.5, borderRadius: 1, background: "rgba(255,255,255,0.05)" }}>
                      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{t.teacherSharePreview || "Teacher share preview"}</Typography>
                      {values.billingModel === "MONTHLY" && (
                        <Box display="flex" gap={3} flexWrap="wrap">
                          <Typography variant="body2">{(t.perSessionLabel || "Per session") + ":"} <b>{preview.perSession != null ? fmtDA(preview.perSession, language) : "-"}</b></Typography>
                          <Typography variant="body2">{(t.perMonthLabel || "Per month") + ":"} <b>{preview.perMonth != null ? fmtDA(preview.perMonth, language) : "-"}</b></Typography>
                        </Box>
                      )}
                      {values.billingModel === "PER_SESSION" && (
                        <Box display="flex" gap={3} flexWrap="wrap">
                          <Typography variant="body2">{(t.perSessionLabel || "Per session") + ":"} <b>{preview.perSession != null ? fmtDA(preview.perSession, language) : "-"}</b></Typography>
                        </Box>
                      )}
                      {values.billingModel === "PER_HOUR" && (
                        <Box display="flex" gap={3} flexWrap="wrap">
                          <Typography variant="body2">{(t.perHourLabel || "Per hour") + ":"} <b>{preview.perHour != null ? fmtDA(preview.perHour, language) : "-"}</b></Typography>
                        </Box>
                      )}
                    </Box>

                    <TextField type="date" name="startDate" label={t.startDate} value={values.startDate || ""} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                    <TextField name="notes" label={t.notes} multiline value={values.notes} onChange={handleChange} />
                  </Box>
                </DialogContent>

                <DialogActions sx={{ gap: 2 }}>
                  <Button
                    data-testid="groups-cancel"
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
                    data-testid="groups-save"
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



