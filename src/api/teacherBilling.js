// src/api/teacherBilling.js
import api from "./client";

/**
 * POST /billing/teacher/{teacherId}/rebuild-earnings
 * Query: groupId?, from?, to? (ISO-8601)
 */
export async function rebuildTeacherEarnings(teacherId, { groupId, from, to } = {}) {
  const params = {};
  if (groupId) params.groupId = groupId;
  if (from) params.from = from;
  if (to) params.to = to;
  const { data } = await api.post(`/billing/teacher/${teacherId}/rebuild-earnings`, null, { params });
  return data; // TeacherSummaryResponse
}

/**
 * GET /billing/teacher/{teacherId}/summary
 */
export async function getTeacherSummary(teacherId, { groupId, from, to } = {}) {
  const params = {};
  if (groupId) params.groupId = groupId;
  if (from) params.from = from;
  if (to) params.to = to;
  const { data } = await api.get(`/billing/teacher/${teacherId}/summary`, { params });
  return data; // TeacherSummaryResponse
}

/**
 * GET /billing/teacher/{teacherId}/earnings
 * status: UNPAID | PAID | ALL
 */
export async function getTeacherEarnings(teacherId, { status = "UNPAID", groupId, from, to } = {}) {
  const params = { status };
  if (groupId) params.groupId = groupId;
  if (from) params.from = from;
  if (to) params.to = to;
  const { data } = await api.get(`/billing/teacher/${teacherId}/earnings`, { params });
  return data; // TeacherEarningRow[]
}

/**
 * POST /billing/teacher/{teacherId}/payouts
 * body: { earningIds: number[], method, reference, cashierUserId }
 */
export async function createTeacherPayout(teacherId, body) {
  const { data } = await api.post(`/billing/teacher/${teacherId}/payouts`, body);
  return data; // TeacherPayoutResponse
}

/**
 * GET /billing/teacher/{teacherId}/payouts
 */
export async function listTeacherPayouts(teacherId) {
  const { data } = await api.get(`/billing/teacher/${teacherId}/payouts`);
  return data; // TeacherPayoutResponse[]
}

/**
 * GET /billing/teacher/payouts/{payoutId}
 */
export async function readTeacherPayout(payoutId) {
  const { data } = await api.get(`/billing/teacher/payouts/${payoutId}`);
  return data; // TeacherPayoutResponse
}
