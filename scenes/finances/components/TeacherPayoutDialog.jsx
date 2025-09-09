import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Divider,
  Typography,
} from "@mui/material";
import translations from "../../../translations";


const fmtMoney = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function TeacherPayoutDialog({ payout, onClose,  language = "fr" }) {
  // Guard against missing payout or lines
  const safePayout = payout ?? {};
  const {
    payoutNo,
    createdAt,
    method,
    reference,
    teacherName,
    total,
    totalAmount, // some backends use this
  } = safePayout;

  const lines = Array.isArray(safePayout.lines) ? safePayout.lines : [];
  const totalToShow = Number(
    (typeof total === "number" ? total : undefined) ??
      (typeof totalAmount === "number" ? totalAmount : 0)
  );

  const handlePrint = () => window.print();
  const t = translations[language] || translations["fr"];


  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {t.PaiementEnseignant} {payoutNo ? `#${payoutNo}` : ""}
      </DialogTitle>

      <DialogContent>
        <Box display="grid" gap={0.5} mb={1}>
          <Typography variant="subtitle2">
            {t.date} {createdAt ? new Date(createdAt).toLocaleString() : "—"}
          </Typography>
          <Typography variant="subtitle2">
            {t.teacher} {teacherName || "—"}
          </Typography>
          <Typography variant="subtitle2">
            {t.method}: {method || "—"}
          </Typography>
          {reference ? (
            <Typography variant="subtitle2">{t.reference} : {reference}</Typography>
          ) : null}
        </Box>

        <Divider sx={{ my: 1 }} />

        {lines.length === 0 ? (
          <Typography color="text.secondary">{t.noLines}.</Typography>
        ) : (
          <Box display="grid" gap={1}>
            {lines.map((l, i) => (
              <Box
                key={l.earningId ?? i}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {l.groupName || "(no group)"}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    {t.earned}:{" "}
                    {l.earnedAt
                      ? new Date(l.earnedAt).toLocaleString()
                      : "—"}
                  </div>
                </div>
                <div style={{ fontWeight: 600 }}>
                  {fmtMoney.format(Number(l.amountNet || 0))}
                </div>
              </Box>
            ))}
          </Box>
        )}

        <Divider sx={{ my: 1 }} />

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{t.total}</Typography>
          <Typography variant="h6">
            {fmtMoney.format(totalToShow)}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={handlePrint}>
          {t.print}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
