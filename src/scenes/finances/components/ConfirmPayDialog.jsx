import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";

const money = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * props:
 *  open: boolean
 *  onClose: () => void
 *  onConfirm: () => void
 *  studentName: string
 *  preview: {
 *    lines: Array<{
 *      groupName?: string,
 *      period?: string,
 *      source: 'CASH'|'WALLET',
 *      amount: number,
 *      note?: string
 *    }>,
 *    totals: {
 *      cashIn: number,
 *      cashApplied: number,
 *      walletUsed: number,
 *      walletTopup: number,   // leftover cash that goes to wallet
 *      shortfall: number      // still unpaid after all allocations
 *    }
 *  }
 */
export default function ConfirmPayDialog({
  open,
  onClose,
  onConfirm,
  studentName,
  preview,
}) {
  const totals = preview?.totals || {
    cashIn: 0,
    cashApplied: 0,
    walletUsed: 0,
    walletTopup: 0,
    shortfall: 0,
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Confirm payment — {studentName}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {preview?.lines?.length ? (
            preview.lines.map((l, i) => (
              <Box
                key={i}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto",
                  gap: 1,
                  alignItems: "center",
                }}
              >
                <Typography variant="body2">
                  {l.groupName ? l.groupName : "Wallet"}
                  {l.period ? ` — ${l.period}` : ""}
                  {l.note ? ` — ${l.note}` : ""}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {l.source}
                </Typography>
                <Typography textAlign="right" variant="body2">
                  {money.format(l.amount || 0)}
                </Typography>
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              Nothing will be paid. Adjust selection or amount.
            </Typography>
          )}

          <Divider />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 1,
              alignItems: "center",
            }}
          >
            <Typography variant="body2">Cash received</Typography>
            <Typography variant="body2" textAlign="right">
              {money.format(totals.cashIn)}
            </Typography>

            <Typography variant="body2">Cash applied to dues</Typography>
            <Typography variant="body2" textAlign="right">
              {money.format(totals.cashApplied)}
            </Typography>

            <Typography variant="body2">Wallet used</Typography>
            <Typography variant="body2" textAlign="right">
              {money.format(totals.walletUsed)}
            </Typography>

            <Typography variant="body2">Leftover to wallet</Typography>
            <Typography variant="body2" textAlign="right">
              {money.format(totals.walletTopup)}
            </Typography>

            <Typography variant="body2">Still unpaid after payment</Typography>
            <Typography
              variant="body2"
              textAlign="right"
              color={totals.shortfall > 0 ? "error.main" : "success.main"}
              fontWeight={600}
            >
              {money.format(totals.shortfall)}
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          disabled={!preview?.lines?.length}
        >
          Confirm & Pay
        </Button>
      </DialogActions>
    </Dialog>
  );
}
