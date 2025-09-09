    import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    MenuItem,
    useTheme,
    } from "@mui/material";
    import { useFormik } from "formik";
    import * as yup from "yup";
    import SaveIcon from "@mui/icons-material/Save";
    import UpdateIcon from "@mui/icons-material/Update";
    import CloseIcon from "@mui/icons-material/Close"; // ✅ better for cancel

    import { tokens } from "../../theme";
    import translations from "../../translations";
    import { createTeacher, updateTeacher } from "../../api/teachersApi";

    const teacherSchema = yup.object().shape({
    fullName: yup.string().required("Full Name is required"),
    gender: yup.string().oneOf(["M", "F"]).required("Gender is required"),
    phone: yup.string().required("Phone is required"),
    email: yup.string().email().required("Email is required"),
    employmentDate: yup.date().required("Employment Date is required"),
    notes: yup.string().nullable(),
    });

    const initialValues = {
    fullName: "",
    gender: "",
    phone: "",
    email: "",
    employmentDate: "",
    notes: "",
    };

    const TeacherDialog = ({ open, onClose, onSaved, language, teacher }) => {
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);
    const t = translations[language] || translations["fr"];

    const formik = useFormik({
        initialValues: teacher
        ? {
            fullName: teacher.fullName || "",
            gender: teacher.gender || "",
            phone: teacher.phone || "",
            email: teacher.email || "",
            employmentDate: teacher.employmentDate
                ? teacher.employmentDate.slice(0, 10)
                : "",
            notes: teacher.notes || "",
            }
        : initialValues,
        enableReinitialize: true,
        validationSchema: teacherSchema,
        onSubmit: async (values, { resetForm }) => {
        try {
            const payload = { ...values };
            if (teacher) {
            await updateTeacher(teacher.id, payload);
            } else {
            await createTeacher(payload);
            }
            resetForm();
            if (onSaved) await onSaved(); // ✅ refresh teacher list
            onClose();
        } catch (err) {
            console.error("Failed to save teacher", err);
        }
        },
    });

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle
            sx={{ backgroundColor: colors.blueAccent[800], color: "#fff" }}
        >
            {teacher ? t.editTeacher || "Edit Teacher" : t.addTeacher || "Add Teacher"}
        </DialogTitle>
        <form onSubmit={formik.handleSubmit}>
            <DialogContent>
            <TextField
                margin="dense"
                fullWidth
                name="fullName"
                placeholder={t.fullName || "Full Name"}
                value={formik.values.fullName}
                onChange={formik.handleChange}
                error={formik.touched.fullName && Boolean(formik.errors.fullName)}
                helperText={formik.touched.fullName && formik.errors.fullName}
            />

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
                <MenuItem value="M">{t.male}</MenuItem>
                <MenuItem value="F">{t.female}</MenuItem>
            </TextField>

            <TextField
                margin="dense"
                fullWidth
                name="phone"
                placeholder={t.phone || "Phone"}
                value={formik.values.phone}
                onChange={formik.handleChange}
                error={formik.touched.phone && Boolean(formik.errors.phone)}
                helperText={formik.touched.phone && formik.errors.phone}
            />

            <TextField
                margin="dense"
                fullWidth
                name="email"
                placeholder={t.email || "Email"}
                value={formik.values.email}
                onChange={formik.handleChange}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
            />

            <TextField
                margin="dense"
                type="date"
                fullWidth
                label={t.employmentDate}
                name="employmentDate"
                value={formik.values.employmentDate}
                onChange={formik.handleChange}
                error={
                formik.touched.employmentDate &&
                Boolean(formik.errors.employmentDate)
                }
                helperText={
                formik.touched.employmentDate && formik.errors.employmentDate
                }
                InputLabelProps={{ shrink: true }}
            />

            <TextField
                margin="dense"
                fullWidth
                name="notes"
                placeholder={t.notes || "Notes"}
                value={formik.values.notes}
                onChange={formik.handleChange}
                error={formik.touched.notes && Boolean(formik.errors.notes)}
                helperText={formik.touched.notes && formik.errors.notes}
            />
            </DialogContent>

            <DialogActions
        sx={{
            gap: 2, // ✅ space between buttons (theme.spacing(2) ≈ 16px)
        }}
        >
            <Button
                onClick={onClose}
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
                startIcon={<CloseIcon />} // ✅ cancel uses close icon
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
                gap: "8px",

                "&:hover": {
                    backgroundColor:
                    theme.palette.mode === "light"
                        ? colors.blueAccent[400]
                        : colors.blueAccent[800],
                },
                }}
                startIcon={teacher ? <UpdateIcon /> : <SaveIcon />}
            >
                {teacher ? t.update || "Update" : t.save || "Save"}
            </Button>
            </DialogActions>
        </form>
        </Dialog>
    );
    };

    export default TeacherDialog;
