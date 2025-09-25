import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Card, CardHeader, CardContent, IconButton, TextField,
  FormGroup, FormControlLabel, Checkbox, Chip, Tooltip, Snackbar, Alert
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import BackspaceIcon from "@mui/icons-material/Backspace";
import SearchIcon from "@mui/icons-material/Search";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";

import {
  startAttendanceSession,
  markStudentAttendance,
  getSessionSummary,
} from "../../../api/attendanceApi";
import { listEnrollments } from "../../../api/enrollmentsApi";
import { searchStudents } from "../../../api/studentsApi";

const SESSIONS_LS_KEY = "att:scheduleToSession";
const PENDING_LS_KEY  = "att:pendingPresents";

const safeRead = (k) => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } };
const safeWrite = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const readSessionMap  = () => safeRead(SESSIONS_LS_KEY);
const writeSessionMap = (m) => safeWrite(SESSIONS_LS_KEY, m);
const readPendingMap  = () => safeRead(PENDING_LS_KEY);
const writePendingMap = (m) => safeWrite(PENDING_LS_KEY, m);
const keyFor = (scheduleId, date) => `${scheduleId}|${date}`;

export default function AttendancePanel({
  panelKey, scheduleId, date, title, groupId,
  forcedScannerOn = false,
  onRegister, onUnregister,
  onClose,
}) {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);      // {id,name,present}
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState(null);        // null | "OPEN"
  const [q, setQ] = useState("");

  // Optional per-panel scanner (works only when global is OFF)
  const [scannerOn, setScannerOn] = useState(false);
  const scanInputRef = useRef(null);

  const [snack, setSnack] = useState({ open: false, msg: "", severity: "info" });

  const presentCount = useMemo(() => students.filter(s => s.present).length, [students]);

  // ----- initial load: roster + hydrate -----
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const enr = await listEnrollments({ groupId, status: "ACTIVE" });
        const ids = (enr.content || enr || []).map(e => e.studentId);

        const namesRes = await searchStudents({ ids });
        const nameMap = {};
        (namesRes.content || namesRes || []).forEach(s => { nameMap[s.id] = s.fullName; });

        const base = ids.map(id => ({ id, name: nameMap[id] || `Student ${id}`, present: false }));
        if (!mounted) return;
        setStudents(base);

        const sm = readSessionMap();
        const savedSessionId = sm[keyFor(scheduleId, date)];

        if (savedSessionId) {
          try {
            const summary = await getSessionSummary(savedSessionId);
            if (!mounted) return;
            setSessionId(summary.sessionId);
            setStatus(summary.status);
            const pids = summary.presentStudentIds || [];
            setStudents(prev => prev.map(s => ({ ...s, present: pids.includes(s.id) })));

            const pm = readPendingMap();
            if (pm[keyFor(scheduleId, date)]) {
              delete pm[keyFor(scheduleId, date)];
              writePendingMap(pm);
            }
          } catch {
            delete sm[keyFor(scheduleId, date)];
            writeSessionMap(sm);
          }
        } else {
          const pm = readPendingMap();
          const pendingIds = new Set(pm[keyFor(scheduleId, date)] || []);
          if (pendingIds.size > 0) {
            setStudents(prev => prev.map(s => ({ ...s, present: pendingIds.has(s.id) })));
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [scheduleId, date, groupId]);

  // ----- expose registration to the dock (also provide name lookup) -----
  useEffect(() => {
    if (!onRegister) return;

    const api = {
      title,
      date,
      getStudentIds: () => students.map(s => s.id),
      getStudentName: (id) => students.find(s => s.id === id)?.name,
      mark: (studentId, present) => toggleOne(studentId, present),
    };
    onRegister(panelKey, api);
    return () => onUnregister?.(panelKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelKey, title, date, students]); // re-register when roster changes

  // ----- helpers to persist pending state -----
  const savePendingFromState = (nextStudents) => {
    const pm = readPendingMap();
    pm[keyFor(scheduleId, date)] = nextStudents.filter(s => s.present).map(s => s.id);
    writePendingMap(pm);
  };

  // ----- START -----
  const handleStart = async () => {
    if (status === "OPEN") return;
    setLoading(true);
    try {
      const s = await startAttendanceSession(scheduleId, date);
      setSessionId(s.sessionId);
      setStatus(s.status);

      const sm = readSessionMap();
      sm[keyFor(scheduleId, date)] = s.sessionId;
      writeSessionMap(sm);

      const toPresent = students.filter(x => x.present).map(x => x.id);
      for (const sid of toPresent) {
        try { await markStudentAttendance(s.sessionId, sid, true); } catch {}
      }

      try {
        const summary = await getSessionSummary(s.sessionId);
        const pids = new Set(summary.presentStudentIds || []);
        setStudents(prev => prev.map(st => ({ ...st, present: pids.has(st.id) })));
      } catch {}

      const pm = readPendingMap();
      delete pm[keyFor(scheduleId, date)];
      writePendingMap(pm);
    } finally {
      setLoading(false);
    }
  };

  // ----- TOGGLE -----
  const toggleOne = async (studentId, checked) => {
    setStudents(prev => prev.map(s => (s.id === studentId ? { ...s, present: checked } : s)));

    if (status === "OPEN" && sessionId) {
      try {
        const res = await markStudentAttendance(sessionId, studentId, checked);
        const pids = new Set(res.presentStudentIds || []);
        setStudents(prev => prev.map(st => ({ ...st, present: pids.has(st.id) })));
      } catch {
        setStudents(prev => prev.map(s => (s.id === studentId ? { ...s, present: !checked } : s)));
        setSnack({ open: true, msg: "Update failed", severity: "error" });
      }
    } else {
      setStudents(prev => {
        const next = prev.map(s => (s.id === studentId ? { ...s, present: checked } : s));
        savePendingFromState(next);
        return next;
      });
    }
  };

  // ----- MARK ALL -----
  const markAll = async (present) => {
    if (status === "OPEN" && sessionId) {
      setStudents(prev => prev.map(s => ({ ...s, present })));
      for (const st of students) {
        try { await markStudentAttendance(sessionId, st.id, present); } catch {}
      }
      try {
        const sum = await getSessionSummary(sessionId);
        const pids = new Set(sum.presentStudentIds || []);
        setStudents(prev => prev.map(st => ({ ...st, present: pids.has(st.id) })));
      } catch {}
    } else {
      setStudents(prev => {
        const next = prev.map(s => ({ ...s, present }));
        savePendingFromState(next);
        return next;
      });
    }
  };

  // ----- search filter -----
  const filtered = useMemo(
    () => (q ? students.filter(s => s.name.toLowerCase().includes(q.toLowerCase())) : students),
    [students, q]
  );

  // ----- shortcuts -----
  const inputRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() === "s") handleStart();
      if (e.key.toLowerCase() === "a") markAll(true);
      if (e.key.toLowerCase() === "c") markAll(false);
      if (e.key === "/" && inputRef.current) { e.preventDefault(); inputRef.current.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, status, students]);

  // per-panel scanner input (active only when global OFF and local ON)
  useEffect(() => {
    if (forcedScannerOn) return; // global owns scanning
    if (scannerOn && scanInputRef.current) {
      const keepFocus = () => scanInputRef.current?.focus();
      scanInputRef.current.focus();
      scanInputRef.current.addEventListener("blur", keepFocus);
      return () => scanInputRef.current?.removeEventListener("blur", keepFocus);
    }
  }, [scannerOn, forcedScannerOn]);

  const handleLocalScanSubmit = () => {
    const raw = scanInputRef.current?.value ?? "";
    scanInputRef.current.value = "";
    let id = null;
    if (/^\d+$/.test(raw.trim())) id = Number(raw.trim());
    else {
      try { const o = JSON.parse(raw); id = o?.studentId ?? o?.id ?? o?.sid ?? null; } catch {}
    }
    if (!id) {
      setSnack({ open: true, msg: `Scan not recognized: "${raw}"`, severity: "warning" });
      return;
    }
    if (!students.some(s => s.id === Number(id))) {
      setSnack({ open: true, msg: `Student #${id} not in this panel`, severity: "error" });
      return;
    }
    toggleOne(Number(id), true);
    setSnack({ open: true, msg: `Marked PRESENT: #${id}`, severity: "success" });
  };

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column", borderRadius: 3, boxShadow: 3 }}>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <span style={{ fontWeight: 700 }}>{title}</span>
            {status === "OPEN"
              ? <Chip size="small" label="LIVE" color="success" />
              : <Chip size="small" label="Pending" color="warning" />}
            <Chip size="small" label={`${presentCount}/${students.length}`} />
            {forcedScannerOn && <Chip size="small" label="Scanner: ON (global)" color="primary" variant="outlined" />}
            {!forcedScannerOn && scannerOn && <Chip size="small" label="Scanner: ON" color="primary" variant="outlined" />}
          </Box>
        }
        action={
          <Box display="flex" alignItems="center" gap={1}>
            {/* Local scanner toggle (disabled if global is ON) */}
            <Tooltip title={forcedScannerOn ? "Global scanner active" : (scannerOn ? "Turn panel scanner OFF" : "Turn panel scanner ON")}>
              <span>
                <IconButton
                  onClick={() => setScannerOn(v => !v)}
                  disabled={forcedScannerOn}
                  sx={{
                    border: 1,
                    borderColor: forcedScannerOn ? "action.disabled" : (scannerOn ? "primary.main" : "action.disabled"),
                    bgcolor: scannerOn && !forcedScannerOn ? "primary.main" : "transparent",
                    color: scannerOn && !forcedScannerOn ? "primary.contrastText" : "text.secondary",
                    "&:hover": {
                      bgcolor: scannerOn && !forcedScannerOn ? "primary.dark" : "action.hover"
                    }
                  }}
                >
                  <QrCodeScannerIcon />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Start (S)">
              <span>
                <IconButton onClick={handleStart} disabled={loading || status === "OPEN"}>
                  <PlayArrowIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Mark all present (A)">
              <span>
                <IconButton onClick={() => markAll(true)} disabled={loading}>
                  <DoneAllIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Clear all (C)">
              <span>
                <IconButton onClick={() => markAll(false)} disabled={loading}>
                  <BackspaceIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Close panel">
              <IconButton onClick={onClose}><CloseIcon /></IconButton>
            </Tooltip>
          </Box>
        }
      />
      <CardContent sx={{ pt: 0, display: "flex", flexDirection: "column", gap: 1, overflow: "auto" }}>
        {/* Local hidden scanner input (only when global is OFF and local is ON) */}
        {!forcedScannerOn && (
          <input
            ref={scanInputRef}
            type="text"
            autoComplete="off"
            style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }}
            onKeyDown={(e) => {
              if (!scannerOn) return;
              if (e.key === "Enter") {
                e.preventDefault();
                handleLocalScanSubmit();
              }
            }}
          />
        )}

        <Box display="flex" alignItems="center" gap={1}>
          <SearchIcon fontSize="small" />
          <TextField
            size="small"
            fullWidth
            inputRef={inputRef}
            placeholder={
              forcedScannerOn
                ? "Scanner ON (global) — you can still search here"
                : scannerOn
                ? "Scanner ON — you can still search here"
                : "Search student..."
            }
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </Box>

        <FormGroup sx={{ mt: 1 }}>
          {filtered.map((s) => (
            <FormControlLabel
              key={s.id}
              control={
                <Checkbox
                  checked={s.present}
                  onChange={(e) => toggleOne(s.id, e.target.checked)}
                />
              }
              label={s.name}
              sx={{ "& .MuiFormControlLabel-label": { fontWeight: s.present ? 600 : 400 } }}
            />
          ))}
        </FormGroup>
      </CardContent>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack({ ...snack, open: false })}
          sx={{ width: "100%" }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Card>
  );
}
