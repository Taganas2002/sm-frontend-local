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
    import { DataGrid } from "@mui/x-data-grid";
    import { tokens } from "../../theme";
    import Header from "../../components/Header";
    import { useState, useEffect } from "react";
    import { Formik } from "formik";
    import * as yup from "yup";

    import AddIcon from "@mui/icons-material/Add";
    import EditIcon from "@mui/icons-material/Edit";
    import DeleteIcon from "@mui/icons-material/Delete";
    import SaveIcon from "@mui/icons-material/Save";
    import UpdateIcon from "@mui/icons-material/Update";
    import CloseIcon from "@mui/icons-material/Close";

    import translations from "../../translations/index";
    import {
    searchClassrooms,
    createClassroom,
    updateClassroom,
    deleteClassroom,
    } from "../../api/classroomsApi";

    const Classes = ({ language }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const t = translations[language] || translations["fr"];

    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingClass, setEditingClass] = useState(null);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [classroomToDelete, setClassroomToDelete] = useState(null);
    const [deleteError, setDeleteError] = useState("");

    // ---------- LOAD CLASSES ----------
    const loadClasses = async () => {
        setLoading(true);
        try {
        const res = await searchClassrooms({ page: 0, size: 50 });
        setClasses(res?.content || res || []);
        } catch (err) {
        console.error("Failed to load classrooms", err);
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        loadClasses();
    }, []);

    // ---------- OPEN / CLOSE DIALOG ----------
    const handleOpen = () => {
        setEditingClass(null);
        setOpenDialog(true);
    };
    const handleClose = () => {
        setEditingClass(null);
        setOpenDialog(false);
    };

    // ---------- HANDLE SAVE ----------
    const handleSave = async (values, { setSubmitting }) => {
        try {
        if (editingClass) {
            await updateClassroom(editingClass.id, values);
        } else {
            await createClassroom(values);
        }
        await loadClasses();
        setOpenDialog(false);
        } catch (err) {
        console.error("Save failed", err);
        } finally {
        setSubmitting(false);
        }
    };

    // ---------- HANDLE EDIT ----------
    const handleEdit = (id) => {
        const cls = classes.find((c) => c.id === id);
        setEditingClass(cls);
        setOpenDialog(true);
    };

    // ---------- HANDLE DELETE ----------
    const handleConfirmDelete = async () => {
        if (!classroomToDelete) return;

        try {
        await deleteClassroom(classroomToDelete.id);
        await loadClasses();
        setDeleteDialogOpen(false);
        setClassroomToDelete(null);
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
                ? "لا يمكن حذف هذه القاعة لأنها مرتبطة بسجلات أخرى."
                : "Impossible de supprimer cette salle car elle est encore liée à d'autres enregistrements.";
        }

        setDeleteError(message);
        }
    };

    const handleCancelDelete = () => {
        setDeleteDialogOpen(false);
        setClassroomToDelete(null);
        setDeleteError("");
    };

    // ---------- COLUMNS ----------
    const columns = [
        { field: "id", headerName: "ID", width: 90 },
        { field: "roomName", headerName: t.roomName, flex: 1 },
        { field: "capacity", headerName: t.capacity, flex: 1 },
        { field: "equipment", headerName: t.equipment, flex: 1 },
        { field: "notes", headerName: t.notes, flex: 1 },
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
                setClassroomToDelete(params.row);
                setDeleteDialogOpen(true);
                }}
                sx={{
                            ml: 1,
                            backgroundColor: theme.palette.error.main,
                            color: "#fff",
                            "&:hover": {
                                backgroundColor: theme.palette.error.dark,
                            },
                        }}
                        startIcon={<DeleteIcon />}
                    />
            </Box>
        ),
        },
    ];

    // ---------- VALIDATION ----------
    const classSchema = yup.object().shape({
        roomName: yup.string().required(t.requiredRoomName),
        capacity: yup
        .number()
        .typeError(t.invalidCapacity)
        .positive(t.invalidCapacity)
        .integer(t.invalidCapacity)
        .required(t.requiredCapacity),
        equipment: yup.string().nullable(),
        notes: yup.string().nullable(),
    });

    const initialValues = {
        roomName: "",
        capacity: "",
        equipment: "",
        notes: "",
    };

    return (
        <Box m="20px">
        <Header title={t.classes} subtitle={t.dataManagement} />

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
            {t.addClass}
            </Button>
        </Box>

        {/* DataGrid */}
        <Box
            height="70vh"
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
            "& .MuiCheckbox-root.Mui-checked": {
                color:
                theme.palette.mode === "light"
                    ? colors.blueAccent[800]
                    : colors.blueAccent[400],
            },
            }}
        >
            <DataGrid
            rows={classes}
            columns={columns}
            loading={loading}
            disableRowSelectionOnClick
            getRowId={(row) => row.id}
            />
        </Box>

        {/* Add/Edit Dialog */}
        <Dialog open={openDialog} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle
            sx={{
                backgroundColor: theme.palette.mode === "light" ? "#0d47a1" : "#4274c7",
                color: "#fff",
                fontWeight: "bold",
            }}
            >
            {editingClass ? t.editClass : t.addClass}
            </DialogTitle>

            <Formik
            initialValues={editingClass || initialValues}
            validationSchema={classSchema}
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
                    <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                    <TextField
                        margin="dense"
                        placeholder={t.roomName}
                        fullWidth
                        name="roomName"
                        value={values.roomName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.roomName && Boolean(errors.roomName)}
                        helperText={touched.roomName && errors.roomName}
                    />

                    <TextField
                        margin="dense"
                        type="number"
                        placeholder={t.capacity}
                        fullWidth
                        name="capacity"
                        value={values.capacity}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.capacity && Boolean(errors.capacity)}
                        helperText={touched.capacity && errors.capacity}
                    />

                    <TextField
                        margin="dense"
                        placeholder={t.equipment}
                        fullWidth
                        name="equipment"
                        value={values.equipment}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.equipment && Boolean(errors.equipment)}
                        helperText={touched.equipment && errors.equipment}
                    />

                    <TextField
                        margin="dense"
                        placeholder={t.notes}
                        fullWidth
                        multiline
                        rows={3}
                        name="notes"
                        value={values.notes}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.notes && Boolean(errors.notes)}
                        helperText={touched.notes && errors.notes}
                        sx={{ gridColumn: "span 2" }}
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
                        },
                        gap: "8px",
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
                theme.palette.mode === "light"
                ? colors.blueAccent[800]
                : colors.blueAccent[400],
            color: "#fff",
            gap: "8px",
            "&:hover": {
                backgroundColor:
                theme.palette.mode === "light"
                    ? colors.blueAccent[400]
                    : colors.blueAccent[800],
            },
            }}
                    startIcon={editingClass ? <UpdateIcon /> : <SaveIcon />}
                    >
                    {editingClass ? t.update || "Update" : t.save || "Save"}
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
            PaperProps={{ sx: {
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
                {t.confirmDeleteMessageClassroom ||
                    "Do you want to delete this classroom?"}
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
            >
                {t.cancel || "No"}
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
                {t.confirm || "Yes, Delete it!"}
            </Button>
            </DialogActions>
        </Dialog>
        </Box>
    );
    };

    export default Classes;
