    import { useState, useEffect } from "react";
    import {
    Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, useTheme
    } from "@mui/material";
    import { DataGrid } from "@mui/x-data-grid";
    import { useFormik } from "formik";
    import * as yup from "yup";
    import { tokens } from "../../theme";
    import Header from "../../components/Header";

    import {
    listEnrollments, createEnrollment, updateEnrollmentStatus, deleteEnrollment
    } from "../../api/enrollmentsApi";
    import { listStudents } from "../../api/studentsApi";
    import { lookupGroups } from "../../api/groupsApi";
    import translations from "../../translations";

    // ---------- INITIAL VALUES ----------
    const initialValues = {
    studentId: "",
    groupId: "",
    enrollmentDate: "",
    // endDate: "",
    status: "",
    notes: "",
    };

    // ---------- VALIDATION ----------
    const enrollmentSchema = yup.object().shape({
    studentId: yup.number().required("Student is required"),
    groupId: yup.number().required("Group is required"),
    enrollmentDate: yup.date().required("Enrollment date is required"),
    status: yup
        .string()
        .oneOf(["ACTIVE", "SUSPENDED", "DROPPED", "COMPLETED"])
        .required("Status is required"),
    notes: yup.string().nullable(),
    });

    const Enrollments = ({ language }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const t = translations[language] || translations["fr"];

    const [enrollments, setEnrollments] = useState([]);
    const [students, setStudents] = useState({});
    const [groups, setGroups] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingEnrollment, setEditingEnrollment] = useState(null);
    const [loading, setLoading] = useState(false);

    // ---------- FORMIK ----------
    const formik = useFormik({
        initialValues,
        validationSchema: enrollmentSchema,
        onSubmit: handleSave,
        enableReinitialize: true,
    });

    // ---------- CLOSE DIALOG ----------
    const handleClose = () => {
        setOpenDialog(false);
        setEditingEnrollment(null);
        formik.resetForm();
    };

    // ---------- LOAD DATA ----------
    const loadEnrollments = async () => {
        setLoading(true);
        try {
        const res = await listEnrollments({ page: 0, size: 20 });
        setEnrollments(res.content || res);
        } catch (err) {
        console.error("Failed to load enrollments", err);
        } finally {
        setLoading(false);
        }
    };

    const loadStudents = async () => {
        const data = await listStudents();
        setStudents(data);
    };

    // Load groups
        
        const loadGroups = async () => {
    try {
        const data = await lookupGroups();
        setGroups(Array.isArray(data) ? data : []); // ✅ always an array
    } catch (err) {
        console.error("Failed to load groups", err);
        setGroups([]);
    }
    };



    useEffect(() => {
        loadEnrollments();
        loadStudents();
        loadGroups();
    }, []);

    // ---------- HANDLE SAVE ----------
    async function handleSave(values) {
        try {
        if (editingEnrollment) {
    await updateEnrollmentStatus(editingEnrollment.id, values.status, values.notes);
        } else {
            await createEnrollment(values);
        }
        await loadEnrollments();
        handleClose();
        } catch (err) {
        console.error("Save failed", err);
        }
    }

    // ---------- LOAD EDITING VALUES ----------
    useEffect(() => {
        if (editingEnrollment) {
        formik.setValues({
            studentId: editingEnrollment.studentId || "",
            groupId: editingEnrollment.groupId || "",
            enrollmentDate: editingEnrollment.enrollmentDate || "",
            // endDate: editingEnrollment.endDate || "",
            status: editingEnrollment.status || "ACTIVE",
            notes: editingEnrollment.notes || "",
        });
        }
    }, [editingEnrollment]);

    // ---------- COLUMNS ----------
    const columns = [
        { field: "id", headerName: "ID", width: 80 },
        {
        field: "studentId",
        headerName: t.studentId || "Student",
        flex: 1,
        renderCell: (params) => {
            const student = students[params.row.studentId];
            return student ? student.fullName : params.row.studentId;
        },
        },
        {
        field: "groupId",
        headerName: "Group",
        flex: 1,
        renderCell: (params) => {
            const group = groups.find((g) => g.id === params.row.groupId);
            return group ? group.name : params.row.groupId;
        },
        },

        { field: "enrollmentDate", headerName: t.startDate || "Start Date", flex: 1 },
        // { field: "endDate", headerName: t.endDate || "End Date", flex: 1 },
        { field: "status", headerName: t.status || "Status", flex: 1 },
        { field: "notes", headerName: t.notes || "Notes", flex: 1 },
        {
        field: "actions",
        headerName: t.actions || "Actions",
        width: 150,
        renderCell: (params) => (
            <>
            <Button
                size="small"
                onClick={() => {
                setEditingEnrollment(params.row);
                setOpenDialog(true);
                }}
            >
                {t.edit}
            </Button>
            <Button
                size="small"
                color="error"
                onClick={async () => {
                await deleteEnrollment(params.row.id);
                loadEnrollments();
                }}
            >
                {t.delete}
            </Button>
            </>
        ),
        },
    ];

    // ---------- RENDER ----------
    return (
        <Box m="20px">
        <Header title={t.enrollments || "Enrollments"} />

        <Box display="flex" justifyContent="flex-end" mb={2}>
            <Button
            variant="contained"
            onClick={() => {
                setEditingEnrollment(null);
                setOpenDialog(true);
                formik.resetForm();
            }}
            sx={{
                backgroundColor:
                theme.palette.mode === "light"
                    ? colors.blueAccent[800]
                    : colors.blueAccent[300],
                color: theme.palette.mode === "light" ? "#fff" : colors.blueAccent[800],
            }}
            >
            {t.addEnrollment || "Add Enrollment"}
            </Button>
        </Box>

        <div style={{ height: 500, width: "100%" }}>
            <DataGrid
            rows={enrollments}
            columns={columns}
            pageSize={10}
            loading={loading}
            getRowId={(row) => row.id}
            />
        </div>

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
                {/* Student Dropdown */}
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
                >
                {Object.values(students).map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                    {s.fullName}
                    </MenuItem>
                ))}
                </TextField>

                {/* Group Dropdown */}
            {/* Group Dropdown */}
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
            >
            <MenuItem value="">-- Select Group --</MenuItem>
            {groups.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                {g.name}
                </MenuItem>
            ))}
            </TextField>


                {/* Enrollment Date */}
                <TextField
                margin="dense"
                type="date"
                fullWidth
                name="enrollmentDate"
                value={formik.values.enrollmentDate}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.enrollmentDate && Boolean(formik.errors.enrollmentDate)}
                helperText={formik.touched.enrollmentDate && formik.errors.enrollmentDate}
                InputLabelProps={{ shrink: true }}
                />


                {/* Status Dropdown */}
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
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="SUSPENDED">Suspended</MenuItem>
                    <MenuItem value="DROPPED">Dropped</MenuItem>
                    <MenuItem value="COMPLETED">Completed</MenuItem>
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
                />
            </DialogContent>

            <DialogActions>
                <Button type="button" onClick={handleClose}>
                {t.cancel}
                </Button>
                <Button type="submit" variant="contained">
                {t.save}
                </Button>
            </DialogActions>
            </form>
        </Dialog>
        </Box>
    );
    };

    export default Enrollments;
