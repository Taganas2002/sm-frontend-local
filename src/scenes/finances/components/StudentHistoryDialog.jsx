// src/scenes/finances/components/StudentHistoryDialog.jsx
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  Paper,
  CircularProgress,
  useTheme
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { studentReceipts } from "../../../api/billing";
import translations from "../../../translations";
import { tokens } from "../../../theme";

const fmt = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function StudentHistoryDialog({
  open,
  onClose,
  studentId,
  studentName,
  phone,
  period,
  totals = { due: 0, paid: 0, balance: 0 }, 
  onGoPay,
  onGoFullHistory,
  language, 
}) {
  const { data: receipts, isFetching } = useQuery({
    queryKey: ["studentReceipts", studentId],
    queryFn: () => studentReceipts(studentId),
    enabled: open && !!studentId,
  });

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = translations[language] || translations["fr"]; // fallback French

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      sx={{
        "& .MuiDialog-container": {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 3,
          bgcolor: "background.paper",
          width: "50%",
          maxWidth: "700px",
        },
      }}
    >
      <Paper
        elevation={3}
        sx={{
          borderRadius: 2,
          p: 4,
          bgcolor: "background.paper",
        }}
      >
        {/* ---------- HEADER ---------- */}
        <DialogTitle
  sx={{
    fontWeight: "bold",
    fontSize: "1.4rem",
    textAlign: "center",
    pb: 1,
  }}
>
  {t.history} — {studentName || `${t.student} #${studentId}`}
  {phone && (
    <Typography
      variant="subtitle2"
      component="span"   // 👈 force span instead of h6
      color="text.secondary"
      sx={{ mt: 0.5, display: "block" }} // block to show below
    >
      {phone}
    </Typography>
  )}
</DialogTitle>


        <DialogContent sx={{ px: 3, py: 2 }}>
          {/* Totals Summary */}
          <Stack
            direction="row"
            spacing={2}
            mb={2}
            flexWrap="wrap"
            justifyContent="center"
          >
            <Chip
              label={`${t.due}: ${fmt.format(totals.due)}`}
              color="warning"
              sx={{ fontWeight: "bold" }}
            />
            <Chip
              label={`${t.paid}: ${fmt.format(totals.paid)}`}
              color="info"
              sx={{ fontWeight: "bold" }}
            />
            <Chip
              label={`${t.balance}: ${fmt.format(totals.balance)}`}
              color={totals.balance <= 0 ? "success" : "error"}
              sx={{ fontWeight: "bold" }}
            />
            {period && (
              <Chip
                label={`${t.period}: ${period}`}
                variant="outlined"
                sx={{ fontWeight: "bold" }}
              />
            )}
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* ---------- RECEIPTS LIST ---------- */}
          <Typography
            variant="h6"
            sx={{ mb: 1, fontWeight: "bold", color: "text.primary" }}
          >
            {t.recentReceipts}
          </Typography>

          <List dense disablePadding>
            {(receipts ?? []).slice(0, 10).map((r) => (
              <Paper
                key={r.receiptId}
                elevation={1}
                sx={{
                  mb: 1.5,
                  borderRadius: 2,
                  p: 1.5,
                  bgcolor: "background.default",
                }}
              >
                <ListItem disablePadding>
                  <ListItemText
                    primary={
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography variant="body1" fontWeight="bold">
                          #{r.receiptNo}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(r.issuedAt).toLocaleString()}
                        </Typography>
                        <Typography
                          variant="body1"
                          fontWeight="bold"
                          color="primary"
                        >
                          {fmt.format(r.total ?? r.totalAmount ?? 0)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        {(r.lines ?? [])
                          .map((l) => {
                            const bits = [
                              l.groupName || t.noGroup,
                              l.model,
                              l.period ? `(${l.period})` : null,
                            ].filter(Boolean);
                            return `${bits.join(" ")} — ${fmt.format(
                              l.amount || 0
                            )}`;
                          })
                          .join(" | ")}
                      </Typography>
                    }
                  />
                </ListItem>
              </Paper>
            ))}

            {(!receipts || receipts.length === 0) && !isFetching && (
              <Box
                p={3}
                textAlign="center"
                color="text.secondary"
                sx={{ fontStyle: "italic" }}
              >
                {t.noReceipts}
              </Box>
            )}
          </List>

          {isFetching && (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress size={24} />
            </Box>
          )}
        </DialogContent>

        {/* ---------- ACTIONS ---------- */}
        <DialogActions
          sx={{
            justifyContent: "space-between",
            px: 3,
            pb: 2,
            pt: 1,
            
          }}
          
        >
          <Button onClick={onClose} variant="outlined" color="error">
            {t.close}
          </Button>
  <Box display="flex" gap={2}>

            <Button
              variant="outlined"
              onClick={onGoFullHistory}
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
            >
              {t.openFullHistory}
            </Button>
            <Button
              variant="contained"
              onClick={onGoPay}
              sx={{
                backgroundColor:
                  theme.palette.mode === "light"
                    ? colors.greenAccent[800]
                    : colors.greenAccent[400],
                color: "#fff",
                "&:hover": {
                  backgroundColor:
                    theme.palette.mode === "light"
                      ? colors.greenAccent[400]
                      : colors.greenAccent[800],
                },
              }}
            >
              {t.pay}
            </Button>
          </Box>
        </DialogActions>
      </Paper>
    </Dialog>
  );
}
