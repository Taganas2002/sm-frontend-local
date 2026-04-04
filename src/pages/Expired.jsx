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

export default function Expired() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        px: 2,
        // subtle background polish
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
          maxWidth: 960,                 // ➜ bigger
          borderRadius: 3,
          p: { xs: 3, sm: 5 },          // ➜ more padding
          textAlign: "center",
          backdropFilter: "blur(6px)",
          border: `1px solid ${
            isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"
          }`,
        }}
      >
        {/* Header */}
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1.5 }}>
          Votre période d’essai a expiré
        </Typography>

        <Typography
          variant="h6"
          sx={{ opacity: 0.9, mb: 3, maxWidth: 760, mx: "auto" }}
        >
          Merci d’utiliser <strong>Madrasti Management Software</strong>. Pour continuer, contactez-nous
          pour activer la version complète (hors-ligne, paiement à la livraison).
        </Typography>

        {/* Big phone CTA */}
        <Button
          size="large"
          startIcon={<PhoneIcon />}
          component={Link}
          href="tel:0553315593"
          sx={{
            mb: 3,
            px: 4,
            py: 1.5,
            fontSize: 18,
            borderRadius: 999,
            background:
              "linear-gradient(135deg, #42a5f5, #1976d2)",
            color: "#fff",
            "&:hover": {
              background: "linear-gradient(135deg, #64b5f6, #1e88e5)",
            },
            textDecoration: "none",
          }}
        >
          Appeler le support : 0553 31 55 93
        </Button>

        {/* Contact buttons */}
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
            startIcon={<EmailIcon />}
            component={Link}
            href="mailto:madrastims@gmail.com"
            target="_blank"
            rel="noopener"
            sx={{ px: 3, borderRadius: 2, textDecoration: "none" }}
          >
            Email
          </Button>

          <Button
  size="large"
  startIcon={<FacebookIcon />}
  component={Link}
  href="https://web.facebook.com/profile.php?id=61580333345908"
  target="_blank"
  rel="noopener"
  sx={{
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
  Facebook
</Button>


          <Button
            variant="contained"
            color="secondary"
            size="large"
            startIcon={<InstagramIcon />}
            component={Link}
            href="https://www.instagram.com/madrasti_m.s/"
            target="_blank"
            rel="noopener"
            sx={{ px: 3, borderRadius: 2, textDecoration: "none" }}
          >
            Instagram
          </Button>
        </Stack>

        <Typography variant="body2" sx={{ mt: 2, opacity: 0.8 }}>
          Besoin d’aide rapide ? Écrivez-nous à{" "}
          <Link href="mailto:madrastims@gmail.com">madrastims@gmail.com</Link>.
        </Typography>
      </Paper>
    </Box>
  );
}
