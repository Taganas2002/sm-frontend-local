    // src/scenes/levels/Levels.jsx
    import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    useTheme,
    } from "@mui/material";
    import { DataGrid } from "@mui/x-data-grid";
    import { useState, useEffect } from "react";
    import { Formik } from "formik";
    import * as yup from "yup";

    import {
    searchLevels,
    createLevel,
    updateLevel,
    // deleteLevel,
    } from "../../api/levelsApi";

    import { tokens } from "../../theme";
    import Header from "../../components/Header";
    import translations from "../../translations";

    import AddIcon from "@mui/icons-material/Add";
    import EditIcon from "@mui/icons-material/Edit";
    // import DeleteIcon from "@mui/icons-material/Delete";
    import CloseIcon from "@mui/icons-material/Close";
    import SaveIcon from "@mui/icons-material/Save";
    import UpdateIcon from "@mui/icons-material/Update";

    const Levels = ({ language }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const t = translations[language] || translations["fr"];

    const [levels, setLevels] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingLevel, setEditingLevel] = useState(null);
    const [loading, setLoading] = useState(false);

    // ---------- HANDLE OPEN/CLOSE ----------
    const handleOpen = () => {
        setEditingLevel(null);
        setOpenDialog(true);
    };
    const handleClose = () => setOpenDialog(false);

    // ---------- LOAD LEVELS ----------
    const loadLevels = async () => {
        setLoading(true);
        try {
        const res = await searchLevels({ page: 0, size: 20 });
        setLevels(res.content || res);
        } catch (err) {
        console.error("Failed to load levels", err);
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        loadLevels();
    }, []);

    // ---------- HANDLE SAVE ----------
    const handleSave = async (values) => {
        try {
        if (editingLevel) {
            await updateLevel(editingLevel.id, values);
        } else {
            await createLevel(values);
        }
        await loadLevels();
        setOpenDialog(false);
        } catch (err) {
        console.error("Save failed", err);
        }
    };

    // ---------- HANDLE DELETE ----------
    // const handleDelete = async (id) => {
    //     try {
    //     await deleteLevel(id);
    //     await loadLevels();
    //     } catch (err) {
    //     console.error("Delete failed", err);
    //     }
    // };

    // ---------- HANDLE EDIT ----------
    const handleEdit = (id) => {
        const level = levels.find((l) => l.id === id);
        setEditingLevel(level);
        setOpenDialog(true);
    };

    // ---------- COLUMNS ----------
    const columns = [
        { field: "id", headerName: "ID", width: 90 },
        { field: "name", headerName: t.levelsTitle || "Name", flex: 1 },
        {
        field: "actions",
        headerName: t.actions || "Actions",
        width: 160,
        renderCell: (params) => (
            // <Box display="flex" gap={1} mt={1}>
            // <Button
            //     size="small"
            //     variant="contained"
            //     color="error"
            //     onClick={() => handleDelete(params.row.id)}
            //     startIcon={<DeleteIcon />}
            // />
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
            // </Box>
        ),
        },
    ];

    // ---------- VALIDATION ----------
    const levelSchema = yup.object().shape({
        name: yup.string().required(t.requiredName || "Name is required"),
    });

    const initialValues = {
        name: "",
    };

    return (
        <Box m="20px">
        <Header title={t.levels || "Levels"} subtitle={t.dataManagement} />

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
            {t.addLevel}
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
            rows={levels}
            columns={columns}
            checkboxSelection
            disableRowSelectionOnClick
            loading={loading}
            getRowId={(row) => row.id}
            />
        </Box>

        {/* Dialog */}
        <Dialog open={openDialog} onClose={handleClose} fullWidth maxWidth="sm">
            <DialogTitle
            sx={{
                backgroundColor:
                theme.palette.mode === "light" ? "#0d47a1" : "#4274c7",
                color: "#fff",
                fontWeight: "bold",
            }}
            >
            {editingLevel ? t.editLevel || "Edit Level" : t.addLevel || "Add Level"}
            </DialogTitle>

            <Formik
            initialValues={editingLevel || initialValues}
            validationSchema={levelSchema}
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
                    placeholder={t.name || "Name"}
                    fullWidth
                    name="name"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                    />
                </DialogContent>

                <DialogActions >
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
            startIcon={editingLevel ? <UpdateIcon /> : <SaveIcon />}
        >
            {editingLevel ? t.update : t.save}
        </Button>
        </DialogActions>

                </form>
            )}
            </Formik>
        </Dialog>
        </Box>
    );
    };

    export default Levels;
