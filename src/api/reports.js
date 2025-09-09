// src/api/reports.js
import api from "./client";

/**
 * GET /api/accounting/reports/profit-loss?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Response shape:
 * { from, to, income, teacherCost, expenses, net }
 */
export async function getProfitLoss({ from, to }) {
  const { data } = await api.get("/accounting/reports/profit-loss", {
    params: { from, to },
  });
  return data;
}
