// src/scenes/users/PermissionsDialog.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Checkbox,
  Grid,
  Stack,
  MenuItem,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import { tokens } from "../../../theme";

import {
  getPermissionsSnapshot,
  listPermissionCodes,
  savePermissions,
} from "../../../api/usersApi";

import translations from "../../../translations/index";

export default function PermissionsDialog({
  open,
  onClose,
  user,
  roles,
  language = "fr", // default fallback
}) {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const t = translations[language] || translations["fr"];

  const [codes, setCodes] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [checked, setChecked] = useState({});
  const [roleId, setRoleId] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [allCodes, snap] = await Promise.all([
        listPermissionCodes("MENU"),
        getPermissionsSnapshot(user.id, true),
      ]);
      setCodes(allCodes || []);
      setSnapshot(snap);
      setRoleId(snap?.roleId ?? "");
      const set = {};
      (snap?.effective || []).forEach((c) => {
        set[c] = true;
      });
      setChecked(set);
    })();
  }, [open, user?.id]);

  const onToggle = (code) => setChecked((s) => ({ ...s, [code]: !s[code] }));

  const menuSelections = useMemo(
    () => codes.map((code) => ({ code, checked: !!checked[code] })),
    [codes, checked]
  );

  const submit = async () => {
    await savePermissions(user.id, {
      roleId: Number(roleId) || roleId,
      menuSelections,
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      dir={language === "ar" ? "rtl" : "ltr"} // 👈 support RTL for Arabic
    >
      <DialogTitle
        sx={{
          backgroundColor:
            theme.palette.mode === "light" ? "#0d47a1" : "#4274c7",
          color: "#fff",
          fontWeight: "bold",
        }}
      >
        {t.permissionsTitle} · {user?.name || user?.email}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            select
            label={t.role}
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            helperText={t.roleHelper}
            size="small"
          >
            {roles.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.name}
              </MenuItem>
            ))}
          </TextField>

          <Typography variant="subtitle2" color="text.secondary">
            {t.menuVisibility}
          </Typography>

          <Grid container spacing={1}>
            {codes.map((code) => (
              <Grid item xs={12} sm={6} md={4} key={code}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!checked[code]}
                      onChange={() => onToggle(code)}
                      sx={{
                        "&.Mui-checked": {
                          color:
                            theme.palette.mode === "light"
                              ? colors.blueAccent[800]
                              : colors.blueAccent[400],
                        },
                      }}
                    />
                  }
                    label={t.permissions[code.replace("MENU:", "")] || code.replace("MENU:", "").replaceAll("_", " ").toLowerCase()}

                />
              </Grid>
            ))}
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions sx={{
            gap: 2, // ✅ space between buttons (theme.spacing(2) ≈ 16px)
        }}>
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
            gap: "8px",
          }}
          startIcon={<CloseIcon />}
        >
          {t.cancel}
        </Button>
        <Button
          variant="contained"
          onClick={submit}
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
          startIcon={<SaveIcon />}
        >
          {t.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
