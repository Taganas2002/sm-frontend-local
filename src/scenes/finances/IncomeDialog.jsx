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

    import translations from "../../translations/index";

    const IncomeDialog = ({ language }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const t = translations[language] || translations["fr"];

    const [finances, setFinances] = useState([]);
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
        setFinances(
            finances.map((f) =>
            f.id === editingRecord.id ? { ...f, ...values } : f
            )
        );
        } else {
        setFinances([...finances, { id: finances.length + 1, ...values }]);
        }
        setOpenDialog(false);
    };

    const handleDelete = (id) => {
        setFinances(finances.filter((f) => f.id !== id));
    };

    const handleEdit = (id) => {
        const record = finances.find((f) => f.id === id);
        setEditingRecord(record);
        setOpenDialog(true);
    };

    // ---------- COLUMNS ----------
    const columns = [
        { field: "id", headerName: "ID", width: 90 },
        { field: "groupName", headerName: t.groupName, flex: 1 },
        { field: "studentName", headerName: t.studentName, flex: 1 },
        { field: "amount", headerName: t.amount, flex: 1 },
        { field: "date", headerName: t.date, flex: 1 },
        { field: "notes", headerName: t.notes, flex: 1 },
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
    const financeSchema = yup.object().shape({
        groupName: yup.string().required(t.requiredGroupName),
        studentName: yup.string().required(t.requiredStudentName),
        amount: yup
        .number()
        .typeError(t.invalidAmount)
        .positive(t.invalidAmount)
        .required(t.requiredAmount),
        date: yup.string().required(t.requiredDate),
        notes: yup.string().nullable(),
    });

    const initialValues = {
        groupName: "",
        studentName: "",
        amount: "",
        date: "",
        notes: "",
    };

    return (
        <Box m="20px">
        <Header title={t.income} subtitle={t.dataManagement} />

        {/* Top Button */}
        <Box display="flex" justifyContent="flex-end" gap={2} mb={2}>
        <Box display="flex" justifyContent="flex-end" mb={2} gap={2}>
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
            {t.addIncome}
            </Button>
        </Box>
        </Box>

        {/* DataGrid */}
        <Box
            height="80vh"
            sx={{
                "& .MuiDataGrid-root": { border: "none" },
                "& .MuiDataGrid-columnHeaders": {
                backgroundColor: colors.blueAccent[700],
                borderBottom: "none",
                textAlign: language === "ar" ? "right" : "left", // 👈 align header text
                },
                "& .MuiDataGrid-cell": {
                textAlign: language === "ar" ? "right" : "left", // 👈 align cell text
                },
            "& .MuiDataGrid-virtualScroller": {
                backgroundColor: colors.primary[400],
            },
            "& .MuiDataGrid-footerContainer": {
                borderTop: "none",
                backgroundColor: colors.blueAccent[400],
            },
            "& .MuiCheckbox-root.Mui-checked": {
                color: theme.palette.mode === "light"
                    ? colors.blueAccent[800]
                    : colors.blueAccent[400], // ✅ dark blue checkbox
            },
            }}
        >
            <DataGrid
            rows={finances}
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
            {editingRecord ? t.editIncome : t.addIncome}
            </DialogTitle>

            <Formik
            initialValues={editingRecord || initialValues}
            validationSchema={financeSchema}
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
                        placeholder={t.groupName}
                        fullWidth
                        name="groupName"
                        value={values.groupName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.groupName && Boolean(errors.groupName)}
                        helperText={touched.groupName && errors.groupName}
                    />

                    <TextField
                        margin="dense"
                        placeholder={t.studentName}
                        fullWidth
                        name="studentName"
                        value={values.studentName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.studentName && Boolean(errors.studentName)}
                        helperText={touched.studentName && errors.studentName}
                    />

                    <TextField
                        margin="dense"
                        type="number"
                        placeholder={t.amount}
                        fullWidth
                        name="amount"
                        value={values.amount}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.amount && Boolean(errors.amount)}
                        helperText={touched.amount && errors.amount}
                    />

                    <TextField
                        margin="dense"
                        type="date"
                        label={t.date}
                        fullWidth
                        name="date"
                        value={values.date}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.date && Boolean(errors.date)}
                        helperText={touched.date && errors.date}
                        InputLabelProps={{ shrink: true }}
                    />

                    {/* ✅ Notes full width */}
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

    export default IncomeDialog;
