// src/scenes/finances/ExpenseDialog.jsx
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
import dayjs from "dayjs";
import { tokens } from "../../../theme";
import translations from "../../../translations";
import { createExpense, updateExpense } from "../../../api/expenses";

const METHODS = ["CASH", "BANK", "MOBILE", "OTHER"];

// ✅ Validation schema
const expenseSchema = yup.object().shape({
  expenseDate: yup.date().required("Date is required"),
  method: yup.string().required("Method is required"),
  category: yup.string().required("Category is required"),
  subCategory: yup.string(),
  amount: yup
    .number()
    .typeError("Amount must be a number")
    .positive("Amount must be greater than zero")
    .required("Amount is required"),
  notes: yup.string(),
});

// ✅ Initial values
const initialValues = {
  expenseDate: dayjs().format("YYYY-MM-DD"),
  method: "CASH",
  category: "",
  subCategory: "",
  amount: "",
  notes: "",
};

const ExpenseDialog = ({ open, onClose, language, expense, reloadExpenses }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = translations[language] || translations["fr"];
  const isEdit = !!expense?.id;

  const formik = useFormik({
    initialValues: expense || initialValues,
    validationSchema: expenseSchema,
    enableReinitialize: true,
    onSubmit: async (values, { resetForm }) => {
      try {
        const payload = {
          ...values,
          amount: Number(values.amount),
          category: values.category.trim().toUpperCase(),
          subCategory: values.subCategory?.trim() || null,
          notes: values.notes?.trim() || null,
        };

        if (isEdit) {
          await updateExpense(expense.id, payload);
        } else {
          await createExpense(payload);
        }

        resetForm();
        onClose();
        if (reloadExpenses) await reloadExpenses();
      } catch (err) {
        console.error("Failed to save expense", err);
      }
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          backgroundColor:
            theme.palette.mode === "light" ? "#0d47a1" : "#4274c7",
          color: "#fff",
          fontWeight: "bold",
        }}
      >
        {isEdit ? t.editExpense || "Edit Expense" : t.addExpense || "Add Expense"}
      </DialogTitle>

      <form onSubmit={formik.handleSubmit}>
        <DialogContent>
          {/* Date */}
          <TextField
            margin="dense"
            fullWidth
            type="date"
            name="expenseDate"
            label={t.date || "Date"}
            InputLabelProps={{ shrink: true }}
            value={formik.values.expenseDate}
            onChange={formik.handleChange}
            error={
              formik.touched.expenseDate &&
              Boolean(formik.errors.expenseDate)
            }
            helperText={formik.touched.expenseDate && formik.errors.expenseDate}
          />

          {/* Method */}
          <TextField
            select
            margin="dense"
            fullWidth
            name="method"
            label={t.method || "Method"}
            value={formik.values.method}
            onChange={formik.handleChange}
            error={formik.touched.method && Boolean(formik.errors.method)}
            helperText={formik.touched.method && formik.errors.method}
          >
            {METHODS.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </TextField>

          {/* Category */}
          <TextField
            margin="dense"
            fullWidth
            name="category"
            placeholder={t.category || "Category"}
            value={formik.values.category}
            onChange={formik.handleChange}
            error={formik.touched.category && Boolean(formik.errors.category)}
            helperText={formik.touched.category && formik.errors.category}
          />

          {/* Sub-category */}
          <TextField
            margin="dense"
            fullWidth
            name="subCategory"
            placeholder={t.subCategory || "Sub-category"}
            value={formik.values.subCategory}
            onChange={formik.handleChange}
            error={
              formik.touched.subCategory &&
              Boolean(formik.errors.subCategory)
            }
            helperText={formik.touched.subCategory && formik.errors.subCategory}
          />

          {/* Amount */}
          <TextField
            margin="dense"
            fullWidth
            name="amount"
            placeholder={t.amount || "Amount"}
            inputMode="decimal"
            value={formik.values.amount}
            onChange={formik.handleChange}
            error={formik.touched.amount && Boolean(formik.errors.amount)}
            helperText={formik.touched.amount && formik.errors.amount}
          />

          {/* Notes */}
          <TextField
            margin="dense"
            fullWidth
            multiline
            minRows={2}
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
            gap: 2,
          }}
        >
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
              },
              gap: "8px",
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
              gap: "8px",
              "&:hover": {
                backgroundColor:
                  theme.palette.mode === "light"
                    ? colors.blueAccent[400]
                    : colors.blueAccent[800],
              },
            }}
            startIcon={isEdit ? <UpdateIcon /> : <SaveIcon />}
          >
            {isEdit ? t.update || "Update" : t.save || "Save"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ExpenseDialog;
