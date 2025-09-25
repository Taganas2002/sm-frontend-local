// src/api/attendanceApi.js
import api from "./client";

/**
 * 1) Teacher Start session
 * @param {number} scheduleId 
 * @param {string} date - "YYYY-MM-DD"
 */
export const startAttendanceSession = async (scheduleId, date) => {
  const res = await api.post("/attendance/teacher/start", null, {
    params: { scheduleId, date },
  });
  return res.data;
};

/**
 * 3) Teacher Mark student presence
 * @param {number} sessionId
 * @param {number} studentId
 * @param {boolean} present
 */
export const markStudentAttendance = async (sessionId, studentId, present) => {
  const res = await api.post("/attendance/teacher/mark", null, {
    params: { sessionId, studentId, present },
  });
  return res.data;
};

/**
 * 4) Session Summary
 * @param {number} sessionId
 */
export const getSessionSummary = async (sessionId) => {
  const res = await api.get(`/attendance/session/${sessionId}/summary`);
  return res.data;
};

/**
 * 5) Attendance Matrix (historical view for group)
 * EXACTLY like your Postman:
 *   /api/attendance/matrix?groupId=2&start=2025-01-01&endExclusive=2026-02-01
 */
export const getAttendanceMatrix = async (groupId, start, endExclusive) => {
  const res = await api.get("/attendance/matrix", {
    params: { groupId, start, endExclusive },
  });
  return res.data; // { groupId, start, endExclusive, dates:[], students:[{studentId,studentName,cells:[]}, ...] }
};
