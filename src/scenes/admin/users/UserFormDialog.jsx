import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  MenuItem,
  useTheme,
  Snackbar,
  Alert
} from "@mui/material";
  import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import UpdateIcon from "@mui/icons-material/Update";
import { tokens } from "../../../theme";
import translations from "../../../translations";

export default function UserFormDialog({
  open,
  onClose,
  onSubmit,
  roles = [],
  initial,
  mode = "create",
  language = "fr"
}) {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = translations[language] || translations.fr;

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    roleId: roles[0]?.id || ""
  });

  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (initial) {
      setForm((s) => ({
        ...s,
        name: initial.name || "",
        email: initial.email || "",
        phone: initial.phone || "",
        // When editing, role change is done in Permissions dialog
        roleId: mode === "create" ? roles[0]?.id || "" : initial.roleId || ""
      }));
    } else {
      setForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        roleId: roles[0]?.id || ""
      });
    }
  }, [initial, open, roles, mode]);

  const handle = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      setToast({ severity: "error", msg: t.errorLoading });
      return;
    }
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      ...(mode === "create"
        ? {
            password: form.password || "ChangeMe#123",
            roleId: Number(form.roleId) || form.roleId
          }
        : {})
    };
    onSubmit(payload);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        dir={language === "ar" ? "rtl" : "ltr"}
      >
        <DialogTitle
          sx={{
            backgroundColor:
              theme.palette.mode === "light" ? "#0d47a1" : "#4274c7",
            color: "#fff",
            fontWeight: "bold"
          }}
        >
          {mode === "create" ? t.createUser : t.editUser}
        </DialogTitle>

        <form onSubmit={submit}>
          <DialogContent dividers>
            <Stack spacing={2}>
              <TextField
                placeholder={t.name}
                name="name"
                value={form.name}
                onChange={handle}
                required
              />
              <TextField
                placeholder={t.email}
                name="email"
                value={form.email}
                onChange={handle}
                type="email"
                required
              />
              <TextField
                placeholder={t.phone}
                name="phone"
                value={form.phone}
                onChange={handle}
                required
              />
              {mode === "create" && (
                <>
                  <TextField
                    placeholder={t.password}
                    name="password"
                    value={form.password}
                    onChange={handle}
                    type="password"
                  />
                  <TextField
                    select
                    label={t.role}
                    name="roleId"
                    value={form.roleId ?? ""}
                    onChange={handle}
                    required
                    helperText={t.roleHelper}
                  >
                    {roles.map((r) => (
                      <MenuItem key={r.id} value={r.id}>
                        {r.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </>
              )}
            </Stack>
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
                  color: "#fff"
                },
                gap: "8px"
              }}
              startIcon={<CloseIcon />}
            >
              {t.cancel}
            </Button>
            <Button
              variant="contained"
              type="submit"
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
                      : colors.blueAccent[800]
                }
              }}
              startIcon={mode === "create" ? <SaveIcon /> : <UpdateIcon />}
            >
              {mode === "create" ? t.create : t.save}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast && <Alert severity={toast.severity}>{toast.msg}</Alert>}
      </Snackbar>
    </>
  );
}
