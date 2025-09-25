import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Card, CardContent, Typography } from "@mui/material";
import { studentReceipts } from "../../api/billing";

export default function StudentReceiptHistory() {
  const { studentId } = useParams();
  const sid = Number(studentId);

  const { data } = useQuery({
    queryKey: ["studentReceipts", sid],
    queryFn: () => studentReceipts(sid),
    enabled: !!sid,
  });

  return (
    <Box p={2}>
      <Typography variant="h4" mb={2}>Receipts — Student #{sid}</Typography>
      <Box display="grid" gap={2}>
        {(data ?? []).map((r) => (
          <Card key={r.id}>
            <CardContent>
              <Typography variant="h6">#{r.receiptNo} — {new Date(r.issuedAt).toLocaleString()}</Typography>
              <Typography variant="body2">Total: {Number(r.totalAmount).toFixed(2)}</Typography>
              <ul style={{ marginTop: 8 }}>
                {r.lines.map((l, i) => (
                  <li key={i}>
                    {l.groupName || "(no group)"} — {l.model}
                    {l.period ? ` — ${l.period}` : ""}
                    {l.sessions ? ` — ${l.sessions} sessions` : ""}
                    {l.hours ? ` — ${l.hours} h` : ""} — {Number(l.amount).toFixed(2)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
