    import { Box, Button, useTheme } from "@mui/material";
    import { DataGrid } from "@mui/x-data-grid";
    import { tokens } from "../../theme";
    import Header from "../../components/Header";
    import { useState } from "react";

    import AddIcon from "@mui/icons-material/Add";
    import EditIcon from "@mui/icons-material/Edit";
    import DeleteIcon from "@mui/icons-material/Delete";

    import translations from "../../translations/index";

    // import dialogs
    import IncomeDialog from "./IncomeDialog";
    import ExpenseDialog from "./Expenses";

    const Finances = ({ language }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const t = translations[language] || translations["fr"];

    const [finances, setFinances] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [dialogType, setDialogType] = useState("income"); // "income" | "expense"

    // ---------- HANDLE OPEN/CLOSE ----------
    const handleOpen = (type) => {
        setEditingRecord(null);
        setDialogType(type);
        setOpenDialog(true);
    };
    const handleClose = () => setOpenDialog(false);

    // ---------- HANDLE SAVE ----------
    const handleSave = (values) => {
        if (editingRecord) {
        setFinances(
            finances.map((f) =>
            f.id === editingRecord.id ? { ...f, ...values, type: dialogType } : f
            )
        );
        } else {
        setFinances([
            ...finances,
            { id: finances.length + 1, ...values, type: dialogType },
        ]);
        }
        setOpenDialog(false);
    };

    const handleDelete = (id) => {
        setFinances(finances.filter((f) => f.id !== id));
    };

    const handleEdit = (id) => {
        const record = finances.find((f) => f.id === id);
        setEditingRecord(record);
        setDialogType(record.type || "income");
        setOpenDialog(true);
    };

    // ---------- COLUMNS ----------
    const columns = [
        { field: "id", headerName: "ID", width: 90 },
        { field: "studentName", headerName: t.studentName, flex: 1 },
        { field: "expenseType", headerName: t.expenseType, flex: 1 },
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

    // ---------- INITIAL VALUES ----------
    const initialIncome = {
        studentName: "",
        feeType: "",
        amountDue: "",
        amountPaid: "",
        remainingBalance: "",
        date: "",
        receiptNumber: "",
        notes: "",
    };

    const initialExpense = {
        expenseType: "",
        amount: "",
        date: "",
        notes: "",
    };

    return (
        <Box m="20px">
        <Header title={t.finance} subtitle={t.dataManagement} />

        {/* Top Buttons */}
        <Box display="flex" justifyContent="flex-end" gap={2} mb={2}>
            <Button
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
            }}
            startIcon={<AddIcon />}
            onClick={() => handleOpen("income")}
            >
            {t.addIncome}
            </Button>
            <Button
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
            }}
            startIcon={<AddIcon />}
            onClick={() => handleOpen("expense")}
            >
            {t.addExpense}
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
                    : colors.blueAccent[400],
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

        {/* Dialogs */}
        {openDialog && dialogType === "income" && (
            <IncomeDialog
            open={openDialog}
            onClose={handleClose}
            onSave={handleSave}
            initialValues={editingRecord || initialIncome}
            t={t}
            />
        )}

        {openDialog && dialogType === "expense" && (
            <ExpenseDialog
            open={openDialog}
            onClose={handleClose}
            onSave={handleSave}
            initialValues={editingRecord || initialExpense}
            t={t}
            />
        )}
        </Box>
    );
    };

    export default Finances;
