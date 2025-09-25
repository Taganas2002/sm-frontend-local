    // src/scenes/sections/Sections.jsx
    import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    useTheme,
    Typography,
    } from "@mui/material";
    import { DataGrid } from "@mui/x-data-grid";
    import { useState, useEffect } from "react";
    import { Formik } from "formik";
    import * as yup from "yup";

    import {
    searchSections,
    createSection,
    updateSection,
    deleteSection,
    } from "../../api/sectionsApi";

    import { tokens } from "../../theme";
    import Header from "../../components/Header";
    import translations from "../../translations";

    import AddIcon from "@mui/icons-material/Add";
    import EditIcon from "@mui/icons-material/Edit";
    import CloseIcon from "@mui/icons-material/Close";
    import SaveIcon from "@mui/icons-material/Save";
    import UpdateIcon from "@mui/icons-material/Update";
    import DeleteIcon from "@mui/icons-material/Delete";

    const Sections = ({ language }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const t = translations[language] || translations["fr"];

    const [sections, setSections] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingSection, setEditingSection] = useState(null);
    const [loading, setLoading] = useState(false);

    // Delete confirmation
    const [openConfirm, setOpenConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");

    // ---------- HANDLE OPEN/CLOSE ----------
    const handleOpen = () => {
        setEditingSection(null);
        setOpenDialog(true);
    };
    const handleClose = () => setOpenDialog(false);

    // ---------- LOAD SECTIONS ----------
    const loadSections = async () => {
        setLoading(true);
        try {
        const res = await searchSections({ page: 0, size: 20 });
        setSections(res.content || res);
        } catch (err) {
        console.error("Failed to load sections", err);
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        loadSections();
    }, []);

    // ---------- HANDLE SAVE ----------
    const handleSave = async (values) => {
        try {
        if (editingSection) {
            await updateSection(editingSection.id, values);
        } else {
            await createSection(values);
        }
        await loadSections();
        setOpenDialog(false);
        } catch (err) {
        console.error("Save failed", err);
        }
    };

    // ---------- HANDLE DELETE ----------
    const confirmDelete = (id) => {
        setDeleteId(id);
        setErrorMessage("");
        setOpenConfirm(true);
    };

    const handleDelete = async () => {
        try {
        await deleteSection(deleteId);
        await loadSections();
        setOpenConfirm(false);
        } catch (err) {
        console.error("Delete failed", err);
        setErrorMessage(
            language === "ar"
            ? "لا يمكن حذف هذا القسم لأنه مرتبط بسجلات أخرى."
            : "Impossible de supprimer cette section car elle est encore liée à d'autres enregistrements."
        );
        }
    };

    // ---------- HANDLE EDIT ----------
    const handleEdit = (id) => {
        const section = sections.find((s) => s.id === id);
        setEditingSection(section);
        setOpenDialog(true);
    };

    // ---------- COLUMNS ----------
    const columns = [
        { field: "id", headerName: "ID", width: 90 },
        { field: "name", headerName: t.sectionName || "Section Name", flex: 1 },
        {
        field: "actions",
        headerName: t.actions || "Actions",
        width: 160,
        renderCell: (params) => (
            <Box display="flex" gap={1} mt={1}>
            <Button
                size="small"
                variant="contained"
                onClick={() => handleEdit(params.row.id)}
                startIcon={<EditIcon />}
                sx={(theme) => ({
                p: 1,
                backgroundColor:
                    theme.palette.mode === "light" ? "#0d47a1" : "#4274c7",
                color: "#fff",
                "&:hover": {
                    backgroundColor:
                    theme.palette.mode === "light" ? "#093170" : "#305a9c",
                },
                })}
            />
            <Button
                size="small"
                variant="contained"
                color="error"
                onClick={() => confirmDelete(params.row.id)}
                startIcon={<DeleteIcon />}
            />
            </Box>
        ),
        },
    ];

    // ---------- VALIDATION ----------
    const sectionSchema = yup.object().shape({
        name: yup.string().required(t.requiredName || "Section name is required"),
    });

    const initialValues = {
        name: "",
    };

    return (
        <Box m="20px">
        <Header title={t.sectionsTitle || "Sections"} subtitle={t.dataManagement} />

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
            {t.addSection || "Add Section"}
            </Button>
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
            rows={sections}
            columns={columns}
            checkboxSelection
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
            {editingSection
                ? t.editSection || "Edit Section"
                : t.addSection || "Add Section"}
            </DialogTitle>

            <Formik
            initialValues={editingSection || initialValues}
            validationSchema={sectionSchema}
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
            }) => (
                <form onSubmit={handleSubmit}>
                <DialogContent>
                    <TextField
                    margin="dense"
                    placeholder={t.sectionName || "Section Name"}
                    fullWidth
                    name="name"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                    />
                </DialogContent>

                <DialogActions>
                    {/* Cancel Button */}
                    <Button
                    onClick={handleClose}
                    variant="outlined"
                    sx={{
                        color: theme.palette.error.main,
                        ml: 2,
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
                    {t.cancel}
                    </Button>

                    {/* Save / Update Button */}
                    <Button
                    onClick={handleSubmit}
                    type="submit"
                    variant="contained"
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
                    startIcon={editingSection ? <UpdateIcon /> : <SaveIcon />}
                    >
                    {editingSection ? t.update : t.save}
                    </Button>
                </DialogActions>
                </form>
            )}
            </Formik>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
            open={openConfirm}
            onClose={() => setOpenConfirm(false)}
            fullWidth
            maxWidth="xs"
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
                <Typography sx={{ color: "yellow", fontWeight: "bold" }}>
                {t.confirmDeleteMessageSection ||
                (language === "ar"
                    ? "هل تريد حذف هذا القسم؟"
                    : "Voulez-vous supprimer cette section ?")}
            </Typography>
            {errorMessage && (
                <Typography color="error" mt={1} sx={{fontWeight: "bold"}}>
                {errorMessage}
                </Typography>
            )}
            </DialogContent>
            <DialogActions sx={{ justifyContent: "center", gap: 2 }}>
            <Button
                onClick={() => setOpenConfirm(false)}
                variant="outlined"
                sx={{
                borderColor: "#fff",
                color: "#fff",
                "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" },
                }}
            >
                {t.cancel}
            </Button>
            <Button
                onClick={handleDelete}
                color="error"
                variant="contained"
                sx={{
                backgroundColor: "#fff",
                color: "#1e3a8a",
                "&:hover": { backgroundColor: "rgba(255,255,255,0.8)" },
                }}
            >
                {t.delete}
            </Button>
            </DialogActions>
        </Dialog>
        </Box>
    );
    };

    export default Sections;
