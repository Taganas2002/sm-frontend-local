// src/scenes/calendar/Calendar.jsx
import { useState, useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import resourceTimeGridPlugin from "@fullcalendar/resource-timegrid";
import AddIcon from "@mui/icons-material/Add";
import { Menu, MenuItem } from "@mui/material";

import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  Snackbar,
  Alert,
} from "@mui/material";
import { Formik } from "formik";
import * as yup from "yup";

import Header from "../../components/Header";
import { tokens } from "../../theme";
import { searchClassrooms } from "../../api/classroomsApi";
import { lookupGroups } from "../../api/groupsApi";
import {
  getWeekSchedules,
  checkClassroomAvailability,
  checkClassroomAvailabilityOnDate,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getServerDate,
} from "../../api/calendarApi";
import translations from "../../translations/index";
import AttendanceDock from "./components/AttendanceDock";

const Calendar = ({ language }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = translations[language] || translations["fr"];

  const calendarRef = useRef(null);

  // Core state
  const [classrooms, setClassrooms] = useState([]);
  const [groups, setGroups] = useState([]);

  // CRUD dialogs / context
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editValues, setEditValues] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  // consistent event colors
  const sessionColors = ["#0a61b8ff", "#058405ff", "#ab3004ff", "#94800fff", "#8A2BE2"];

  // Attendance Dock (multi-session)
  const [dockOpen, setDockOpen] = useState(false);
  const [dockPanels, setDockPanels] = useState([]); // [{key,scheduleId,date,title,groupId}]
  const [weekEvents, setWeekEvents] = useState([]);  // candidates for Add panel
  const lastCandidatesHashRef = useRef("");

  // ---------- Helpers ----------
  const tzOffsetMinutes = () => -new Date().getTimezoneOffset();

  const mondayOfStr = (dateLike) => {
    const d = new Date(dateLike);
    const day = d.getDay(); // 0..6 (Sun..Sat)
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    return monday.toISOString().slice(0, 10); // yyyy-MM-dd
  };

  const mondayOfDate = (dateObj) => {
    const d = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    return monday;
  };

  const isGroupPerSession = (groupId) => {
    const g = groups.find((x) => String(x.id) === String(groupId));
    if (!g) return false;
    const v =
      g.pricingModel ||
      g.priceModel ||
      g.paymentModel ||
      g.model ||
      g.billingModel ||
      g.feeModel;
    return String(v || "").toUpperCase() === "PER_SESSION";
  };

  // ---------- Load base data ----------
  useEffect(() => {
    (async () => {
      try {
        const res = await searchClassrooms({ page: 0, size: 200 });
        setClassrooms(res.content || res || []);
      } catch {
        setClassrooms([]);
      }

      try {
        const g = await lookupGroups({ page: 0, size: 200 });
        setGroups(Array.isArray(g.content) ? g.content : g || []);
      } catch {
        setGroups([]);
      }
    })();
  }, []);

  // Refetch when classrooms arrive (ensures events attach to resources)
  useEffect(() => {
    if (classrooms.length && calendarRef.current) {
      calendarRef.current.getApi().refetchEvents();
    }
  }, [classrooms]);

  // ---------- Server-anchored initial date ----------
  useEffect(() => {
    (async () => {
      try {
        const { today } = await getServerDate(); // { today: 'YYYY-MM-DD' }
        const serverMonday = mondayOfDate(new Date(`${today}T00:00:00`));
        calendarRef.current?.getApi()?.gotoDate(serverMonday);
      } catch {
        // ignore; use client date
      }
    })();
  }, []);

  // ---------- Attendance Dock ----------
  const openPanelFromEventObj = (evObj) => {
    const date =
      evObj.extendedProps?.date ||
      (evObj.startStr ? evObj.startStr.split("T")[0] : "");
    const key = `${evObj.id}|${date}`;
    setDockPanels((prev) => {
      if (prev.some((p) => p.key === key)) return prev;
      return [
        ...prev,
        {
          key,
          scheduleId: evObj.id,
          date,
          // ✅ show the pure group name in the dock
          title: evObj.extendedProps?.groupName || evObj.title || "",
          groupId: evObj.extendedProps.groupId,
        },
      ];
    });
    setDockOpen(true);
  };
  const openPanelForEvent = (info) => openPanelFromEventObj(info.event);
  const closePanel = (key) => setDockPanels((prev) => prev.filter((p) => p.key !== key));
  const closeAllPanels = () => {
    setDockPanels([]);
    setDockOpen(false);
  };
  const hideDock = () => setDockOpen(false); // keep panels in state

  // ---------- Validation (dynamic per add/edit) ----------
  const addSchema = (oneTime) =>
    yup.object().shape({
      roomId: yup.string().required(t.requiredClassroom || "Classroom is required"),
      groupId: yup.string().required(t.requiredGroup || "Group is required"),
      day: oneTime
        ? yup.string().nullable()
        : yup.string().required(t.requiredDay || "Day is required"),
      date: oneTime
        ? yup
            .string()
            .required(t.requiredDate || "Date is required")
            .matches(/^\d{4}-\d{2}-\d{2}$/, "yyyy-mm-dd")
        : yup.string().nullable(),
      startTime: yup.string().required(t.requiredStartTime || "Start time is required"),
      endTime: yup.string().required(t.requiredEndTime || "End time is required"),
    });

  // ---------- Create schedule ----------
  const handleAddClass = async (values, { resetForm }) => {
    try {
      const oneTime = isGroupPerSession(values.groupId);
      const payload = {
        startTime: values.startTime,
        endTime: values.endTime,
        classroomId: values.roomId,
        active: true,
        ...(oneTime ? { date: values.date } : { dayOfWeek: values.day }),
      };

      const availability = oneTime
        ? await checkClassroomAvailabilityOnDate({
            classroomId: payload.classroomId,
            date: payload.date,
            startTime: payload.startTime,
            endTime: payload.endTime,
          })
        : await checkClassroomAvailability({
            classroomId: payload.classroomId,
            dayOfWeek: payload.dayOfWeek,
            startTime: payload.startTime,
            endTime: payload.endTime,
          });

      if (!availability?.available) {
        setSnackbar({ open: true, message: t.classroomConflict, severity: "error" });
        return;
      }

      await createSchedule(values.groupId, payload);

      resetForm();
      setOpenDialog(false);
      calendarRef.current?.getApi().refetchEvents();
    } catch (err) {
      console.error("Failed to create schedule", err);
      alert("Failed to save session. Please try again.");
    }
  };

  // ---------- Map backend week events → FullCalendar (local times) ----------
  const mapWeekEventsToCalendar = (list) =>
    (list || []).map((e, index) => {
      const start = `${e.date}T${e.startTime}`;
      const end = `${e.date}T${e.endTime}`;
      const color = sessionColors[index % sessionColors.length];

      // link event to the resource column (room)
      const match = classrooms.find(
        (c) => (c.roomName || c.name) && (c.roomName || c.name) === e.classroomName
      );
      const resourceId = match ? String(match.id) : undefined;

      return {
        id: e.scheduleId,
        // ✅ title now ONLY the group name
        title: e.groupName || "Group",
        start,
        end,
        resourceId,
        backgroundColor: color,
        borderColor: color,
        textColor: "#fff",
        extendedProps: {
          groupId: e.groupId,
          groupName: e.groupName,
          classroomId: match ? match.id : null,
          classroomName: e.classroomName,
          dayOfWeek: e.dayOfWeek || null,
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime,
          oneTime: !!e.oneTime,
        },
      };
    });

  // Build & store candidates safely (no loops)
  const setCandidatesSafely = (mapped) => {
    const hash = mapped.map((e) => `${e.id}|${e.extendedProps?.date}`).join(",");
    if (hash !== lastCandidatesHashRef.current) {
      lastCandidatesHashRef.current = hash;
      setWeekEvents(mapped);
    }
  };

  return (
    <Box m="15px">
      <Header title={t.schoolCalendar} subtitle={t.organizeTimetable} />

      {/* Add Class Button */}
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{
            backgroundColor:
              theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400],
            color: "#fff",
            "&:hover": {
              backgroundColor:
                theme.palette.mode === "light" ? colors.blueAccent[400] : colors.blueAccent[800],
            },
          }}
          onClick={() => setOpenDialog(true)}
        >
          {t.addClass}
        </Button>
      </Box>

      {/* Add Class Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle
          sx={{
            backgroundColor: theme.palette.mode === "light" ? "#0d47a1" : "#4274c7",
            color: "#fff",
            fontWeight: "bold",
          }}
        >
          {t.addSession}
        </DialogTitle>
        <Formik
          initialValues={{ roomId: "", groupId: "", day: "", date: "", startTime: "", endTime: "" }}
          validateOnBlur
          validateOnChange
          validate={(values) => {
            const oneTime = isGroupPerSession(values.groupId);
            try {
              addSchema(oneTime).validateSync(values, { abortEarly: false });
              return {};
            } catch (y) {
              const errors = {};
              if (y.inner && Array.isArray(y.inner)) {
                y.inner.forEach((e) => {
                  if (e.path) errors[e.path] = e.message;
                });
              } else if (y.path) {
                errors[y.path] = y.message;
              }
              return errors;
            }
          }}
          onSubmit={handleAddClass}
        >
          {({ values, errors, touched, handleChange, handleSubmit }) => {
            const oneTime = isGroupPerSession(values.groupId);
            return (
              <form onSubmit={handleSubmit}>
                <DialogContent>
                  {/* Classroom */}
                  <TextField
                    select
                    fullWidth
                    margin="dense"
                    label={t.classroom}
                    name="roomId"
                    value={values.roomId}
                    onChange={handleChange}
                    error={touched.roomId && Boolean(errors.roomId)}
                    helperText={touched.roomId && errors.roomId}
                  >
                    {classrooms.map((c) => (
                      <MenuItem key={c.id} value={String(c.id)}>
                        {c.roomName || c.name || `Room ${c.id}`}
                      </MenuItem>
                    ))}
                  </TextField>

                  {/* Group */}
                  <TextField
                    select
                    fullWidth
                    margin="dense"
                    label={t.group}
                    name="groupId"
                    value={values.groupId}
                    onChange={handleChange}
                    error={touched.groupId && Boolean(errors.groupId)}
                    helperText={touched.groupId && errors.groupId}
                  >
                    {groups.map((g) => (
                      <MenuItem key={g.id} value={String(g.id)}>
                        {g.name || g.label || `Group ${g.id}`}
                      </MenuItem>
                    ))}
                  </TextField>

                  {/* Weekly or one-time */}
                  {!oneTime ? (
                    <TextField
                      select
                      fullWidth
                      margin="dense"
                      label={t.day}
                      name="day"
                      value={values.day}
                      onChange={handleChange}
                      error={touched.day && Boolean(errors.day)}
                      helperText={touched.day && errors.day}
                    >
                      {[
                        "MONDAY",
                        "TUESDAY",
                        "WEDNESDAY",
                        "THURSDAY",
                        "FRIDAY",
                        "SATURDAY",
                        "SUNDAY",
                      ].map((d) => (
                        <MenuItem key={d} value={d}>
                          {t.days[d]}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <TextField
                      fullWidth
                      margin="dense"
                      type="date"
                      label={t.date || "Date"}
                      name="date"
                      InputLabelProps={{ shrink: true }}
                      value={values.date}
                      onChange={handleChange}
                      error={touched.date && Boolean(errors.date)}
                      helperText={touched.date && errors.date}
                    />
                  )}

                  <TextField
                    fullWidth
                    margin="dense"
                    type="time"
                    label={t.startTime}
                    name="startTime"
                    InputLabelProps={{ shrink: true }}
                    value={values.startTime}
                    onChange={handleChange}
                    error={touched.startTime && Boolean(errors.startTime)}
                    helperText={touched.startTime && errors.startTime}
                  />

                  <TextField
                    fullWidth
                    margin="dense"
                    type="time"
                    label={t.endTime}
                    name="endTime"
                    InputLabelProps={{ shrink: true }}
                    value={values.endTime}
                    onChange={handleChange}
                    error={touched.endTime && Boolean(errors.endTime)}
                    helperText={touched.endTime && errors.endTime}
                  />
                </DialogContent>

                <DialogActions>
                  <Button onClick={() => setOpenDialog(false)} color="error">
                    {t.cancel}
                  </Button>
                  <Button type="submit" variant="contained" color="primary">
                    {t.save}
                  </Button>
                </DialogActions>
              </form>
            );
          }}
        </Formik>
      </Dialog>

      {/* Calendar */}
      <Box sx={{ overflowX: "auto", width: "100%" }}>
        <Box sx={{ minWidth: `${Math.max(classrooms.length, 1) * 700}px` }}>
          <FullCalendar
            ref={calendarRef}
            timeZone="local"
            firstDay={1}
            height="80vh"
            plugins={[timeGridPlugin, interactionPlugin, resourceTimeGridPlugin]}
            initialView="resourceTimeGridWeek"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "resourceTimeGridWeek,resourceTimeGridDay",
            }}
            resources={classrooms.map((c) => ({
              id: String(c.id),
              title: c.roomName || c.name || `Room ${c.id}`,
            }))}
            events={async (fetchInfo, success, failure) => {
              try {
                if (!classrooms.length) {
                  success([]);
                  return;
                }
                const weekStart = mondayOfStr(fetchInfo.start);
                const data = await getWeekSchedules(weekStart, tzOffsetMinutes());
                const mapped = mapWeekEventsToCalendar(data);
                setCandidatesSafely(mapped);
                success(mapped);
              } catch (e) {
                console.error(e);
                failure(e);
              }
            }}
            editable={false}
            selectable={false}
            resourceAreaWidth="200px"
            slotMinTime="07:00:00"
            slotMaxTime="24:00:00"
            eventClick={openPanelForEvent}
            eventDidMount={(info) => {
              // Right-click context menu + open dock panel
              info.el.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                const event = info.event;

                setEditValues({
                  id: event.id,
                  day: event.extendedProps.oneTime ? "" : event.extendedProps.dayOfWeek || "",
                  date: event.extendedProps.oneTime ? event.extendedProps.date : "",
                  startTime: event.extendedProps.startTime,
                  endTime: event.extendedProps.endTime,
                  classroomId:
                    event.extendedProps.classroomId ??
                    classrooms.find(
                      (c) => (c.roomName || c.name) === event.extendedProps.classroomName
                    )?.id,
                  oneTime: !!event.extendedProps.oneTime,
                });

                setDeleteId(event.id);
                setContextMenu({ mouseX: e.clientX + 2, mouseY: e.clientY - 6 });

                openPanelFromEventObj(event);
              });
            }}
          />
        </Box>
      </Box>

      {/* Context menu */}
      <Menu
        open={contextMenu !== null}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
        }
      >
        <MenuItem
          onClick={() => {
            setOpenEditDialog(true);
            setContextMenu(null);
          }}
        >
          ✏️ {t.editSession}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setOpenDeleteDialog(true);
            setContextMenu(null);
          }}
        >
          🗑️ {t.delete || "Delete"}
        </MenuItem>
      </Menu>

      {/* Edit dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
        <DialogTitle
          sx={{
            backgroundColor: theme.palette.mode === "light" ? "#0d47a1" : "#4274c7",
            color: "#fff",
            fontWeight: "bold",
          }}
        >
          {t.editSession}
        </DialogTitle>
        {editValues && (
          <Formik
            initialValues={editValues}
            enableReinitialize
            validateOnBlur
            validateOnChange
            validationSchema={() =>
              yup.object().shape({
                day: editValues.oneTime
                  ? yup.string().nullable()
                  : yup.string().required("Day is required"),
                date: editValues.oneTime
                  ? yup
                      .string()
                      .required("Date is required")
                      .matches(/^\d{4}-\d{2}-\d{2}$/, "yyyy-mm-dd")
                  : yup.string().nullable(),
                startTime: yup.string().required("Start time is required"),
                endTime: yup.string().required("End time is required"),
                classroomId: yup.string().required("Classroom is required"),
              })
            }
            onSubmit={async (values) => {
              try {
                const payload = {
                  startTime: values.startTime,
                  endTime: values.endTime,
                  classroomId: values.classroomId,
                  active: true,
                  ...(editValues.oneTime ? { date: values.date } : { dayOfWeek: values.day }),
                };

                const availability = editValues.oneTime
                  ? await checkClassroomAvailabilityOnDate({
                      classroomId: payload.classroomId,
                      date: payload.date,
                      startTime: payload.startTime,
                      endTime: payload.endTime,
                      excludeScheduleId: values.id,
                    })
                  : await checkClassroomAvailability({
                      classroomId: payload.classroomId,
                      dayOfWeek: payload.dayOfWeek,
                      startTime: payload.startTime,
                      endTime: payload.endTime,
                      excludeScheduleId: values.id,
                    });

                if (!availability?.available) {
                  setSnackbar({ open: true, message: t.classroomConflict, severity: "error" });
                  return;
                }

                await updateSchedule(values.id, payload);
                setSnackbar({ open: true, message: t.successMsg, severity: "success" });
                setOpenEditDialog(false);
                calendarRef.current?.getApi().refetchEvents();
              } catch (err) {
                console.error("Failed to update schedule", err);
                setSnackbar({ open: true, message: t.sessionUpdateFailed, severity: "error" });
              }
            }}
          >
            {({ values, errors, touched, handleChange, handleSubmit }) => (
              <form onSubmit={handleSubmit}>
                <DialogContent>
                  {!editValues.oneTime ? (
                    <TextField
                      select
                      fullWidth
                      margin="dense"
                      label={t.day}
                      name="day"
                      value={values.day || ""}
                      onChange={handleChange}
                      error={touched.day && Boolean(errors.day)}
                      helperText={touched.day && errors.day}
                    >
                      {[
                        "MONDAY",
                        "TUESDAY",
                        "WEDNESDAY",
                        "THURSDAY",
                        "FRIDAY",
                        "SATURDAY",
                        "SUNDAY",
                      ].map((d) => (
                        <MenuItem key={d} value={d}>
                          {t.days[d]}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <TextField
                      fullWidth
                      margin="dense"
                      type="date"
                      label={t.date || "Date"}
                      name="date"
                      InputLabelProps={{ shrink: true }}
                      value={values.date || ""}
                      onChange={handleChange}
                      error={touched.date && Boolean(errors.date)}
                      helperText={touched.date && errors.date}
                    />
                  )}

                  <TextField
                    fullWidth
                    margin="dense"
                    type="time"
                    label={t.startTime || "Start Time"}
                    name="startTime"
                    InputLabelProps={{ shrink: true }}
                    value={values.startTime}
                    onChange={handleChange}
                    error={touched.startTime && Boolean(errors.startTime)}
                    helperText={touched.startTime && errors.startTime}
                  />

                  <TextField
                    fullWidth
                    margin="dense"
                    type="time"
                    label={t.endTime || "End Time"}
                    name="endTime"
                    InputLabelProps={{ shrink: true }}
                    value={values.endTime}
                    onChange={handleChange}
                    error={touched.endTime && Boolean(errors.endTime)}
                    helperText={touched.endTime && errors.endTime}
                  />

                  <TextField
                    select
                    fullWidth
                    margin="dense"
                    label={t.classroom}
                    name="classroomId"
                    value={values.classroomId ?? ""}
                    onChange={handleChange}
                    error={touched.classroomId && Boolean(errors.classroomId)}
                    helperText={touched.classroomId && errors.classroomId}
                  >
                    {classrooms.map((c) => (
                      <MenuItem key={c.id} value={String(c.id)}>
                        {c.roomName || c.name || `Room ${c.id}`}
                      </MenuItem>
                    ))}
                  </TextField>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setOpenEditDialog(false)} color="error">
                    {t.cancel}
                  </Button>
                  <Button type="submit" variant="contained" color="primary">
                    {t.saveChanges}
                  </Button>
                </DialogActions>
              </form>
            )}
          </Formik>
        )}
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle
          sx={{
            backgroundColor: theme.palette.mode === "light" ? "#b71c1c" : "#ef5350",
            color: "#fff",
            fontWeight: "bold",
          }}
        >
          {t.confirmDeleteTitle || "Confirm Delete"}
        </DialogTitle>
        <DialogContent>
          {t.confirmDeleteMessage || "Are you sure you want to delete this session?"}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} color="primary">
            {t.cancel}
          </Button>
          <Button
            onClick={async () => {
              try {
                await deleteSchedule(deleteId);
                setSnackbar({
                  open: true,
                  message: t.deleted || "🗑️ Session deleted successfully!",
                  severity: "success",
                });
                setOpenDeleteDialog(false);
                setDeleteId(null);
                calendarRef.current?.getApi().refetchEvents();
              } catch (err) {
                console.error("Failed to delete schedule", err);
                setSnackbar({
                  open: true,
                  message: t.sessionDeleteFailed || "❌ Failed to delete session.",
                  severity: "error",
                });
              }
            }}
            color="error"
            variant="contained"
          >
            {t.confirm || "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%", fontSize: "1.1rem", fontWeight: "bold", p: 2, borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Attendance Dock (multi-session) */}
      <AttendanceDock
        open={dockOpen}
        panels={dockPanels}
        candidates={weekEvents}
        onHide={hideDock}
        onCloseAll={closeAllPanels}
        onClosePanel={closePanel}
        onAddPanel={openPanelFromEventObj}
      />
    </Box>
  );
};

export default Calendar;
