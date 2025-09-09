// src/api/billing.js
import api from "./client";

/**
 * Search monthly dues (server-paged)
 * GET /billing/dues/monthly/search
 * params: { period (YYYY-MM), status=ALL | UNPAID | PARTIAL | PAID, groupId?, q?, page?, size? }
 * returns: { content:[{ studentId, studentFullName, phone, groupId, groupName, period, due, paid, balance, status }], page, size, total }
 */
export const searchMonthly = async ({
  period,
  status = "ALL",
  groupId,
  q = "",
  page = 0,
  size = 50,
}) => {
  const { data } = await api.get("/billing/dues/monthly/search", {
    params: { period, status, groupId, q, page, size },
  });
  return data;
};

/**
 * Unpaid monthly groups for a single student
 * GET /billing/dues/students/{studentId}/unpaid-monthly-groups?period=YYYY-MM
 * returns: { studentId, studentFullName, period, groups:[{groupId, groupName, amountDue, amountPaid, balance}] }
 */
export const unpaidMonthlyGroups = async (studentId, period) => {
  const { data } = await api.get(
    `/billing/dues/students/${studentId}/unpaid-monthly-groups`,
    { params: period ? { period } : {} }
  );
  return data;
};

/**
 * Collect a payment
 * POST /billing/collect
 * headers: (optional) X-Cashier-UserId
 * payload = { studentId, method, reference, items:[{groupId, model, period?, sessions?, hours?, amount}] }
 * returns: ReceiptResponse
 */
export const collectPayment = async (payload, cashierUserId) => {
  const headers = {};
  if (cashierUserId) headers["X-Cashier-UserId"] = String(cashierUserId);
  const { data } = await api.post("/billing/collect", payload, { headers });
  return data;
};

/** Student receipts history */
export const studentReceipts = async (studentId) => {
  const { data } = await api.get(`/billing/students/${studentId}/receipts`);
  return data;
};

/** Read one receipt */
export const readReceipt = async (receiptId) => {
  const { data } = await api.get(`/billing/receipts/${receiptId}`);
  return data;
};
