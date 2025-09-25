// Axios client for Billing endpoints
import api from "./client";

/** Single student: unpaid MONTHLY groups for a given period (YYYY-MM) */
export const unpaidMonthlyGroups = async (studentId, period) => {
  const { data } = await api.get(
    `/billing/dues/students/${studentId}/unpaid-monthly-groups`,
    { params: { period } }
  );
  return data;
};

/** Student receipt history (list) */
export const studentReceipts = async (studentId) => {
  const { data } = await api.get(`/billing/students/${studentId}/receipts`);
  return data;
};

/** Collect a payment (partial or prepay is handled by backend) */
export const collectPayment = async (payload, cashierUserId) => {
  const { data } = await api.post(`/billing/collect`, payload, {
    headers: { "X-Cashier-UserId": cashierUserId ?? "" },
  });
  return data;
};

/** Unified: cycles dues across a RANGE (attendance based; matches Pay page) */
export const searchCycleRange = async ({
  start,
  end,
  status = "ALL",
  groupId,
  studentId,
  q = "",
  page = 0,
  size = 50,
}) => {
  const { data } = await api.get("/billing/dues/cycle-range/search", {
    params: { start, end, status, groupId, studentId, q, page, size },
  });
  return data;
};

/** (kept) legacy monthly range grid */
export const searchMonthlyRange = async ({
  start,
  end,
  status = "ALL",
  groupId,
  groupName,
  q = "",
  page = 0,
  size = 50,
}) => {
  const { data } = await api.get("/billing/dues/monthly/range/search", {
    params: { start, end, status, groupName, groupId, q, page, size },
  });
  return data;
};

export const studentMonthlyRange = async (
  studentId,
  start,
  end,
  status = "ALL",
  groupId,
  page = 0,
  size = 200
) => {
  const { data } = await api.get(
    `/billing/students/${studentId}/monthly/range`,
    { params: { start, end, status, groupId, page, size } }
  );
  return data;
};

/** NEW: cycles all-time for a student (status/group filters) */
export const searchCycleAll = async ({
  studentId,
  status = "ALL",
  groupId,
  q = "",
  page = 0,
  size = 1000,
}) => {
  const { data } = await api.get("/billing/dues/cycle-all/search", {
    params: { studentId, status, groupId, q, page, size },
  });
  return data;
};

/** NEW: student all-time summary */
export const studentSummaryAll = async (studentId, groupId) => {
  const { data } = await api.get(
    `/billing/dues/students/${studentId}/summary-all`,
    { params: { groupId } }
  );
  return data;
};

export default {
  unpaidMonthlyGroups,
  studentReceipts,
  collectPayment,
  searchCycleRange,
  searchMonthlyRange,
  studentMonthlyRange,
  searchCycleAll,
  studentSummaryAll,
};
