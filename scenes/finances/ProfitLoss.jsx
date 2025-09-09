// src/scenes/finances/ProfitLoss.jsx
import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  IconButton,
  TextField,
  Typography,
  useTheme,
  
} from "@mui/material";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { getProfitLoss } from "../../api/reports";
import Header from "../../components/Header";
import translations from "../../translations"; // assume you have a translation file
import AutorenewIcon from "@mui/icons-material/Autorenew"; // replace RecycleIcon




const nf = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const thisMonth = () => {
  const d = dayjs();
  return {
    from: d.startOf("month").format("YYYY-MM-DD"),
    to: d.endOf("month").format("YYYY-MM-DD"),
  };
};

function StatCard({ title, value, bgColor, color }) {
  return (
    <Card
      sx={{
        height: "100%",
        borderRadius: 2,
        boxShadow: 3,
        background: bgColor,
        color: color || "#fff",
        transition: "transform 0.2s",
        p: 4, // uniform padding
        "&:hover": { transform: "translateY(-4px)", boxShadow: 6 },
      }}
    >
      <CardContent>
        <Typography
          variant="h5"
          sx={{ textTransform: "uppercase", fontWeight: 900 , textAlign:"center" }}
        >
          {title}
        </Typography>
        <Typography variant="h4" sx={{ mt: 1, fontWeight: 700, textAlign:"center" }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function ProfitLoss({ language = "fr" }) {
  const theme = useTheme();
  const [{ from, to }, setRange] = useState(thisMonth());
  const t = translations[language] || translations["fr"];

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["profitLoss", from, to],
    queryFn: () => getProfitLoss({ from, to }),
    keepPreviousData: true,
  });

  const totals = {
    income: Number(data?.income ?? 0),
    teacherCost: Number(data?.teacherCost ?? 0),
    expenses: Number(data?.expenses ?? 0),
    net: Number(data?.net ?? 0),
  };

  // Define card colors for light and dark mode
  const cardColors = [
    { bg: theme.palette.mode === "dark" ? "linear-gradient(135deg, #6a11cb, #2575fc)" : "linear-gradient(135deg, #2575fc, #6a11cb)", color: "#fff" },
    { bg: theme.palette.mode === "dark" ? "linear-gradient(135deg, #ff416c, #ff4b2b)" : "linear-gradient(135deg, #ff4b2b, #ff416c)", color: "#fff" },
    { bg: theme.palette.mode === "dark" ? "linear-gradient(135deg, #00c6ff, #0072ff)" : "linear-gradient(135deg, #0072ff, #00c6ff)", color: "#fff" },
    { bg: theme.palette.mode === "dark" ? "linear-gradient(135deg, #00b09b, #96c93d)" : "linear-gradient(135deg, #96c93d, #00b09b)", color: "#fff" },
  ];

  return (
    <Box p={{ xs: 2, md: 4 }}>
      {/* Header */}
      <Box m="20px 0" p="0 20px">
        <Header title= {t.profitTitle || "Profit & Loss"}
        subtitle={t.profitSubtitle || "Summary of income, expenses and net profit"}
      />
        
        {/* <IconButton title="Refresh" onClick={() => refetch()} disabled={isFetching} color="primary">
          <RefreshIcon />
        </IconButton> */}
      </Box>

      {/* Filters */}
      <Grid container spacing={2} mb={4} justifyContent="center">
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label={t.from || "From"}
            type="date"
            size="small"
            fullWidth
            value={from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label={t.to || "To"}
            type="date"
            size="small"
            fullWidth
            value={to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            variant="outlined"
          />
        </Grid>
      <Grid item>
          <IconButton
            title={t.refresh || "Refresh"}
            onClick={() => refetch()}
            disabled={isFetching}
            color="primary"
          >
          <AutorenewIcon />
          </IconButton>
        </Grid>
      </Grid>

      {/* Summary Cards */}
      <Grid container spacing={3} justifyContent="center">
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title={t.income || "Income"} value={nf.format(totals.income)} bgColor={cardColors[0].bg} color={cardColors[0].color} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title={t.teacherCost || "Teacher Cost"} value={nf.format(totals.teacherCost)} bgColor={cardColors[1].bg} color={cardColors[1].color} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title={t.otherExpenses || "Other Expenses"} value={nf.format(totals.expenses)} bgColor={cardColors[2].bg} color={cardColors[2].color} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title={t.net || "Net"}
            value={nf.format(totals.net)}
            bgColor={cardColors[3].bg}
            color={cardColors[3].color}
          />
        </Grid>
      </Grid>

      {/* Footer Range Info */}
      <Box textAlign="center" mt={4}>
        <Typography variant="body2" color="text.secondary">
          {t.showingResults || "Showing results from"} <strong>{from}</strong> {t.to || "to"} <strong>{to}</strong>
        </Typography>
      </Box>
    </Box>
  );
}
