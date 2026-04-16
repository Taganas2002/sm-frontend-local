import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputAdornment,
  MenuItem,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import AddIcon from "@mui/icons-material/Add";
import { useFormik } from "formik";
import * as yup from "yup";

import { tokens } from "../../theme";
import Header from "../../components/Header";
import { getTranslations } from "../../translations";

import {
  listEnrollments,
  filterEnrollmentsCSV,
  createEnrollment,
  createEnrollmentBatch,
  updateEnrollmentStatus,
  deleteEnrollment,
} from "../../api/enrollmentsApi";
import { searchStudents, getStudent, fetchStudentNamesByIds } from "../../api/studentsApi";
import { searchGroups, lookupGroups } from "../../api/groupsApi";
import { listLevels } from "../../api/levelsApi";
import { listSections } from "../../api/sectionsApi";

const STATUS_OPTIONS = ["ACTIVE", "SUSPENDED", "DROPPED", "COMPLETED"];
const ENROLLMENT_SCANNER_LS_KEY = "enrollment:studentScannerOn";

const getLocalDate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const initialValues = {
  studentId: "",
  groupId: "",
  status: "ACTIVE",
  notes: "",
};

const parseStudentIdFromScan = (raw) => {
  if (!raw) return null;
  const value = String(raw).trim();
  if (/^\d+$/.test(value)) return Number(value);
  try {
    const parsed = JSON.parse(value);
    const candidate = parsed?.studentId ?? parsed?.id ?? parsed?.sid;
    if (candidate != null && /^\d+$/.test(String(candidate))) return Number(candidate);
  } catch {}
  const match = value.match(/(?:studentId|sid|id)\s*[:=]\s*(\d+)/i);
  if (match) return Number(match[1]);
  return null;
};

const normalizeToArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.content)) return data.content;
  if (typeof data === "object") return Object.values(data);
  return [];
};

const getEnrollmentStatusLabel = (status, t) => {
  const map = {
    ACTIVE: t.activeStatus || t.active || "ACTIVE",
    SUSPENDED: t.suspended || "SUSPENDED",
    DROPPED: t.dropped || "DROPPED",
    COMPLETED: t.completed || "COMPLETED",
  };
  return map[status] || status;
};

const primaryActionSx = (theme, colors) => ({
  backgroundColor:
    theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400],
  color: "#fff",
  fontWeight: 700,
  "&:hover": {
    backgroundColor:
      theme.palette.mode === "light" ? colors.blueAccent[600] : colors.blueAccent[300],
  },
});

const modalSurfaceSx = (theme, colors) => ({
  bgcolor: theme.palette.mode === "light" ? "#ffffff" : colors.primary[400],
  color: theme.palette.mode === "light" ? "#101828" : "#f8fafc",
});

const modalFieldSx = (theme) => ({
  "& .MuiInputLabel-root": {
    color: theme.palette.mode === "light" ? "#3152b5" : "#bfdbfe",
    fontWeight: 600,
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: theme.palette.mode === "light" ? "#2643a2" : "#dbeafe",
  },
  "& .MuiInputBase-root": {
    color: theme.palette.mode === "light" ? "#101828" : "#f8fafc",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.mode === "light" ? "#2b50c7" : "#bfdbfe",
    borderWidth: 2,
  },
  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.mode === "light" ? "#1e40af" : "#dbeafe",
  },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.mode === "light" ? "#1d4ed8" : "#ffffff",
  },
  "& .MuiSvgIcon-root": {
    color: theme.palette.mode === "light" ? "#6b7280" : "#f8fafc",
  },
  "& .MuiInputBase-input::placeholder": {
    color: theme.palette.mode === "light" ? "#6b7280" : "#cbd5e1",
    opacity: 1,
  },
});

const secondaryActionSx = (theme) => ({
  color: theme.palette.mode === "light" ? "#475467" : "#e2e8f0",
  fontWeight: 700,
});

const Enrollments = ({ language = "fr" }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = getTranslations(language);

  const [rows, setRows] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [groups, setGroups] = useState([]);
  const [levels, setLevels] = useState([]);
  const [sections, setSections] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState(null);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [filterGroupId, setFilterGroupId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [studentOptions, setStudentOptions] = useState([]);
  const [studentSearchInput, setStudentSearchInput] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [scannerOn, setScannerOn] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "info" });
  const scanInputRef = useRef(null);
  const studentSearchTimer = useRef(null);

  /** 0 = one student + autocomplete, 1 = pick group then checkboxes */
  const [addModeTab, setAddModeTab] = useState(0);
  const [bulkGroupId, setBulkGroupId] = useState("");
  const [bulkSearch, setBulkSearch] = useState("");
  const [bulkLevelId, setBulkLevelId] = useState("");
  const [bulkSectionId, setBulkSectionId] = useState("");
  const [bulkSelectedIds, setBulkSelectedIds] = useState(() => new Set());
  const [alreadyInGroupIds, setAlreadyInGroupIds] = useState(() => new Set());
  const [groupLoadError, setGroupLoadError] = useState("");

  const studentsById = useMemo(() => {
    const map = {};
    (studentsList || []).forEach((s) => {
      if (s?.id == null) return;
      map[Number(s.id)] = s;
    });
    return map;
  }, [studentsList]);

  const enrollmentSchema = yup.object().shape({
    studentId: yup.number().required(t.studentId || "Student is required"),
    groupId: yup
      .string()
      .required(t.group || "Group is required")
      .test("groupIdNum", t.group || "Group is required", (v) => {
        const n = Number(v);
        return v !== "" && Number.isFinite(n) && n > 0;
      }),
    status: yup.string().oneOf(STATUS_OPTIONS).required(t.status || "Status is required"),
    notes: yup.string().nullable(),
  });

  const formik = useFormik({
    initialValues,
    validationSchema: enrollmentSchema,
    onSubmit: handleSave,
    enableReinitialize: true,
  });

  const loadStudents = async () => {
    try {
      const data = await searchStudents({ page: 0, size: 1000, sort: "fullName,asc" });
      const list = normalizeToArray(data);
      setStudentsList(list);
      setStudentOptions(list.slice(0, 50));
    } catch (e) {
      console.error("Failed to load students", e);
      setStudentsList([]);
      setStudentOptions([]);
    }
  };

  /** Enrolled students may be missing from the first 1000 search results — fetch names by id for the grid. */
  useEffect(() => {
    const have = new Set((studentsList || []).map((s) => Number(s.id)));
    const needIds = [
      ...new Set(
        rows
          .map((r) => Number(r.studentId))
          .filter((id) => Number.isFinite(id) && id > 0 && !have.has(id))
      ),
    ];
    if (needIds.length === 0) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const map = await fetchStudentNamesByIds(needIds);
        if (cancelled) return;
        setStudentsList((prev) => {
          const h = new Set((prev || []).map((s) => Number(s.id)));
          const add = Object.entries(map)
            .filter(([id]) => !h.has(Number(id)))
            .map(([id, fullName]) => ({ id: Number(id), fullName }));
          if (add.length === 0) return prev;
          return [...(prev || []), ...add];
        });
      } catch (e) {
        console.error("Failed to resolve enrollment student names", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rows, studentsList]);

  const loadLevels = async () => {
    try {
      const data = await listLevels();
      setLevels(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load levels", e);
      setLevels([]);
    }
  };

  const loadSections = async () => {
    try {
      const data = await listSections();
      setSections(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load sections", e);
      setSections([]);
    }
  };

  const normalizeGroupRows = (arr) =>
    (arr || [])
      .map((g) => {
        const id = Number(g?.id ?? g?.groupId);
        const rawName = g?.name ?? g?.groupName;
        const name =
          rawName != null && String(rawName).trim() !== "" ? String(rawName).trim() : `Group #${id}`;
        return { id, name };
      })
      .filter((g) => Number.isFinite(g.id) && g.id > 0);

  const loadGroups = async () => {
    setGroupLoadError("");
    try {
      let arr = [];
      try {
        const res = await searchGroups({
          page: 0,
          size: 500,
          sort: "name,asc",
        });
        const raw = res?.content ?? res;
        arr = Array.isArray(raw) ? raw : normalizeToArray(raw);
      } catch (e1) {
        console.warn("enrollment: searchGroups failed, will try lookup", e1);
      }
      if (!arr.length) {
        try {
          const lookup = await lookupGroups({ limit: 500 });
          arr = Array.isArray(lookup) ? lookup : normalizeToArray(lookup);
        } catch (e2) {
          console.warn("enrollment: lookupGroups failed", e2);
        }
      }
      const mapped = normalizeGroupRows(arr);
      setGroups(mapped);
      if (mapped.length === 0) {
        setGroupLoadError(t.groupsLoadError || "Could not load groups. Check your connection or try again.");
      }
    } catch (e) {
      console.error("Failed to load groups", e);
      setGroups([]);
      setGroupLoadError(t.groupsLoadError || "Could not load groups.");
    }
  };

  const loadEnrollments = async () => {
    setLoading(true);
    try {
      if (!filterStatus) {
        const res = await listEnrollments({
          page: 0,
          size: 100,
          sort: "enrollmentDate,desc",
          groupId: filterGroupId ? Number(filterGroupId) : undefined,
        });
        setRows(normalizeToArray(res));
      } else {
        const res = await filterEnrollmentsCSV({
          groupId: filterGroupId ? Number(filterGroupId) : undefined,
          statuses: [filterStatus],
          page: 0,
          size: 100,
          sort: "enrollmentDate,desc",
        });
        setRows(normalizeToArray(res));
      }
    } catch (e) {
      console.error("Failed to load enrollments", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
    loadGroups();
    loadLevels();
    loadSections();
  }, []);

  useEffect(() => {
    loadEnrollments();
  }, [filterGroupId, filterStatus]);

  useEffect(() => {
    const saved = localStorage.getItem(ENROLLMENT_SCANNER_LS_KEY);
    setScannerOn(saved === "1");
  }, []);

  useEffect(() => {
    localStorage.setItem(ENROLLMENT_SCANNER_LS_KEY, scannerOn ? "1" : "0");
  }, [scannerOn]);

  useEffect(() => {
    if (!scannerOn || !scanInputRef.current || !openDialog || editingEnrollment) return;
    const keepFocus = () => scanInputRef.current?.focus();
    scanInputRef.current.focus();
    scanInputRef.current.addEventListener("blur", keepFocus);
    return () => scanInputRef.current?.removeEventListener("blur", keepFocus);
  }, [scannerOn, openDialog, editingEnrollment]);

  useEffect(() => {
    if (editingEnrollment) return;
    if (studentSearchTimer.current) clearTimeout(studentSearchTimer.current);
    studentSearchTimer.current = setTimeout(async () => {
      try {
        const res = await searchStudents({
          search: studentSearchInput.trim(),
          page: 0,
          size: 50,
          sort: "fullName,asc",
        });
        setStudentOptions(normalizeToArray(res));
      } catch (err) {
        console.error("Failed to search students", err);
        setStudentOptions([]);
      }
    }, 250);
    return () => clearTimeout(studentSearchTimer.current);
  }, [studentSearchInput, editingEnrollment]);

  const bulkSelectedGroup = useMemo(
    () => groups.find((g) => String(g.id) === String(bulkGroupId)),
    [groups, bulkGroupId]
  );

  const bulkVisibleStudents = useMemo(() => {
    const term = (bulkSearch || "").trim().toLowerCase();
    const list = studentsList || [];
    const filtered = list.filter((s) => {
        const studentLevelId = s?.levelId == null ? "" : String(s.levelId);
        const studentSectionId = s?.sectionId == null ? "" : String(s.sectionId);
        if (bulkLevelId && studentLevelId !== String(bulkLevelId)) return false;
        if (bulkSectionId && studentSectionId !== String(bulkSectionId)) return false;
        if (!term) return true;
          const name = (s.fullName || "").toLowerCase();
          const phone = (s.phone || "").toLowerCase();
          const gphone = (s.guardianPhone || "").toLowerCase();
          return name.includes(term) || phone.includes(term) || gphone.includes(term);
        });
    return [...filtered].sort((a, b) => String(a.fullName || "").localeCompare(String(b.fullName || ""), undefined, { sensitivity: "base" }));
  }, [studentsList, bulkSearch, bulkLevelId, bulkSectionId]);

  useEffect(() => {
    if (!openDialog || editingEnrollment || addModeTab !== 1) {
      return;
    }
    let cancelled = false;
    (async () => {
      if (!bulkGroupId) {
        if (!cancelled) setAlreadyInGroupIds(new Set());
        return;
      }
      try {
        const res = await filterEnrollmentsCSV({
          groupId: Number(bulkGroupId),
          statuses: ["ACTIVE", "SUSPENDED"],
          page: 0,
          size: 500,
          sort: "enrollmentDate,desc",
        });
        const ids = new Set(
          normalizeToArray(res)
            .map((r) => Number(r.studentId))
            .filter((n) => Number.isFinite(n))
        );
        if (!cancelled) setAlreadyInGroupIds(ids);
      } catch (e) {
        console.error("Failed to load enrollments for group", e);
        if (!cancelled) setAlreadyInGroupIds(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openDialog, editingEnrollment, addModeTab, bulkGroupId]);

  const filteredRows = useMemo(() => {
    const term = (q || "").trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      const sid = Number(r.studentId);
      const student = Number.isFinite(sid) ? studentsById[sid] : undefined;
      const studentName = (student?.fullName || "").toLowerCase();
      const groupName = (groups.find((g) => Number(g.id) === Number(r.groupId))?.name || "").toLowerCase();
      const notes = (r.notes || "").toLowerCase();
      return studentName.includes(term) || groupName.includes(term) || notes.includes(term);
    });
  }, [q, rows, studentsById, groups]);

  const handleClose = () => {
    setOpenDialog(false);
    setEditingEnrollment(null);
    setSelectedStudent(null);
    setStudentSearchInput("");
    setAddModeTab(0);
    setBulkGroupId("");
    setBulkSearch("");
    setBulkLevelId("");
    setBulkSectionId("");
    setBulkSelectedIds(new Set());
    setAlreadyInGroupIds(new Set());
    setGroupLoadError("");
    formik.resetForm();
    formik.setValues({ ...initialValues });
  };

  const toggleBulkStudent = (id) => {
    const n = Number(id);
    if (!Number.isFinite(n)) return;
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const selectAllVisibleEligible = () => {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      bulkVisibleStudents.forEach((s) => {
        const id = Number(s.id);
        if (!Number.isFinite(id) || alreadyInGroupIds.has(id)) return;
        next.add(id);
      });
      return next;
    });
  };

  const clearBulkSelection = () => setBulkSelectedIds(new Set());

  const skipReasonLabel = (code) => {
    const key = `skipReason_${code}`;
    return t[key] || code;
  };

  async function handleBulkSave() {
    if (!bulkGroupId) {
      setSnack({ open: true, msg: t.bulkSelectGroupFirst || "Select a group first", severity: "warning" });
      return;
    }
    const ids = [...bulkSelectedIds].filter((n) => Number.isFinite(n));
    if (ids.length === 0) {
      setSnack({ open: true, msg: t.selectAtLeastOneStudent || "Select at least one student", severity: "warning" });
      return;
    }
    try {
      const res = await createEnrollmentBatch({
        groupId: Number(bulkGroupId),
        studentIds: ids,
        status: formik.values.status,
        notes: formik.values.notes || "",
        enrollmentDate: getLocalDate(),
      });
      await loadEnrollments();
      await loadStudents();
      let msg =
        (t.bulkEnrollDone || "Created {{created}}, skipped {{skipped}}")
          .replace(/\{\{created\}\}/g, String(res.createdCount ?? 0))
          .replace(/\{\{skipped\}\}/g, String(res.skippedCount ?? 0));
      if (res.skips?.length) {
        const preview = res.skips
          .slice(0, 5)
          .map((sk) => `#${sk.studentId}: ${skipReasonLabel(sk.code)}`)
          .join("; ");
        msg += ` - ${preview}${res.skips.length > 5 ? "..." : ""}`;
      }
      setSnack({
        open: true,
        msg,
        severity: res.skippedCount > 0 ? "warning" : "success",
      });
      handleClose();
    } catch (err) {
      console.error("Bulk save failed", err);
      setSnack({ open: true, msg: t.failedSave || "Save failed", severity: "error" });
    }
  }

  async function handleSave(values) {
    try {
      if (editingEnrollment) {
        await updateEnrollmentStatus(editingEnrollment.id, values.status, values.notes);
      } else {
        await createEnrollment({
          studentId: Number(values.studentId),
          groupId: Number(values.groupId),
          status: values.status,
          notes: values.notes || "",
          enrollmentDate: getLocalDate(),
        });
      }
      await loadStudents();
      if (!editingEnrollment && values.studentId) {
        try {
          const s = await getStudent(Number(values.studentId));
          if (s?.id != null) {
            setStudentsList((prev) => {
              const pid = Number(s.id);
              const list = prev || [];
              if (list.some((x) => Number(x.id) === pid)) return list;
              return [...list, s];
            });
          }
        } catch (e) {
          console.error("Failed to refresh enrolled student", e);
        }
      }
      await loadEnrollments();
      handleClose();
    } catch (err) {
      console.error("Save failed", err);
    }
  }

  useEffect(() => {
    if (editingEnrollment) {
      formik.setValues({
        studentId: editingEnrollment.studentId || "",
        groupId: editingEnrollment.groupId != null ? String(editingEnrollment.groupId) : "",
        status: editingEnrollment.status || "ACTIVE",
        notes: editingEnrollment.notes || "",
      });
      const eSid = Number(editingEnrollment.studentId);
      const existingStudent = Number.isFinite(eSid) ? studentsById[eSid] : undefined;
      setSelectedStudent(existingStudent || null);
      setStudentSearchInput(existingStudent?.fullName || "");
    }
  }, [editingEnrollment, studentsById]);

  const handleScanString = async (raw) => {
    const id = parseStudentIdFromScan(raw);
    if (!id) {
      setSnack({ open: true, msg: t.scanNotRecognized || "Scan not recognized", severity: "warning" });
      return;
    }
    try {
      const student = await getStudent(id);
      setSelectedStudent(student);
      setStudentSearchInput(student?.fullName || String(id));
      formik.setFieldValue("studentId", Number(student.id));
      setSnack({ open: true, msg: `${t.student || "Student"}: ${student.fullName}`, severity: "success" });
    } catch (err) {
      setSnack({ open: true, msg: `${t.loadError || "Loading failed"} #${id}`, severity: "error" });
    }
  };

  const columns = [
    {
      field: "studentId",
      headerName: t.studentName || t.student || "Student",
      flex: 1,
      renderCell: (params) => {
        const sid = Number(params.row.studentId);
        const s = Number.isFinite(sid) ? studentsById[sid] : undefined;
        return s?.fullName ?? (Number.isFinite(sid) ? `#${sid}` : params.row.studentId);
      },
    },
    {
      field: "groupId",
      headerName: t.group || "Group",
      flex: 1,
      renderCell: (params) => {
        const g = groups.find((x) => Number(x.id) === Number(params.row.groupId));
        return g ? g.name : params.row.groupId;
      },
    },
    { field: "enrollmentDate", headerName: t.startDate || "Start date", flex: 1 },
    {
      field: "status",
      headerName: t.status || "Status",
      flex: 1,
      renderCell: (params) => getEnrollmentStatusLabel(params.value, t),
    },
    { field: "notes", headerName: t.notes || "Notes", flex: 1 },
    {
      field: "actions",
      headerName: t.actions || "Actions",
      width: 160,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box display="flex" gap={1}>
          <Tooltip title={t.edit || "Edit"}>
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                setEditingEnrollment(params.row);
                setOpenDialog(true);
              }}
              sx={{
                minWidth: 36,
                p: "6px",
                bgcolor: theme.palette.mode === "light" ? colors.blueAccent[600] : colors.blueAccent[400],
                "&:hover": {
                  bgcolor: theme.palette.mode === "light" ? colors.blueAccent[700] : colors.blueAccent[300],
                },
              }}
            >
              <EditIcon fontSize="small" />
            </Button>
          </Tooltip>

          <Tooltip title={t.delete || "Delete"}>
            <Button
              size="small"
              variant="contained"
              onClick={async () => {
                await deleteEnrollment(params.row.id);
                loadEnrollments();
              }}
              sx={{ minWidth: 36, p: "6px", bgcolor: colors.redAccent[500], "&:hover": { bgcolor: colors.redAccent[700] } }}
            >
              <DeleteIcon fontSize="small" />
            </Button>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box m="20px">
      <Header title={t.enrollment || t.enrollments || "Enrollments"} />

      <Box mb={2} display="grid" gridTemplateColumns="minmax(260px, 1fr) 220px 220px auto" gap={2} alignItems="center">
        <TextField
          placeholder={t.searchEnrollment || "Search (name / group / notes)"}
          // put test id on the actual input (root is a div â€” Playwright fill needs the input)
          inputProps={{ "data-testid": "enrollments-search-q" }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <TextField
          select
          label={t.groups || "Groups"}
          value={filterGroupId}
          onChange={(e) => setFilterGroupId(e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
          SelectProps={{
            displayEmpty: true,
            renderValue: (selected) => {
              if (selected === "" || selected == null) return t.all || "All";
              const g = groups.find((x) => String(x.id) === String(selected));
              return g?.name ?? String(selected);
            },
          }}
        >
          <MenuItem value="">{t.all || "All"}</MenuItem>
          {groups.map((g) => (
            <MenuItem key={g.id} value={String(g.id)}>
              {g.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label={t.status || "Status"}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
          SelectProps={{
            displayEmpty: true,
            renderValue: (selected) => {
              if (selected === "" || selected == null) return t.all || "All";
              return getEnrollmentStatusLabel(selected, t);
            },
          }}
        >
          <MenuItem value="">{t.all || "All"}</MenuItem>
          {STATUS_OPTIONS.map((status) => (
            <MenuItem key={status} value={status}>{getEnrollmentStatusLabel(status, t)}</MenuItem>
          ))}
        </TextField>

        <Box display="flex" justifyContent="flex-end">
          <Button
            data-testid="enrollments-add"
            variant="contained"
            onClick={async () => {
              setEditingEnrollment(null);
              setSelectedStudent(null);
              setStudentSearchInput("");
              setAddModeTab(0);
              setBulkGroupId("");
              setBulkSearch("");
              setBulkSelectedIds(new Set());
              setAlreadyInGroupIds(new Set());
              formik.resetForm();
              formik.setValues({ ...initialValues });
              try {
                await loadGroups();
                await loadStudents();
              } catch (e) {
                console.error(e);
              }
              setOpenDialog(true);
            }}
            sx={{
              ...primaryActionSx(theme, colors),
            }}
            startIcon={<AddIcon />}
          >
            {t.addEnrollment || "Add enrollment"}
          </Button>
        </Box>
      </Box>

      <Box height="70vh" dir={language === "ar" ? "rtl" : "ltr"} sx={{ "& .MuiDataGrid-root": { border: "none" }, "& .MuiDataGrid-columnHeaders": { backgroundColor: colors.blueAccent[700], borderBottom: "none", textAlign: language === "ar" ? "right" : "left" }, "& .MuiDataGrid-cell": { textAlign: language === "ar" ? "right" : "left" }, "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] }, "& .MuiDataGrid-footerContainer": { borderTop: "none", backgroundColor: colors.blueAccent[400] } }}>
        <DataGrid rows={filteredRows} columns={columns} pageSize={10} loading={loading} disableRowSelectionOnClick getRowId={(row) => row.id} />
      </Box>

      <Dialog
        open={openDialog}
        onClose={handleClose}
        fullWidth
        maxWidth={!editingEnrollment && addModeTab === 1 ? "md" : "sm"}
        data-testid="enrollments-dialog"
        PaperProps={{
          sx: {
            ...modalSurfaceSx(theme, colors),
          },
        }}
      >
        <DialogTitle
          sx={{
            backgroundColor:
              theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400],
            color: "#fff",
            fontWeight: 800,
          }}
        >
          {editingEnrollment ? t.editEnrollment || "Edit enrollment" : t.addEnrollment || "Add enrollment"}
        </DialogTitle>

        {openDialog && groupLoadError && (
          <Alert severity="error" sx={{ mx: 2, mt: 1 }} onClose={() => setGroupLoadError("")}>
            {groupLoadError}
          </Alert>
        )}

        {!editingEnrollment && (
          <Box
            sx={{
              direction: "ltr",
              width: "100%",
              bgcolor: theme.palette.mode === "light" ? "#ffffff" : colors.primary[400],
            }}
            dir="ltr"
          >
            <Tabs
              value={addModeTab}
              onChange={(_, v) => {
                setAddModeTab(v);
                setGroupLoadError("");
              }}
              variant="fullWidth"
              sx={{
                borderBottom: 1,
                borderColor: theme.palette.mode === "light" ? "#d0d5dd" : "rgba(255,255,255,0.12)",
                px: 1,
                "& .MuiTabs-indicator": {
                  backgroundColor: theme.palette.mode === "light" ? colors.blueAccent[700] : "#dbeafe",
                  height: 3,
                },
                "& .MuiTab-root": {
                  color: theme.palette.mode === "light" ? "#475467" : "#cbd5e1",
                  fontWeight: 700,
                },
                "& .Mui-selected": {
                  color: theme.palette.mode === "light" ? `${colors.blueAccent[700]} !important` : "#ffffff !important",
                },
              }}
              data-testid="enrollments-add-mode-tabs"
            >
              <Tab label={t.enrollmentSingle || "One student"} data-testid="enrollments-tab-single" />
              <Tab label={t.enrollmentBulk || "Multiple students"} data-testid="enrollments-tab-bulk" />
            </Tabs>
          </Box>
        )}

        <input
          ref={scanInputRef}
          type="text"
          autoComplete="off"
          style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }}
          onKeyDown={(e) => {
            if (!scannerOn || !openDialog || editingEnrollment || addModeTab !== 0) return;
            if (e.key === "Enter") {
              e.preventDefault();
              const raw = scanInputRef.current?.value ?? "";
              if (scanInputRef.current) scanInputRef.current.value = "";
              handleScanString(raw);
            }
          }}
        />

        {!editingEnrollment && addModeTab === 1 ? (
          <>
            <DialogContent dir={language === "ar" ? "rtl" : "ltr"} sx={modalSurfaceSx(theme, colors)}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
                {t.bulkStep1Title || "Step 1 - Group"}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                {t.bulkEnrollmentHelp || "Choose the group, then select students."}
              </Typography>
              <TextField
                select
                fullWidth
                margin="dense"
                label={t.selectGroupForBulk || t.group || "Group"}
                value={bulkGroupId}
                onChange={(e) => {
                  setBulkGroupId(e.target.value);
                  setBulkSelectedIds(new Set());
                }}
                data-testid="enrollments-bulk-group"
                InputLabelProps={{ shrink: true }}
                sx={modalFieldSx(theme)}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (selected) => {
                    if (selected === "" || selected == null) {
                      return t.enrollmentPickGroup || "- Select group -";
                    }
                    const g = groups.find((x) => String(x.id) === String(selected));
                    return g?.name ?? String(selected);
                  },
                }}
              >
                <MenuItem value="">{t.enrollmentPickGroup || "- Select group -"}</MenuItem>
                {groups.map((g) => (
                  <MenuItem key={g.id} value={String(g.id)}>
                    {g.name}
                  </MenuItem>
                ))}
              </TextField>

              {bulkGroupId && bulkSelectedGroup && (
                <Alert severity="info" sx={{ mt: 1, mb: 1 }} variant="outlined">
                  <Typography variant="body2" component="span">
                    <strong>{bulkSelectedGroup.name}</strong>
                    {" - "}
                    {t.bulkStep2Hint || "Tick students below, then Save."}
                  </Typography>
                </Alert>
              )}

              <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 1, mb: 0.5 }}>
                {t.bulkStep2Title || "Step 2 - Students"}
              </Typography>

              <TextField
                select
                margin="dense"
                fullWidth
                name="status"
                label={t.status || "Status"}
                value={formik.values.status}
                onChange={formik.handleChange}
                InputLabelProps={{ shrink: true }}
                sx={modalFieldSx(theme)}
              >
                {STATUS_OPTIONS.map((status) => (
                  <MenuItem key={status} value={status}>
                    {getEnrollmentStatusLabel(status, t)}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                margin="dense"
                placeholder={t.notes || "Notes"}
                fullWidth
                name="notes"
                value={formik.values.notes}
                onChange={formik.handleChange}
                multiline
                minRows={2}
                sx={modalFieldSx(theme)}
              />

              <Divider sx={{ my: 1.5 }} />

              <Box
                sx={{
                  mb: 1.5,
                  p: 1.5,
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: theme.palette.mode === "light" ? "#d0d5dd" : "rgba(191,219,254,0.18)",
                  backgroundColor: theme.palette.mode === "light" ? "#f8fbff" : "rgba(15,23,42,0.3)",
                }}
              >
                <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "1.2fr 0.8fr 0.8fr auto" }} gap={1.25} alignItems="start" mb={1}>
                  <TextField
                    size="small"
                    fullWidth
                    sx={modalFieldSx(theme)}
                    label={t.searchStudents || "Search students"}
                    value={bulkSearch}
                    onChange={(e) => setBulkSearch(e.target.value)}
                    data-testid="enrollments-bulk-search"
                    InputLabelProps={{ shrink: true }}
                    helperText={t.searchStudentsHelp || "Search by name, phone, or guardian phone"}
                  />
                  <TextField
                    select
                    size="small"
                    fullWidth
                    label={t.level || "Level"}
                    value={bulkLevelId}
                    onChange={(e) => setBulkLevelId(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={modalFieldSx(theme)}
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (selected) => {
                        if (!selected) return t.all || "All";
                        const level = levels.find((item) => String(item.id) === String(selected));
                        return level?.name ?? String(selected);
                      },
                    }}
                  >
                    <MenuItem value="">{t.all || "All"}</MenuItem>
                    {levels.map((level) => (
                      <MenuItem key={level.id} value={String(level.id)}>
                        {level.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    fullWidth
                    label={t.section || t.branch || "Branch"}
                    value={bulkSectionId}
                    onChange={(e) => setBulkSectionId(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={modalFieldSx(theme)}
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (selected) => {
                        if (!selected) return t.all || "All";
                        const section = sections.find((item) => String(item.id) === String(selected));
                        return section?.name ?? String(selected);
                      },
                    }}
                  >
                    <MenuItem value="">{t.all || "All"}</MenuItem>
                    {sections.map((section) => (
                      <MenuItem key={section.id} value={String(section.id)}>
                        {section.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Chip
                    label={(t.selectedStudentsCount || "{{n}} selected").replace("{{n}}", String(bulkSelectedIds.size))}
                    color="primary"
                    variant="outlined"
                    sx={{
                      alignSelf: "center",
                      justifySelf: { xs: "start", md: "end" },
                      color: theme.palette.mode === "light" ? "#1d4ed8" : "#dbeafe",
                      borderColor: theme.palette.mode === "light" ? "#93c5fd" : "#93c5fd",
                      fontWeight: 700,
                      backgroundColor: theme.palette.mode === "light" ? "#eff6ff" : "rgba(30,64,175,0.18)",
                    }}
                  />
                </Box>
                <TextField
                  size="small"
                  fullWidth
                  disabled
                  value={
                    bulkVisibleStudents.length === 0
                      ? t.noStudentsMatch || "No students match the current filters"
                      : `${bulkVisibleStudents.length} ${t.students || "students"}`
                  }
                  sx={{
                    ...modalFieldSx(theme),
                    "& .MuiInputBase-input.Mui-disabled": {
                      WebkitTextFillColor: theme.palette.mode === "light" ? "#475467" : "#e2e8f0",
                      fontWeight: 600,
                    },
                  }}
                />
              </Box>
              <Box display="flex" gap={1} mb={1.5} flexWrap="wrap">
                <Button size="small" variant="outlined" onClick={selectAllVisibleEligible} disabled={!bulkGroupId}>
                  {t.selectAllVisibleStudents || "Select all (visible)"}
                </Button>
                <Button size="small" onClick={clearBulkSelection} disabled={bulkSelectedIds.size === 0}>
                  {t.clearStudentSelection || "Clear"}
                </Button>
              </Box>

              <Box
                sx={{
                  maxHeight: "min(52vh, 520px)",
                  overflowY: "auto",
                  overflowX: "hidden",
                  border: "1px solid",
                  borderColor: theme.palette.mode === "light" ? "#d0d5dd" : "rgba(191,219,254,0.18)",
                  borderRadius: 2,
                  p: 1.25,
                  bgcolor: theme.palette.mode === "light" ? "#ffffff" : "rgba(15,23,42,0.38)",
                  boxShadow: theme.palette.mode === "light" ? "inset 0 1px 0 rgba(255,255,255,0.7)" : "inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
                data-testid="enrollments-bulk-list"
              >
                {!bulkGroupId ? (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3, fontWeight: 600 }}>
                    {t.bulkSelectGroupFirst || "Select a group first to load students."}
                  </Typography>
                ) : bulkVisibleStudents.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3, fontWeight: 600 }}>
                    {t.noStudentsMatch || "No students match the current filters."}
                  </Typography>
                ) : (
                  <FormGroup>
                    {bulkVisibleStudents.map((s) => {
                      const id = Number(s.id);
                      const inGroup = alreadyInGroupIds.has(id);
                      const levelName = levels.find((item) => Number(item.id) === Number(s.levelId))?.name;
                      const sectionName = sections.find((item) => Number(item.id) === Number(s.sectionId))?.name;
                      return (
                        <FormControlLabel
                          key={s.id}
                          labelPlacement="end"
                          sx={{
                            mr: 0,
                            ml: 0,
                            mb: 0.75,
                            alignItems: "flex-start",
                            opacity: inGroup ? 0.6 : 1,
                            border: "1px solid",
                            borderColor: inGroup
                              ? theme.palette.mode === "light"
                                ? "#e4e7ec"
                                : "rgba(148,163,184,0.18)"
                              : theme.palette.mode === "light"
                                ? "#dbeafe"
                                : "rgba(147,197,253,0.18)",
                            borderRadius: 2,
                            px: 1.25,
                            py: 0.75,
                            backgroundColor: inGroup
                              ? theme.palette.mode === "light"
                                ? "#f8fafc"
                                : "rgba(30,41,59,0.45)"
                              : theme.palette.mode === "light"
                                ? "#ffffff"
                                : "rgba(15,23,42,0.54)",
                          }}
                          control={
                            <Checkbox
                              checked={bulkSelectedIds.has(id)}
                              onChange={() => toggleBulkStudent(id)}
                              disabled={inGroup}
                              data-testid={`enrollments-bulk-cb-${id}`}
                            />
                          }
                          label={
                            <Box sx={{ pt: 0.25 }}>
                              <Typography variant="body1" sx={{ color: theme.palette.mode === "light" ? "#101828" : "#f8fafc", fontWeight: 700 }}>
                                {s.fullName}
                              </Typography>
                              <Typography variant="caption" sx={{ display: "block", color: theme.palette.mode === "light" ? "#475467" : "#cbd5e1", mt: 0.25 }}>
                                {[s.phone, s.guardianPhone].filter(Boolean).join(" • ") || (t.studentId || "Student")}
                              </Typography>
                              {(levelName || sectionName) && (
                                <Typography variant="caption" sx={{ display: "block", color: theme.palette.mode === "light" ? "#1d4ed8" : "#93c5fd", mt: 0.25, fontWeight: 600 }}>
                                  {[levelName, sectionName].filter(Boolean).join(" • ")}
                                </Typography>
                              )}
                              {inGroup && (
                                <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 0.4, fontWeight: 700 }}>
                                  {t.alreadyEnrolledShort || "Already in group"}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      );
                    })}
                  </FormGroup>
                )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, ...modalSurfaceSx(theme, colors) }}>
              <Button data-testid="enrollments-cancel" type="button" onClick={handleClose} sx={secondaryActionSx(theme)}>
                {t.cancel || "Cancel"}
              </Button>
              <Button
                data-testid="enrollments-bulk-save"
                type="button"
                variant="contained"
                disabled={!bulkGroupId || bulkSelectedIds.size === 0}
                onClick={handleBulkSave}
                sx={primaryActionSx(theme, colors)}
              >
                {t.save || "Save"}
              </Button>
            </DialogActions>
          </>
        ) : (
          <form onSubmit={formik.handleSubmit}>
            <DialogContent dir={language === "ar" ? "rtl" : "ltr"} sx={modalSurfaceSx(theme, colors)}>
              {editingEnrollment && (
                <TextField
                  margin="dense"
                  fullWidth
                  disabled
                  label={t.studentId || "Student"}
                  value={selectedStudent?.fullName || String(editingEnrollment.studentId || "")}
                  sx={{ mb: 1, ...modalFieldSx(theme) }}
                />
              )}
              {!editingEnrollment && (
                <Box display="flex" gap={1} alignItems="center" mb={1}>
                  <Autocomplete
                    data-testid="enrollments-student-autocomplete"
                    fullWidth
                    options={studentOptions}
                    value={selectedStudent}
                    onChange={(_, value) => {
                      setSelectedStudent(value);
                      formik.setFieldValue("studentId", value?.id ? Number(value.id) : "");
                    }}
                    inputValue={studentSearchInput}
                    onInputChange={(_, value) => setStudentSearchInput(value)}
                    getOptionLabel={(option) =>
                      option?.fullName ? `${option.fullName}${option.phone ? ` - ${option.phone}` : ""}` : ""
                    }
                    isOptionEqualToValue={(option, value) => option?.id === value?.id}
                    disabled={!!editingEnrollment}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        inputProps={{ ...params.inputProps, "data-testid": "enrollments-student-input" }}
                        margin="dense"
                        fullWidth
                        name="studentId"
                        label={t.studentId || "Student"}
                        placeholder={t.searchStudents || "Search (name / phone / guardian)"}
                        onBlur={formik.handleBlur}
                        error={formik.touched.studentId && Boolean(formik.errors.studentId)}
                        helperText={formik.touched.studentId && formik.errors.studentId}
                        sx={modalFieldSx(theme)}
                      />
                    )}
                  />

                  <Tooltip title={scannerOn ? t.scannerOffLabel || "Turn QR scanner OFF" : t.scannerOnLabel || "Turn QR scanner ON"}>
                    <span>
                      <IconButton
                        onClick={() => setScannerOn((value) => !value)}
                        disabled={!!editingEnrollment}
                        sx={{
                          mt: 1,
                          border: 1,
                          borderColor: scannerOn ? "primary.main" : "action.disabled",
                          bgcolor: scannerOn ? "primary.main" : "transparent",
                          color: scannerOn ? "primary.contrastText" : "text.secondary",
                          borderRadius: "12px",
                          width: 44,
                          height: 44,
                          "&:hover": { bgcolor: scannerOn ? "primary.dark" : "action.hover" },
                        }}
                      >
                        <QrCodeScannerIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              )}

              <TextField
                inputProps={{ "data-testid": "enrollments-groupId" }}
                select
                fullWidth
                margin="dense"
                label={t.group || "Group"}
                name="groupId"
                value={formik.values.groupId === "" || formik.values.groupId == null ? "" : String(formik.values.groupId)}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.groupId && Boolean(formik.errors.groupId)}
                helperText={formik.touched.groupId && formik.errors.groupId}
                disabled={!!editingEnrollment}
                InputLabelProps={{ shrink: true }}
                sx={modalFieldSx(theme)}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (selected) => {
                    if (selected === "" || selected == null) return "-";
                    const g = groups.find((x) => String(x.id) === String(selected));
                    return g?.name ?? String(selected);
                  },
                }}
              >
                {groups.map((g) => (
                  <MenuItem key={g.id} value={String(g.id)}>
                    {g.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                inputProps={{ "data-testid": "enrollments-status" }}
                select
                margin="dense"
                fullWidth
                name="status"
                label={t.status || "Status"}
                value={formik.values.status}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.status && Boolean(formik.errors.status)}
                helperText={formik.touched.status && formik.errors.status}
                sx={modalFieldSx(theme)}
              >
                {STATUS_OPTIONS.map((status) => (
                  <MenuItem key={status} value={status}>
                    {getEnrollmentStatusLabel(status, t)}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                margin="dense"
                placeholder={t.notes || "Notes"}
                fullWidth
                name="notes"
                value={formik.values.notes}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.notes && Boolean(formik.errors.notes)}
                helperText={formik.touched.notes && formik.errors.notes}
                multiline
                minRows={2}
                sx={modalFieldSx(theme)}
              />
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2, ...modalSurfaceSx(theme, colors) }}>
              <Button data-testid="enrollments-cancel" type="button" onClick={handleClose} sx={secondaryActionSx(theme)}>
                {t.cancel || "Cancel"}
              </Button>
              <Button
                data-testid="enrollments-save"
                type="submit"
                variant="contained"
                sx={primaryActionSx(theme, colors)}
              >
                {t.save || "Save"}
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={2500} onClose={() => setSnack((prev) => ({ ...prev, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={() => setSnack((prev) => ({ ...prev, open: false }))} severity={snack.severity} variant="filled" sx={{ width: "100%" }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Enrollments;

