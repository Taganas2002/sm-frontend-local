import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { useEffect } from "react";
import { getTranslations, translateBillingModel } from "../../../translations";
import { tokens } from "../../../theme";

const fmt = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const methodLabel = (method, t) => {
  const labels = {
    CASH: t.cash || "Cash",
    CARD: t.card || "Card",
    BANK_TRANSFER: t.bankTransfer || "Bank transfer",
    WALLET: t.wallet || "Wallet",
    VOUCHER: t.voucher || "Voucher",
    MIXED: t.mixed || "Mixed",
  };
  return labels[String(method || "").toUpperCase()] || method || t.notAvailable || "N/A";
};

const formatIssuedAt = (value, language) => {
  if (!value) return "";
  const locale = language === "ar" ? "ar-DZ" : language === "en" ? "en-CA" : "fr-FR";
  return new Date(value).toLocaleString(locale);
};

export default function ReceiptDialog({ receipt, onClose, language = "fr", autoPrint = false }) {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = getTranslations(language);

  useEffect(() => {
    if (!autoPrint) return undefined;
    const timer = setTimeout(() => window.print(), 150);
    return () => clearTimeout(timer);
  }, [autoPrint]);

  const total = receipt?.totalAmount != null ? receipt.totalAmount : receipt?.total ?? 0;
  const lines = receipt?.lines || [];
  const labels = {
    receipt: t.receiptTitle || t.receipt || "Receipt",
    receiptNumber: t.receiptNumber || "Receipt #",
    issued: t.issued || "Issued",
    student: t.student || "Student",
    method: t.method || "Method",
    cashier: t.cashier || "Cashier",
    total: t.total || "Total",
    notes: t.notes || "Notes",
    close: t.close || "Close",
    print: t.print || "Print",
    noLines: t.noLines || "No lines.",
    notAvailable: t.notAvailable || "N/A",
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" dir={language === "ar" ? "rtl" : "ltr"} data-testid="receipt-dialog">
      <DialogContent sx={{ p: 0 }}>
        <Paper sx={{ p: 3, bgcolor: "background.paper" }}>
          <Box textAlign="center" mb={3}>
            <Typography
              variant="h4"
              sx={{
                bgcolor: colors.blueAccent[400],
                color: "#fff",
                py: 1.25,
                borderRadius: 2,
                fontWeight: 700,
              }}
            >
              {labels.receipt}
            </Typography>
          </Box>

          <Stack spacing={2.5}>
            <Stack direction="row" justifyContent="space-between" spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {labels.receiptNumber}
                </Typography>
                <Typography variant="h6" fontWeight={700} sx={{ fontFamily: "Consolas, monospace" }}>
                  {receipt?.receiptNo || labels.notAvailable}
                </Typography>
              </Box>
              <Box textAlign={language === "ar" ? "left" : "right"}>
                <Typography variant="body2" color="text.secondary">
                  {labels.issued}
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {formatIssuedAt(receipt?.issuedAt, language)}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Box minWidth={180}>
                <Typography variant="body2" color="text.secondary">
                  {labels.student}
                </Typography>
                <Typography variant="body1" fontWeight={700}>
                  {receipt?.student?.fullName || labels.notAvailable}
                </Typography>
              </Box>
              <Box minWidth={140}>
                <Typography variant="body2" color="text.secondary">
                  {labels.method}
                </Typography>
                <Typography variant="body1" fontWeight={700}>
                  {methodLabel(receipt?.method, t)}
                </Typography>
              </Box>
              <Box minWidth={140}>
                <Typography variant="body2" color="text.secondary">
                  {labels.cashier}
                </Typography>
                <Typography variant="body1" fontWeight={700}>
                  {receipt?.cashier?.fullName || receipt?.cashier?.id || labels.notAvailable}
                </Typography>
              </Box>
            </Stack>

            <Divider />

            <Stack spacing={1.25}>
              {lines.length === 0 ? (
                <Typography color="text.secondary">{labels.noLines}</Typography>
              ) : (
                lines.map((line, index) => (
                  <Box
                    key={`${receipt?.id || receipt?.receiptNo}-line-${index}`}
                    sx={{
                      borderRadius: 2,
                      px: 1.5,
                      py: 1.25,
                      bgcolor: colors.primary[400],
                      border: `1px solid ${colors.primary[300]}`,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="center">
                      <Box minWidth={0}>
                        <Typography variant="body1" fontWeight={700} noWrap>
                          {line.groupName || labels.notAvailable}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {translateBillingModel(line.model, t)}
                          {line.period ? ` - ${line.period}` : ""}
                          {line.sessions ? ` - ${line.sessions} session` : ""}
                          {line.hours ? ` - ${line.hours} h` : ""}
                        </Typography>
                        {line.note && (
                          <Typography variant="caption" color="text.secondary">
                            {labels.notes}: {line.note}
                          </Typography>
                        )}
                      </Box>
                      <Typography variant="body1" fontWeight={700} whiteSpace="nowrap">
                        {fmt.format(Number(line.amount || 0))}
                      </Typography>
                    </Stack>
                  </Box>
                ))
              )}
            </Stack>

            <Divider />

            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" fontWeight={700}>
                {labels.total}
              </Typography>
              <Typography variant="h5" fontWeight={700} color="warning.main" data-testid="receipt-total-amount">
                {fmt.format(Number(total || 0))}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </DialogContent>

      <DialogActions className="no-print" sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          {labels.close}
        </Button>
        <Button
          variant="contained"
          onClick={() => window.print()}
          sx={{
            backgroundColor: theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400],
            color: "#fff",
            "&:hover": {
              backgroundColor: theme.palette.mode === "light" ? colors.blueAccent[400] : colors.blueAccent[800],
            },
          }}
        >
          {labels.print}
        </Button>
      </DialogActions>

      <style>
        {`
          @media print {
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>
    </Dialog>
  );
}
