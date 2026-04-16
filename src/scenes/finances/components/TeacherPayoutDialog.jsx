import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

const fmtMoney = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatDateTime = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString("fr-FR");
};

const formatDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString("fr-FR");
};

const methodLabel = (method) => {
  const key = String(method || "").toUpperCase();
  const labels = {
    CASH: "Espèces",
    CARD: "Carte",
    BANK_TRANSFER: "Virement",
    WALLET: "Portefeuille",
    VOUCHER: "Bon",
    MIXED: "Mixte",
  };
  return labels[key] || method || "N/A";
};

export default function TeacherPayoutDialog({ payout, onClose }) {
  const safePayout = payout ?? {};
  const {
    payoutNo,
    createdAt,
    issuedAt,
    method,
    reference,
    teacherName,
    total,
    totalAmount,
  } = safePayout;

  const lines = Array.isArray(safePayout.lines) ? safePayout.lines : [];
  const totalToShow = Number(
    (typeof total === "number" ? total : undefined) ??
      (typeof totalAmount === "number" ? totalAmount : 0)
  );

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth={false}
      dir="rtl"
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
          className="teacher-payout-print-root"
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
                      MMS
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 24,
                        lineHeight: 1.05,
                        fontWeight: 800,
                        letterSpacing: "-0.04em",
                      }}
                    >
                      إيصال دفع للمعلم
                    </Typography>
                  </Box>

                  <Chip
                    label={methodLabel(method)}
                    size="small"
                    sx={{
                      height: 28,
                      fontWeight: 700,
                      bgcolor: "#e2e8f0",
                      color: "#0f172a",
                    }}
                  />
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="flex-end" spacing={2}>
                  <Box>
                    <Typography sx={{ fontSize: 11, color: "#94a3b8", mb: 0.5 }}>
                      رقم الإيصال
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 16,
                        fontWeight: 700,
                        fontFamily: '"IBM Plex Mono", "Consolas", monospace',
                        wordBreak: "break-word",
                      }}
                    >
                      {payoutNo || "N/A"}
                    </Typography>
                  </Box>

                  <Box textAlign="left">
                    <Typography sx={{ fontSize: 11, color: "#94a3b8", mb: 0.5 }}>
                      التاريخ
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                      {formatDateTime(issuedAt || createdAt)}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            </Box>

            <Stack direction="row" spacing={1.25} useFlexGap flexWrap="wrap" className="teacher-payout-meta-grid">
              <Box className="teacher-payout-meta-card" sx={{ flex: "1 1 180px" }}>
                <Typography className="teacher-payout-meta-label">المعلم</Typography>
                <Typography className="teacher-payout-meta-value">{teacherName || "—"}</Typography>
              </Box>

              <Box className="teacher-payout-meta-card" sx={{ flex: "1 1 120px" }}>
                <Typography className="teacher-payout-meta-label">المرجع</Typography>
                <Typography className="teacher-payout-meta-value">{reference || "—"}</Typography>
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
                  Détails
                </Typography>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Montant
                </Typography>
              </Stack>

              <Stack spacing={1}>
                {lines.length === 0 ? (
                  <Typography sx={{ color: "#64748b" }}>لا توجد تفاصيل.</Typography>
                ) : (
                  lines.map((line, index) => (
                    <Box
                      key={line.earningId ?? `${payoutNo || "payout"}-${index}`}
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
                            {line.groupName || "(بدون مجموعة)"}
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
                            {line.studentName ? `الطالب: ${line.studentName}` : `المصدر: ${line.paymentType || "ATTENDANCE_FIXED"}`}
                            {line.paymentType ? ` · النوع: ${line.paymentType}` : ""}
                            {line.periodKey ? ` · الفترة: ${line.periodKey}` : ""}
                          </Typography>

                          {line.earnedAt ? (
                            <Typography
                              sx={{
                                mt: 0.4,
                                fontSize: 11,
                                color: "#94a3b8",
                                wordBreak: "break-word",
                              }}
                            >
                              {formatDate(line.earnedAt)}
                              {line.studentPaymentId ? ` · Payment #${line.studentPaymentId}` : ""}
                            </Typography>
                          ) : line.studentPaymentId ? (
                            <Typography
                              sx={{
                                mt: 0.4,
                                fontSize: 11,
                                color: "#94a3b8",
                                wordBreak: "break-word",
                              }}
                            >
                              {`Payment #${line.studentPaymentId}`}
                            </Typography>
                          ) : null}
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
                          {fmtMoney.format(Number(line.amountNet || 0))}
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
                    الإجمالي
                  </Typography>
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                    Teacher Payout
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#15803d",
                    fontFamily: '"IBM Plex Mono", "Consolas", monospace',
                  }}
                >
                  {fmtMoney.format(totalToShow)}
                </Typography>
              </Stack>
            </Box>

            <Box
              sx={{
                border: "1px dashed #cbd5e1",
                borderRadius: 2,
                px: 1.5,
                py: 1.25,
                textAlign: "center",
              }}
            >
              <Typography sx={{ fontSize: 12, color: "#64748b", mb: 1 }}>توقيع المؤسسة</Typography>
              <Typography sx={{ letterSpacing: "0.12em", color: "#0f172a" }}>
                _____________________
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </DialogContent>

      <DialogActions className="no-print" sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          إغلاق
        </Button>
        <Button variant="contained" onClick={() => window.print()}>
          طباعة
        </Button>
      </DialogActions>

      <style>
        {`
          .teacher-payout-meta-card {
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 12px 14px;
            background: #ffffff;
          }

          .teacher-payout-meta-label {
            font-size: 11px;
            color: #94a3b8;
            margin-bottom: 4px;
          }

          .teacher-payout-meta-value {
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

            .teacher-payout-print-root,
            .teacher-payout-print-root * {
              visibility: visible;
            }

            .teacher-payout-print-root {
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

            .teacher-payout-meta-grid {
              display: block !important;
            }

            .teacher-payout-meta-card {
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
