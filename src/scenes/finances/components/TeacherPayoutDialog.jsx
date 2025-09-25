// src/scenes/finances/components/TeacherPayoutDialog.jsx
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Grid,
  Paper,useTheme,
} from "@mui/material";
    import { tokens } from "../../../theme";


const fmtMoney = new Intl.NumberFormat("ar-EG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  numberingSystem: "latn", // ✅ أرقام غربية
});

export default function TeacherPayoutDialog({ payout, onClose }) {
  const safePayout = payout ?? {};
  const {
    payoutNo,
    // createdAt,
    method,
    reference,
    teacherName,
    total,
    totalAmount,
  } = safePayout;
    const theme = useTheme();
    const colors = tokens(theme.palette.mode);

  const lines = Array.isArray(safePayout.lines) ? safePayout.lines : [];
  const totalToShow = Number(
    (typeof total === "number" ? total : undefined) ??
      (typeof totalAmount === "number" ? totalAmount : 0)
  );

  const handlePrint = () => window.print();

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogContent sx={{ p: 0 }}>
        <Paper sx={{ p: 3 }}>
          {/* العنوان */}
          <Box textAlign="center" mb={2}>
            <Typography
              variant="h4"
              sx={{
                bgcolor: "#93c5fd",
                color: "black",
                py: 1,
                fontWeight: "bold",
              }}
            >
              إيصال دفع للمعلم {payoutNo ? `#${payoutNo}` : ""}
            </Typography>
          </Box>

          {/* معلومات الدفع */}
          <Box mb={2}>
          {/* <Typography variant="body1">
  التاريخ:{" "}
  {createdAt
    ? new Date(createdAt).toLocaleDateString("ar-EG", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        numberingSystem: "latn", // ✅ يضمن أرقام غربية 123
      })
    : "—"}
</Typography> */}

            <Typography variant="body1">
              المعلم: {teacherName || "—"}
            </Typography>
            <Typography variant="body1">
              طريقة الدفع: {method || "—"}
            </Typography>
            {reference ? (
              <Typography variant="body1">المرجع: {reference}</Typography>
            ) : null}
          </Box>

          {/* التفاصيل */}
          <Box mb={2}>
            {lines.length === 0 ? (
              <Typography color="text.secondary">لا توجد تفاصيل.</Typography>
            ) : (
              (lines ?? []).map((l, i) => (
                <Box
                  key={l.earningId ?? i}
                  display="flex"
                  justifyContent="space-between"
                  sx={{ borderBottom: "1px dashed #ccc", py: 0.5 }}
                >
                  <Typography variant="body1" fontWeight="bold">
                    {l.groupName || "(بدون مجموعة)"}
                    {l.earnedAt
                      ? ` — ${new Date(l.earnedAt).toLocaleDateString("ar-EG", {
                          numberingSystem: "latn",
                        })}`
                      : ""}
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {fmtMoney.format(Number(l.amountNet || 0))}
                  </Typography>
                </Box>
              ))
            )}
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* الإجمالي */}
          <Box display="flex" justifyContent="space-between" mb={3}>
            <Typography variant="h4" fontWeight="bold">
              الإجمالي
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {fmtMoney.format(totalToShow)}
            </Typography>
          </Box>

          {/* التوقيع */}
          <Grid item xs={6} textAlign="center" mt={5}>
            <Typography variant="body2">_____________________</Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight="bold"
            >
              توقيع المؤسسة
            </Typography>
          </Grid>

          {/* ملاحظة
          <Typography
            variant="caption"
            sx={{
              display: "block",
              bgcolor: "#93c5fd",
              color: "black",
              mt: 2,
              p: 1,
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            ملاحظة: المبلغ غير قابل للاسترجاع في أي حال من الأحوال.
          </Typography> */}
        </Paper>
      </DialogContent>

      {/* الإجراءات (مخفية عند الطباعة) */}
      <DialogActions className="no-print">
        <Button onClick={onClose}  sx={{ bgcolor: "#757273ff", ml:1 }}>إغلاق</Button>
        <Button
          variant="contained"
          onClick={handlePrint}
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
          طباعة
        </Button>
      </DialogActions>

      {/* CSS لإخفاء الأزرار أثناء الطباعة */}
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
