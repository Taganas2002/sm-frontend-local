        import { useState } from "react";
        import { Box, useTheme, Typography, Paper } from "@mui/material";
        import { tokens } from "../../theme";
        import translations from "../../translations";
        import Header from "../../components/Header";

        import AddIcon from "@mui/icons-material/Add";
        import PersonAddIcon from "@mui/icons-material/PersonAdd";
        import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
        import PaidIcon from "@mui/icons-material/Paid";
        import SchoolIcon from "@mui/icons-material/School";
        import CheckCircleIcon from "@mui/icons-material/CheckCircle";


        import TeacherDialog from "../../scenes/teachers/TeacherDialog"; 
        import StudentDialog from "../../scenes/students/StudentDialog"; // ✅ import StudentDialog

        const Dashboard = ({ language }) => {
        const theme = useTheme();
        const colors = tokens(theme.palette.mode);
        const t = translations[language] || translations["ar"];

        // ✅ State for Teacher & Student dialogs
        const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
        const [studentDialogOpen, setStudentDialogOpen] = useState(false);

        // Stats
        // ✅ Dashboard Cards (replace circleStats)
        const circleStats = [
        {
        label: t.manageStudents,
        description: `${t.manageStudentsDesc}`,
        icon: <PersonAddIcon sx={{ fontSize: 36 }} />,
        gradient: "linear-gradient(135deg, #a78bfa, #7c3aed)",
        },
        {
        label: t.manageTeachers,
        description: `${t.manageTeachersDesc}`,
        icon: <SchoolIcon sx={{ fontSize: 36 }} />,
        gradient: "linear-gradient(135deg, #f59e0b, #facc15)",
        },
        {
        label: t.attendance,
        description: `${t.attendanceDesc}`,
        icon: <CheckCircleIcon sx={{ fontSize: 36 }} />,
        gradient: "linear-gradient(135deg, #42a5f5, #0ea5e9)",
        },
        {
        label: t.billing,
        description: `${t.billingDesc}`,
        icon: <AccountBalanceWalletIcon sx={{ fontSize: 36 }} />,
        gradient: "linear-gradient(135deg, #ff6f91, #f43f5e)",
        },
        ];


        // Quick actions
        const quickActions = [
        {
        label:t.addStudent,
        icon: <PersonAddIcon />,
        bgColor: "#a78bfa",
        onClick: () => setStudentDialogOpen(true), // ✅ open StudentDialog
        },
        {
        label: t.addTeacher,
        icon: <AddIcon />,
        bgColor: "#f59e0b",
        onClick: () => setTeacherDialogOpen(true), 
        },
        ];

        return (
        <Box m="20px 0" p="0 20px">
        <Header title={t.schoolManagement} subtitle={t.dataManagement} />

        {/* Stats Row */}
        <Box display="flex" justifyContent="center" flexWrap="wrap" gap={6} mt={3}>
        {circleStats.map((stat, i) => (
        <Paper
        key={i}
        elevation={4}
        sx={{
        width: 160,
        minHeight: 160,
        borderRadius: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        background: theme.palette.mode === "dark"
        ? "linear-gradient(135deg, #1e3a8a, #93c5fd)"
      : "linear-gradient(135deg, #93c5fd, #1e3a8a)" , // dark mode  // light mode
        color: "#fff",
        textAlign: "center",
        cursor: "pointer",
        transition: "0.3s",
        "&:hover": { transform: "scale(1.05)", boxShadow: "0px 10px 25px rgba(0,0,0,0.3)" },
        padding: 2,
        }}
        >
        <Box sx={{ fontSize: 36, mb: 1 }}>{stat.icon}</Box> {/* ✅ add margin bottom */}
        <Typography variant="h5" fontWeight="bold">{stat.label}</Typography>
        <Typography variant="subtitle">{stat.description}</Typography>
        </Paper>
        ))}
        </Box>


        {/* Quick Actions Row */}
        <Box display="flex" justifyContent="center" flexWrap="wrap" gap={4} mt={5}>
                {quickActions.map((action, i) => (
                <Paper
                key={i}
                elevation={4}
                onClick={action.onClick}
                sx={{
                width: 180,
                height: 100,
                borderRadius: 3,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                backgroundColor: action.bgColor,
                color: "#fff",
                cursor: "pointer",
                transition: "0.3s",
                "&:hover": {
                        transform: "scale(1.05)",
                        boxShadow: "0px 10px 20px rgba(0,0,0,0.2)",
                },
                }}
                >
                <Box sx={{ fontSize: 28 }}>{action.icon}</Box>
                <Typography variant="h5"  fontWeight="bold">
                {action.label}
                </Typography>
                </Paper>
                ))}
        </Box>

        {/* ✅ Teacher Dialog */}
        <TeacherDialog
                open={teacherDialogOpen}
                onClose={() => setTeacherDialogOpen(false)}
                language={language}
                teacher={null}
                reloadTeachers={() => {}}
        />

        {/* ✅ Student Dialog */}
        <StudentDialog
                open={studentDialogOpen}
                onClose={() => setStudentDialogOpen(false)}
                language={language}
                student={null} // new student
                reloadStudents={() => {}} // optional: update stats if needed
        />
        </Box>
        );
        };

        export default Dashboard;
