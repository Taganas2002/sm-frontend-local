import { Box, Typography, Paper } from "@mui/material";
import Header from "../../components/Header";
import translations from "../../translations";
import { useTheme } from "@mui/material/styles";

// ✅ Import images from src/assets/screenshots
import classroomImg from "../../assets/screenshots/classroom.jpg";
import teacherImg from "../../assets/screenshots/teacher.jpg";
import matiereImg from "../../assets/screenshots/matiere.jpg";
import levelImg from "../../assets/screenshots/level.jpg";
import sectionImg from "../../assets/screenshots/section.jpg";
import groupImg from "../../assets/screenshots/group.jpg";
import studentImg from "../../assets/screenshots/student.jpg";
import enrollmentImg from "../../assets/screenshots/enrollment.jpg";
import calendarImg from "../../assets/screenshots/calendar.jpg";

const Guide = ({ language }) => {
  const t = translations[language] || translations["fr"];
  const theme = useTheme();

  const steps = [
    { title: t.title1, description: t.desc1, screenshot: classroomImg },
    { title: t.title2, description: t.desc2, screenshot: teacherImg },
    { title: t.title3, description: t.desc3, screenshot: matiereImg },
    { title: t.title4, description: t.desc4, screenshot: levelImg },
    { title: t.title5, description: t.desc5, screenshot: sectionImg },
    { title: t.title6, description: t.desc6, screenshot: groupImg },
    { title: t.title7, description: t.desc7, screenshot: studentImg },
    { title: t.title8, description: t.desc8, screenshot: enrollmentImg },
    { title: t.title9, description: t.desc9, screenshot: calendarImg },
  ];

  return (
    <Box m={3}>
      <Header
        title={t?.guideTitle || "Guide d’utilisation"}
        subtitle={
          t?.guideSubtitle ||
          "Suivez ces étapes pour bien démarrer avec le logiciel"
        }
      />

      <Box mt={2} display="flex" flexDirection="column" gap={3}>
        {steps.map((step, idx) => (
          <Paper
            key={idx}
            elevation={3}
            sx={{
              borderRadius: 2,
              p: 3,
              backgroundColor:
                theme.palette.mode === "light" ? "#eaf3ff" : "#2f3f5a",
              "&:hover": {
                boxShadow: "0px 4px 12px rgba(5, 126, 255, 0.5)", // custom blue shadow
              },
              transition: "box-shadow 0.3s ease",
            }}
          >
            {/* Flex container for text (left) and image (right) */}
            <Box
              display="flex"
              flexDirection={{ xs: "column", md: "row" }}
              alignItems="center"
              gap={3}
            >
              {/* Text */}
              <Box flex={1}>
                <Typography
                  variant="h4"
                  fontWeight={600}
                  mb={1}
                  sx={{
                    color:
                      theme.palette.mode === "light" ? "#1e3a8a" : "#57a5fa",
                  }}
                >
                  {step.title}
                </Typography>
                <Typography variant="h5" mb={2}>
                  {step.description}
                </Typography>
              </Box>

              {/* Image */}
              {step.screenshot && (
                <Box
                  component="img"
                  src={step.screenshot}
                  alt={step.title}
                  sx={{
                    flex: 1,
                    width: "100%",
                    maxWidth: 650,
                    borderRadius: 2,
                    objectFit: "contain",
                  }}
                />
              )}
            </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

export default Guide;
