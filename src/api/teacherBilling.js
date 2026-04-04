import api from "./client";

export async function rebuildTeacherEarnings(teacherId, { groupId, from, to } = {}) {
  const params = {};
  if (groupId) params.groupId = groupId;
  if (from) params.from = from;
  if (to) params.to = to;
  const { data } = await api.post(`/billing/teacher/${teacherId}/rebuild-earnings`, null, { params });
  return data;
}

export async function getTeacherSummary(teacherId, { groupId, from, to } = {}) {
  const params = {};
  if (groupId) params.groupId = groupId;
  if (from) params.from = from;
  if (to) params.to = to;
  const { data } = await api.get(`/billing/teacher/${teacherId}/summary`, { params });
  return data;
}

export async function getTeacherEarnings(teacherId, { status = "UNPAID", groupId, from, to } = {}) {
  const params = { status };
  if (groupId) params.groupId = groupId;
  if (from) params.from = from;
  if (to) params.to = to;
  const { data } = await api.get(`/billing/teacher/${teacherId}/earnings`, { params });
  return data;
}

export async function createTeacherPayout(teacherId, body, idempotencyKey) {
  const headers = {};
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const { data } = await api.post(`/billing/teacher/${teacherId}/payouts`, body, { headers });
  return data;
}

export async function listTeacherPayouts(teacherId) {
  const { data } = await api.get(`/billing/teacher/${teacherId}/payouts`);
  return data;
}

export async function readTeacherPayout(payoutId) {
  const { data } = await api.get(`/billing/teacher/payouts/${payoutId}`);
  return data;
}

export async function getTeacherFixedAttendance(teacherId, { groupId, from, to } = {}) {
  const params = {};
  if (groupId) params.groupId = groupId;
  if (from) params.from = from;
  if (to) params.to = to;
  const { data } = await api.get(`/billing/teacher/${teacherId}/fixed-attendance`, { params });
  return data;
}

// NEW: lock fixed cycles (idempotent)
export async function lockFixedCycles(teacherId, payload) {
  const { data } = await api.post(`/billing/teacher/${teacherId}/fixed-attendance/lock`, payload);
  return data; // { earningIds: number[] }
}
