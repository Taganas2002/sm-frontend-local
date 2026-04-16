import {
  Chip,
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
  const t = getTranslations(language);
  const colors = tokens(theme.palette.mode);
  const isRtl = language === "ar";

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

  const schoolName = receipt?.school?.name || "MMS";

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth={false}
      dir={isRtl ? "rtl" : "ltr"}
      data-testid="receipt-dialog"
      PaperProps={{
        sx: {
          width: "min(92vw, 460px)",
          maxWidth: "460px",
          borderRadius: 3,
          overflow: "hidden",
          bgcolor: "transparent",
          boxShadow: "none",
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Paper
          className="receipt-print-root"
          sx={{
            p: { xs: 2.5, sm: 3 },
            bgcolor: "#fff",
            color: "#111827",
            borderRadius: 3,
            boxShadow: "0 18px 48px rgba(15, 23, 42, 0.18)",
            fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
          }}
        >
          <Stack spacing={2.25}>
            <Box
              sx={{
                border: "1px solid #d1d5db",
                borderRadius: 2.5,
                px: 2,
                py: 1.75,
                background:
                  "linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(255,255,255,1) 100%)",
              }}
            >
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography
                      sx={{
                        fontSize: 11,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "#64748b",
                        mb: 0.5,
                      }}
                    >
                      {schoolName}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 26,
                        lineHeight: 1,
                        fontWeight: 800,
                        letterSpacing: "-0.04em",
                      }}
                    >
                      {labels.receipt}
                    </Typography>
                  </Box>

                  <Chip
                    label={methodLabel(receipt?.method, t)}
                    size="small"
                    sx={{
                      height: 28,
                      fontWeight: 700,
                      bgcolor: "#e2e8f0",
                      color: "#0f172a",
                    }}
                  />
                </Stack>

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-end"
                  spacing={2}
                >
                  <Box>
                    <Typography sx={{ fontSize: 11, color: "#94a3b8", mb: 0.5 }}>
                      {labels.receiptNumber}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 16,
                        fontWeight: 700,
                        fontFamily: '"IBM Plex Mono", "Consolas", monospace',
                        wordBreak: "break-word",
                      }}
                    >
                      {receipt?.receiptNo || labels.notAvailable}
                    </Typography>
                  </Box>

                  <Box textAlign={isRtl ? "left" : "right"}>
                    <Typography sx={{ fontSize: 11, color: "#94a3b8", mb: 0.5 }}>
                      {labels.issued}
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                      {formatIssuedAt(receipt?.issuedAt, language)}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            </Box>

            <Stack
              direction="row"
              spacing={1.25}
              useFlexGap
              flexWrap="wrap"
              className="receipt-meta-grid"
            >
              <Box className="receipt-meta-card" sx={{ flex: "1 1 180px" }}>
                <Typography className="receipt-meta-label">{labels.student}</Typography>
                <Typography className="receipt-meta-value">
                  {receipt?.student?.fullName || labels.notAvailable}
                </Typography>
              </Box>
              <Box className="receipt-meta-card" sx={{ flex: "1 1 120px" }}>
                <Typography className="receipt-meta-label">{labels.cashier}</Typography>
                <Typography className="receipt-meta-value">
                  {receipt?.cashier?.fullName || receipt?.cashier?.id || labels.notAvailable}
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ borderColor: "#cbd5e1", borderStyle: "dashed" }} />

            <Box>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 1.25, px: 0.25 }}
              >
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Details
                </Typography>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Amount
                </Typography>
              </Stack>

              <Stack spacing={1}>
                {lines.length === 0 ? (
                  <Typography color="text.secondary">{labels.noLines}</Typography>
                ) : (
                  lines.map((line, index) => (
                    <Box
                      key={`${receipt?.id || receipt?.receiptNo}-line-${index}`}
                      sx={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 2,
                        px: 1.5,
                        py: 1.25,
                        backgroundColor: "#fff",
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
                        <Box minWidth={0} flex={1}>
                          <Typography
                            sx={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#0f172a",
                              lineHeight: 1.3,
                              wordBreak: "break-word",
                            }}
                          >
                            {line.groupName || labels.notAvailable}
                          </Typography>
                          <Typography
                            sx={{
                              mt: 0.35,
                              fontSize: 12,
                              color: "#64748b",
                              lineHeight: 1.45,
                              wordBreak: "break-word",
                            }}
                          >
                            {translateBillingModel(line.model, t)}
                            {line.period ? ` - ${line.period}` : ""}
                            {line.sessions ? ` - ${line.sessions} session` : ""}
                            {line.hours ? ` - ${line.hours} h` : ""}
                          </Typography>
                          {line.note && (
                            <Typography
                              sx={{
                                mt: 0.4,
                                fontSize: 11,
                                color: "#94a3b8",
                                wordBreak: "break-word",
                              }}
                            >
                              {labels.notes}: {line.note}
                            </Typography>
                          )}
                        </Box>

                        <Typography
                          sx={{
                            fontSize: 15,
                            fontWeight: 800,
                            color: "#0f172a",
                            whiteSpace: "nowrap",
                            fontFamily: '"IBM Plex Mono", "Consolas", monospace',
                          }}
                        >
                          {fmt.format(Number(line.amount || 0))}
                        </Typography>
                      </Stack>
                    </Box>
                  ))
                )}
              </Stack>
            </Box>

            <Box
              sx={{
                borderTop: "1px dashed #94a3b8",
                pt: 1.5,
                mt: 0.5,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography sx={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>
                    {labels.total}
                  </Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                    {labels.receipt}
                  </Typography>
                </Box>
                <Typography
                  variant="h5"
                  fontWeight={800}
                  data-testid="receipt-total-amount"
                  sx={{
                    color: colors.greenAccent[300],
                    fontFamily: '"IBM Plex Mono", "Consolas", monospace',
                  }}
                >
                  {fmt.format(Number(total || 0))}
                </Typography>
              </Stack>
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
          .receipt-meta-card {
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 12px 14px;
            background: #ffffff;
          }

          .receipt-meta-label {
            font-size: 11px;
            color: #94a3b8;
            margin-bottom: 4px;
          }

          .receipt-meta-value {
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
            word-break: break-word;
          }

          @page {
            size: 80mm auto;
            margin: 6mm;
          }

          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            body * {
              visibility: hidden;
            }

            .receipt-print-root,
            .receipt-print-root * {
              visibility: visible;
            }

            .receipt-print-root {
              position: absolute !important;
              inset: 0 auto auto 0 !important;
              width: 80mm !important;
              min-width: 80mm !important;
              max-width: 80mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
              border-radius: 0 !important;
              box-shadow: none !important;
            }

            .receipt-meta-grid {
              display: block !important;
            }

            .receipt-meta-card {
              margin-bottom: 8px !important;
              break-inside: avoid;
            }

            .MuiDialog-root,
            .MuiDialog-container,
            .MuiDialog-paper,
            .MuiDialogContent-root {
              overflow: visible !important;
              background: transparent !important;
              box-shadow: none !important;
            }

            .no-print {
              display: none !important;
            }
          }
        `}
      </style>
    </Dialog>
  );
}
