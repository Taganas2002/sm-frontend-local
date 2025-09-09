// src/api/expenses.js
import api from "./client";

/** PageResponse { content, page, size, total } */
export async function searchExpenses({
  from,
  to,
  category,       // string enum, e.g. "ELECTRICITY" (optional)
  q = "",         // vendor/ref/notes search (optional)
  page = 0,
  size = 50,
  sort = "expenseDate,desc",
}) {
  const { data } = await api.get("/accounting/expenses", {
    params: { from, to, category, q, page, size, sort },
  });
  return data;
}

export async function getExpense(id) {
  const { data } = await api.get(`/accounting/expenses/${id}`);
  return data;
}

export async function createExpense(payload) {
  // expected fields: category, subCategory, expenseDate (YYYY-MM-DD), amount, notes, method? (optional)
  const { data } = await api.post("/accounting/expenses", payload);
  return data;
}

export async function updateExpense(id, payload) {
  const { data } = await api.put(`/accounting/expenses/${id}`, payload);
  return data;
}

export async function deleteExpense(id) {
  await api.delete(`/accounting/expenses/${id}`);
  return true;
}

/** Summary (optional widget support) */
export async function expenseSummary({ from, to }) {
  const { data } = await api.get("/accounting/expenses/summary", {
    params: { from, to },
  });
  return data;
}
