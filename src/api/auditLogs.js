// src/api/auditLogs.js
import api from "./client";

/**
 * @param {object} params
 * @param {string} [params.action] - e.g. BILLING_COLLECT
 * @param {string} [params.entityType] - e.g. Receipt, Student
 * @param {number} [params.entityId]
 * @param {string} [params.from] - ISO-8601 instant
 * @param {string} [params.to] - ISO-8601 instant (exclusive)
 * @param {number} [params.page]
 * @param {number} [params.size] - max 200
 */
export async function searchAuditLogs(params = {}) {
  const { data } = await api.get("/audit-logs", { params });
  return data;
}
