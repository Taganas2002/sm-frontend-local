    import { Box, Button, TextField, Typography, useTheme } from "@mui/material";
    import ArrowBackIcon from "@mui/icons-material/ArrowBack";
    import { useNavigate } from "react-router-dom";

    const Settings = () => {
    const theme = useTheme();
    const navigate = useNavigate();

    return (
        <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        p={3}
        >
        {/* Back button
        <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            sx={{
            bgcolor: "#00cfff",
            color: "black",
            mb: 2,
            alignSelf: "flex-start",
            }}
            onClick={() => navigate(-1)} // go back
        >
            عودة
        </Button> */}

        {/* Title */}
        <Typography variant="h4" gutterBottom>
            تعديل ملفك الشخصي
        </Typography>

        {/* Form */}
        <Box
            component="form"
            display="flex"
            flexDirection="column"
            gap={2}
            width="100%"
            maxWidth="400px"
        >
            <TextField label="الاسم *"  fullWidth />
            <TextField label="اسم المستخدم (اختياري)"  fullWidth />
            <TextField label="كلمة المرور (اختياري)" type="password" fullWidth />
            <TextField label="تأكيد كلمة المرور (اختياري)" type="password" fullWidth />
            <TextField
            label="عنوان البريد الإلكتروني *"
            type="email"
            fullWidth
            />
            <TextField
            label="تأكيد عنوان البريد الإلكتروني *"
            type="email"
            fullWidth
            />

            {/* Save button */}
            <Button
            variant="contained"
            sx={{ bgcolor: "#1976d2", color: "white", borderRadius: "20px" }}
            >
            حفظ
            </Button>
        </Box>
        </Box>
    );
    };

    export default Settings;
