    import { useEffect, useState } from "react";
    import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    useTheme,
    } from "@mui/material";
    import { DataGrid } from "@mui/x-data-grid";

    import AddIcon from "@mui/icons-material/Add";
    import EditIcon from "@mui/icons-material/Edit";
    import DeleteIcon from "@mui/icons-material/Delete";

    import Header from "../../components/Header";
    import { tokens } from "../../theme";
    import translations from "../../translations";
    import {
    searchTeachers,
    deleteTeacher,
    } from "../../api/teachersApi";
    import TeacherDialog from "./TeacherDialog"; // ✅ new import (to be implemented)

    // ==========================
    // Component
    // ==========================
    const Teachers = ({ language }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const t = translations[language] || translations["fr"];
    const [deleteError, setDeleteError] = useState("");


    const [teachers, setTeachers] = useState([]);
    const [open, setOpen] = useState(false); // ✅ used now
    const [editingTeacher, setEditingTeacher] = useState(null); // ✅ used now
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    // Load teachers
    const loadTeachers = async () => {
        try {
        const res = await searchTeachers({ page: 0, size: 20 });
        const teachersWithDefaults = (res?.content || []).map((t) => ({
            ...t,
            gender: t.gender || "",
            employmentDate: t.employmentDate || "",
            notes: t.notes || "",
        }));
        setTeachers(teachersWithDefaults);
        } catch (err) {
        console.error("Failed to load teachers", err);
        }
    };

    useEffect(() => {
        loadTeachers();
    }, []);

    // Edit teacher
    const handleEdit = (teacher) => {
        setEditingTeacher(teacher);
        setOpen(true);
    };

    // Open add dialog
    const handleOpen = () => {
        setEditingTeacher(null);
        setOpen(true);
    };

    // Cancel delete
    const handleCancelDelete = () => {
        setDeleteDialogOpen(false);
        setDeleteId(null);
    };

    // Confirm delete
        const handleConfirmDelete = async () => {
    try {
        await deleteTeacher(deleteId);
        await loadTeachers();
        setDeleteError(""); // clear any old errors
        setDeleteDialogOpen(false);
        setDeleteId(null);
    } catch (err) {
        let message =
        err.response?.data?.message ||
        err.message ||
        "Delete failed. Please try again later.";

        if (message.includes("Cannot delete or update a parent row")) {
        // 🔹 Show only one language depending on selected UI language
        message =
            language === "ar"
            ? "لا يمكن حذف هذا الأستاذ لأنه مازال مرتبطًا بفصل دراسي."
            : "Impossible de supprimer cet enseignant car il est encore affecté à une classe.";
        }

        setDeleteError(message);
    }
    };


    // Columns
    const columns = [
        { field: "id", headerName: "ID", width: 70 },
        { field: "fullName", headerName: t.fullName || "Full Name", flex: 1 },
        {
        field: "gender",
        headerName: t.gender || "Gender",
        width: 120,
        valueGetter: (params) => {
            if (!params?.row) return "";
            return params.row.gender === "M"
            ? t.male || "Male"
            : params.row.gender === "F"
            ? t.female || "Female"
            : "";
        },
        },
        { field: "phone", headerName: t.phone || "Phone", width: 150 },
        { field: "email", headerName: t.email || "Email", width: 200 },
        {
        field: "employmentDate",
        headerName: t.employmentDate || "Employment Date",
        width: 150,
        valueGetter: (params) =>
            params?.row?.employmentDate?.slice(0, 10) || "",
        },
        { field: "notes", headerName: t.notes || "Notes", flex: 1 },
        {
        field: "actions",
        headerName: t.actions,
        width: 180,
        renderCell: (params) => (
            <Box display="flex" gap={1} mt={1}>
            <Button
                onClick={() => handleEdit(params.row)}
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
                startIcon={<DeleteIcon />}
            />
            </Box>
        ),
        },
    ];

    return (
        <Box m="20px">
        <Header
            title={t.teachers || "Teachers"}
            subtitle={t.dataManagement || "Data Management"}
        />

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
            {t.addTeacher || "Add Teacher"}
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
            "& .MuiCheckbox-root.Mui-checked": {
                color:
                theme.palette.mode === "light"
                    ? colors.blueAccent[800]
                    : colors.blueAccent[400],
            },
            }}
        >
            <DataGrid
            rows={teachers}
            columns={columns}
            getRowId={(row) => row.id}
            pageSize={10}
            rowsPerPageOptions={[10, 20]}
            checkboxSelection
            disableSelectionOnClick
            />
        </Box>

        {/* ✅ Teacher Add/Edit Dialog (placeholder for now) */}
        <TeacherDialog
            open={open}
            onClose={() => setOpen(false)}
            language={language}
            onSaved={loadTeachers}   // ✅ refresh after save
            teacher={editingTeacher}
            reloadTeachers={loadTeachers}
        />

        {/* ✅ Blue Delete Dialog */}
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
            <DialogTitle
            sx={{ fontWeight: "bold", fontSize: "1.5rem", mb: 1 }}
            >
            {t.confirmDeleteTitle || "Are you sure?"}
            </DialogTitle>
            <DialogContent>
    {deleteError ? (
        <Typography sx={{ color: "yellow", fontWeight: "bold" }}>
        {deleteError}
        </Typography>
    ) : (
        <Typography>
        {t.confirmDeleteMessage || "Do you want to delete this teacher?"}
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
                disabled={!!deleteError} // ✅ disable if error is showing
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

    export default Teachers;
