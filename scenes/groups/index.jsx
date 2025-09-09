    import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    useTheme,
    FormControlLabel,
    Checkbox,
    Typography 
    } from "@mui/material";
    import { DataGrid } from "@mui/x-data-grid";
    import { tokens } from "../../theme";
    import Header from "../../components/Header";
    import { useState, useEffect } from "react";
    import { Formik } from "formik";
    import * as yup from "yup";
    import AddIcon from "@mui/icons-material/Add";
    import EditIcon from "@mui/icons-material/Edit";
    import translations from "../../translations/index";
    import CloseIcon from "@mui/icons-material/Close"; // ✅ better for cancel
    import SaveIcon from "@mui/icons-material/Save";
    import UpdateIcon from "@mui/icons-material/Update";
    import DeleteIcon from "@mui/icons-material/Delete";
    
    

    // APIs
    import { listTeachers } from "../../api/teachersApi";
    import { listSubjects } from "../../api/subjectsApi";
    import { listLevels } from "../../api/levelsApi";
    import { listSections } from "../../api/sectionsApi";

    import {
    searchGroups,
    createGroup,
    updateGroup,
    getGroup,
    deleteGroup
    } from "../../api/groupsApi";

    const Groups = ({ language }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const t = translations[language] || translations["fr"];
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState(null);
    const [deleteError, setDeleteError] = useState("");


    const [groups, setGroups] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [levels, setLevels] = useState([]);
    const [sections, setSections] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [loading, setLoading] = useState(false);

    // Load dropdowns + groups
    useEffect(() => {
        const loadAll = async () => {
        setLoading(true);
        try {
            const [teachersList, subjectsList, levelsList, sectionsList] =
            await Promise.all([
                listTeachers(),
                listSubjects(),
                listLevels(),
                listSections(),
            ]);
            setTeachers(teachersList);
            setSubjects(subjectsList);
            setLevels(levelsList);
            setSections(sectionsList?.content ? sectionsList.content : sectionsList);

            await loadGroups(teachersList, subjectsList, levelsList, sectionsList);
        } catch (err) {
            console.error("Error loading dropdown data:", err);
        } finally {
            setLoading(false);
        }
        };

        loadAll();
        // eslint-disable-next-line
    }, []);

    // Load groups and enrich names
    const loadGroups = async (
        teachersList = teachers,
        subjectsList = subjects,
        levelsList = levels,
        sectionsList = sections
    ) => {
        setLoading(true);
        try {
        const res = await searchGroups({ page: 0, size: 50 });
        const raw = res?.content ? res.content : res ?? [];
        const enriched = raw.map((g) => ({
            ...g,
            teacherName:
            teachersList.find((x) => x.id === g.teacherId)?.fullName || "",
            subjectName: subjectsList.find((x) => x.id === g.subjectId)?.name || "",
            levelName: levelsList.find((x) => x.id === g.levelId)?.name || "",
            sectionName: sectionsList.find((x) => x.id === g.sectionId)?.name || "",
        }));
        setGroups(enriched);
        } catch (err) {
        console.error("Failed to load groups", err);
        } finally {
        setLoading(false);
        }
    };

    const handleOpen = () => {
        setEditingGroup(null);
        setOpenDialog(true);
    };

    const handleClose = () => {
        setEditingGroup(null);
        setOpenDialog(false);
    };

    const fetchSectionsForLevel = async (levelId, setFieldValue) => {
        setFieldValue("levelId", levelId);
        try {
        const data = await listSections(levelId);
        const list = data?.content ? data.content : data;
        setSections(list || []);
        } catch (err) {
        console.error("Failed to load sections for level", err);
        setSections([]);
        }
    };

    const handleEdit = (row) => {
        setEditingGroup(row);
        setOpenDialog(true);
        if (row?.levelId) {
        listSections(row.levelId).then((d) =>
            setSections(d?.content ? d.content : d || [])
        );
        }
    };
     // Delete handlers
    const handleCancelDelete = () => {
        setDeleteDialogOpen(false);
        setGroupToDelete(null);
        setDeleteError("");
    };

    const handleConfirmDelete = async () => {
    if (!groupToDelete) return;

    try {
        await deleteGroup(groupToDelete.id);
        await loadGroups();
        setDeleteError("");
        setDeleteDialogOpen(false);
        setGroupToDelete(null);
    } catch (err) {
        let message =
            err.response?.data?.message ||
            err.message ||
            t.deleteFailed ||
            "Delete failed. Please try again later.";

        // 🔹 Custom handling for foreign key or auth errors
        if (
            message.includes("Cannot delete or update a parent row") ||
            message.includes("Full authentication is required")
        ) {
            message =
                language === "ar"
                    ? "لا يمكن حذف هذا الفوج لأنه مرتبط بسجلات أخرى."
                    : "Impossible de supprimer ce groupe car il est encore lié à d'autres enregistrements.";
        }

        setDeleteError(message);
    }
};


    const columns = [
        { field: "id", headerName: "ID", width: 80 },
        { field: "name", headerName: t.groupName || "إسم الفوج", flex: 1 },
        { field: "teacherName", headerName: t.teacher, flex: 1 },
        { field: "subjectName", headerName: t.subject, flex: 1 },
        { field: "levelName", headerName: t.level, flex: 1 },
        { field: "sectionName", headerName: t.section, flex: 1 },
        { field: "capacity", headerName: t.capacity, width: 100 },
        { field: "billingModel", headerName: t.billingModel, width: 130 },
        { field: "startDate", headerName: t.startDate, width: 130 },
            { field: "notes", headerName: t.notes, flex: 1 },
            {
            field: "actions",
            headerName: t.actions,
            width: 180,
            renderCell: (params) => (
                <Box display="flex" gap={1} mt={1}>
                    {/* Edit Button */}
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

                    {/* Delete Button */}
                    <Button
                        onClick={() => {
                            setGroupToDelete(params.row);
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

    // Validation schema
    const groupSchema = yup.object().shape({
        name: yup.string().required("مطلوب"), // ✅ added validation
        academicYear: yup.string().required("مطلوب"),
        teacherId: yup.number().typeError("اختر أستاذ").required("مطلوب"),
        subjectId: yup.number().typeError("اختر مادة").required("مطلوب"),
        levelId: yup.number().typeError("اختر مستوى").required("مطلوب"),
        sectionId: yup.number().typeError("اختر شعبة").required("مطلوب"),
        privateGroup: yup.boolean(),
        revisionGroup: yup.boolean(),
        active: yup.boolean(),
        capacity: yup
        .number()
        .transform((val, orig) => (orig === "" ? null : val))
        .nullable()
        .positive("يجب أن يكون أكبر من 0")
        .required("مطلوب"),
        billingModel: yup.string().required("مطلوب"),
        monthlyFee: yup
        .number()
        .transform((val, orig) => (orig === "" ? null : val))
        .nullable()
        .when("billingModel", {
            is: "MONTHLY",
            then: (s) => s.required("مطلوب"),
        }),
        sessionsPerMonth: yup
        .number()
        .transform((val, orig) => (orig === "" ? null : val))
        .nullable(),
        sessionCost: yup
        .number()
        .transform((val, orig) => (orig === "" ? null : val))
        .nullable()
        .when("billingModel", {
            is: "PER_SESSION",
            then: (s) => s.required("مطلوب"),
        }),
        hourlyCost: yup
        .number()
        .transform((val, orig) => (orig === "" ? null : val))
        .nullable()
        .when("billingModel", {
            is: "PER_HOUR",
            then: (s) => s.required("مطلوب"),
        }),
        sessionDurationMin: yup
        .number()
        .transform((val, orig) => (orig === "" ? null : val))
        .nullable()
        .when("billingModel", {
            is: "PER_HOUR",
            then: (s) => s.required("مطلوب"),
        }),
        teacherShareType: yup.string().required("مطلوب"),
        teacherShareValue: yup
        .number()
        .transform((val, orig) => (orig === "" ? null : val))
        .nullable()
        .required("مطلوب"),
    });

    const initialValues = {
        name: "",
        academicYear: "",
        teacherId: "",
        subjectId: "",
        levelId: "",
        sectionId: "",
        privateGroup: false,
        revisionGroup: false,
        active: true,
        capacity: 10,
        billingModel: "MONTHLY",
        sessionsPerMonth: "",
        monthlyFee: "",
        sessionCost: "",
        hourlyCost: "",
        sessionDurationMin: "",
        teacherShareType: "PERCENT",
        teacherShareValue: "",
        allowCheckInWithoutBalance: false,
        requireFirstLessonAttendance: false,
        registerFirstAbsence: false,
        lastLessonReminder: false,
        absenceStopThreshold: "",
        warnDuplicateCard: false,
        allowMultipleCheckinsPerDay: false,
        startDate: "",
        notes: "",
    };

    // Save (create or update)
    const handleSave = async (values, { setSubmitting }) => {
        try {
        const payload = {
            name: values.name, 
            academicYear: values.academicYear,
            teacherId: Number(values.teacherId),
            subjectId: Number(values.subjectId),
            levelId: Number(values.levelId),
            sectionId: Number(values.sectionId),
            privateGroup: Boolean(values.privateGroup),
            revisionGroup: Boolean(values.revisionGroup),
            active: Boolean(values.active),
            capacity: Number(values.capacity),
            billingModel: values.billingModel,
            sessionsPerMonth: values.sessionsPerMonth
            ? Number(values.sessionsPerMonth)
            : null,
            monthlyFee: values.monthlyFee ? Number(values.monthlyFee) : null,
            sessionCost: values.sessionCost ? Number(values.sessionCost) : null,
            hourlyCost: values.hourlyCost ? Number(values.hourlyCost) : null,
            sessionDurationMin: values.sessionDurationMin
            ? Number(values.sessionDurationMin)
            : null,
            teacherShareType: values.teacherShareType,
            teacherShareValue: values.teacherShareValue
            ? Number(values.teacherShareValue)
            : null,
            allowCheckInWithoutBalance: Boolean(values.allowCheckInWithoutBalance),
            requireFirstLessonAttendance: Boolean(values.requireFirstLessonAttendance),
            registerFirstAbsence: Boolean(values.registerFirstAbsence),
            lastLessonReminder: Boolean(values.lastLessonReminder),
            absenceStopThreshold: values.absenceStopThreshold
            ? Number(values.absenceStopThreshold)
            : null,
            warnDuplicateCard: Boolean(values.warnDuplicateCard),
            allowMultipleCheckinsPerDay: Boolean(values.allowMultipleCheckinsPerDay),
            startDate: values.startDate || null,
            notes: values.notes || null,
        };

        if (editingGroup?.id) {
            const updated = await updateGroup(editingGroup.id, payload);
            const fresh = await getGroup(updated.id); // ensure latest backend
            const enriched = {
            ...fresh,
            teacherName: teachers.find((x) => x.id === fresh.teacherId)?.fullName || "",
            subjectName: subjects.find((x) => x.id === fresh.subjectId)?.name || "",
            levelName: levels.find((x) => x.id === fresh.levelId)?.name || "",
            sectionName: sections.find((x) => x.id === fresh.sectionId)?.name || "",
            };
            setGroups((prev) => prev.map((g) => (g.id === enriched.id ? enriched : g)));
        } else {
            const created = await createGroup(payload);
            const fresh = await getGroup(created.id);
            const enriched = {
            ...fresh,
            teacherName: teachers.find((x) => x.id === fresh.teacherId)?.fullName || "",
            subjectName: subjects.find((x) => x.id === fresh.subjectId)?.name || "",
            levelName: levels.find((x) => x.id === fresh.levelId)?.name || "",
            sectionName: sections.find((x) => x.id === fresh.sectionId)?.name || "",
            };
            setGroups((prev) => [...prev, enriched]);
        }

        setOpenDialog(false);
        setEditingGroup(null);
        } catch (err) {
        console.error("Save group failed", err);
        } finally {
        setSubmitting(false);
        }
    };

    return (
        <Box m="20px">
        <Header title={t.groups} subtitle={t.dataManagement} />

        {/* Add Group */}
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
            {t.addGroup || "Add Group"}
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
            rows={groups}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
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
            {editingGroup ? t.editGroup : t.addGroup}
            </DialogTitle>

            <Formik
            initialValues={editingGroup || initialValues}
            validationSchema={groupSchema}
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
                setFieldValue,
                isSubmitting,
            }) => (
                <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                    {/* Group Name */}
                    <TextField
                        name="name"
                        label="إسم الفوج *"
                        value={values.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.name && Boolean(errors.name)}
                        helperText={touched.name && errors.name}
                    />

                    {/* Academic Year */}
                    <TextField
                        name="academicYear"
                        label="السنة الدراسية *"
                        value={values.academicYear}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={
                        touched.academicYear && Boolean(errors.academicYear)
                        }
                        helperText={touched.academicYear && errors.academicYear}
                    />

                    {/* Teacher */}
                    <TextField
                        select
                        name="teacherId"
                        label="الأستاذ *"
                        value={values.teacherId || ""}
                        onChange={handleChange}
                    >
                        <MenuItem value="">-- اختر --</MenuItem>
                        {teachers.map((tc) => (
                        <MenuItem key={tc.id} value={tc.id}>
                            {tc.fullName}
                        </MenuItem>
                        ))}
                    </TextField>

                    {/* Subject */}
                    <TextField
                        select
                        name="subjectId"
                        label="المادة *"
                        value={values.subjectId || ""}
                        onChange={handleChange}
                    >
                        <MenuItem value="">-- اختر --</MenuItem>
                        {subjects.map((s) => (
                        <MenuItem key={s.id} value={s.id}>
                            {s.name}
                        </MenuItem>
                        ))}
                    </TextField>

                    {/* Level */}
                    <TextField
                        select
                        name="levelId"
                        label="المستوى *"
                        value={values.levelId || ""}
                        onChange={(e) =>
                        fetchSectionsForLevel(e.target.value, setFieldValue)
                        }
                    >
                        <MenuItem value="">-- اختر --</MenuItem>
                        {levels.map((lvl) => (
                        <MenuItem key={lvl.id} value={lvl.id}>
                            {lvl.name}
                        </MenuItem>
                        ))}
                    </TextField>

                    {/* Section */}
                    <TextField
                        select
                        name="sectionId"
                        label="الشعبة *"
                        value={values.sectionId || ""}
                        onChange={handleChange}
                        disabled={!values.levelId}
                    >
                        <MenuItem value="">-- اختر --</MenuItem>
                        {sections.map((sec) => (
                        <MenuItem key={sec.id} value={sec.id}>
                            {sec.name}
                        </MenuItem>
                        ))}
                    </TextField>

                    <FormControlLabel
                        control={
                        <Checkbox
                            checked={Boolean(values.privateGroup)}
                            onChange={(e) =>
                            setFieldValue("privateGroup", e.target.checked)
                            }
                        />
                        }
                        label="مجموعة خاصة"
                    />

                    <FormControlLabel
                        control={
                        <Checkbox
                            checked={Boolean(values.revisionGroup)}
                            onChange={(e) =>
                            setFieldValue("revisionGroup", e.target.checked)
                            }
                        />
                        }
                        label="مجموعة مراجعة"
                    />
{/* Capacity */}
                    <TextField
                        type="number"
                        name="capacity"
                        label="سعة الفوج *"
                        value={values.capacity}
                        onChange={handleChange}
                    />
                    {/* Billing Model */}
                    <TextField
                        select
                        name="billingModel"
                        label="نموذج الفوترة"
                        value={values.billingModel}
                        onChange={handleChange}
                    >
                        <MenuItem value="MONTHLY">شهري</MenuItem>
                        <MenuItem value="PER_SESSION">لكل حصة</MenuItem>
                        <MenuItem value="PER_HOUR">لكل ساعة</MenuItem>
                    </TextField>

                        {/* Billing conditional */}
                        {values.billingModel === "MONTHLY" && (
                            <>
                            <TextField type="number" name="monthlyFee" label="الإشتراك الشهري" value={values.monthlyFee} onChange={handleChange} />
                            <TextField type="number" name="sessionsPerMonth" label="عدد الحصص في الشهر" value={values.sessionsPerMonth} onChange={handleChange} />
                            </>
                        )}
                        {values.billingModel === "PER_SESSION" && (
                            <TextField type="number" name="sessionCost" label="سعر الحصة" value={values.sessionCost} onChange={handleChange} />
                        )}
                        {values.billingModel === "PER_HOUR" && (
                            <>
                            <TextField type="number" name="hourlyCost" label="سعر الساعة" value={values.hourlyCost} onChange={handleChange} />
                            <TextField type="number" name="sessionDurationMin" label="مدة الحصة بالدقائق" value={values.sessionDurationMin} onChange={handleChange} />
                            </>
                        )}

                        {/* Teacher Share */}
                        <TextField select name="teacherShareType" label="نصيب الأستاذ" value={values.teacherShareType} onChange={handleChange}>
                            <MenuItem value="PERCENT">%</MenuItem>
                            <MenuItem value="FIXED">مبلغ ثابت</MenuItem>
                        </TextField>
                        <TextField type="number" name="teacherShareValue" label="قيمة نصيب الأستاذ" value={values.teacherShareValue} onChange={handleChange} />

                        {/* Start Date */}
                        <TextField type="date" name="startDate" label="تاريخ البداية" value={values.startDate || ""} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                        {/* Notes */}
                        <TextField name="notes" label="ملاحظات" multiline value={values.notes} onChange={handleChange} />
                        </Box>
                    </DialogContent>
                <DialogActions
                sx={{
                    gap: 2, // ✅ space between buttons (theme.spacing(2) ≈ 16px)
                }}
                >        
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
                gap: "8px",
                },
            }}
            startIcon={<CloseIcon />} // ❌ cancel button with icon
            >
            {t.cancel || "Cancel"}
            </Button>

            <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
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
            startIcon={
                isSubmitting
                ? null // no icon while submitting
                : editingGroup
                ? <UpdateIcon />
                : <SaveIcon />
            }
            >
            {isSubmitting
                ? t.saving || "Saving..."
                : editingGroup
                ? t.update || "Update"
                : t.save || "Save"}
            </Button>

                    </DialogActions>
                    </form>
                )}
                </Formik>
            </Dialog>
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
                {t.confirmDeleteMessageGroup || "Do you want to delete this group?"}
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
                disabled={!!deleteError}
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

        export default Groups;
