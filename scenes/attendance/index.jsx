    // src/pages/Attendance.jsx
    import { useState, useEffect } from "react";
    import {
    Box,
    Typography,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Paper,
    useTheme,
    } from "@mui/material";
    import dayjs from "dayjs";
    import { getAttendanceMatrix } from "../../api/attendanceApi";
    import { lookupGroups } from "../../api/groupsApi";
    import Header from "../../components/Header"; 
    import translations from "../../translations";
    import CheckCircleIcon from "@mui/icons-material/CheckCircle";
    import CancelIcon from "@mui/icons-material/Cancel";



    const Attendance = ({ language }) => {
    const theme = useTheme();
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState("");
    const [matrix, setMatrix] = useState(null);
    const t = translations[language] || translations["ar"];
    

    const SESSIONS_PER_MONTH = 8;

    // Load groups
    useEffect(() => {
        const loadGroups = async () => {
        try {
            const g = await lookupGroups();
            setGroups(Array.isArray(g) ? g : []);
        } catch (err) {
            console.error("Failed to load groups", err);
        }
        };
        loadGroups();
    }, []);

    // Load attendance matrix
    useEffect(() => {
        if (!selectedGroup) {
        setMatrix(null);
        return;
        }

        const loadMatrix = async () => {
        try {
            const start = dayjs().startOf("year").format("YYYY-MM-DD");
            const endExclusive = dayjs().endOf("year").add(1, "day").format("YYYY-MM-DD");

            const data = await getAttendanceMatrix(selectedGroup, start, endExclusive);
            setMatrix(data);
        } catch (err) {
            console.error("Failed to load attendance matrix", err);
            setMatrix(null);
        }
        };

        loadMatrix();
    }, [selectedGroup]);

    // Group dates by month
    const monthsMeta = (() => {
        if (!matrix?.dates) return [];
        const grouped = {};
        matrix.dates.forEach((d) => {
        const m = dayjs(d).month() + 1;
        if (!grouped[m]) grouped[m] = [];
        grouped[m].push(d);
        });
        return Object.keys(grouped)
        .map((m) => ({
            monthNumber: parseInt(m, 10),
            dates: grouped[m],
            sessions: SESSIONS_PER_MONTH,
        }))
        .sort((a, b) => a.monthNumber - b.monthNumber);
    })();

    // Month colors
    const monthColors = [
        "#f0f8ff", "#faebd7", "#ffe4e1", "#e6e6fa",
        "#f5f5dc", "#ffe4b5", "#e0ffff", "#f5f5f5",
        "#979efcff", "#f48bf4ff", "#f2ca99ff", "#9cec9cff",
    ];
    const getMonthBg = (monthNumber) => {
    return monthColors[monthNumber - 1];
    };

    return (
        <Box m="20px">
        <Header title={t.presence} subtitle={t.presences} />
        
                {/* Group filter */}
        <Box display="flex" gap={2} alignItems="center" mb={2}>
            <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>{t.group}</InputLabel>
            <Select
                value={selectedGroup}
                label={t.group}
                onChange={(e) => setSelectedGroup(e.target.value)}
            >
            <MenuItem value="">{t.chooseGroup}</MenuItem>
                {groups.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                    {g.name}
                </MenuItem>
                ))}
            </Select>
            </FormControl>
        </Box>

        {/* Attendance Table */}
        {matrix && (
        <Paper
        sx={{
            overflowX: "auto",
            borderRadius: 2,
            boxShadow: 3,
                width: "100%",   // stretch horizontally

        }}
        >
            <Table sx={{ borderCollapse: "collapse" }}>
        <TableHead>
            <TableRow>
            <TableCell
                rowSpan={2}
                sx={{
                backgroundColor: theme.palette.mode === "dark" ? "#6f7a89ff" : "#cbd5e1",
                border: "1px solid #374151",
                }}
            >
                #
            </TableCell>
            <TableCell
                rowSpan={2}
                sx={{
                backgroundColor: theme.palette.mode === "dark" ? "#6f7a89ff" : "#cbd5e1",
                border: "1px solid #374151",
                }}
            >
                {t.name}
            </TableCell>
            {monthsMeta.map((m) => (
                <TableCell
                key={m.monthNumber}
                colSpan={m.sessions}
                align="center"
                    sx={{
                    backgroundColor: getMonthBg(m.monthNumber),
                    fontWeight: "bold",
                    border: "1px solid #374151",
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                }}
                >
                {dayjs().month(m.monthNumber - 1).format("MMMM")}
                </TableCell>
            ))}
            </TableRow>

            <TableRow>
            {monthsMeta.flatMap((m) =>
                Array.from({ length: m.sessions }).map((_, i) => (
                <TableCell
                    key={`${m.monthNumber}-${i}`}
                    align="center"
                            sx={{
            backgroundColor: theme.palette.mode === "dark" ? "#6f7a89ff" : "#cbd5e1",
            border: "1px solid #374151",
            position: "sticky",
            top: 32, // adjust if needed depending on row height
            zIndex: 1,
        }}
                >
                    {m.dates[i] ? dayjs(m.dates[i]).format("DD/MM") : "-"}
                </TableCell>
                ))
            )}
            </TableRow>
        </TableHead>

        <TableBody>
            {(matrix.students || []).map((s, idx) => {
            const flatCells = [];
            let dateIndex = 0;
            monthsMeta.forEach((m) => {
                for (let i = 0; i < m.sessions; i++) {
                flatCells.push(s.cells[dateIndex] || "-");
                dateIndex++;
                }
            });

            return (
                <TableRow key={s.studentId}>
                <TableCell
                    sx={{
                    backgroundColor: theme.palette.mode === "dark" ? "#6f7a89ff" : "#cbd5e1",
                    border: "1px solid #374151",
                    }}
                >
                    {idx + 1}
                </TableCell>
                <TableCell
                    sx={{
                    backgroundColor: theme.palette.mode === "dark" ? "#6f7a89ff" : "#cbd5e1",
                    border: "1px solid #374151",
                    }}
                >
                    {s.studentName}
                </TableCell>
                {flatCells.map((c, i) => (
                    <TableCell
                    key={i}
                    align="center"
                    sx={{
                        backgroundColor: theme.palette.mode === "dark" ? "#97a5bbff" : "#cbd5e1",
                        border: "1px solid #374151",
                    }}
                    >
                    {c === "P" ? (
                    <CheckCircleIcon sx={{ color: "green", fontSize: 20 }} />
                ) : c === "A" ? (
                    <CancelIcon sx={{ color: "red", fontSize: 20 }} />
                ) : (
                    <span style={{ color: theme.palette.text.disabled }}>-</span>
                )}

                    </TableCell>
                ))}
                </TableRow>
            );
            })}
        </TableBody>
        </Table>

            </Paper>
        )}
        </Box>
    );
    };

    export default Attendance;
