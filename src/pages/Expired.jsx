// src/pages/Expired.jsx
import {
  Box,
  Typography,
  Stack,
  Button,
  Link,
  Paper,
  useTheme,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import { getTranslations } from "../translations";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE_TEL,
  FACEBOOK_URL,
  INSTAGRAM_URL,
} from "../constants/supportContact";
import { SupportPhoneInline } from "../utils/supportContactLabels";

export default function Expired({ language = "fr" }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const t = getTranslations(language);
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        px: { xs: 1.5, sm: 2 },
        py: { xs: 2, sm: 0 },
        background:
          isDark
            ? "radial-gradient(1200px 600px at 50% -10%, rgba(255,255,255,0.08), transparent)"
            : "radial-gradient(1200px 600px at 50% -10%, rgba(25,118,210,0.10), transparent)",
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: "100%",
          maxWidth: 960,
          borderRadius: 3,
          p: { xs: 2.5, sm: 4, md: 5 },
          textAlign: "center",
          backdropFilter: "blur(6px)",
          border: `1px solid ${
            isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"
          }`,
        }}
      >
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            mb: 1.5,
            fontSize: { xs: "1.65rem", sm: "2.125rem", md: "3rem" },
            lineHeight: 1.2,
          }}
        >
          {t.expiredPageTitle}
        </Typography>

        <Typography
          variant="h6"
          sx={{
            opacity: 0.95,
            mb: 2,
            maxWidth: 760,
            mx: "auto",
            fontWeight: 600,
            fontSize: { xs: "0.95rem", sm: "1.15rem" },
          }}
        >
          {t.expiredBanner ||
            "Your school account is no longer active. Contact support to renew."}
        </Typography>

        <Typography
          variant="body1"
          sx={{ opacity: 0.9, mb: 3, maxWidth: 720, mx: "auto", fontSize: { xs: "0.9rem", sm: "1rem" } }}
        >
          {t.expiredPageSubtitle ||
            "This may be because your trial ended or your subscription was deactivated by an administrator."}
        </Typography>

        <Typography
          variant="body2"
          sx={{ opacity: 0.85, mb: 2, maxWidth: 760, mx: "auto" }}
        >
          {t.expiredThankYou}
        </Typography>

        <Button
          size="large"
          fullWidth
          startIcon={<PhoneIcon />}
          component={Link}
          href={SUPPORT_PHONE_TEL}
          sx={{
            mb: 3,
            maxWidth: 420,
            mx: "auto",
            display: "inline-flex",
            px: 4,
            py: 1.5,
            fontSize: { xs: 15, sm: 18 },
            borderRadius: 999,
            background: "linear-gradient(135deg, #42a5f5, #1976d2)",
            color: "#fff",
            "&:hover": {
              background: "linear-gradient(135deg, #64b5f6, #1e88e5)",
            },
            textDecoration: "none",
          }}
        >
          <SupportPhoneInline t={t} />
        </Button>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="center"
          sx={{ mb: 2 }}
          useFlexGap
        >
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<EmailIcon />}
            component={Link}
            href={`mailto:${SUPPORT_EMAIL}`}
            target="_blank"
            rel="noopener"
            sx={{
              maxWidth: { xs: "100%", sm: 280 },
              px: 3,
              borderRadius: 2,
              textDecoration: "none",
            }}
          >
            {t.expiredEmailButton}
          </Button>

          <Button
            size="large"
            fullWidth
            startIcon={<FacebookIcon />}
            component={Link}
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener"
            sx={{
              maxWidth: { xs: "100%", sm: 280 },
              px: 3,
              borderRadius: 2,
              textDecoration: "none",
              backgroundColor: "#1877F2",
              color: "#fff",
              "&:hover": {
                backgroundColor: "#1565c0",
              },
            }}
          >
            {t.expiredFacebookButton}
          </Button>

          <Button
            variant="contained"
            color="secondary"
            size="large"
            fullWidth
            startIcon={<InstagramIcon />}
            component={Link}
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener"
            sx={{
              maxWidth: { xs: "100%", sm: 280 },
              px: 3,
              borderRadius: 2,
              textDecoration: "none",
            }}
          >
            {t.expiredInstagramButton}
          </Button>
        </Stack>

        <Typography variant="body2" sx={{ mt: 2, opacity: 0.8, px: 1 }}>
          {t.expiredHelpFooter}{" "}
          <Link href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</Link>.
        </Typography>
      </Paper>
    </Box>
  );
}
