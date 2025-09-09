            import { useState, useEffect } from "react";
            import FullCalendar from "@fullcalendar/react";
            import timeGridPlugin from "@fullcalendar/timegrid";
            import interactionPlugin from "@fullcalendar/interaction";
            import resourceTimeGridPlugin from "@fullcalendar/resource-timegrid";
            import AddIcon from "@mui/icons-material/Add";
            import { FormGroup } from "@mui/material"; // add this to your imports
            import { Menu, MenuItem } from "@mui/material";

            import {
            Box,
            Button,
            Dialog,
            DialogTitle,
            DialogContent,
            DialogActions,
            TextField,
            useTheme,FormControlLabel, // ✅ Add this
            Checkbox ,Snackbar,
            Alert,
            } from "@mui/material";
            import { Formik } from "formik";
            import * as yup from "yup";

            import Header from "../../components/Header";
            import { tokens } from "../../theme";
            import { searchClassrooms } from "../../api/classroomsApi";
            import { lookupGroups } from "../../api/groupsApi";
        import { getWeekSchedules, checkClassroomAvailability,
            createSchedule,updateSchedule } from "../../api/calendarApi";
        import {
        startAttendanceSession,
        closeAttendanceSession,
        markStudentAttendance,
        getSessionSummary
        } from "../../api/attendanceApi";
            import { listEnrollments } from "../../api/enrollmentsApi";
            import{searchStudents} from "../../api/studentsApi";
            import translations from "../../translations/index";
            

            const Calendar = ({ language }) => {
            const theme = useTheme();
            const colors = tokens(theme.palette.mode);
            const t = translations[language] || translations["fr"];
            
            

            const [sessionStatus, setSessionStatus] = useState(null);
            const [sessionId, setSessionId] = useState(null);
            const [events, setEvents] = useState([]);
            const [openDialog, setOpenDialog] = useState(false);
            const [classrooms, setClassrooms] = useState([]);
            const [groups, setGroups] = useState([]);
            const sessionColors = ["#0a61b8ff", "#058405ff", "#ab3004ff", "#94800fff", "#8A2BE2"];
            const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
            const [openEditDialog, setOpenEditDialog] = useState(false);
            const [editValues, setEditValues] = useState(null);
            const [contextMenu, setContextMenu] = useState(null);
            // Attendance dialog
            const [openAttendanceDialog, setOpenAttendanceDialog] = useState(false);
            const [selectedEvent, setSelectedEvent] = useState(null);
            const [students, setStudents] = useState([]);
            // const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
            // const [deleteId, setDeleteId] = useState(null);


        const handleStartSession = async () => {
    if (!selectedEvent) return;
    try {
        const isoDate = selectedEvent.startStr.split("T")[0];
        const session = await startAttendanceSession(selectedEvent.id, isoDate); // call API
        setSessionId(session.sessionId);
        setSessionStatus(session.status); // should be "OPEN"
        const presentIds = session.presentStudentIds || [];
        setStudents(prev => prev.map(s => ({ ...s, present: presentIds.includes(s.id) })));
    } catch (err) {
        console.error("Failed to start session", err);
        alert("Could not start session.");
    }
    };


        const handleCloseSession = async () => {
        if (!sessionId) return;
        try {
            const resp = await closeAttendanceSession(sessionId);
            setSessionStatus(resp.status); // CLOSED
            setStudents(prev =>
            prev.map(s => ({ ...s, present: resp.presentStudentIds.includes(s.id) }))
            );
            setOpenAttendanceDialog(false);
            await loadWeekEvents(); // refresh calendar
        } catch (err) {
            console.error(err);
            alert("Could not close session.");
        }
        };

    // const hydrateSession = async () => {
    // if (!sessionId) return;
    // try {
    //     const summary = await getSessionSummary(sessionId);
    //     setSessionStatus(summary.status);
    //     setStudents(prev =>
    //     prev.map(s => ({ ...s, present: summary.presentStudentIds.includes(s.id) }))
    //     );
    // } catch (err) {
    //     console.error(err);
    // }
    // };



            /** Load classrooms + groups */
            useEffect(() => {
                (async () => {
                try {
                    const res = await searchClassrooms({ page: 0, size: 50 });
                    setClassrooms(res.content || res || []);
                } catch (err) {
                    console.error("Failed to load classrooms", err);
                    setClassrooms([]);
                }

                try {
                    const g = await lookupGroups({ page: 0, size: 50 });
                    setGroups(Array.isArray(g.content) ? g.content : g || []);
                } catch (err) {
                    console.error("Failed to load groups", err);
                    setGroups([]);
                }
                })();
            }, []);

            /** Helper: get Monday of current week in YYYY-MM-DD format */
            const getCurrentWeekStart = () => {
                const now = new Date();
                const day = now.getDay(); // Sunday = 0
                const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(now.setDate(diff));
                return monday.toISOString().split("T")[0];
            };

            /** Handle event click */
                const handleEventClick = async (info) => {
    const event = info.event;
    setSelectedEvent(event);

    try {
        // 1️⃣ Load enrolled students
        const res = await listEnrollments({ groupId: event.extendedProps.groupId, status: "ACTIVE" });
        const enrolledStudents = Array.isArray(res.content) ? res.content : [];
        const studentIds = enrolledStudents.map((s) => s.studentId);

        const studentsRes = await searchStudents({ ids: studentIds });
        const studentsMap = {};
        (studentsRes.content || studentsRes || []).forEach((stu) => {
        studentsMap[stu.id] = stu.fullName;
        });

        const mappedStudents = enrolledStudents.map((s) => ({
        id: s.studentId,
        name: studentsMap[s.studentId] || `Student ${s.studentId}`,
        present: false,
        }));
        setStudents(mappedStudents);

        // 2️⃣ Check session status
        // const isoDate = event.startStr.split("T")[0];
        let summary;

        try {
        summary = await getSessionSummary(event.id); // 👈 check if session exists
        setSessionId(summary.sessionId);
        setSessionStatus(summary.status);

        const presentIds = summary.presentStudentIds || [];
        setStudents(mappedStudents.map(s => ({ ...s, present: presentIds.includes(s.id) })));
        } catch {
        // if no session exists, let teacher click "Start Session"
        console.warn("No session found, will start on button click.");
        setSessionId(null);
        setSessionStatus(null);
        }

        // 3️⃣ Open dialog
        setOpenAttendanceDialog(true);

    } catch (err) {
        console.error("Failed to fetch enrolled students/session", err);
        setStudents([]);
    }
    };

            /** Load all events for the current week (All groups) */
            const loadWeekEvents = async (weekStart = getCurrentWeekStart()) => {
                try {
                const tzOffsetMinutes = -new Date().getTimezoneOffset();
                const res = await getWeekSchedules(weekStart, tzOffsetMinutes);

                    setEvents(
            (res || []).map((e, index) => ({
                id: e.scheduleId,
                title: `${e.groupName} • ${e.classroomName || ""}`,
                start: e.start.replace("Z", ""), // 👈 strip UTC "Z"
                end: e.end.replace("Z", ""),     // 👈 same here
                resourceId: e.classroomName || e.classroomId || `Room-${e.scheduleId}`,
                backgroundColor: sessionColors[index % sessionColors.length], // per session color
                borderColor: sessionColors[index % sessionColors.length],
                textColor: "#fff", // optional, for readability
                extendedProps: {
                groupId: e.groupId,
                groupName: e.groupName,
                classroomName: e.classroomName,
                dayOfWeek: e.dayOfWeek,
                },
            }))
        );

                } catch (err) {
                console.error("Failed to load week events", err);
                setEvents([]);
                }
            };

            /** Load week events on mount */
            useEffect(() => {
                loadWeekEvents();
            }, [classrooms]); // wait until classrooms loaded for correct resources

            /** Validation Schema */
            const validationSchema = yup.object().shape({
        roomId: yup.string().required(t.requiredClassroom || "Classroom is required"),
        groupId: yup.string().required(t.requiredGroup || "Group is required"),
        day: yup.string().required(t.requiredDay || "Day is required"),
        startTime: yup.string().required(t.requiredStartTime || "Start time is required"),
        endTime: yup.string().required(t.requiredEndTime || "End time is required"),
        });


            /** Handle adding a new class */
            const handleAddClass = async (values, { resetForm }) => {
                try {
                const payload = {
                    dayOfWeek: values.day,
                    startTime: values.startTime,
                    endTime: values.endTime,
                    classroomId: values.roomId,
                    active: true,
                };

                const availability = await checkClassroomAvailability({
                    classroomId: payload.classroomId,
                    dayOfWeek: payload.dayOfWeek,
                    startTime: payload.startTime,
                    endTime: payload.endTime,
                });

                if (!availability?.available) {
            setSnackbar({
                open: true,
                message: t.classroomConflict,
                severity: "error",
            });
            return;
            }


                await createSchedule(values.groupId, payload);

                await loadWeekEvents(); // reload week events after adding

                resetForm();
                setOpenDialog(false);
                } catch (err) {
                console.error("Failed to create schedule", err);
                alert("Failed to save session. Please try again.");
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
                    onClick={() => setOpenDialog(true)}
                    >
        {t.addClass}
                    </Button>
                </Box>

                {/* Add Class Dialog */}
                <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                    <DialogTitle 
                    sx={{
                backgroundColor:
                theme.palette.mode === "light" ? "#0d47a1" : "#4274c7",
                color: "#fff",
                fontWeight: "bold",
            }} >{t.addSession}</DialogTitle>
                    <Formik
                    initialValues={{
                        roomId: "",
                        groupId: "",
                        day: "",
                        startTime: "",
                        endTime: "",
                    }}
                    validationSchema={validationSchema}
                    onSubmit={handleAddClass}
                    >
                    {({ values, errors, touched, handleChange, handleSubmit }) => (
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
                                <MenuItem key={c.id} value={c.id}>
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
                                <MenuItem key={g.id} value={g.id}>
                                {g.name || g.label || `Group ${g.id}`}
                                </MenuItem>
                            ))}
                            </TextField>

                            {/* Day */}
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
                            {["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map((d) => (
                                <MenuItem key={d} value={d}>
                            {t.days[d]}
                                </MenuItem>
                            ))}
                            </TextField>

                            {/* Start Time */}
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

                            {/* End Time */}
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
                            <Button onClick={() => setOpenDialog(false)} sx={{
                        fontWeight: "bold",
                        ml: 2,
                        backgroundColor:
                        theme.palette.mode === "light"
                            ? colors.redAccent[800]
                            : colors.redAccent[300],
                        color:
                        theme.palette.mode === "light"
                            ? "#fff"
                            : colors.blueAccent[800],
                        "&:hover": {
                        backgroundColor:
                            theme.palette.mode === "light"
                            ? colors.redAccent[700]
                            : colors.redAccent[200],
                        },
                    }}>{t.cancel}</Button>
                            <Button type="submit" variant="contained" color="primary" sx={{
                        fontWeight: "bold",
                        backgroundColor:
                        theme.palette.mode === "light"
                            ? colors.blueAccent[800]
                            : colors.blueAccent[300],
                        color:
                        theme.palette.mode === "light"
                            ? "#fff"
                            : colors.blueAccent[800],
                        "&:hover": {
                        backgroundColor:
                            theme.palette.mode === "light"
                            ? colors.blueAccent[700]
                            : colors.blueAccent[200],
                        },
                    }}>
                            {t.save}
                            </Button>
                        </DialogActions>
                        </form>
                    )}
                    </Formik>
                </Dialog>

                {/* Calendar */}
    <Box sx={{ overflowX: "auto", width: "100%" }}>
    <Box sx={{ minWidth: `${classrooms.length * 700}px` }}> 
            <FullCalendar
    timeZone="UTC"
    height="80vh"
    plugins={[timeGridPlugin, interactionPlugin, resourceTimeGridPlugin]}
    initialView="resourceTimeGridWeek"
    headerToolbar={{
        left: "prev,next today",
        center: "title",
        right: "resourceTimeGridWeek,timeGridDay",
    }}
    resources={classrooms.map((c) => ({
        id: c.roomName || c.name || `Room-${c.id}`,
        title: c.roomName || c.name || `Room ${c.id}`,
    }))}
    events={events}
    editable={false}
    selectable={false}
    resourceAreaWidth="160px"
    slotMinTime="07:00:00"   // 👈 Start at 8 AM
    slotMaxTime="24:00:00"   // 👈 End at 12 AM (midnight)
    eventClick={(info) => {
        // 👇 open ONLY attendance on normal click
        if (!contextMenu) {
        handleEventClick(info);
        }
    }}
    eventDidMount={(info) => {
        // 👇 attach right-click menu for Edit/Delete
        info.el.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const event = info.event;

        setEditValues({
            id: event.id,
            day: event.extendedProps.dayOfWeek,
            startTime: event.start.toISOString().substring(11, 16),
            endTime: event.end.toISOString().substring(11, 16),
            classroomId: classrooms.find(
            (c) => c.roomName === event.extendedProps.classroomName
            )?.id,
        });

        setContextMenu({
            mouseX: e.clientX + 2,
            mouseY: e.clientY - 6,
        });
        });
    }}
    />

    </Box>
    </Box>
        <Menu
    open={contextMenu !== null}
    onClose={() => setContextMenu(null)}
    anchorReference="anchorPosition"
    anchorPosition={
        contextMenu !== null
        ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
        : undefined
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
    {/* <MenuItem
        onClick={() => {
        setDeleteId(editValues?.id); 
        setOpenDeleteDialog(true); 
        setContextMenu(null);
        }}
    >
        🗑️ Delete Session
    </MenuItem> */}
    </Menu>
            {/* Attendance Dialog */}
            <Dialog
    open={openAttendanceDialog}
    onClose={() => setOpenAttendanceDialog(false)}
    maxWidth="sm"
    fullWidth
    >
    <DialogTitle 
    sx={{
                backgroundColor:
                theme.palette.mode === "light" ? "#0d47a1" : "#4274c7",
                color: "#fff",
                fontWeight: "bold",
            }}>{t.attendance} - {selectedEvent?.title}</DialogTitle>
    <DialogContent>
    <FormGroup>
        {students.map((s, index) => (
        <FormControlLabel
            key={s.id}
            control={
            <Checkbox
        checked={s.present}
        disabled={sessionStatus !== "OPEN"} 
        onChange={async (e) => {
            const checked = e.target.checked;
            setStudents((prev) =>
            prev.map((st, i) => (i === index ? { ...st, present: checked } : st))
            );

            try {
            await markStudentAttendance(sessionId, s.id, checked);
            } catch (err) {
            console.error("Failed to mark attendance", err);
            setStudents((prev) =>
                prev.map((st, i) =>
                i === index ? { ...st, present: !checked } : st
                )
            );
            }
        }}
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
            label={s.name}
        />
        ))}
    </FormGroup>
    </DialogContent>

        <DialogActions>
    <Box display="flex" gap={1} mb={2}>
        {/* Start Button */}
        <Button
        onClick={handleStartSession}
        disabled={!selectedEvent || sessionStatus === "OPEN" || sessionStatus === "CLOSED"} 
        variant="contained"
        sx={{
            fontWeight: "bold",
            backgroundColor:
            !selectedEvent || sessionStatus === "OPEN" || sessionStatus === "CLOSED"
                ? "grey" // disabled grey
                : (theme.palette.mode === "light"
                    ? colors.blueAccent[800]
                    : colors.blueAccent[300]),
            color:
            !selectedEvent || sessionStatus === "OPEN" || sessionStatus === "CLOSED"
                ? "#ccc"
                : "#fff",
        }}
        >
        {t.startSession}
        </Button>

        {/* Close Button */}
        <Button
        onClick={handleCloseSession}
        disabled={!sessionId || sessionStatus !== "OPEN"} 
        variant="contained"
        sx={{
            fontWeight: "bold",
            ml: 2,
            backgroundColor:
            !sessionId || sessionStatus !== "OPEN"
                ? "grey" // disabled grey
                : (theme.palette.mode === "light"
                    ? colors.redAccent[800]
                    : colors.redAccent[300]),
            color:
            !sessionId || sessionStatus !== "OPEN"
                ? "#ccc"
                : "#fff",
        }}
        >
        {t.closeSession}
        </Button>
    </Box>
    </DialogActions>

        </Dialog>
{/* Edit Schedule Dialog */}
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
            validationSchema={yup.object().shape({
                day: yup.string().required("Day is required"),
                startTime: yup.string().required("Start time is required"),
                endTime: yup.string().required("End time is required"),
                classroomId: yup.string().required("Classroom is required"),
            })}
            onSubmit={async (values) => {
                try {
                const payload = {
                    dayOfWeek: values.day,
                    startTime: values.startTime,
                    endTime: values.endTime,
                    classroomId: values.classroomId,
                    active: true,
                };

                const availability = await checkClassroomAvailability(payload);
                if (!availability?.available) {
                    setSnackbar({
                    open: true,
                    message: t.classroomConflict,
                    severity: "error",
                    });
                    return;
                }

                await updateSchedule(values.id, payload);
                setSnackbar({
                    open: true,
                    message: t.successMsg,
                    severity: "success",
                });
                setOpenEditDialog(false);
                await loadWeekEvents();
                } catch (err) {
                console.error("Failed to update schedule", err);
                setSnackbar({
                    open: true,
                    message: t.sessionUpdateFailed,
                    severity: "error",
                });
                }
            }}
            >
            {({ values, errors, touched, handleChange, handleSubmit }) => (
                <form onSubmit={handleSubmit}>
                <DialogContent>
                    {/* Day */}
                    <TextField
                    select
                    fullWidth
                    margin="dense"
                    label="Day"
                    name="day"
                    value={values.day}
                    onChange={handleChange}
                    error={touched.day && Boolean(errors.day)}
                    helperText={touched.day && errors.day}
                    >
                    {["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"].map((d) => (
                        <MenuItem key={d} value={d}> {t.days[d]}</MenuItem>
                    ))}
                    </TextField>

                    {/* Start Time */}
                    <TextField
                    fullWidth
                    margin="dense"
                    type="time"
                    label="Start Time"
                    name="startTime"
                    InputLabelProps={{ shrink: true }}
                    value={values.startTime}
                    onChange={handleChange}
                    error={touched.startTime && Boolean(errors.startTime)}
                    helperText={touched.startTime && errors.startTime}
                    />

                    {/* End Time */}
                    <TextField
                    fullWidth
                    margin="dense"
                    type="time"
                    label="End Time"
                    name="endTime"
                    InputLabelProps={{ shrink: true }}
                    value={values.endTime}
                    onChange={handleChange}
                    error={touched.endTime && Boolean(errors.endTime)}
                    helperText={touched.endTime && errors.endTime}
                    />

                    {/* Classroom */}
                    <TextField
                    select
                    fullWidth
                    margin="dense"
                    label={t.classroom}
                    name="classroomId"
                    value={values.classroomId}
                    onChange={handleChange}
                    error={touched.classroomId && Boolean(errors.classroomId)}
                    helperText={touched.classroomId && errors.classroomId}
                    >
                    {classrooms.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
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

        <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
        <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{
        width: "100%",
        fontSize: "1.1rem",      
        fontWeight: "bold",     
        p: 2,                     // 👈 More padding inside
        borderRadius: 2,          // 👈 Softer corners
    }}
        >
            {snackbar.message}
        </Alert>
        </Snackbar>

        {/* //Delete Confirmation Dialog */}
    {/* <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
    <DialogTitle
        sx={{
        backgroundColor: theme.palette.mode === "light" ? "#b71c1c" : "#ef5350",
        color: "#fff",
        fontWeight: "bold",
        }}
    >
        Confirm Delete
    </DialogTitle>
    <DialogContent>
        Are you sure you want to delete this session? This action cannot be undone.
    </DialogContent>
    <DialogActions>
        <Button onClick={() => setOpenDeleteDialog(false)} color="primary">
        Cancel
        </Button>
        <Button
        onClick={async () => {
            try {
            await deleteSchedule(deleteId);
            setSnackbar({
                open: true,
                message: "🗑️ Session deleted successfully!",
                severity: "success",
            });
            setOpenDeleteDialog(false);
            await loadWeekEvents();
            } catch (err) {
            console.error("Failed to delete schedule", err);
            setSnackbar({
                open: true,
                message: "❌ Failed to delete session. Please try again.",
                severity: "error",
            });
            }
        }}
        color="error"
        variant="contained"
        >
        Delete
        </Button>
    </DialogActions>
    </Dialog> */}

            </Box>
            );
            };

            export default Calendar;
