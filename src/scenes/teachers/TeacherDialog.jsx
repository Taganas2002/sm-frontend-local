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
import { getTranslations } from "../../translations";
import { createTeacher, updateTeacher } from "../../api/teachersApi";

const initialValues = {
  fullName: "",
  phone: "",
  email: "",
};

const TeacherDialog = ({ open, onClose, onSaved, language, teacher }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = getTranslations(language);

  const teacherSchema = yup.object().shape({
    fullName: yup.string().trim().required(t.requiredFullName || "Full name is required"),
    phone: yup.string().nullable().optional(),
    email: yup
      .string()
      .nullable()
      .transform((v) => (typeof v === "string" && v.trim() === "" ? null : v))
      .test("email", t.invalidEmail || "Invalid email", (value) => {
        if (value == null || value === "") return true;
        return yup.string().email().isValidSync(value);
      }),
  });

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
        const payload = { fullName: values.fullName.trim() };
        const ph = (values.phone || "").trim();
        const em = (values.email || "").trim();
        if (ph) payload.phone = ph;
        if (em) payload.email = em;
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

  const requiredAsteriskSx = {
    "& .MuiFormLabel-asterisk": { color: theme.palette.error.main },
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" data-testid="teachers-dialog">
      <DialogTitle sx={{ backgroundColor: colors.blueAccent[800], color: "#fff" }}>
        {teacher ? t.editTeacher || "Edit teacher" : t.addTeacher || "Add teacher"}
      </DialogTitle>

      <form onSubmit={formik.handleSubmit}>
        <DialogContent>
          <TextField
            inputProps={{ "data-testid": "teachers-fullName" }}
            margin="dense"
            fullWidth
            required
            name="fullName"
            label={t.fullName || "Full name"}
            value={formik.values.fullName}
            onChange={formik.handleChange}
            error={formik.touched.fullName && Boolean(formik.errors.fullName)}
            helperText={formik.touched.fullName && formik.errors.fullName}
            sx={requiredAsteriskSx}
          />

          <TextField
            inputProps={{ "data-testid": "teachers-phone" }}
            margin="dense"
            fullWidth
            name="phone"
            label={t.phoneOptional || t.phone || "Phone"}
            value={formik.values.phone}
            onChange={formik.handleChange}
          />

          <TextField
            inputProps={{ "data-testid": "teachers-email" }}
            margin="dense"
            fullWidth
            name="email"
            label={t.emailOptional || t.email || "Email"}
            value={formik.values.email || ""}
            onChange={formik.handleChange}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
          />
        </DialogContent>

        <DialogActions sx={{ gap: 2 }}>
          <Button
            data-testid="teachers-cancel"
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
            data-testid="teachers-save"
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
