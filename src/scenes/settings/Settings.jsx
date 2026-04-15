import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Slider,
  Switch,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import PaletteIcon from "@mui/icons-material/Palette";
import ImageIcon from "@mui/icons-material/Image";
import EditIcon from "@mui/icons-material/Edit";
import Header from "../../components/Header";
import { getMySchool, updateMySchool } from "../../api/schoolsApi";
import { useAuth } from "../../auth/AuthContext";
import { tokens } from "../../theme";
import { getTranslations } from "../../translations";

const PRESETS = {
  CLASSIC: {
    cardPrimaryColor: "#133C86",
    cardHeaderBg: "#EAEFFC",
    cardTextColor: "#1A2233",
    cardQrFrameColor: "#E5E7EB",
  },
  PREMIUM: {
    cardPrimaryColor: "#0F172A",
    cardHeaderBg: "#DBEAFE",
    cardTextColor: "#0B1A36",
    cardQrFrameColor: "#C7D2FE",
  },
  MODERN: {
    cardPrimaryColor: "#1D4ED8",
    cardHeaderBg: "#E0F2FE",
    cardTextColor: "#0F172A",
    cardQrFrameColor: "#BFDBFE",
  },
  DARK: {
    cardPrimaryColor: "#111827",
    cardHeaderBg: "#1F2937",
    cardTextColor: "#F3F4F6",
    cardQrFrameColor: "#374151",
  },
};

const asHex = (v, fallback) => {
  const s = String(v || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s : fallback;
};

const isDarkHex = (hex) => {
  const value = asHex(hex, "#000000").slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.5;
};

const Settings = ({ language }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = getTranslations(language);
  const { user, updateUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [logoInputKey, setLogoInputKey] = useState(0);
  const [form, setForm] = useState({
    name: "",
    logoUrl: "",
    cardTemplateKey: "CLASSIC",
    cardPrimaryColor: PRESETS.CLASSIC.cardPrimaryColor,
    cardHeaderBg: PRESETS.CLASSIC.cardHeaderBg,
    cardTextColor: PRESETS.CLASSIC.cardTextColor,
    cardQrFrameColor: PRESETS.CLASSIC.cardQrFrameColor,
    cardShowSchoolName: true,
    cardShowLogo: true,
    cardShowLevelSection: true,
    cardNameFontScale: 1.0,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const school = await getMySchool();
        const preset = PRESETS[school.cardTemplateKey] || PRESETS.CLASSIC;
        setForm({
          name: school.name || user?.schoolName || "",
          logoUrl: school.logoUrl || user?.schoolLogoUrl || "",
          cardTemplateKey: school.cardTemplateKey || "CLASSIC",
          cardPrimaryColor: asHex(school.cardPrimaryColor, preset.cardPrimaryColor),
          cardHeaderBg: asHex(school.cardHeaderBg, preset.cardHeaderBg),
          cardTextColor: asHex(school.cardTextColor, preset.cardTextColor),
          cardQrFrameColor: asHex(school.cardQrFrameColor, preset.cardQrFrameColor),
          cardShowSchoolName: school.cardShowSchoolName ?? true,
          cardShowLogo: school.cardShowLogo ?? true,
          cardShowLevelSection: school.cardShowLevelSection ?? true,
          cardNameFontScale: school.cardNameFontScale ?? 1.0,
        });
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to load school settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.schoolId]);

  const applyPreset = (templateKey) => {
    const preset = PRESETS[templateKey] || PRESETS.CLASSIC;
    setForm((prev) => ({
      ...prev,
      cardTemplateKey: templateKey,
      cardPrimaryColor: preset.cardPrimaryColor,
      cardHeaderBg: preset.cardHeaderBg,
      cardTextColor: preset.cardTextColor,
      cardQrFrameColor: preset.cardQrFrameColor,
    }));
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = String(reader.result || "");
      setForm((prev) => ({ ...prev, logoUrl: base64 }));
      try {
        localStorage.setItem("userLogo", base64);
      } catch {
        // ignore localStorage restrictions
      }
    };
    reader.readAsDataURL(file);
    setLogoInputKey((k) => k + 1);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setOk("");
    try {
      const payload = {
        name: form.name.trim(),
        logoUrl: form.logoUrl || null,
        cardTemplateKey: form.cardTemplateKey,
        cardPrimaryColor: asHex(form.cardPrimaryColor, PRESETS.CLASSIC.cardPrimaryColor),
        cardHeaderBg: asHex(form.cardHeaderBg, PRESETS.CLASSIC.cardHeaderBg),
        cardTextColor: asHex(form.cardTextColor, PRESETS.CLASSIC.cardTextColor),
        cardQrFrameColor: asHex(form.cardQrFrameColor, PRESETS.CLASSIC.cardQrFrameColor),
        cardShowSchoolName: !!form.cardShowSchoolName,
        cardShowLogo: !!form.cardShowLogo,
        cardShowLevelSection: !!form.cardShowLevelSection,
        cardNameFontScale: Number(form.cardNameFontScale || 1.0),
      };
      const updated = await updateMySchool(payload);
      updateUser({
        schoolName: updated.name,
        schoolLogoUrl: updated.logoUrl,
        cardTemplateKey: updated.cardTemplateKey,
        cardPrimaryColor: updated.cardPrimaryColor,
        cardHeaderBg: updated.cardHeaderBg,
        cardTextColor: updated.cardTextColor,
        cardQrFrameColor: updated.cardQrFrameColor,
        cardShowSchoolName: updated.cardShowSchoolName,
        cardShowLogo: updated.cardShowLogo,
        cardShowLevelSection: updated.cardShowLevelSection,
        cardNameFontScale: updated.cardNameFontScale,
      });
      setOk(t.cardDesignSaved || "Card design saved for this school.");
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || t.cardDesignSaveFailed || "Failed to save card design.");
    } finally {
      setSaving(false);
    }
  };

  const previewNameSize = useMemo(() => 21 * Number(form.cardNameFontScale || 1), [form.cardNameFontScale]);
  const showInlineLogo = Boolean(form.logoUrl && String(form.logoUrl).startsWith("data:image"));
  const previewBodyBg = form.cardTemplateKey === "DARK" ? "#0F172A" : "#FFFFFF";
  const previewBodyText = form.cardTemplateKey === "DARK" ? "#E5E7EB" : form.cardTextColor;
  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      backgroundColor: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.04 : 0.9),
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: `${theme.palette.mode === "dark" ? "#bfdbfe" : "#1e3a8a"} !important`,
      },
      "&:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: `${theme.palette.mode === "dark" ? "#dbeafe" : "#1d4ed8"} !important`,
      },
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderColor: `${theme.palette.mode === "dark" ? "#93c5fd" : "#1d4ed8"} !important`,
        borderWidth: "2px",
      },
    },
    "& .MuiFormLabel-root": {
      color: `${theme.palette.mode === "dark" ? "#e2e8f0" : "#0f172a"} !important`,
      fontWeight: 600,
    },
    "& .MuiFormLabel-root.Mui-focused": {
      color: `${theme.palette.mode === "dark" ? "#dbeafe" : "#1d4ed8"} !important`,
    },
    "& .MuiInputAdornment-root": {
      color: `${theme.palette.mode === "dark" ? "#cbd5e1" : "#334155"} !important`,
    },
    "& .MuiInputBase-input": {
      color: `${theme.palette.mode === "dark" ? "#f8fafc" : "#020617"} !important`,
      fontWeight: 600,
    },
    "& .MuiSelect-select": {
      color: `${theme.palette.mode === "dark" ? "#f8fafc" : "#020617"} !important`,
      fontWeight: 600,
    },
    "& .MuiSvgIcon-root": {
      color: `${theme.palette.mode === "dark" ? "#e2e8f0" : "#1e293b"} !important`,
    },
  };
  const colorFields = [
    { key: "cardPrimaryColor", label: t.primaryColor || "Primary color" },
    { key: "cardHeaderBg", label: t.headerColor || "Header color" },
    { key: "cardTextColor", label: t.textColor || "Text color" },
    { key: "cardQrFrameColor", label: t.qrFrameColor || "QR frame color" },
  ];

  if (loading) {
    return (
      <Box p="20px" display="flex" alignItems="center" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      p="20px"
      sx={{
        height: "calc(100dvh - 110px)",
        display: "flex",
        flexDirection: "column",
        overflow: { xs: "auto", sm: "hidden" },
      }}
    >
      <Header title={t.settings || "Settings"} subtitle={t.cardDesignerSubtitle || "School branding and student card design"} />

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2.5,
          alignItems: "stretch",
          overflow: { xs: "visible", md: "hidden" },
        }}
      >
        <Box sx={{ display: "flex", minWidth: 0, minHeight: 0 }}>
          <Paper
            sx={{
              p: { xs: 1.6, md: 2 },
              borderRadius: 3,
              border: `1px solid ${alpha(colors.blueAccent[400], 0.3)}`,
              width: "100%",
              height: "100%",
              overflowY: "visible",
              pr: { xs: 1.2, md: 1.8 },
            }}
          >
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <PaletteIcon sx={{ color: colors.blueAccent[400] }} />
              <Typography variant="h6" fontWeight={700}>{t.schoolBranding || "School Branding"}</Typography>
            </Box>
            <TextField
              fullWidth
              margin="normal"
              label={t.schoolName || "School name"}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              sx={fieldSx}
            />
            <Box mt={1.5} display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
              <Button variant="contained" component="label" startIcon={<ImageIcon />} sx={{ borderRadius: 2 }}>
                {t.uploadLogo || "Upload logo"}
                <input key={logoInputKey} hidden type="file" accept="image/*" onChange={handleLogoUpload} />
              </Button>
              {showInlineLogo ? <Chip size="small" color="success" label={t.imageUploaded || "Image uploaded"} /> : null}
            </Box>
            <TextField
              select
              fullWidth
              margin="normal"
              label={t.designPreset || "Design preset"}
              value={form.cardTemplateKey}
              onChange={(e) => applyPreset(e.target.value)}
              sx={fieldSx}
            >
              <MenuItem value="CLASSIC">Classic</MenuItem>
              <MenuItem value="PREMIUM">Premium</MenuItem>
              <MenuItem value="MODERN">Modern</MenuItem>
              <MenuItem value="DARK">Dark</MenuItem>
            </TextField>

            <Grid container spacing={1.5} mt={0.5}>
              {colorFields.map((field) => (
                <Grid item xs={12} sm={6} key={field.key}>
                  <Box
                    sx={{
                      p: 1.2,
                      borderRadius: 2,
                      border: `1px solid ${theme.palette.mode === "dark" ? "#334155" : "#cbd5e1"}`,
                      backgroundColor: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.02 : 0.65),
                    }}
                  >
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: theme.palette.mode === "dark" ? "#e2e8f0" : "#0f172a", mb: 0.8 }}>
                      {field.label}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1.2}>
                      <Box
                        component="input"
                        type="color"
                        value={form[field.key]}
                        onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}
                        sx={{
                          width: 42,
                          height: 42,
                          p: 0,
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                      />
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: theme.palette.mode === "dark" ? "#cbd5e1" : "#334155" }}>
                        {form[field.key]}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>

            <Box mt={2}>
              <Typography variant="body2" gutterBottom sx={{ color: theme.palette.mode === "dark" ? "#e2e8f0" : "#0f172a", fontWeight: 700 }}>
                {t.nameSize || "Name size"}
              </Typography>
              <Slider
                min={0.85}
                max={1.3}
                step={0.05}
                value={Number(form.cardNameFontScale || 1)}
                onChange={(_, v) => setForm((p) => ({ ...p, cardNameFontScale: Number(v) }))}
                valueLabelDisplay="auto"
                sx={{
                  color: theme.palette.mode === "dark" ? "#60a5fa" : "#1d4ed8",
                  "& .MuiSlider-rail": { opacity: 0.35 },
                  "& .MuiSlider-track": { border: "none" },
                  "& .MuiSlider-thumb": { boxShadow: "0 0 0 4px rgba(37,99,235,.25)" },
                }}
              />
            </Box>

            <Box mt={1} p={1.2} borderRadius={2} sx={{ background: alpha(colors.blueAccent[300], 0.08) }}>
              <FormControlLabel
                control={<Switch checked={!!form.cardShowSchoolName} onChange={(e) => setForm((p) => ({ ...p, cardShowSchoolName: e.target.checked }))} />}
                label={<Typography sx={{ color: `${theme.palette.mode === "dark" ? "#f8fafc" : "#0f172a"} !important`, fontWeight: 700 }}>{t.showSchoolName || "Show school name"}</Typography>}
                sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: theme.palette.mode === "dark" ? "#60a5fa" : "#1d4ed8" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: theme.palette.mode === "dark" ? "#60a5fa" : "#1d4ed8" } }}
              />
              <FormControlLabel
                control={<Switch checked={!!form.cardShowLogo} onChange={(e) => setForm((p) => ({ ...p, cardShowLogo: e.target.checked }))} />}
                label={<Typography sx={{ color: `${theme.palette.mode === "dark" ? "#f8fafc" : "#0f172a"} !important`, fontWeight: 700 }}>{t.showLogo || "Show logo"}</Typography>}
                sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: theme.palette.mode === "dark" ? "#60a5fa" : "#1d4ed8" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: theme.palette.mode === "dark" ? "#60a5fa" : "#1d4ed8" } }}
              />
              <FormControlLabel
                control={<Switch checked={!!form.cardShowLevelSection} onChange={(e) => setForm((p) => ({ ...p, cardShowLevelSection: e.target.checked }))} />}
                label={<Typography sx={{ color: `${theme.palette.mode === "dark" ? "#f8fafc" : "#0f172a"} !important`, fontWeight: 700 }}>{t.showLevelSectionLine || "Show level/section line"}</Typography>}
                sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: theme.palette.mode === "dark" ? "#60a5fa" : "#1d4ed8" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: theme.palette.mode === "dark" ? "#60a5fa" : "#1d4ed8" } }}
              />
            </Box>

            {error ? <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert> : null}
            {ok ? <Alert severity="success" sx={{ mt: 1.5 }}>{ok}</Alert> : null}

            <Box mt={2}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={saving}
                onClick={save}
                sx={{ borderRadius: 2, px: 2.2, backgroundColor: theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400], color: "#fff" }}
              >
                {saving ? (t.saving || "Saving...") : (t.saveDesign || "Save design")}
              </Button>
            </Box>
          </Paper>
        </Box>

        <Box sx={{ display: "flex", minWidth: 0, minHeight: 0 }}>
          <Paper
            sx={{
              p: { xs: 1.6, md: 2 },
              borderRadius: 3,
              border: `1px solid ${alpha(colors.blueAccent[400], 0.3)}`,
              width: "100%",
              height: "100%",
              overflowY: "visible",
            }}
          >
            <Typography variant="h6" mb={2}>{t.livePreview || "Live Preview"} (CR80)</Typography>
            <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
              <Box sx={{ width: "min(460px, 100%)", background: form.cardPrimaryColor, borderRadius: 2.2, p: { xs: 1.2, md: 1.6 } }}>
                <Box sx={{ background: previewBodyBg, borderRadius: 1.6, overflow: "hidden" }}>
                  <Box sx={{ background: form.cardHeaderBg, px: 1.7, py: 1.2, minHeight: 58, display: "flex", alignItems: "center", gap: 1.2, justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, minWidth: 0 }}>
                    {form.cardShowLogo && form.logoUrl ? (
                      <Box component="img" src={form.logoUrl} alt="logo" sx={{ width: 42, height: 42, objectFit: "contain", borderRadius: 1.2, background: "#fff", border: `1px solid ${form.cardQrFrameColor}`, p: 0.45 }} />
                    ) : null}
                    {form.cardShowSchoolName ? (
                      <Typography sx={{ fontWeight: 800, fontSize: 19, color: isDarkHex(form.cardHeaderBg) ? "#F8FAFC" : form.cardTextColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {form.name || (t.schoolName || "School name")}
                      </Typography>
                    ) : null}
                    </Box>
                    <Button
                      variant="contained"
                      component="label"
                      size="small"
                      startIcon={<EditIcon fontSize="small" />}
                      sx={{
                        minWidth: 0,
                        px: 1.1,
                        py: 0.5,
                        borderRadius: 2,
                        backgroundColor: isDarkHex(form.cardHeaderBg) ? "rgba(255,255,255,.2)" : "rgba(15,23,42,.12)",
                        color: isDarkHex(form.cardHeaderBg) ? "#F8FAFC" : "#0F172A",
                        "&:hover": {
                          backgroundColor: isDarkHex(form.cardHeaderBg) ? "rgba(255,255,255,.32)" : "rgba(15,23,42,.22)",
                        },
                      }}
                    >
                      {t.edit || "Edit"}
                      <input key={`preview-logo-${logoInputKey}`} hidden type="file" accept="image/*" onChange={handleLogoUpload} />
                    </Button>
                  </Box>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", p: 2.1, minHeight: 225, gap: 2 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 700, color: previewBodyText, fontSize: previewNameSize, lineHeight: 1.15 }}>
                        Aicha El Idrissi
                      </Typography>
                      {form.cardShowLevelSection ? (
                        <Typography sx={{ color: previewBodyText, opacity: 0.82, fontSize: 14, mt: 0.6 }}>
                          7e annÃ©e â€” section A
                        </Typography>
                      ) : null}
                    </Box>
                    <Box sx={{ border: `1px solid ${form.cardQrFrameColor}`, borderRadius: 1, p: 0.5, background: "#fff" }}>
                      <Box sx={{ width: 156, height: 156, background: "repeating-linear-gradient(90deg,#000 0,#000 6px,#fff 6px,#fff 12px)", borderRadius: 0.8, opacity: 0.9 }} />
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default Settings;

