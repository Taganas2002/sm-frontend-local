import { useMemo, useRef, useState, useEffect } from "react";
import {
  Box, Drawer, IconButton, Tooltip, Typography, Button, Menu, MenuItem,
  ListItemText, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  RadioGroup, FormControlLabel, Radio, Snackbar, Alert
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import AttendancePanel from "./AttendancePanel";

/**
 * props:
 * - open: boolean
 * - panels: [{ key, scheduleId, date, title, groupId }]
 * - candidates: array of "event-like" objects from Calendar (mapped events)
 * - onHide: () => void
 * - onCloseAll: () => void
 * - onClosePanel: (key) => void
 * - onAddPanel: (candidateEventObj) => void
 */

// --- helper: parse studentId from scanned string ---
const parseStudentIdFromScan = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\d+$/.test(s)) return Number(s);
  try {
    const o = JSON.parse(s);
    const cand = o?.studentId ?? o?.id ?? o?.sid;
    if (cand != null && /^\d+$/.test(String(cand))) return Number(cand);
  } catch {}
  const m = s.match(/(?:studentId|sid|id)\s*[:=]\s*(\d+)/i);
  if (m) return Number(m[1]);
  return null;
};

const GLOBAL_SCAN_LS_KEY = "att:globalScannerOn";

export default function AttendanceDock({
  open, panels, candidates = [],
  onHide, onCloseAll, onClosePanel, onAddPanel,
}) {
  const [anchorEl, setAnchorEl] = useState(null);

  // Which sessions are already opened (for the Add menu)
  const openKeys = useMemo(() => new Set(panels.map(p => `${p.scheduleId}|${p.date}`)), [panels]);
  const selectable = useMemo(
    () => (candidates || []).filter(ev => !openKeys.has(`${ev.id}|${ev.extendedProps?.date}`)),
    [candidates, openKeys]
  );

  const columns = Math.min(Math.max(panels.length, 1), 3); // 1..3

  // =========================
  // Global Scanner state (PERSISTED)
  // =========================
  const [globalScannerOn, setGlobalScannerOn] = useState(false);
  const scanInputRef = useRef(null);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "info" });

  // Load persisted toggle
  useEffect(() => {
    const saved = localStorage.getItem(GLOBAL_SCAN_LS_KEY);
    setGlobalScannerOn(saved === "1");
  }, []);
  // Persist on change
  useEffect(() => {
    localStorage.setItem(GLOBAL_SCAN_LS_KEY, globalScannerOn ? "1" : "0");
  }, [globalScannerOn]);

  // Registry of open panels: key -> { title, date, getIds, getName, mark }
  const [registry, setRegistry] = useState({});
  const registerPanel = (panelKey, api) => {
    setRegistry(prev => ({ ...prev, [panelKey]: api }));
  };
  const unregisterPanel = (panelKey) => {
    setRegistry(prev => {
      const n = { ...prev };
      delete n[panelKey];
      return n;
    });
  };

  // Keep the hidden input focused while global scanner is ON
  useEffect(() => {
    if (globalScannerOn && scanInputRef.current) {
      const keepFocus = () => scanInputRef.current?.focus();
      scanInputRef.current.focus();
      scanInputRef.current.addEventListener("blur", keepFocus);
      return () => scanInputRef.current?.removeEventListener("blur", keepFocus);
    }
  }, [globalScannerOn]);

  // =========================
  // Conflict dialog (shows NAME)
  // =========================
  const [conflict, setConflict] = useState(null);
  // conflict = { studentId, studentName, matches:[{panelKey,title}], value: panelKey|null }

  const handleScanString = (raw) => {
    const id = parseStudentIdFromScan(raw);
    if (!id) {
      setSnack({ open: true, msg: `Scan not recognized: "${raw}"`, severity: "warning" });
      return;
    }

    const matches = [];
    let nameFromFirstMatch = null;

    for (const [panelKey, api] of Object.entries(registry)) {
      try {
        const ids = api.getStudentIds();
        if (ids?.includes(Number(id))) {
          matches.push({ panelKey, title: api.title });
          if (!nameFromFirstMatch) {
            nameFromFirstMatch = api.getStudentName(Number(id)) || null;
          }
        }
      } catch {}
    }

    if (matches.length === 0) {
      setSnack({ open: true, msg: `Student #${id} not found in open panels`, severity: "error" });
      return;
    }

    if (matches.length === 1) {
      const { panelKey } = matches[0];
      registry[panelKey]?.mark(id, true);
      const nm = nameFromFirstMatch ? `${nameFromFirstMatch} (#${id})` : `#${id}`;
      setSnack({ open: true, msg: `Marked PRESENT in "${registry[panelKey]?.title}": ${nm}`, severity: "success" });
      return;
    }

    setConflict({
      studentId: id,
      studentName: nameFromFirstMatch,
      matches,
      value: matches[0].panelKey
    });
  };

  const applyConflictChoice = () => {
    if (!conflict?.value) return;
    const panelKey = conflict.value;
    registry[panelKey]?.mark(conflict.studentId, true);
    const nm = conflict.studentName ? `${conflict.studentName} (#${conflict.studentId})` : `#${conflict.studentId}`;
    setSnack({ open: true, msg: `Marked PRESENT in "${registry[panelKey]?.title}": ${nm}`, severity: "success" });
    setConflict(null);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      variant="persistent"
      PaperProps={{ sx: { width: "min(1200px, 76vw)", p: 2, bgcolor: "background.default" } }}
    >
      {/* Hidden global scanner input */}
      <input
        ref={scanInputRef}
        type="text"
        autoComplete="off"
        style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }}
        onKeyDown={(e) => {
          if (!globalScannerOn) return;
          if (e.key === "Enter") {
            e.preventDefault();
            const raw = scanInputRef.current?.value ?? "";
            scanInputRef.current.value = "";
            handleScanString(raw);
          }
        }}
      />

      <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6" fontWeight={800}>Attendance</Typography>
          <Chip size="small" label={`${panels.length} open`} />
          {globalScannerOn && <Chip size="small" color="primary" variant="outlined" label="Scanner: ON (global)" />}
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          {/* Global scanner toggle — prettier & always visible */}
          <Tooltip title={globalScannerOn ? "Turn global scanner OFF" : "Turn global scanner ON"}>
            <IconButton
              onClick={() => setGlobalScannerOn(v => !v)}
              sx={{
                border: 1,
                borderColor: globalScannerOn ? "primary.main" : "action.disabled",
                bgcolor: globalScannerOn ? "primary.main" : "transparent",
                color: globalScannerOn ? "primary.contrastText" : "text.secondary",
                "&:hover": {
                  bgcolor: globalScannerOn ? "primary.dark" : "action.hover"
                }
              }}
            >
              <QrCodeScannerIcon />
            </IconButton>
          </Tooltip>

          {/* Add panel */}
          <Tooltip title="Add panel from this week">
            <span>
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} disabled={selectable.length === 0}>
                <AddIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            keepMounted
          >
            {selectable.length === 0 && <MenuItem disabled>No sessions in view</MenuItem>}
            {selectable.map(ev => (
              <MenuItem
                key={`${ev.id}|${ev.extendedProps?.date}`}
                onClick={() => { onAddPanel(ev); setAnchorEl(null); }}
              >
                <ListItemText
                  primary={ev.title}
                  secondary={`${ev.extendedProps?.date} • ${ev.extendedProps?.startTime ?? ""}–${ev.extendedProps?.endTime ?? ""}`}
                />
              </MenuItem>
            ))}
          </Menu>

          {/* Close all panels */}
          <Tooltip title="Close all panels">
            <IconButton onClick={onCloseAll}><ClearAllIcon /></IconButton>
          </Tooltip>

          {/* Hide dock (keep panels) */}
          <Tooltip title="Hide dock">
            <IconButton onClick={onHide}><VisibilityOffIcon /></IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(340px, 1fr))`,
          gap: 2,
          height: "calc(100% - 48px)",
          overflow: "auto",
          pr: 1,
        }}
      >
        {panels.map(p => (
          <AttendancePanel
            key={p.key}
            panelKey={p.key}
            scheduleId={p.scheduleId}
            date={p.date}
            title={p.title}
            groupId={p.groupId}
            forcedScannerOn={globalScannerOn}
            onRegister={registerPanel}
            onUnregister={unregisterPanel}
            onClose={() => onClosePanel(p.key)}
          />
        ))}
      </Box>

      {/* Conflict chooser (shows NAME) */}
      <Dialog open={!!conflict} onClose={() => setConflict(null)}>
        <DialogTitle>Student appears in multiple panels</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ mb: 1 }}>
            Choose the group to mark for{" "}
            <strong>{conflict?.studentName ? conflict.studentName : `student #${conflict?.studentId}`}</strong>:
          </Typography>
          <RadioGroup
            value={conflict?.value || ""}
            onChange={(e) => setConflict(c => ({ ...c, value: e.target.value }))}
          >
            {(conflict?.matches || []).map(m => (
              <FormControlLabel
                key={m.panelKey}
                value={m.panelKey}
                control={<Radio />}
                label={m.title}
              />
            ))}
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConflict(null)}>Cancel</Button>
          <Button variant="contained" onClick={applyConflictChoice} disabled={!conflict?.value}>
            Mark Present
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Drawer>
  );
}
