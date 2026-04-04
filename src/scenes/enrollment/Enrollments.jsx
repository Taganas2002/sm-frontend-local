import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  MenuItem,
  Snackbar,
  TextField,
  Tooltip,
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
  updateEnrollmentStatus,
  deleteEnrollment,
} from "../../api/enrollmentsApi";
import { searchStudents, getStudent } from "../../api/studentsApi";
import { lookupGroups } from "../../api/groupsApi";

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

const Enrollments = ({ language = "fr" }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = getTranslations(language);

  const [rows, setRows] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [groups, setGroups] = useState([]);
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
    groupId: yup.number().required(t.group || "Group is required"),
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

  const loadGroups = async () => {
    try {
      // Backend historically only honored limit when 0 < limit < 500; use 499 so large schools still get a full page.
      const data = await lookupGroups({ limit: 499 });
      setGroups(Array.isArray(data) ? data : normalizeToArray(data));
    } catch (e) {
      console.error("Failed to load groups", e);
      setGroups([]);
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
          groupId: filterGroupId || undefined,
        });
        setRows(normalizeToArray(res));
      } else {
        const res = await filterEnrollmentsCSV({
          groupId: filterGroupId || undefined,
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

  const filteredRows = useMemo(() => {
    const term = (q || "").trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      const sid = Number(r.studentId);
      const student = Number.isFinite(sid) ? studentsById[sid] : undefined;
      const studentName = (student?.fullName || "").toLowerCase();
      const groupName = (groups.find((g) => g.id === r.groupId)?.name || "").toLowerCase();
      const notes = (r.notes || "").toLowerCase();
      return studentName.includes(term) || groupName.includes(term) || notes.includes(term);
    });
  }, [q, rows, studentsById, groups]);

  const handleClose = () => {
    setOpenDialog(false);
    setEditingEnrollment(null);
    setSelectedStudent(null);
    setStudentSearchInput("");
    formik.resetForm();
    formik.setValues({ ...initialValues });
  };

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
        groupId: editingEnrollment.groupId || "",
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
    { field: "id", headerName: "ID", width: 80 },
    {
      field: "studentId",
      headerName: t.studentId || "Student",
      flex: 1,
      renderCell: (params) => {
        const sid = Number(params.row.studentId);
        const s = Number.isFinite(sid) ? studentsById[sid] : undefined;
        return s ? s.fullName : params.row.studentId;
      },
    },
    {
      field: "groupId",
      headerName: t.group || "Group",
      flex: 1,
      renderCell: (params) => {
        const g = groups.find((x) => x.id === params.row.groupId);
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
          // put test id on the actual input (root is a div — Playwright fill needs the input)
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

        <TextField select label={t.groups || "Groups"} value={filterGroupId} onChange={(e) => setFilterGroupId(e.target.value)} size="small">
          <MenuItem value="">{t.all || "All"}</MenuItem>
          {groups.map((g) => (
            <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
          ))}
        </TextField>

        <TextField select label={t.status || "Status"} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} size="small">
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
              backgroundColor: theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[300],
              color: theme.palette.mode === "light" ? "#fff" : colors.blueAccent[900],
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

      <Dialog open={openDialog} onClose={handleClose} fullWidth maxWidth="sm" data-testid="enrollments-dialog">
        <DialogTitle sx={{ backgroundColor: theme.palette.mode === "light" ? "#0d47a1" : "#4274c7", color: "#fff", fontWeight: "bold" }}>
          {editingEnrollment ? t.editEnrollment || "Edit enrollment" : t.addEnrollment || "Add enrollment"}
        </DialogTitle>

        <input
          ref={scanInputRef}
          type="text"
          autoComplete="off"
          style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }}
          onKeyDown={(e) => {
            if (!scannerOn || !openDialog || editingEnrollment) return;
            if (e.key === "Enter") {
              e.preventDefault();
              const raw = scanInputRef.current?.value ?? "";
              if (scanInputRef.current) scanInputRef.current.value = "";
              handleScanString(raw);
            }
          }}
        />

        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
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
                getOptionLabel={(option) => option?.fullName ? `${option.fullName}${option.phone ? ` - ${option.phone}` : ""}` : ""}
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
                  />
                )}
              />

              <Tooltip title={scannerOn ? (t.scannerOffLabel || "Turn QR scanner OFF") : (t.scannerOnLabel || "Turn QR scanner ON")}>
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

            <TextField
              inputProps={{ "data-testid": "enrollments-groupId" }}
              select
              fullWidth
              margin="dense"
              label={t.group || "Group"}
              name="groupId"
              value={formik.values.groupId}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.groupId && Boolean(formik.errors.groupId)}
              helperText={formik.touched.groupId && formik.errors.groupId}
              disabled={!!editingEnrollment}
            >
              {groups.map((g) => (
                <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
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
            >
              {STATUS_OPTIONS.map((status) => (
                <MenuItem key={status} value={status}>{getEnrollmentStatusLabel(status, t)}</MenuItem>
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
            />
          </DialogContent>

          <DialogActions>
            <Button data-testid="enrollments-cancel" type="button" onClick={handleClose}>
              {t.cancel || "Cancel"}
            </Button>
            <Button data-testid="enrollments-save" type="submit" variant="contained">
              {t.save || "Save"}
            </Button>
          </DialogActions>
        </form>
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
