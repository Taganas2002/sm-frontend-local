    import { useEffect, useMemo, useState } from "react";
    import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Tooltip,
    InputAdornment,
    useTheme,
    } from "@mui/material";
    import { DataGrid } from "@mui/x-data-grid";
    import EditIcon from "@mui/icons-material/Edit";
    import DeleteIcon from "@mui/icons-material/Delete";
    import SearchIcon from "@mui/icons-material/Search";
    import { useFormik } from "formik";
    import * as yup from "yup";

    import { tokens } from "../../theme";
    import Header from "../../components/Header";
    import translations from "../../translations";

    import {
    listEnrollments,
    filterEnrollmentsCSV,
    createEnrollment,
    updateEnrollmentStatus,
    deleteEnrollment,
    } from "../../api/enrollmentsApi";
    import { listStudents } from "../../api/studentsApi";
    import { lookupGroups } from "../../api/groupsApi";

    // ---------- helpers ----------
    const STATUS_OPTIONS = ["ACTIVE", "SUSPENDED", "DROPPED", "COMPLETED"];

    // Local-PC date (yyyy-MM-dd) — NOT UTC toISOString()
    const getLocalDate = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
    };

    // ---------- form ----------
    const initialValues = {
    studentId: "",
    groupId: "",
    status: "ACTIVE", // default
    notes: "",
    };

    const enrollmentSchema = yup.object().shape({
    studentId: yup.number().required("Student is required"),
    groupId: yup.number().required("Group is required"),
    status: yup.string().oneOf(STATUS_OPTIONS).required("Status is required"),
    notes: yup.string().nullable(),
    });

    const Enrollments = ({ language = "fr" }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const t = translations[language] || translations["fr"];

    const [rows, setRows] = useState([]);
    const [studentsList, setStudentsList] = useState([]);
    const [groups, setGroups] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingEnrollment, setEditingEnrollment] = useState(null);
    const [loading, setLoading] = useState(false);

    // filter bar
    const [q, setQ] = useState("");
    const [filterGroupId, setFilterGroupId] = useState("");
    const [filterStatus, setFilterStatus] = useState("");

    const studentsById = useMemo(() => {
        const map = {};
        (studentsList || []).forEach((s) => (map[s.id] = s));
        return map;
    }, [studentsList]);

    const formik = useFormik({
        initialValues,
        validationSchema: enrollmentSchema,
        onSubmit: handleSave,
        enableReinitialize: true,
    });

    // ---------- loaders ----------
    const normalizeToArray = (data) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.content)) return data.content;
        if (typeof data === "object") return Object.values(data);
        return [];
    };

    const loadStudents = async () => {
        try {
        const data = await listStudents({ page: 0, size: 1000 });
        setStudentsList(normalizeToArray(data));
        } catch (e) {
        console.error("Failed to load students", e);
        setStudentsList([]);
        }
    };

    const loadGroups = async () => {
        try {
        const data = await lookupGroups();
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterGroupId, filterStatus]);

    // client-side text search
    const filteredRows = useMemo(() => {
        const term = (q || "").trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((r) => {
        const student = studentsById[r.studentId];
        const studentName = (student?.fullName || "").toLowerCase();
        const groupName =
            (groups.find((g) => g.id === r.groupId)?.name || "").toLowerCase();
        const notes = (r.notes || "").toLowerCase();
        return (
            studentName.includes(term) ||
            groupName.includes(term) ||
            notes.includes(term)
        );
        });
    }, [q, rows, studentsById, groups]);

    // ---------- dialog ----------
    const handleClose = () => {
        setOpenDialog(false);
        setEditingEnrollment(null);
        formik.resetForm();
        formik.setValues({ ...initialValues }); // keep ACTIVE as default
    };

    async function handleSave(values) {
        try {
        if (editingEnrollment) {
            // EDIT: patch status + notes
            await updateEnrollmentStatus(
            editingEnrollment.id,
            values.status,
            values.notes
            );
        } else {
            // CREATE: send enrollmentDate from local PC
            await createEnrollment({
            studentId: values.studentId,
            groupId: values.groupId,
            status: values.status, // default ACTIVE
            notes: values.notes || "",
            enrollmentDate: getLocalDate(), // <<==== required change
            });
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
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingEnrollment]);

    // ---------- columns ----------
    const columns = [
        { field: "id", headerName: "ID", width: 80 },
        {
        field: "studentId",
        headerName: t.studentId || "Student",
        flex: 1,
        renderCell: (params) => {
            const s = studentsById[params.row.studentId];
            return s ? s.fullName : params.row.studentId;
        },
        },
        {
        field: "groupId",
        headerName: "Group",
        flex: 1,
        renderCell: (params) => {
            const g = groups.find((x) => x.id === params.row.groupId);
            return g ? g.name : params.row.groupId;
        },
        },
        { field: "enrollmentDate", headerName: t.startDate || "Start Date", flex: 1 },
        { field: "status", headerName: t.status || "Status", flex: 1 },
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
                    bgcolor:
                    theme.palette.mode === "light"
                        ? colors.blueAccent[600]
                        : colors.blueAccent[400],
                    "&:hover": {
                    bgcolor:
                        theme.palette.mode === "light"
                        ? colors.blueAccent[700]
                        : colors.blueAccent[300],
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
                sx={{
                    minWidth: 36,
                    p: "6px",
                    bgcolor: colors.redAccent[500],
                    "&:hover": { bgcolor: colors.redAccent[700] },
                }}
                >
                <DeleteIcon fontSize="small" />
                </Button>
            </Tooltip>
            </Box>
        ),
        },
    ];

    // ---------- render ----------
    return (
        <Box m="20px">
        <Header title={t.enrollments || "Enrollments"} />

        {/* FILTER BAR (like Students screen) */}
        <Box
            mb={2}
            display="grid"
            gridTemplateColumns="minmax(260px, 1fr) 220px 220px auto"
            gap={2}
            alignItems="center"
        >
            <TextField
            placeholder="Search (name / group / notes)"
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
            label="Groups"
            value={filterGroupId}
            onChange={(e) => setFilterGroupId(e.target.value)}
            size="small"
            >
            <MenuItem value="">{t.all || "All"}</MenuItem>
            {groups.map((g) => (
                <MenuItem key={g.id} value={g.id}>
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
            >
            <MenuItem value="">{t.all || "All"}</MenuItem>
            {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>
                {s}
                </MenuItem>
            ))}
            </TextField>

            <Box display="flex" justifyContent="flex-end">
            <Button
                variant="contained"
                onClick={() => {
                setEditingEnrollment(null);
                formik.resetForm();
                formik.setValues({ ...initialValues }); // ensure ACTIVE
                setOpenDialog(true);
                }}
                sx={{
                backgroundColor:
                    theme.palette.mode === "light"
                    ? colors.blueAccent[800]
                    : colors.blueAccent[300],
                color:
                    theme.palette.mode === "light" ? "#fff" : colors.blueAccent[900],
                }}
            >
                {t.addEnrollment || "Add Enrollment"}
            </Button>
            </Box>
        </Box>

        <div style={{ height: 520, width: "100%" }}>
            <DataGrid
            rows={filteredRows}
            columns={columns}
            pageSize={10}
            loading={loading}
            disableRowSelectionOnClick
            getRowId={(row) => row.id}
            />
        </div>

        {/* CREATE/EDIT DIALOG */}
        <Dialog open={openDialog} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle
            sx={{
                backgroundColor:
                theme.palette.mode === "light" ? "#0d47a1" : "#4274c7",
                color: "#fff",
                fontWeight: "bold",
            }}
            >
            {editingEnrollment
                ? t.editEnrollment || "Edit Enrollment"
                : t.addEnrollment || "Add Enrollment"}
            </DialogTitle>

            <form onSubmit={formik.handleSubmit}>
            <DialogContent>
                {/* Student */}
                <TextField
                select
                margin="dense"
                fullWidth
                name="studentId"
                label={t.studentId || "Select Student"}
                value={formik.values.studentId}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.studentId && Boolean(formik.errors.studentId)}
                helperText={formik.touched.studentId && formik.errors.studentId}
                disabled={!!editingEnrollment}
                >
                {studentsList.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                    {s.fullName}
                    </MenuItem>
                ))}
                </TextField>

                {/* Group */}
                <TextField
                select
                fullWidth
                margin="dense"
                label="Group"
                name="groupId"
                value={formik.values.groupId}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.groupId && Boolean(formik.errors.groupId)}
                helperText={formik.touched.groupId && formik.errors.groupId}
                disabled={!!editingEnrollment}
                >
                {groups.map((g) => (
                    <MenuItem key={g.id} value={g.id}>
                    {g.name}
                    </MenuItem>
                ))}
                </TextField>

                {/* Status (no blank option) */}
                <TextField
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
                {STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s} value={s}>
                    {s}
                    </MenuItem>
                ))}
                </TextField>

                {/* Notes */}
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
                <Button type="button" onClick={handleClose}>
                {t.cancel || "Cancel"}
                </Button>
                <Button type="submit" variant="contained">
                {t.save || "Save"}
                </Button>
            </DialogActions>
            </form>
        </Dialog>
        </Box>
    );
    };

    export default Enrollments;
