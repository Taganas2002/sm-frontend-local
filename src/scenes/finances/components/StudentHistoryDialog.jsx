import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { studentReceipts } from "../../../api/billing";
import { getTranslations, translateBillingModel } from "../../../translations";
import { tokens } from "../../../theme";
import ReceiptDialog from "./ReceiptDialog";

const fmt = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatDateTime = (value, language) => {
  if (!value) return "";
  const locale = language === "ar" ? "ar-DZ" : language === "en" ? "en-CA" : "fr-FR";
  return new Date(value).toLocaleString(locale);
};

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
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [autoPrint, setAutoPrint] = useState(false);

  const { data: receipts, isFetching } = useQuery({
    queryKey: ["studentReceipts", studentId],
    queryFn: () => studentReceipts(studentId),
    enabled: open && !!studentId,
  });

  useEffect(() => {
    if (!open) {
      setSelectedReceipt(null);
      setAutoPrint(false);
    }
  }, [open]);

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const t = getTranslations(language);

  const labels = useMemo(
    () => ({
      historyTitle: t.receiptHistory || t.history || "History",
      recentReceipts: t.recentReceipts || "Recent receipts",
      due: t.due || "Due",
      paid: t.paid || "Paid",
      balance: t.balance || "Balance",
      period: t.period || "Period",
      method: t.method || "Method",
      cashier: t.cashier || "Cashier",
      receiptNumber: t.receiptNumber || "Receipt #",
      view: t.view || "View",
      reprint: t.reprint || t.print || "Reprint",
      noGroup: t.noGroup || "No group",
      noReceipts: t.noReceipts || "No receipts found.",
      total: t.total || "Total",
      openFullHistory: t.openFullHistory || "Open full history",
      pay: t.pay || "Pay",
      phone: t.phone || "Phone",
      student: t.student || "Student",
      notes: t.notes || "Notes",
      notAvailable: t.notAvailable || "N/A",
    }),
    [t]
  );

  const openReceipt = (receipt, shouldPrint = false) => {
    setSelectedReceipt(receipt);
    setAutoPrint(shouldPrint);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: "background.paper",
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack spacing={1}>
            <Typography variant="h5" fontWeight={700} textAlign="center">
              {labels.historyTitle} - {studentName || `${labels.student} #${studentId}`}
            </Typography>
            {phone && (
              <Typography variant="body2" color="text.secondary" textAlign="center">
                {labels.phone}: {phone}
              </Typography>
            )}
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ px: 3, pb: 2 }}>
          <Stack direction="row" spacing={1.5} mb={2.5} flexWrap="wrap" useFlexGap justifyContent="center">
            <Chip label={`${labels.due}: ${fmt.format(totals.due || 0)}`} color="warning" sx={{ fontWeight: 700 }} />
            <Chip label={`${labels.paid}: ${fmt.format(totals.paid || 0)}`} color="info" sx={{ fontWeight: 700 }} />
            <Chip
              label={`${labels.balance}: ${fmt.format(totals.balance || 0)}`}
              color={Number(totals.balance || 0) <= 0 ? "success" : "error"}
              sx={{ fontWeight: 700 }}
            />
            {period && <Chip label={`${labels.period}: ${period}`} variant="outlined" sx={{ fontWeight: 700 }} />}
          </Stack>

          <Divider sx={{ mb: 2.5 }} />

          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
            {labels.recentReceipts}
          </Typography>

          {isFetching ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress size={28} />
            </Box>
          ) : (receipts ?? []).length === 0 ? (
            <Box py={4} textAlign="center" color="text.secondary" sx={{ fontStyle: "italic" }}>
              {labels.noReceipts}
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {(receipts ?? []).slice(0, 10).map((receipt) => {
                const lines = receipt?.lines || [];
                return (
                  <Paper
                    key={receipt.id || receipt.receiptId || receipt.receiptNo}
                    elevation={0}
                    sx={{
                      borderRadius: 2.5,
                      p: 2,
                      bgcolor: colors.primary[400],
                      border: `1px solid ${colors.primary[300]}`,
                    }}
                  >
                    <Stack spacing={1.5}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                        <Box>
                          <Typography variant="h6" fontWeight={700} color="warning.main">
                            {fmt.format(receipt.total ?? receipt.totalAmount ?? 0)}
                          </Typography>
                          <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap" useFlexGap>
                            <Chip
                              size="small"
                              label={`${labels.method}: ${methodLabel(receipt.method, t)}`}
                              variant="outlined"
                            />
                            <Chip
                              size="small"
                              label={`${labels.cashier}: ${receipt.cashier?.fullName || receipt.cashier?.id || labels.notAvailable}`}
                              variant="outlined"
                            />
                          </Stack>
                        </Box>

                        <Box textAlign="right">
                          <Typography variant="body2" color="text.secondary">
                            {formatDateTime(receipt.issuedAt, language)}
                          </Typography>
                          <Typography
                            variant="body1"
                            fontWeight={700}
                            sx={{ fontFamily: "Consolas, monospace", mt: 0.5 }}
                          >
                            {receipt.receiptNo || labels.notAvailable}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack spacing={1}>
                        {lines.map((line, index) => (
                          <Box
                            key={`${receipt.receiptNo || receipt.id}-line-${index}`}
                            sx={{
                              borderRadius: 2,
                              px: 1.5,
                              py: 1,
                              bgcolor: colors.primary[500],
                            }}
                          >
                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                              <Box minWidth={0}>
                                <Typography variant="body1" fontWeight={600} noWrap>
                                  {line.groupName || labels.noGroup}
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
                                {fmt.format(line.amount || 0)}
                              </Typography>
                            </Stack>
                          </Box>
                        ))}
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                        <Typography variant="body2" color="text.secondary">
                          {labels.receiptNumber}: {receipt.receiptNo || labels.notAvailable}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityOutlinedIcon />}
                            onClick={() => openReceipt(receipt, false)}
                          >
                            {labels.view}
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<PrintOutlinedIcon />}
                            onClick={() => openReceipt(receipt, true)}
                            sx={{ fontWeight: 700 }}
                          >
                            {labels.reprint}
                          </Button>
                        </Stack>
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 3 }}>
          <Button onClick={onClose} variant="outlined" color="error">
            {t.close || "Close"}
          </Button>
          <Box display="flex" gap={1.5}>
            <Button
              variant="outlined"
              onClick={onGoFullHistory}
              sx={{
                backgroundColor: theme.palette.mode === "light" ? colors.blueAccent[800] : colors.blueAccent[400],
                color: "#fff",
                "&:hover": {
                  backgroundColor: theme.palette.mode === "light" ? colors.blueAccent[400] : colors.blueAccent[800],
                },
              }}
            >
              {labels.openFullHistory}
            </Button>
            <Button
              variant="contained"
              onClick={onGoPay}
              sx={{
                backgroundColor: theme.palette.mode === "light" ? colors.greenAccent[800] : colors.greenAccent[400],
                color: "#fff",
                "&:hover": {
                  backgroundColor: theme.palette.mode === "light" ? colors.greenAccent[400] : colors.greenAccent[800],
                },
              }}
            >
              {labels.pay}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {selectedReceipt && (
        <ReceiptDialog
          receipt={selectedReceipt}
          onClose={() => {
            setSelectedReceipt(null);
            setAutoPrint(false);
          }}
          language={language}
          autoPrint={autoPrint}
        />
      )}
    </>
  );
}
