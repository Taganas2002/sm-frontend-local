    import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    useTheme,
    } from "@mui/material";
    import CloseIcon from "@mui/icons-material/Close";
    import SaveIcon from "@mui/icons-material/Save";
    import UpdateIcon from "@mui/icons-material/Update";
    import { useFormik } from "formik";
    import * as yup from "yup";
    import { useEffect, useState } from "react";

    import { tokens } from "../../theme";
    import translations from "../../translations";
    import { createStudent, updateStudent } from "../../api/studentsApi";
    import { listLevels } from "../../api/levelsApi";
    import { listSections } from "../../api/sectionsApi";

    // Validation schema (groups removed)
    const studentSchema = yup.object().shape({
    fullName: yup.string().required("Full Name is required"),
    dob: yup.date().required("Date of Birth is required"),
    gender: yup.string().required("Gender is required"),
    address: yup.string().required("Address is required"),
    phone: yup.string().required("Phone is required"),
    guardianName: yup.string().required("Guardian Name is required"),
    guardianPhone: yup.string().required("Guardian Phone is required"),
    enrollmentDate: yup.date().required("Enrollment Date is required"),
    cardUid: yup.string().required("Card UID is required"),
    levelId: yup.number().required("Level is required"),
    sectionId: yup.number().required("Section is required"),
    });

    // Initial values (groups removed)
    const initialValues = {
    fullName: "",
    dob: "",
    gender: "",
    address: "",
    phone: "",
    guardianName: "",
    guardianPhone: "",
    enrollmentDate: "",
    cardUid: "",
    levelId: "",
    sectionId: "",
    };

    const normalizeList = (list = []) => (list || []).map((x) => ({ ...x, id: Number(x.id) }));

    const StudentDialog = ({ open, onClose, language, student, reloadStudents }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const t = translations[language] || translations["fr"];

    const [levels, setLevels] = useState([]);
    const [sections, setSections] = useState([]);

    // load levels & sections initially
    useEffect(() => {
        const fetchLevels = async () => {
        try {
            const levelsData = normalizeList(await listLevels() || []);
            setLevels(levelsData);

            if (student?.levelId) {
            const sectionsData = normalizeList(await listSections(student.levelId) || []);
            setSections(sectionsData);
            }
        } catch (e) {
            console.error("Failed to load levels/sections", e);
        }
        };
        fetchLevels();
    }, [student]);

    const formik = useFormik({
        initialValues: student || initialValues,
        validationSchema: studentSchema,
        enableReinitialize: true,
        onSubmit: async (values, { resetForm }) => {
        try {
            const payload = {
            ...values,
            levelId: Number(values.levelId),
            sectionId: Number(values.sectionId),
            };

            if (student) {
            await updateStudent(student.id, payload);
            } else {
            await createStudent(payload);
            }

            resetForm();
            onClose();
            if (reloadStudents) await reloadStudents();
        } catch (err) {
            console.error("Failed to save student", err);
        }
        },
    });

    const handleLevelChange = async (levelId) => {
        formik.setFieldValue("levelId", levelId);
        formik.setFieldValue("sectionId", "");
        if (!levelId) {
        setSections([]);
        return;
        }
        try {
        const sectionsData = normalizeList(await listSections(levelId) || []);
        setSections(sectionsData);
        } catch (err) {
        console.error("Failed to load sections", err);
        setSections([]);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle
            sx={{
            backgroundColor: theme.palette.mode === "light" ? "#0d47a1" : "#4274c7",
            color: "#fff",
            fontWeight: "bold",
            }}
        >
            {student ? t.editStudent : t.addStudent}
        </DialogTitle>

        <form onSubmit={formik.handleSubmit}>
            <DialogContent>
            {/* Full Name */}
            <TextField
                margin="dense"
                fullWidth
                name="fullName"
                placeholder={t.fullName}
                value={formik.values.fullName}
                onChange={formik.handleChange}
                error={formik.touched.fullName && Boolean(formik.errors.fullName)}
                helperText={formik.touched.fullName && formik.errors.fullName}
            />

            {/* DOB */}
            <TextField
                margin="dense"
                fullWidth
                type="date"
                name="dob"
                label={t.dob}
                InputLabelProps={{ shrink: true }}
                value={formik.values.dob}
                onChange={formik.handleChange}
                error={formik.touched.dob && Boolean(formik.errors.dob)}
                helperText={formik.touched.dob && formik.errors.dob}
            />

            {/* Gender */}
            <TextField
                select
                margin="dense"
                fullWidth
                name="gender"
                label={t.gender}
                value={formik.values.gender}
                onChange={formik.handleChange}
                error={formik.touched.gender && Boolean(formik.errors.gender)}
                helperText={formik.touched.gender && formik.errors.gender}
            >
                <MenuItem value="M">Male</MenuItem>
                <MenuItem value="F">Female</MenuItem>
            </TextField>

            {/* Address */}
            <TextField
                margin="dense"
                fullWidth
                name="address"
                placeholder={t.address}
                value={formik.values.address}
                onChange={formik.handleChange}
                error={formik.touched.address && Boolean(formik.errors.address)}
                helperText={formik.touched.address && formik.errors.address}
            />

            {/* Phone */}
            <TextField
                margin="dense"
                fullWidth
                name="phone"
                placeholder={t.phone}
                value={formik.values.phone}
                onChange={formik.handleChange}
                error={formik.touched.phone && Boolean(formik.errors.phone)}
                helperText={formik.touched.phone && formik.errors.phone}
            />

            {/* Guardian Name */}
            <TextField
                margin="dense"
                fullWidth
                name="guardianName"
                placeholder={t.guardianName}
                value={formik.values.guardianName}
                onChange={formik.handleChange}
                error={formik.touched.guardianName && Boolean(formik.errors.guardianName)}
                helperText={formik.touched.guardianName && formik.errors.guardianName}
            />

            {/* Guardian Phone */}
            <TextField
                margin="dense"
                fullWidth
                name="guardianPhone"
                placeholder={t.guardianPhone}
                value={formik.values.guardianPhone}
                onChange={formik.handleChange}
                error={formik.touched.guardianPhone && Boolean(formik.errors.guardianPhone)}
                helperText={formik.touched.guardianPhone && formik.errors.guardianPhone}
            />

            {/* Enrollment Date */}
            <TextField
                margin="dense"
                fullWidth
                type="date"
                name="enrollmentDate"
                label={t.enrollmentDate}
                InputLabelProps={{ shrink: true }}
                value={formik.values.enrollmentDate}
                onChange={formik.handleChange}
                error={formik.touched.enrollmentDate && Boolean(formik.errors.enrollmentDate)}
                helperText={formik.touched.enrollmentDate && formik.errors.enrollmentDate}
            />

            {/* Card UID */}
            <TextField
                margin="dense"
                fullWidth
                name="cardUid"
                placeholder={t.cardUid}
                value={formik.values.cardUid}
                onChange={formik.handleChange}
                error={formik.touched.cardUid && Boolean(formik.errors.cardUid)}
                helperText={formik.touched.cardUid && formik.errors.cardUid}
            />

            {/* Level */}
            <TextField
                select
                margin="dense"
                fullWidth
                name="levelId"
                label={t.levels}
                value={formik.values.levelId || ""}
                onChange={(e) => handleLevelChange(Number(e.target.value))}
                error={formik.touched.levelId && Boolean(formik.errors.levelId)}
                helperText={formik.touched.levelId && formik.errors.levelId}
            >
                <MenuItem value="">{t.selectLevel}</MenuItem>
                {levels.map((lvl) => (
                <MenuItem key={lvl.id} value={lvl.id}>
                    {lvl.name}
                </MenuItem>
                ))}
            </TextField>

            {/* Section */}
            <TextField
                select
                margin="dense"
                fullWidth
                name="sectionId"
                label={t.sections}
                value={formik.values.sectionId || ""}
                onChange={formik.handleChange}
                error={formik.touched.sectionId && Boolean(formik.errors.sectionId)}
                helperText={formik.touched.sectionId && formik.errors.sectionId}
                disabled={!formik.values.levelId}
            >
                <MenuItem value="">{t.selectSection}</MenuItem>
                {sections.map((sec) => (
                <MenuItem key={sec.id} value={sec.id}>
                    {sec.name}
                </MenuItem>
                ))}
            </TextField>
            </DialogContent>

            <DialogActions  sx={{
            gap: 2, // ✅ space between buttons (theme.spacing(2) ≈ 16px)
        }} >
            <Button
                onClick={onClose}
                variant="outlined"
                sx={{
                color: theme.palette.error.main,
                ml: 2,
                borderColor: theme.palette.error.main,
                "&:hover": {
                    backgroundColor: theme.palette.error.light,
                    borderColor: theme.palette.error.dark,
                    color: "#fff",
                gap: "8px",

                },
                }}
                startIcon={<CloseIcon />}
            >
                {t.cancel}
            </Button>

            <Button
                type="submit"
                variant="contained"
                sx={{
                backgroundColor:
                    theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400],
                color: "#fff",
                gap: "8px",

                "&:hover": {
                    backgroundColor:
                    theme.palette.mode === "light" ? colors.blueAccent[400] : colors.blueAccent[800],
                },
                }}
                startIcon={student ? <UpdateIcon /> : <SaveIcon />}
            >
                {student ? t.update : t.save}
            </Button>
            </DialogActions>
        </form>
        </Dialog>
    );
    };

    export default StudentDialog;
