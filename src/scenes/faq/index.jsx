    import { Box, useTheme, Accordion, AccordionSummary, AccordionDetails, Typography, Paper } from "@mui/material";
    import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
    import Header from "../../components/Header";
    import translations from "../../translations";

    const FAQ = ({ language }) => {
    const theme = useTheme();
    const t = translations[language] || translations["fr"];

    const questionColor = theme.palette.mode === "light" ? "#0A4F9F" : "#65ce30";
    const answerColor = theme.palette.mode === "light" ? theme.palette.grey[800] : theme.palette.grey[300];
    const bgColor = theme.palette.mode === "light" ? "#ffffff" : theme.palette.background.paper;

    const faqItems = [
        { q: t?.faq?.q1, a: t?.faq?.a1 },
        { q: t?.faq?.q2, a: t?.faq?.a2 },
        { q: t?.faq?.q3, a: t?.faq?.a3 },
        { q: t?.faq?.q4, a: t?.faq?.a4 },
        { q: t?.faq?.q5, a: t?.faq?.a5 },
        { q: t?.faq?.q6, a: t?.faq?.a6 },
    ];

    return (
        <Box m={3}>
        <Header title={t?.faqTitle || "FAQ"} subtitle={t?.faqSubtitle} />

        <Box mt={2} display="flex" flexDirection="column" gap={2}>
            {faqItems.map((item, idx) =>
            item?.q ? (
                <Paper
                key={idx}
                elevation={3}
                sx={{
                    borderRadius: 2,
                    overflow: "hidden",
                    "&:hover": { boxShadow: 6 },
                    transition: "box-shadow 0.3s ease",
                    backgroundColor: bgColor,
                }}
                >
                <Accordion disableGutters elevation={0}>
                    <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ color: questionColor }} />}
                    sx={{
                        px: 2,
                        py: 1.5,
                        "&:hover": { backgroundColor: theme.palette.action.hover },
                    }}
                    >
                    <Typography
                        variant="h6"
                        fontWeight={600}
                        color={questionColor}
                    >
                        {item.q}
                    </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 3, py: 2 }}>
                    <Typography variant="body1" color={answerColor} lineHeight={1.7}>
                        {item.a}
                    </Typography>
                    </AccordionDetails>
                </Accordion>
                </Paper>
            ) : null
            )}
        </Box>
        </Box>
    );
    };

    export default FAQ;
