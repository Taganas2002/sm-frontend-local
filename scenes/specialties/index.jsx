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
    import { tokens } from "../../theme";
    import Header from "../../components/Header";
    import { useState } from "react";
    import { Formik } from "formik";
    import * as yup from "yup";

    import AddIcon from "@mui/icons-material/Add";
    import EditIcon from "@mui/icons-material/Edit";
    import DeleteIcon from "@mui/icons-material/Delete";

    import translations from "../../translations";

    const Specialities = ({ language }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const t = translations[language] || translations["fr"];

    const [specialites, setSpecialites] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);

    // ---------- HANDLE OPEN/CLOSE ----------
    const handleOpen = () => {
        setEditingRecord(null);
        setOpenDialog(true);
    };
    const handleClose = () => setOpenDialog(false);

    // ---------- HANDLE SAVE ----------
    const handleSave = (values) => {
        if (editingRecord) {
        setSpecialites(
            specialites.map((s) =>
            s.id === editingRecord.id ? { ...s, ...values } : s
            )
        );
        } else {
        setSpecialites([...specialites, { id: specialites.length + 1, ...values }]);
        }
        setOpenDialog(false);
    };

    const handleDelete = (id) => {
        setSpecialites(specialites.filter((s) => s.id !== id));
    };

    const handleEdit = (id) => {
        const record = specialites.find((s) => s.id === id);
        setEditingRecord(record);
        setOpenDialog(true);
    };

    // ---------- COLUMNS ----------
    const columns = [
        { field: "id", headerName: "ID", width: 90 },
        { field: "specialiteAr", headerName: t.specialiteAr, flex: 1 },
        { field: "specialiteEn", headerName: t.specialiteEn, flex: 1 },
        { field: "department", headerName: t.department, flex: 1 },
        {
        field: "actions",
        headerName: t.actions,
        width: 160,
        renderCell: (params) => (
            <Box display="flex" gap={1} mt={1}>
            <Button
                size="small"
                variant="contained"
                color="error"
                onClick={() => handleDelete(params.row.id)}
                startIcon={<DeleteIcon />}
            />
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
            </Box>
        ),
        },
    ];

    // ---------- VALIDATION ----------
    const specialiteSchema = yup.object().shape({
        specialiteAr: yup.string().required(t.requiredSpecialiteAr),
        specialiteEn: yup.string().required(t.requiredSpecialiteEn),
        department: yup.string().required(t.requiredDepartment),
    });

    const initialValues = {
        specialiteAr: "",
        specialiteEn: "",
        department: "",
    };

    return (
        <Box m="20px">
        <Header title={t.specialite} subtitle={t.dataManagement} />

        {/* Top Button */}
        <Box display="flex" justifyContent="flex-end" gap={2} mb={2}>
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
            {t.addSpecialite}
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
            }}
        >
            <DataGrid
            rows={specialites}
            columns={columns}
            checkboxSelection
            disableRowSelectionOnClick
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
            {editingRecord ? t.editSpecialite : t.addSpecialite}
            </DialogTitle>

            <Formik
            initialValues={editingRecord || initialValues}
            validationSchema={specialiteSchema}
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
                    <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                    <TextField
                        margin="dense"
                        placeholder={t.specialiteAr}
                        fullWidth
                        name="specialiteAr"
                        value={values.specialiteAr}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.specialiteAr && Boolean(errors.specialiteAr)}
                        helperText={touched.specialiteAr && errors.specialiteAr}
                    />

                    <TextField
                        margin="dense"
                        placeholder={t.specialiteEn}
                        fullWidth
                        name="specialiteEn"
                        value={values.specialiteEn}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.specialiteEn && Boolean(errors.specialiteEn)}
                        helperText={touched.specialiteEn && errors.specialiteEn}
                    />

                    <TextField
                        margin="dense"
                        placeholder={t.department}
                        fullWidth
                        name="department"
                        value={values.department}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.department && Boolean(errors.department)}
                        helperText={touched.department && errors.department}
                    />
                    </Box>
                </DialogContent>

                <DialogActions>
                    <Button
                    onClick={handleClose}
                    sx={{
                        ml: 2,
                        backgroundColor:
                        theme.palette.mode === "light"
                            ? colors.redAccent[800]
                            : colors.redAccent[300],
                        color:
                        theme.palette.mode === "light"
                            ? "#fff"
                            : colors.blueAccent[800],
                        "&:hover": {
                        backgroundColor:
                            theme.palette.mode === "light"
                            ? colors.redAccent[700]
                            : colors.redAccent[200],
                        },
                    }}
                    >
                    {t.cancel}
                    </Button>

                    <Button
                    onClick={handleSubmit}
                    variant="contained"
                    sx={{
                        backgroundColor:
                        theme.palette.mode === "light"
                            ? colors.blueAccent[800]
                            : colors.blueAccent[300],
                        color:
                        theme.palette.mode === "light"
                            ? "#fff"
                            : colors.blueAccent[800],
                        "&:hover": {
                        backgroundColor:
                            theme.palette.mode === "light"
                            ? colors.blueAccent[700]
                            : colors.blueAccent[200],
                        },
                    }}
                    >
                    {t.save}
                    </Button>
                </DialogActions>
                </form>
            )}
            </Formik>
        </Dialog>
        </Box>
    );
    };

    export default Specialities;
