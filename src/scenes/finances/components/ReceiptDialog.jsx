// src/scenes/finances/components/ReceiptDialog.jsx
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Grid,
  Paper,
  useTheme,
} from "@mui/material"; 
  import { tokens } from "../../../theme";


const fmt = new Intl.NumberFormat("ar-EG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  numberingSystem: "latn", // ✅ لضمان الأرقام الغربية
});

export default function ReceiptDialog({ receipt, onClose }) {
  const print = () => window.print();
  const theme = useTheme();
    const colors = tokens(theme.palette.mode);
  const total =
    receipt?.totalAmount != null ? receipt.totalAmount : receipt?.total ?? 0;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogContent sx={{ p: 0 }}>
        <Paper sx={{ p: 3 }}>
          {/* رأس الإيصال */}
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
إيصال الدفع     
      </Typography>
          </Box>

          {/* معلومات الإيصال */}
          <Box mb={2}>
            <Typography variant="body1">
              الرقم: {receipt.receiptNo}
            </Typography>
            <Typography variant="body1">
              التاريخ:{" "}
              {new Date(receipt.issuedAt).toLocaleDateString("ar-EG", {
                numberingSystem: "latn",
              })}
            </Typography>
          </Box>

          {/* الطالب */}
          <Box mb={2}>
            <Typography variant="body1" fontWeight="bold">
              اسم و لقب التلميذ : {receipt.student?.fullName}
            </Typography>
          </Box>

          {/* تفاصيل الرسوم */}
          <Box mb={2}>
            {(receipt.lines ?? []).map((l, i) => (
              <Box
                key={i}
                display="flex"
                justifyContent="space-between"
                sx={{ borderBottom: "1px dashed #ccc", py: 0.5 }}
              >
                <Typography variant="body1" fontWeight="bold">
                  {l.groupName || "(بدون مجموعة)"} — {l.model}
                  {l.period ? ` — ${l.period}` : ""}
                  {l.sessions ? ` — ${l.sessions} حصص` : ""}
                  {l.hours ? ` — ${l.hours} ساعة` : ""}
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {fmt.format(Number(l.amount || 0))}
                </Typography>
              </Box>
            ))}
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* الإجمالي */}
          <Box display="flex" justifyContent="space-between" mb={3}>
            <Typography variant="h4" fontWeight="bold">
              الإجمالي
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {fmt.format(Number(total))}
            </Typography>
          </Box>

          {/* التوقيع */}
          <Grid item xs={6} textAlign="center" mt={5}>
            <Typography variant="body2">_____________________</Typography>
            <Typography variant="caption" color="text.secondary" fontWeight="bold">
              توقيع المؤسسة
            </Typography>
          </Grid>

          {/* ملاحظة */}
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
            ملاحظة: المبلغ المدفوع غير قابل للاسترداد في أي حال من الأحوال.
          </Typography>
        </Paper>
      </DialogContent>

      {/* الإجراءات (مخفية عند الطباعة) */}
      <DialogActions className="no-print" >
        <Button onClick={onClose}  sx={{ bgcolor: "#757273ff", ml:1 }}>إغلاق</Button>
        <Button variant="contained" onClick={print} sx={{
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
        }}>
          طباعة
        </Button>
      </DialogActions>

      {/* CSS لإخفاء الأزرار عند الطباعة */}
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
