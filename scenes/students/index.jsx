    // src/scenes/students/Students.jsx
    import { useEffect, useState } from "react";
    import {
    Box,
    Button,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
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
    searchStudents,
    deleteStudent,
    } from "../../api/studentsApi";
    import { listLevels } from "../../api/levelsApi";
    import { listSections } from "../../api/sectionsApi";

    import StudentDialog from "./StudentDialog"; // ✅ use extracted dialog

    const normalizeList = (list = []) =>
    (list || []).map((x) => ({ ...x, id: Number(x.id) }));

    const Students = ({ language }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const t = translations[language] || translations["fr"];

    const [students, setStudents] = useState([]);
    const [levels, setLevels] = useState([]);
    const [sections, setSections] = useState([]);

    const [studentDialogOpen, setStudentDialogOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState(null);
    const [deleteError, setDeleteError] = useState("");


    // 🔹 Fetch initial data
    const loadInitialData = async () => {
        try {
        const levelsData = normalizeList((await listLevels()) || []);
        setLevels(levelsData);

        const allSectionsNested = await Promise.all(
            (levelsData || []).map((lvl) => listSections(lvl.id))
        );
        const sectionsNorm = normalizeList(allSectionsNested.flat());
        setSections(sectionsNorm);

        await loadStudents(levelsData, sectionsNorm);
        } catch (err) {
        console.error("Failed to load initial data", err);
        }
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    // 🔹 Load students
    const loadStudents = async (levelsData = [], sectionsData = []) => {
        try {
        const res = await searchStudents({ page: 0, size: 20 });
        const rawStudents = res?.content || res || [];

        const enriched = rawStudents.map((s) => {
            const levelIdNum =
            s.levelId !== undefined && s.levelId !== null ? Number(s.levelId) : "";
            const sectionIdNum =
            s.sectionId !== undefined && s.sectionId !== null
                ? Number(s.sectionId)
                : "";
            return {
            ...s,
            levelId: levelIdNum,
            sectionId: sectionIdNum,
            levelName:
                levelsData.find((l) => Number(l.id) === levelIdNum)?.name || "",
            sectionName:
                sectionsData.find((sec) => Number(sec.id) === sectionIdNum)?.name ||
                "",
            };
        });

        setStudents(enriched);
        } catch (err) {
        console.error("Failed to load students", err);
        }
    };

    // 🔹 Edit student
    const handleEdit = (student) => {
        setEditingStudent(student);
        setStudentDialogOpen(true);
    };

    // 🔹 Add student
    const handleOpenAdd = () => {
        setEditingStudent(null);
        setStudentDialogOpen(true);
    };

    // 🔹 Delete confirmation
    const handleOpenDelete = (studentId) => {
        setStudentToDelete(studentId);
        setDeleteDialogOpen(true);
    };

    // 🔹 Delete confirmation
        const handleConfirmDelete = async () => {
    try {
        await deleteStudent(studentToDelete);
        await loadInitialData();
        setDeleteError(""); // clear error if success
        setDeleteDialogOpen(false);
        setStudentToDelete(null);
    } catch (err) {
        let message =
        err.response?.data?.message ||
        err.message ||
        "Delete failed. Please try again later.";

        if (message.includes("Cannot delete or update a parent row")) {
        // 🔹 Show localized message depending on UI language
        message =
            language === "ar"
            ? "لا يمكن حذف هذا التلميذ لأنه مازال مسجلاً في فصل دراسي."
            : "Impossible de supprimer cet élève car il est encore inscrit à une classe.";
        }

        setDeleteError(message);
    }
};

    const handleCancelDelete = () => {
        setDeleteDialogOpen(false);
        setStudentToDelete(null);
    };

    const columns = [
        { field: "id", headerName: "ID", width: 70 },
        { field: "fullName", headerName: t.fullName, flex: 1 },
        { field: "dob", headerName: t.dob, width: 120 },
        { field: "gender", headerName: t.gender, width: 100 },
        { field: "phone", headerName: t.phone, width: 150 },
        { field: "guardianName", headerName: t.guardianName, width: 150 },
        { field: "cardUid", headerName: t.cardUid, width: 150 },
        { field: "levelName", headerName: t.levels, flex: 1 },
        { field: "sectionName", headerName: t.sections, flex: 1 },
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
                onClick={() => handleOpenDelete(params.row.id)}
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
        <Header title={t.studentsTitle} subtitle={t.studentsSubtitle} />

        {/* Add Student Button */}
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
            onClick={handleOpenAdd}
            >
            {t.addStudent || "Add Student"}
            </Button>
        </Box>

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
            rows={students}
            columns={columns}
            getRowId={(row) => row.id}
            pageSize={10}
            rowsPerPageOptions={[10, 20]}
            checkboxSelection
            disableSelectionOnClick
            />
        </Box>

        {/* ✅ Student Dialog */}
        <StudentDialog
            open={studentDialogOpen}
            onClose={() => setStudentDialogOpen(false)}
            language={language}
            student={editingStudent}
            reloadStudents={loadInitialData}
            levels={levels}          // ✅ pass down
            sections={sections}   
        />

        {/* Delete Confirmation Dialog */}
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
            {deleteError ? (
                <Typography sx={{ color: "yellow", fontWeight: "bold" }}>
                {deleteError}
                </Typography>
            ) : (
                <Typography>
                {t.confirmDeleteMessageStudent || "Do you want to delete this student?"}
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
                disabled={!!deleteError} // ✅ disable if error is showing
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
    };

    export default Students;
