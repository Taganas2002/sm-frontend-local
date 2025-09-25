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
  Chip,
  useTheme,
  Snackbar,
  Alert
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import { tokens } from "../../../theme";
import {
  getPermissionsSnapshot,
  listPermissionCodes,
  savePermissions
} from "../../../api/usersApi";
import translations, { labelForMenu } from "../../../translations";

export default function PermissionsDialog({
  open,
  onClose,
  user,
  roles,
  language = "fr"
}) {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = translations[language] || translations.fr;

  // data
  const [codes, setCodes] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [roleId, setRoleId] = useState("");
  const [loading, setLoading] = useState(false);

  // UI state for each code:
  // - baseline: boolean (from role)
  // - override: "ALLOW" | "DENY" | null
  // - checked: boolean (visual)
  const [state, setState] = useState({}); // { code: { baseline, override, checked } }

  // toasts
  const [toast, setToast] = useState(null);

  const setCode = (code, patch) =>
    setState((s) => ({ ...s, [code]: { ...(s[code] || {}), ...patch } }));

  useEffect(() => {
    if (!open || !user?.id) return;
    (async () => {
      try {
        setLoading(true);
        const [allCodes, snap] = await Promise.all([
          listPermissionCodes("MENU"),
          getPermissionsSnapshot(user.id, true)
        ]);
        setCodes(allCodes || []);
        setSnapshot(snap);
        setRoleId(snap?.roleId ?? "");

        const base = new Set(snap?.baseline || []);
        const overrides = {};
        (snap?.overrides || []).forEach((o) => (overrides[o.code] = o.effect));

        const mapped = {};
        (allCodes || []).forEach((code) => {
          const baseline = base.has(code);
          const override = overrides[code] || null;
          let checked = baseline; // default to baseline visibility
          if (override === "ALLOW") checked = true;
          if (override === "DENY") checked = false;
          mapped[code] = { baseline, override, checked };
        });
        setState(mapped);
      } catch {
        setToast({ severity: "error", msg: t.errorLoading });
      } finally {
        setLoading(false);
      }
    })();
  }, [open, user?.id]);

  const onToggle = (code) => {
    setState((s) => {
      const cur = s[code] || { baseline: false, override: null, checked: false };
      // If baseline and no override -> toggle should create DENY (unchecked)
      // If baseline and was DENY -> toggle back to baseline (remove override) -> checked true
      // If not baseline and no override -> toggle should create ALLOW (checked)
      // If not baseline and was ALLOW -> toggle back to no override (unchecked)
      let { baseline, override, checked } = cur;

      if (baseline) {
        if (!override) {
          // baseline only -> create DENY
          override = "DENY";
          checked = false;
        } else if (override === "DENY") {
          // remove override -> back to baseline (checked)
          override = null;
          checked = true;
        } else if (override === "ALLOW") {
          // shouldn't normally happen (ALLOW on baseline not needed) -> remove override
          override = null;
          checked = true;
        }
      } else {
        if (!override) {
          // no baseline -> create ALLOW
          override = "ALLOW";
          checked = true;
        } else if (override === "ALLOW") {
          // remove override -> unchecked
          override = null;
          checked = false;
        } else if (override === "DENY") {
          // deny on non-baseline is also redundant; remove -> unchecked
          override = null;
          checked = false;
        }
      }
      return { ...s, [code]: { baseline, override, checked } };
    });
  };

  const menuSelections = useMemo(
    () =>
      codes.map((code) => ({
        code,
        checked: !!state[code]?.checked
      })),
    [codes, state]
  );

  const submit = async () => {
    try {
      setLoading(true);
      await savePermissions(user.id, {
        roleId: roleId ? Number(roleId) : null,
        menuSelections
      });
      setToast({ severity: "success", msg: t.saved });
      onClose();
    } catch {
      setToast({ severity: "error", msg: t.failedSave });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
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
              {codes.map((code) => {
                const s = state[code] || {};
                const label = labelForMenu(code, t);
                const showChip = s.override || s.baseline;
                let chipColor = "default";
                let chipLabel = t.baseline;
                if (s.override === "ALLOW") {
                  chipColor = "success";
                  chipLabel = t.allow;
                } else if (s.override === "DENY") {
                  chipColor = "error";
                  chipLabel = t.deny;
                }

                return (
                  <Grid item xs={12} sm={6} md={4} key={code}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={!!s.checked}
                            indeterminate={s.baseline && !s.override}
                            onChange={() => onToggle(code)}
                            disabled={loading}
                            sx={{
                              "&.Mui-checked": {
                                color:
                                  theme.palette.mode === "light"
                                    ? colors.blueAccent[800]
                                    : colors.blueAccent[400]
                              }
                            }}
                          />
                        }
                        label={label}
                      />
                      {showChip && (
                        <Chip
                          size="small"
                          color={chipColor}
                          label={chipLabel}
                          sx={{ ml: language === "ar" ? 0 : 1, mr: language === "ar" ? 1 : 0 }}
                        />
                      )}
                    </Stack>
                  </Grid>
                );
              })}
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ gap: 2 }}>
          <Button
            onClick={onClose}
            variant="outlined"
            disabled={loading}
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
            onClick={submit}
            disabled={loading}
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
            startIcon={<SaveIcon />}
          >
            {loading ? t.loading : t.save}
          </Button>
        </DialogActions>
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
