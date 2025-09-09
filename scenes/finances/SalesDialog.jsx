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

    const SalesDialog = ({ language }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const t = translations[language] || translations["fr"];

    const [products, setProducts] = useState([]);
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
        setProducts(
            products.map((p) =>
            p.id === editingRecord.id ? { ...p, ...values } : p
            )
        );
        } else {
        setProducts([...products, { id: products.length + 1, ...values }]);
        }
        setOpenDialog(false);
    };

    const handleDelete = (id) => {
        setProducts(products.filter((p) => p.id !== id));
    };

    const handleEdit = (id) => {
        const record = products.find((p) => p.id === id);
        setEditingRecord(record);
        setOpenDialog(true);
    };

    // ---------- COLUMNS ----------
    const columns = [
        { field: "id", headerName: "ID", width: 90 },
        { field: "productName", headerName: t.productName, flex: 1 },
        { field: "productCode", headerName: t.productCode, flex: 1 },
        { field: "salePrice", headerName: t.salePrice, flex: 1 },
        { field: "cost", headerName: t.cost, flex: 1 },
        { field: "category", headerName: t.category, flex: 1 },
        { field: "quantity", headerName: t.quantity, flex: 1 },
        { field: "brand", headerName: t.brand, flex: 1 },
        { field: "source", headerName: t.source, flex: 1 },
        { field: "schoolName", headerName: t.schoolName, flex: 1 },
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
    const productSchema = yup.object().shape({
        productName: yup.string().required(t.requiredProductName),
        productCode: yup.string().required(t.requiredProductCode),
        salePrice: yup
        .number()
        .typeError(t.invalidNumber)
        .positive(t.invalidNumber)
        .required(t.requiredSalePrice),
        cost: yup.number().typeError(t.invalidNumber).nullable(),
        category: yup.string().nullable(),
        quantity: yup.number().typeError(t.invalidNumber).nullable(),
        brand: yup.string().nullable(),
        source: yup.string().nullable(),
        schoolName: yup.string().nullable(),
    });

    const initialValues = {
        productName: "",
        productCode: "",
        salePrice: "",
        cost: "",
        category: "",
        quantity: "",
        brand: "",
        source: "",
        schoolName: "",
    };

    return (
        <Box m="20px">
        <Header title={t.sales} subtitle={t.dataManagement} />

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
            {t.addProduct}
            </Button>
        </Box>

        {/* DataGrid */}
        <Box
            height="80vh"
             dir={language === "ar" ? "rtl" : "ltr"}   // 👈 force direction
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
                color:
                theme.palette.mode === "light"
                    ? colors.blueAccent[800]
                    : colors.blueAccent[400], // ✅ dark blue checkbox
            },
            }}
        >
            <DataGrid
            rows={products}
            columns={columns}
            checkboxSelection
            disableRowSelectionOnClick
            />
        </Box>

        {/* Dialog */}
        <Dialog open={openDialog} onClose={handleClose} fullWidth maxWidth="md">
            <DialogTitle
            sx={{
                backgroundColor:
                theme.palette.mode === "light" ? "#0d47a1" : "#4274c7",
                color: "#fff",
                fontWeight: "bold",
            }}
            >
            {editingRecord ? t.editProduct : t.addProduct}
            </DialogTitle>

            <Formik
            initialValues={editingRecord || initialValues}
            validationSchema={productSchema}
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
                        placeholder={t.productName}
                        fullWidth
                        name="productName"
                        value={values.productName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.productName && Boolean(errors.productName)}
                        helperText={touched.productName && errors.productName}
                    />

                    <TextField
                        margin="dense"
                        placeholder={t.productCode}
                        fullWidth
                        name="productCode"
                        value={values.productCode}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.productCode && Boolean(errors.productCode)}
                        helperText={touched.productCode && errors.productCode}
                    />

                    <TextField
                        margin="dense"
                        type="number"
                        placeholder={t.salePrice}
                        fullWidth
                        name="salePrice"
                        value={values.salePrice}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.salePrice && Boolean(errors.salePrice)}
                        helperText={touched.salePrice && errors.salePrice}
                    />

                    <TextField
                        margin="dense"
                        type="number"
                        placeholder={t.cost}
                        fullWidth
                        name="cost"
                        value={values.cost}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.cost && Boolean(errors.cost)}
                        helperText={touched.cost && errors.cost}
                    />

                    <TextField
                        margin="dense"
                        placeholder={t.category}
                        fullWidth
                        name="category"
                        value={values.category}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.category && Boolean(errors.category)}
                        helperText={touched.category && errors.category}
                    />

                    <TextField
                        margin="dense"
                        type="number"
                        placeholder={t.quantity}
                        fullWidth
                        name="quantity"
                        value={values.quantity}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.quantity && Boolean(errors.quantity)}
                        helperText={touched.quantity && errors.quantity}
                    />

                    <TextField
                        margin="dense"
                        placeholder={t.brand}
                        fullWidth
                        name="brand"
                        value={values.brand}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.brand && Boolean(errors.brand)}
                        helperText={touched.brand && errors.brand}
                    />

                    <TextField
                        margin="dense"
                        placeholder={t.source}
                        fullWidth
                        name="source"
                        value={values.source}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.source && Boolean(errors.source)}
                        helperText={touched.source && errors.source}
                    />

                    <TextField
                        margin="dense"
                        placeholder={t.schoolName}
                        fullWidth
                        name="schoolName"
                        value={values.schoolName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.schoolName && Boolean(errors.schoolName)}
                        helperText={touched.schoolName && errors.schoolName}
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

    export default SalesDialog;
