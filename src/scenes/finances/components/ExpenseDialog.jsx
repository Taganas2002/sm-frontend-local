// src/scenes/finances/components/ExpenseDialog.jsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  useTheme,
  CircularProgress,
  Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import UpdateIcon from "@mui/icons-material/Update";
import { useFormik } from "formik";
import * as yup from "yup";
import dayjs from "dayjs";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { tokens } from "../../../theme";
import { getTranslations } from "../../../translations";
import { createExpense, updateExpense, getExpense } from "../../../api/expenses";

const METHODS = ["CASH", "BANK", "MOBILE", "OTHER"];

function methodLabel(m, t) {
  const u = String(m || "").toUpperCase();
  if (u === "CASH") return t.cash || "CASH";
  if (u === "BANK") return t.bank || "BANK";
  if (u === "MOBILE") return t.mobile || "MOBILE";
  if (u === "OTHER") return t.expenseMethodOther || t.other || "OTHER";
  return m;
}

/** Backend may send LocalDate as "YYYY-MM-DD" or as JSON array [y,m,d]. */
function formatExpenseDateForInput(v) {
  if (v == null || v === "") return dayjs().format("YYYY-MM-DD");
  if (Array.isArray(v) && v.length >= 3) {
    const [y, mo, d] = v;
    return `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const parsed = dayjs(v);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD");
}

function emptyForm() {
  return {
    expenseDate: dayjs().format("YYYY-MM-DD"),
    method: "CASH",
    category: "",
    subCategory: "",
    amount: "",
    notes: "",
  };
}

function normalizeApiExpense(e) {
  if (!e) return emptyForm();
  const amt = e.amount ?? e.totalAmount ?? e.total;
  return {
    expenseDate: formatExpenseDateForInput(e.expenseDate ?? e.date),
    method: String(e.method || "CASH").toUpperCase(),
    category: e.category != null ? String(e.category) : "",
    subCategory: e.subCategory != null ? String(e.subCategory) : "",
    amount: amt != null && amt !== "" ? String(Number(amt)) : "",
    notes: e.notes != null ? String(e.notes) : "",
  };
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.language
 * @param {number|null|undefined} props.expenseId — null/undefined = add new
 * @param {() => Promise<void>|void} [props.reloadExpenses]
 */
const ExpenseDialog = ({ open, onClose, language = "fr", expenseId, reloadExpenses }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = getTranslations(language);
  const isEdit = expenseId != null && Number.isFinite(Number(expenseId));

  const { data: expenseDetail, isFetching } = useQuery({
    queryKey: ["expense", expenseId],
    queryFn: () => getExpense(expenseId),
    enabled: open && isEdit,
  });

  const initialValues = useMemo(() => {
    if (!isEdit) return emptyForm();
    if (!expenseDetail) return emptyForm();
    return normalizeApiExpense(expenseDetail);
  }, [isEdit, expenseDetail]);

  const expenseSchema = useMemo(
    () =>
      yup.object().shape({
        expenseDate: yup
          .string()
          .required(t.expenseDateRequired || "Date is required")
          .matches(/^\d{4}-\d{2}-\d{2}$/, t.expenseDateRequired || "Date is required"),
        method: yup.string().required(t.expenseMethodRequired || "Method is required"),
        category: yup
          .string()
          .trim()
          .min(1, t.expenseCategoryRequired || "Category is required"),
        subCategory: yup.string(),
        amount: yup
          .number()
          .typeError(t.expenseAmountNumber || "Amount must be a number")
          .positive(t.expenseAmountPositive || "Amount must be greater than zero")
          .required(t.expenseAmountRequired || "Amount is required"),
        notes: yup.string(),
      }),
    [t]
  );

  const formik = useFormik({
    initialValues,
    validationSchema: expenseSchema,
    enableReinitialize: true,
    onSubmit: async (values, { resetForm }) => {
      try {
        const payload = {
          expenseDate: values.expenseDate,
          method: values.method || "CASH",
          category: values.category.trim().toUpperCase(),
          subCategory: values.subCategory?.trim() || null,
          amount: Number(values.amount),
          notes: values.notes?.trim() || null,
        };

        if (isEdit) {
          await updateExpense(Number(expenseId), payload);
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

  const dir = language === "ar" ? "rtl" : "ltr";
  const showLoader = open && isEdit && isFetching;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      dir={dir}
      key={isEdit ? `edit-${expenseId}` : "add"}
    >
      <DialogTitle
        sx={{
          backgroundColor: theme.palette.mode === "light" ? "#0d47a1" : "#4274c7",
          color: "#fff",
          fontWeight: "bold",
        }}
      >
        {isEdit ? t.editExpense || "Edit expense" : t.addExpense || "Add expense"}
      </DialogTitle>

      <form onSubmit={formik.handleSubmit}>
        <DialogContent>
          {showLoader ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TextField
                margin="dense"
                fullWidth
                type="date"
                name="expenseDate"
                label={t.date || "Date"}
                InputLabelProps={{ shrink: true }}
                value={formik.values.expenseDate}
                onChange={formik.handleChange}
                error={formik.touched.expenseDate && Boolean(formik.errors.expenseDate)}
                helperText={formik.touched.expenseDate && formik.errors.expenseDate}
              />

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
                    {methodLabel(m, t)}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                margin="dense"
                fullWidth
                name="category"
                label={t.category || "Category"}
                placeholder={t.category || "Category"}
                value={formik.values.category}
                onChange={formik.handleChange}
                error={formik.touched.category && Boolean(formik.errors.category)}
                helperText={formik.touched.category && formik.errors.category}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                margin="dense"
                fullWidth
                name="subCategory"
                label={t.subCategory || "Sub-category"}
                placeholder={t.subCategory || "Sub-category"}
                value={formik.values.subCategory}
                onChange={formik.handleChange}
                error={formik.touched.subCategory && Boolean(formik.errors.subCategory)}
                helperText={formik.touched.subCategory && formik.errors.subCategory}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                margin="dense"
                fullWidth
                name="amount"
                label={t.amount || "Amount"}
                placeholder={t.amount || "Amount"}
                inputMode="decimal"
                value={formik.values.amount}
                onChange={formik.handleChange}
                error={formik.touched.amount && Boolean(formik.errors.amount)}
                helperText={formik.touched.amount && formik.errors.amount}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                margin="dense"
                fullWidth
                multiline
                minRows={2}
                name="notes"
                label={t.notes || "Notes"}
                placeholder={t.notes || "Notes"}
                value={formik.values.notes}
                onChange={formik.handleChange}
                error={formik.touched.notes && Boolean(formik.errors.notes)}
                helperText={formik.touched.notes && formik.errors.notes}
                InputLabelProps={{ shrink: true }}
              />
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ gap: 2 }}>
          <Button
            onClick={onClose}
            variant="outlined"
            disabled={showLoader}
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
            disabled={showLoader}
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
