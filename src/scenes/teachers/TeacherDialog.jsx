// src/scenes/teachers/TeacherDialog.jsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  useTheme,
} from "@mui/material";
import { useFormik } from "formik";
import * as yup from "yup";
import SaveIcon from "@mui/icons-material/Save";
import UpdateIcon from "@mui/icons-material/Update";
import CloseIcon from "@mui/icons-material/Close";

import { tokens } from "../../theme";
import translations from "../../translations";
import { createTeacher, updateTeacher } from "../../api/teachersApi";

// Only the fields we keep (you asked to remove gender, employmentDate, notes)
const teacherSchema = yup.object().shape({
  fullName: yup.string().required("Full Name is required"),
  phone: yup.string().required("Phone is required"),
  email: yup.string().nullable().email("Invalid email"),
});

const initialValues = {
  fullName: "",
  phone: "",
  email: "",
};

const TeacherDialog = ({ open, onClose, onSaved, language, teacher }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = translations[language] || translations["fr"];

  const formik = useFormik({
    initialValues: teacher
      ? {
          fullName: teacher.fullName || "",
          phone: teacher.phone || "",
          email: teacher.email || "",
        }
      : initialValues,
    enableReinitialize: true,
    validationSchema: teacherSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        const payload = { ...values };
        if (teacher?.id) {
          await updateTeacher(teacher.id, payload);
        } else {
          await createTeacher(payload);
        }
        resetForm();
        onSaved && (await onSaved());
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
            value={formik.values.email || ""}
            onChange={formik.handleChange}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
          />
        </DialogContent>

        <DialogActions sx={{ gap: 2 }}>
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
