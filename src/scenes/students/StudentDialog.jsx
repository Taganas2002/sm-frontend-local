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

// only these are required
const studentSchema = yup.object().shape({
  fullName: yup.string().required("Full Name is required"),
  levelId: yup
    .number()
    .typeError("Level is required")
    .required("Level is required"),
  sectionId: yup
    .number()
    .typeError("Section is required")
    .required("Section is required"),
  // everything else optional
  dob: yup.mixed().nullable(),
  gender: yup.mixed().nullable(),
  address: yup.mixed().nullable(),
  phone: yup.mixed().nullable(),
  guardianName: yup.mixed().nullable(),
  guardianPhone: yup.mixed().nullable(),
  // enrollmentDate, cardUid, medicalNotes are not in the form
});

const initialValues = {
  fullName: "",
  dob: "",
  gender: "",
  address: "",
  phone: "",
  guardianName: "",
  guardianPhone: "",
  levelId: "",
  sectionId: "",
};

// helper: today YYYY-MM-DD from PC local time
const todayYMD = () => new Date().toLocaleDateString("en-CA");

const normalizeList = (list = []) =>
  (list || []).map((x) => ({ ...x, id: Number(x.id) }));

const StudentDialog = ({ open, onClose, language, student, reloadStudents }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = translations[language] || translations["fr"];

  const [levels, setLevels] = useState([]);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const levelsData = normalizeList((await listLevels()) || []);
        setLevels(levelsData);

        if (student?.levelId) {
          const sectionsData = normalizeList(
            (await listSections(student.levelId)) || []
          );
          setSections(sectionsData);
        } else {
          setSections([]);
        }
      } catch (e) {
        console.error("Failed to load levels/sections", e);
      }
    })();
  }, [student]);

  const formik = useFormik({
    initialValues: student
      ? {
          fullName: student.fullName ?? "",
          dob: student.dob ?? "",
          gender: student.gender ?? "",
          address: student.address ?? "",
          phone: student.phone ?? "",
          guardianName: student.guardianName ?? "",
          guardianPhone: student.guardianPhone ?? "",
          levelId: student.levelId ?? "",
          sectionId: student.sectionId ?? "",
        }
      : initialValues,
    validationSchema: studentSchema,
    enableReinitialize: true,
    onSubmit: async (values, { resetForm }) => {
      try {
        const payload = {
          ...values,
          levelId: values.levelId ? Number(values.levelId) : null,
          sectionId: values.sectionId ? Number(values.sectionId) : null,
        };

        // set enrollmentDate automatically on CREATE only
        if (!student) {
          payload.enrollmentDate = todayYMD();
        }

        // ensure we don't accidentally send fields you removed
        delete payload.cardUid;
        delete payload.medicalNotes;

        if (student?.id) {
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
      const sectionsData = normalizeList((await listSections(levelId)) || []);
      setSections(sectionsData);
    } catch (err) {
      console.error("Failed to load sections", err);
      setSections([]);
    }
  };

  // make the required asterisk red
  const requiredAsteriskSx = {
    "& .MuiFormLabel-asterisk": { color: theme.palette.error.main },
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          backgroundColor:
            theme.palette.mode === "light"
              ? colors.blueAccent[800]
              : colors.blueAccent[400],
          color: "#fff",
          fontWeight: "bold",
        }}
      >
        {student ? t.editStudent : t.addStudent}
      </DialogTitle>

      <form onSubmit={formik.handleSubmit}>
        <DialogContent>
          {/* Full Name (required) */}
          <TextField
            margin="dense"
            fullWidth
            required
            label={t.fullName}
            name="fullName"
            value={formik.values.fullName}
            onChange={formik.handleChange}
            error={formik.touched.fullName && Boolean(formik.errors.fullName)}
            helperText={formik.touched.fullName && formik.errors.fullName}
            sx={requiredAsteriskSx}
          />

          {/* Optional fields below */}
          <TextField
            margin="dense"
            fullWidth
            type="date"
            label={t.dob}
            name="dob"
            InputLabelProps={{ shrink: true }}
            value={formik.values.dob || ""}
            onChange={formik.handleChange}
          />

          <TextField
            select
            margin="dense"
            fullWidth
            label={t.gender}
            name="gender"
            value={formik.values.gender || ""}
            onChange={formik.handleChange}
          >
            <MenuItem value="">{t.select || "Select"}</MenuItem>
            <MenuItem value="M">{t.male || "Male"}</MenuItem>
            <MenuItem value="F">{t.female || "Female"}</MenuItem>
          </TextField>

          <TextField
            margin="dense"
            fullWidth
            label={t.address}
            name="address"
            value={formik.values.address || ""}
            onChange={formik.handleChange}
          />

          <TextField
            margin="dense"
            fullWidth
            label={t.phone}
            name="phone"
            value={formik.values.phone || ""}
            onChange={formik.handleChange}
          />

          <TextField
            margin="dense"
            fullWidth
            label={t.guardianName}
            name="guardianName"
            value={formik.values.guardianName || ""}
            onChange={formik.handleChange}
          />

          <TextField
            margin="dense"
            fullWidth
            label={t.guardianPhone}
            name="guardianPhone"
            value={formik.values.guardianPhone || ""}
            onChange={formik.handleChange}
          />

          {/* Level (required) */}
          <TextField
            select
            required
            margin="dense"
            fullWidth
            label={t.levels}
            name="levelId"
            value={formik.values.levelId || ""}
            onChange={(e) => handleLevelChange(Number(e.target.value))}
            error={formik.touched.levelId && Boolean(formik.errors.levelId)}
            helperText={formik.touched.levelId && formik.errors.levelId}
            sx={requiredAsteriskSx}
          >
            <MenuItem value="">{t.selectLevel}</MenuItem>
            {levels.map((lvl) => (
              <MenuItem key={lvl.id} value={lvl.id}>
                {lvl.name}
              </MenuItem>
            ))}
          </TextField>

          {/* Section (required) */}
          <TextField
            select
            required
            margin="dense"
            fullWidth
            label={t.sections}
            name="sectionId"
            value={formik.values.sectionId || ""}
            onChange={formik.handleChange}
            error={formik.touched.sectionId && Boolean(formik.errors.sectionId)}
            helperText={formik.touched.sectionId && formik.errors.sectionId}
            disabled={!formik.values.levelId}
            sx={requiredAsteriskSx}
          >
            <MenuItem value="">{t.selectSection}</MenuItem>
            {sections.map((sec) => (
              <MenuItem key={sec.id} value={sec.id}>
                {sec.name}
              </MenuItem>
            ))}
          </TextField>
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
            {t.cancel}
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
