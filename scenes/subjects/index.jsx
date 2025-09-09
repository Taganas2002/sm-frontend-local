    // src/scenes/subjects/Subjects.jsx
    import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Typography,
    useTheme,
    } from "@mui/material";
    import {
    searchSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
    } from "../../api/subjectsApi";
    import { DataGrid } from "@mui/x-data-grid";
    import { tokens } from "../../theme";
    import Header from "../../components/Header";
    import { useState, useEffect } from "react";
    import { Formik } from "formik";
    import * as yup from "yup";

    import AddIcon from "@mui/icons-material/Add";
    import EditIcon from "@mui/icons-material/Edit";
    import DeleteIcon from "@mui/icons-material/Delete";
    import CloseIcon from "@mui/icons-material/Close";
    import SaveIcon from "@mui/icons-material/Save";
    import UpdateIcon from "@mui/icons-material/Update";

    import translations from "../../translations/index";

    const Subjects = ({ language }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const t = translations[language] || translations["fr"];

    const [subjects, setSubjects] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);
    const [loading, setLoading] = useState(false);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [subjectToDelete, setSubjectToDelete] = useState(null);
    const [deleteError, setDeleteError] = useState("");

    // ---------- LOAD SUBJECTS ----------
    const loadSubjects = async () => {
        setLoading(true);
        try {
        const res = await searchSubjects({ page: 0, size: 20 });
        setSubjects(res.content || res || []);
        } catch (err) {
        console.error("Failed to load subjects", err);
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        loadSubjects();
    }, []);

    // ---------- OPEN / CLOSE DIALOG ----------
    const handleOpen = () => {
        setEditingSubject(null);
        setOpenDialog(true);
    };
    const handleClose = () => {
        setEditingSubject(null);
        setOpenDialog(false);
    };

    // ---------- HANDLE SAVE ----------
    const handleSave = async (values, { setSubmitting }) => {
        try {
        if (editingSubject) {
            await updateSubject(editingSubject.id, values);
        } else {
            await createSubject(values);
        }
        await loadSubjects();
        setOpenDialog(false);
        } catch (err) {
        console.error("Save failed", err);
        } finally {
        setSubmitting(false);
        }
    };

    // ---------- HANDLE EDIT ----------
    const handleEdit = (id) => {
        const subj = subjects.find((s) => s.id === id);
        setEditingSubject(subj);
        setOpenDialog(true);
    };

    // ---------- HANDLE DELETE ----------
    const handleConfirmDelete = async () => {
        if (!subjectToDelete) return;

        try {
        await deleteSubject(subjectToDelete.id);
        await loadSubjects();
        setDeleteDialogOpen(false);
        setSubjectToDelete(null);
        setDeleteError("");
        } catch (err) {
        let message =
            err.response?.data?.message ||
            err.message ||
            t.deleteFailed ||
            "Delete failed. Please try again.";

        if (
            message.includes("Cannot delete or update a parent row") ||
            message.includes("foreign key constraint")
        ) {
            message =
            language === "ar"
                ? "لا يمكن حذف هذه المادة لأنها مرتبطة بسجلات أخرى."
                : "Impossible de supprimer cette matière car elle est encore liée à d'autres enregistrements.";
        }

        setDeleteError(message);
        }
    };

    const handleCancelDelete = () => {
        setDeleteDialogOpen(false);
        setSubjectToDelete(null);
        setDeleteError("");
    };

    // ---------- COLUMNS ----------
    const columns = [
        { field: "id", headerName: "ID", width: 90 },
        { field: "name", headerName: t.subjectName, flex: 1 },
        { field: "code", headerName: t.subjectCode, flex: 1 },
        {
        field: "actions",
        headerName: t.actions,
        width: 180,
        renderCell: (params) => (
            <Box display="flex" gap={1} mt={1}>
            <Button
                size="small"
                variant="contained"
                onClick={() => handleEdit(params.row.id)}
                startIcon={<EditIcon />}
                sx={{
                backgroundColor:
                    theme.palette.mode === "light"
                    ? colors.blueAccent[800]
                    : colors.blueAccent[400],
                color: "#fff",
                "&:hover": {
                    backgroundColor:
                    theme.palette.mode === "light"
                        ? colors.blueAccent[400]
                        : colors.blueAccent[800],
                },
                }}
            />
            <Button
                size="small"
                variant="contained"
                color="error"
                onClick={() => {
                setSubjectToDelete(params.row);
                setDeleteDialogOpen(true);
                }}
                startIcon={<DeleteIcon />}
                sx={{
                backgroundColor: theme.palette.error.main,
                color: "#fff",
                "&:hover": {
                    backgroundColor: theme.palette.error.dark,
                },
                }}
            />
            </Box>
        ),
        },
    ];

    // ---------- VALIDATION ----------
    const subjectSchema = yup.object().shape({
        name: yup.string().required(t.requiredSubjectName),
        code: yup.string().required(t.requiredSubjectCode),
    });

    const initialValues = {
        name: "",
        code: "",
    };

    return (
        <Box m="20px">
        <Header title={t.subjects} subtitle={t.dataManagement} />

        {/* Top Button */}
        <Box display="flex" justifyContent="flex-end" mb={2}>
            <Button
            variant="contained"
            sx={{
                backgroundColor:
                theme.palette.mode === "light"
                    ? colors.blueAccent[800]
                    : colors.blueAccent[400],
                color: "#fff",
                "& .MuiButton-startIcon": {
                marginInlineEnd: language === "ar" ? "8px" : "6px",
                },
                "&:hover": {
                backgroundColor:
                    theme.palette.mode === "light"
                    ? colors.blueAccent[400]
                    : colors.blueAccent[800],
                },
            }}
            startIcon={<AddIcon />}
            onClick={handleOpen}
            >
            {t.addSubject}
            </Button>
        </Box>

        {/* DataGrid */}
        <Box
            height="70vh"
            dir={language === "ar" ? "rtl" : "ltr"}
            sx={{
            "& .MuiDataGrid-root": { border: "none" },
            "& .MuiDataGrid-columnHeaders": {
                backgroundColor: colors.blueAccent[700],
                borderBottom: "none",
                textAlign: language === "ar" ? "right" : "left",
            },
            "& .MuiDataGrid-cell": {
                textAlign: language === "ar" ? "right" : "left",
            },
            "& .MuiDataGrid-virtualScroller": {
                backgroundColor: colors.primary[400],
            },
            "& .MuiDataGrid-footerContainer": {
                borderTop: "none",
                backgroundColor: colors.blueAccent[400],
            },
            }}
        >
            <DataGrid
            rows={subjects}
            columns={columns}
            disableRowSelectionOnClick
            loading={loading}
            getRowId={(row) => row.id}
            />
        </Box>

        {/* Add/Edit Dialog */}
        <Dialog open={openDialog} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle
            sx={{
                backgroundColor:
                theme.palette.mode === "light" ? "#0d47a1" : "#4274c7",
                color: "#fff",
                fontWeight: "bold",
            }}
            >
            {editingSubject ? t.editSubject : t.addSubject}
            </DialogTitle>

            <Formik
            initialValues={editingSubject || initialValues}
            validationSchema={subjectSchema}
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
                isSubmitting,
            }) => (
                <form onSubmit={handleSubmit}>
                <DialogContent>
                    <TextField
                    margin="dense"
                    placeholder={t.subjectName}
                    fullWidth
                    name="name"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                    />

                    <TextField
                    margin="dense"
                    placeholder={t.subjectCode}
                    fullWidth
                    name="code"
                    value={values.code}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.code && Boolean(errors.code)}
                    helperText={touched.code && errors.code}
                    />
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
                        },
                    }}
                    startIcon={<CloseIcon />}
                    >
                    {t.cancel}
                    </Button>

                    <Button
                    type="submit"
                    variant="contained"
                    disabled={isSubmitting}
                    sx={{
                        backgroundColor:
                        theme.palette.mode === "light"
                            ? colors.blueAccent[800]
                            : colors.blueAccent[400],
                        color: "#fff",
                        "&:hover": {
                        backgroundColor:
                            theme.palette.mode === "light"
                            ? colors.blueAccent[400]
                            : colors.blueAccent[800],
                        },
                    }}
                    startIcon={editingSubject ? <UpdateIcon /> : <SaveIcon />}
                    >
                    {editingSubject ? t.update : t.save}
                    </Button>
                </DialogActions>
                </form>
            )}
            </Formik>
        </Dialog>

        {/* Delete Confirmation Dialog */}
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
                <Typography sx={{ color: "yellow", fontWeight: "bold" }}>
                {deleteError}
                </Typography>
            ) : (
                <Typography>
                {t.confirmDeleteMessageSubject ||
                    "Do you want to delete this subject?"}
                </Typography>
            )}
            </DialogContent>

            <DialogActions sx={{ justifyContent: "center", gap: 2 }}>
            <Button
                onClick={handleCancelDelete}
                variant="outlined"
                sx={{
                borderColor: "#fff",
                color: "#fff",
                "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" },
                }}
                startIcon={<CloseIcon />}
            >
                {t.cancel}
            </Button>
            <Button
                onClick={handleConfirmDelete}
                variant="contained"
                disabled={!!deleteError}
                sx={{
                backgroundColor: "#fff",
                color: "#1e3a8a",
                "&:hover": { backgroundColor: "rgba(255,255,255,0.8)" },
                }}
            >
                {t.confirm}
            </Button>
            </DialogActions>
        </Dialog>
        </Box>
    );
    };

    export default Subjects;
