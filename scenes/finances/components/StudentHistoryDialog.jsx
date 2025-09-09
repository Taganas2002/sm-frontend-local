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
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { studentReceipts } from "../../../api/billing";

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
  totals, // { due, paid, balance }
  onGoPay,
  onGoFullHistory,
}) {
  const { data: receipts, isFetching } = useQuery({
    queryKey: ["studentReceipts", studentId],
    queryFn: () => studentReceipts(studentId),
    enabled: open && !!studentId,
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        History — {studentName || `Student #${studentId}`}
        {phone ? <Typography variant="subtitle2">{phone}</Typography> : null}
      </DialogTitle>

      <DialogContent>
        {/* Totals header */}
        <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
          <Chip
            label={`Due: ${fmt.format(totals?.due || 0)}`}
            color="warning"
            variant="filled"
          />
          <Chip
            label={`Paid: ${fmt.format(totals?.paid || 0)}`}
            color="info"
            variant="filled"
          />
          <Chip
            label={`Balance: ${fmt.format(totals?.balance || 0)}`}
            color={(totals?.balance ?? 0) <= 0 ? "success" : "error"}
            variant="filled"
          />
          {period ? <Chip label={`Period: ${period}`} variant="outlined" /> : null}
        </Stack>

        <Divider sx={{ my: 1 }} />

        <Typography variant="subtitle1" gutterBottom>
          Recent receipts
        </Typography>

        <List dense disablePadding>
          {(receipts ?? []).slice(0, 10).map((r) => (
            <ListItem key={r.receiptId} divider>
              <ListItemText
                primary={
                  <Box display="flex" justifyContent="space-between" gap={2}>
                    <span>
                      #{r.receiptNo} — {new Date(r.issuedAt).toLocaleString()}
                    </span>
                    <strong>{fmt.format(r.total ?? r.totalAmount ?? 0)}</strong>
                  </Box>
                }
                secondary={
                  (r.lines ?? [])
                    .map((l) => {
                      const bits = [
                        l.groupName || "(no group)",
                        l.model,
                        l.period ? `(${l.period})` : null,
                      ].filter(Boolean);
                      return `${bits.join(" ")} — ${fmt.format(l.amount || 0)}`;
                    })
                    .join(" | ")
                }
              />
            </ListItem>
          ))}
          {(!receipts || receipts.length === 0) && (
            <Box p={2} color="text.secondary">No receipts found.</Box>
          )}
        </List>

        {isFetching && <Box p={1} color="text.secondary">Loading…</Box>}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="outlined" onClick={onGoFullHistory}>
          Open full history
        </Button>
        <Button variant="contained" onClick={onGoPay}>
          Pay
        </Button>
      </DialogActions>
    </Dialog>
  );
}
