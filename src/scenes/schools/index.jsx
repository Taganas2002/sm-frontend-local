    import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    useTheme,
    Switch,
    FormControlLabel,
    } from "@mui/material";
    import CloseIcon from "@mui/icons-material/Close";
    import SaveIcon from "@mui/icons-material/Save";
    import UpdateIcon from "@mui/icons-material/Update";
    import AddIcon from "@mui/icons-material/Add";
    import { DataGrid } from "@mui/x-data-grid";
    import { tokens } from "../../theme";
    import Header from "../../components/Header";
    import { useState, useEffect } from "react";
    import { Formik } from "formik";
    import * as yup from "yup";
    import translations from "../../translations";
    import {
    searchSchools,
    createSchool,
    updateSchool,
    deleteSchool,
    } from "../../api/schoolsApi";

    const schoolSchema = yup.object().shape({
    name: yup.string().max(160).required("Name is required"),
    address: yup.string().max(255),
    phone: yup.string().max(60),
    email: yup.string().email("Invalid email").max(160),
    active: yup.boolean(),
    });

    const initialValues = {
    name: "",
    address: "",
    phone: "",
    email: "",
    active: true,
    level: "1AP", // default level
    };

    const Schools = ({ language = "ar" }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const t = translations[language] || translations["ar"];

    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [selectedSchool, setSelectedSchool] = useState(null);

    const fetchSchools = async () => {
        setLoading(true);
        try {
        const data = await searchSchools({ page: 0, size: 20 });
        setSchools(data.content || []);
        } catch (error) {
        console.error("Failed to fetch schools:", error);
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchools();
    }, []);

    const handleOpen = (school = null) => {
        setSelectedSchool(school);
        setOpen(true);
    };

    const handleClose = () => {
        setSelectedSchool(null);
        setOpen(false);
    };

    const handleSubmit = async (values, { resetForm }) => {
        try {
        if (selectedSchool) {
            await updateSchool(selectedSchool.id, values);
        } else {
            await createSchool(values);
        }
        fetchSchools();
        handleClose();
        resetForm();
        } catch (error) {
        console.error("Failed to save school:", error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm(t.deleteConfirm || "Are you sure?")) {
        try {
            await deleteSchool(id);
            fetchSchools();
        } catch (error) {
            console.error("Failed to delete school:", error);
        }
        }
    };

    const columns = [
        { field: "id", headerName: t.id || "ID", flex: 0.3 },
        { field: "name", headerName: t.name || "Name", flex: 1 },
        { field: "address", headerName: t.address || "Address", flex: 1 },
        { field: "phone", headerName: t.phone || "Phone", flex: 0.8 },
        { field: "email", headerName: t.email || "Email", flex: 1 },
        {
        field: "level",
        headerName: t.level || "Level",
        flex: 1,
        renderCell: (params) => t.levels[params.value] || params.value,
        },
        {
        field: "active",
        headerName: t.active || "Active",
        flex: 0.5,
        renderCell: (params) => (params.value ? t.yes || "Yes" : t.no || "No"),
        },
        {
        field: "actions",
        headerName: t.actions || "Actions",
        flex: 1,
        renderCell: (params) => (
            <>
            <Button
                variant="contained"
                size="small"
                sx={{
                mr: 1,
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
                onClick={() => handleOpen(params.row)}
            >
                <UpdateIcon />
            </Button>
            <Button
                variant="contained"
                color="error"
                size="small"
                onClick={() => handleDelete(params.row.id)}
            >
                <CloseIcon />
            </Button>
            </>
        ),
        },
    ];

    return (
        <Box m="20px">
        <Header title={t.schools || "Schools"} subtitle={t.schoolsSubtitle || "Manage school records"} />

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
            onClick={() => handleOpen()}
            >
            {t.addSchool}
            </Button>
        </Box>

        <Box
            m="40px 0 0 0"
            height="70vh"
            sx={{
            "& .MuiDataGrid-root": { border: "none" },
            "& .MuiDataGrid-cell": { borderBottom: "none" },
            "& .MuiDataGrid-columnHeaders": {
                backgroundColor: colors.blueAccent[700],
                borderBottom: "none",
            },
            "& .MuiDataGrid-virtualScroller": {
                backgroundColor: colors.primary[400],
            },
            "& .MuiDataGrid-footerContainer": {
                borderTop: "none",
                backgroundColor: colors.blueAccent[700],
            },
            }}
        >
            <DataGrid rows={schools} columns={columns} loading={loading} getRowId={(row) => row.id} />
        </Box>

        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>{selectedSchool ? t.editSchool || "Edit School" : t.addSchool || "Add School"}</DialogTitle>
            <Formik
            initialValues={selectedSchool || initialValues}
            validationSchema={schoolSchema}
            onSubmit={handleSubmit}
            enableReinitialize
            >
            {({ values, errors, touched, handleBlur, handleChange, handleSubmit, setFieldValue }) => (
                <form onSubmit={handleSubmit}>
                <DialogContent>
                    <TextField
                    margin="dense"
                    label={t.name || "Name"}
                    name="name"
                    fullWidth
                    variant="outlined"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={!!touched.name && !!errors.name}
                    helperText={touched.name && errors.name}
                    />
                    <TextField
                    margin="dense"
                    label={t.address || "Address"}
                    name="address"
                    fullWidth
                    variant="outlined"
                    value={values.address}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={!!touched.address && !!errors.address}
                    helperText={touched.address && errors.address}
                    />
                    <TextField
                    margin="dense"
                    label={t.phone || "Phone"}
                    name="phone"
                    fullWidth
                    variant="outlined"
                    value={values.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={!!touched.phone && !!errors.phone}
                    helperText={touched.phone && errors.phone}
                    />
                    <TextField
                    margin="dense"
                    label={t.email || "Email"}
                    name="email"
                    fullWidth
                    variant="outlined"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={!!touched.email && !!errors.email}
                    helperText={touched.email && errors.email}
                    />
                    <FormControlLabel
                    control={
                        <Switch
                        checked={values.active}
                        onChange={(e) => setFieldValue("active", e.target.checked)}
                        name="active"
                        color="primary"
                        />
                    }
                    label={t.active || "Active"}
                    />
                </DialogContent>

                <DialogActions>
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
                    {t.cancel || "Cancel"}
                    </Button>

                    <Button
                    type="submit"
                    variant="contained"
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
                        ml: 2,
                    }}
                    startIcon={selectedSchool ? <UpdateIcon /> : <SaveIcon />}
                    >
                    {selectedSchool ? t.update || "Update" : t.save || "Save"}
                    </Button>
                </DialogActions>
                </form>
            )}
            </Formik>
        </Dialog>
        </Box>
    );
    };

    export default Schools;
