// src/scenes/finances/components/ReceiptDialog.jsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
} from "@mui/material";

const fmt = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function ReceiptDialog({ receipt, onClose }) {
  const print = () => window.print();

  const total =
    receipt?.totalAmount != null ? receipt.totalAmount : receipt?.total ?? 0;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Receipt #{receipt.receiptNo}</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle2">
          Issued: {new Date(receipt.issuedAt).toLocaleString()}
        </Typography>
        <Typography variant="subtitle2">
          Student: {receipt.student?.fullName}
        </Typography>
        <Divider sx={{ my: 1 }} />
        <Box display="grid" gap={1}>
          {(receipt.lines ?? []).map((l, i) => (
            <Box key={i} display="flex" justifyContent="space-between">
              <div>
                {l.groupName || "(no group)"} — {l.model}
                {l.period ? ` — ${l.period}` : ""}
                {l.sessions ? ` — ${l.sessions} sessions` : ""}
                {l.hours ? ` — ${l.hours} h` : ""}
              </div>
              <div>{fmt.format(Number(l.amount || 0))}</div>
            </Box>
          ))}
        </Box>
        <Divider sx={{ my: 1 }} />
        <Box display="flex" justifyContent="space-between">
          <Typography variant="h6">Total</Typography>
          <Typography variant="h6">{fmt.format(Number(total))}</Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={print}>
          Print
        </Button>
      </DialogActions>
    </Dialog>
  );
}
