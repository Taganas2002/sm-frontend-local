    // src/scenes/finances/Expenses.jsx
    import { useEffect, useMemo, useState } from "react";
    import {
    Box,
    Button,
    Chip,
    Grid,
    IconButton,
    TextField,
    Typography,
    useTheme, Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    } from "@mui/material";
    import RefreshIcon from "@mui/icons-material/Refresh";
    import AddIcon from "@mui/icons-material/Add";
    import EditIcon from "@mui/icons-material/Edit";
    import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
    import { DataGrid } from "@mui/x-data-grid";
    import dayjs from "dayjs";
    import { deleteExpense, searchExpenses } from "../../api/expenses";
    import ExpenseDialog from "../finances/components/ExpenseDialog";
    import { useQuery, useQueryClient } from "@tanstack/react-query";
    import Header from "../../components/Header";
    import { tokens } from "../../theme";
    import translations from "../../translations";


    


    const nf = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    });

    const thisMonth = () => {
    const d = dayjs();
    return {
        from: d.startOf("month").format("YYYY-MM-DD"),
        to: d.endOf("month").format("YYYY-MM-DD"),
    };
    };

    export default function Expenses({ language = "fr" }) {
    const qc = useQueryClient();

    // Filters
    const [{ from, to }, setRange] = useState(thisMonth());
    const [category, setCategory] = useState("");
    const [q, setQ] = useState("");
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const t = translations[language] || translations["fr"];


    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);
    const [sort, setSort] = useState([{ field: "expenseDate", sort: "desc" }]);

    // Dialog state
    const [dialog, setDialog] = useState({ open: false, initial: null });
    // Delete dialog state
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [deleteId, setDeleteId] = useState(null);

    const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setDeleteId(null);
    };

    const handleConfirmDelete = async () => {
    if (!deleteId) return;
    await deleteExpense(deleteId);
    qc.invalidateQueries({ queryKey: ["expenses"] });
    setDeleteDialogOpen(false);
    setDeleteId(null);
    };


    const { data, isFetching, refetch } = useQuery({
        queryKey: ["expenses", from, to, category, q, page, size, sort],
        queryFn: () =>
        searchExpenses({
            from,
            to,
            category: category || undefined,
            q: q || undefined,
            page,
            size,
            sort:
            sort?.length > 0
                ? `${sort[0].field},${sort[0].sort || "asc"}`
                : "expenseDate,desc",
        }),
        keepPreviousData: true,
    });

    // Robust row mapping + preformatted display fields
    const rows = useMemo(() => {
        const list = data?.content ?? data?.items ?? [];
        return list.map((e) => {
        const expenseDate = e.expenseDate || e.date || "";
        const createdAt =
            e.createdAt || e.created_at || e.issuedAt || e.created || null;

        const amountNum = Number(
            e.amount ?? e.totalAmount ?? e.total ?? 0
        );

        return {
            id: e.id,
            expenseDate,                                // YYYY-MM-DD
            time: createdAt ? dayjs(createdAt).format("hh:mm A") : "",
            categoryLabel: [e.category, e.subCategory].filter(Boolean).join(" — "),
            method: e.method || null,
            amountNum,                                  // keep numeric for potential future sorting
            amountLabel: nf.format(amountNum),
            notes: e.notes || "",
        };
        });
    }, [data]);

    const columns = [
        { field: "expenseDate", headerName: t.date, width: 120 },
    { field: "time", headerName: t.time, width: 120 },
    {
        field: "categoryLabel",
        headerName: t.category,
        flex: 1,
        minWidth: 220,
    },
        {
        field: "method",
        headerName: t.method,
        width: 120,
        renderCell: (p) => (p.value ? <Chip size="small" label={p.value} /> : null),
        },
            {
        field: "amountLabel",
        headerName: t.amount,
        width: 140,
        headerAlign: "right",
        align: "right",
        },
        {
        field: "notes",
        headerName: t.notes,
        flex: 1,
        minWidth: 200,
        },
            {
    field: "actions",
    headerName: t.actions,
    width: 120,
    sortable: false,
    filterable: false,
    renderCell: (params) => (
        <Box display="flex" gap={1} mt={1}>
        <Button
            onClick={() => setDialog({ open: true, initial: params.row })}
            variant="contained"
            size="small"
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
            startIcon={<EditIcon />}
        />
        <Button
            onClick={() => {
            setDeleteId(params.row.id);
            setDeleteDialogOpen(true);
            }}
            variant="contained"
            size="small"
            sx={{
            ml: 1,
            backgroundColor: theme.palette.error.main,
            color: "#fff",
            "&:hover": {
                backgroundColor: theme.palette.error.dark,
            },
            }}
            startIcon={<DeleteOutlineIcon />}
        />
        </Box>
    ),
    }

    ];

    useEffect(() => {
        setPage(0);
    }, [from, to, category, q]);

    return (
        <Box m="20px">
        <Header
            title={t.Expenses}
        />

        {/* Toolbar (From/To, Category, Search, Refresh, Add) */}
        <Grid container spacing={1} alignItems="center" mb={1}>
            <Grid item>
            <TextField
            label={t.from}
                type="date"
                size="small"
                value={from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                InputLabelProps={{ shrink: true }}
            />
            </Grid>
            <Grid item>
            <TextField
            label={t.from}
                type="date"
                size="small"
                value={to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                InputLabelProps={{ shrink: true }}
            />
            </Grid>

            <Grid item xs={12} sm={4} md={3}>
            <TextField
            label={t.category}
                placeholder="ELECTRICITY / WATER / RENT …"
                fullWidth
                size="small"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
            />
            </Grid>

            <Grid item xs={12} sm={5} md={4}>
            <TextField
            label={t.searchexpense}
                fullWidth
                size="small"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && refetch()}
            />
            </Grid>

            <Grid item>
            <IconButton onClick={() => refetch()} title={t.refresh}>
                <RefreshIcon />
            </IconButton>
            </Grid>

            <Grid item flexGrow={1} />

            <Grid item>
            <Button sx={{
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
                variant="contained"
                onClick={() => setDialog({ open: true, initial: null })}
            >
            {t.addExpense}
            </Button>
            </Grid>
        </Grid>

        <Box height="80vh"
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
            "& .MuiCheckbox-root.Mui-checked": {
                color:
                theme.palette.mode === "light"
                    ? colors.blueAccent[800]
                    : colors.blueAccent[400],
            },
            }}
        >
            <DataGrid
            loading={isFetching}
            rows={rows}
            columns={columns}
            paginationMode="server"
            rowCount={data?.total ?? data?.totalElements ?? rows.length}
            paginationModel={{ page, pageSize: size }}
            onPaginationModelChange={(m) => {
                setPage(m.page);
                setSize(m.pageSize);
            }}
            pageSizeOptions={[10, 20, 50]}
            disableRowSelectionOnClick
            sortingMode="server"
            sortModel={sort}
            onSortModelChange={(m) => setSort(m)}
            sx={{
                "& .MuiDataGrid-columnHeader, & .MuiDataGrid-cell": {
                justifyContent: "center",
                },
                "& .MuiDataGrid-cell--textRight": {
                justifyContent: "flex-end",
                },
            }}
            />
        </Box>

        {/* Create / Edit dialog */}
        <ExpenseDialog
            open={dialog.open}
            initial={dialog.initial}
            onClose={() => setDialog({ open: false, initial: null })}
            onSaved={() => qc.invalidateQueries({ queryKey: ["expenses"] })}
        />

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
        <Typography>
        {t.confirmDeleteMessage || "Do you want to delete this expense?"}
        </Typography>
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
    }
