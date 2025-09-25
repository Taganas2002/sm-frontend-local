// src/api/calendarApi.js
import api from "./client";

/** ---------- Availability ---------- **/

// Weekly availability (by day-of-week)
export const checkClassroomAvailability = async ({
  classroomId,
  dayOfWeek,
  startTime,
  endTime,
  excludeScheduleId,
}) => {
  const res = await api.get(`/calendar/availability/classrooms/${classroomId}`, {
    params: { dayOfWeek, startTime, endTime, excludeScheduleId },
  });
  return res.data;
};

// One-time availability (by specific date)
export const checkClassroomAvailabilityOnDate = async ({
  classroomId,
  date,          // YYYY-MM-DD
  startTime,     // HH:mm
  endTime,       // HH:mm
  excludeScheduleId,
}) => {
  const res = await api.get(`/calendar/availability/classrooms/${classroomId}/date`, {
    params: { date, startTime, endTime, excludeScheduleId },
  });
  return res.data;
};

/** ---------- Schedules CRUD ---------- **/

// Create schedule (weekly or one-time)
// data = { dayOfWeek?, date?, startTime, endTime, classroomId, active? }
export const createSchedule = async (groupId, data) => {
  const res = await api.post(`/calendar/groups/${groupId}/schedules`, data);
  return res.data;
};

// Update schedule (can switch between weekly and one-time)
export const updateSchedule = async (scheduleId, data) => {
  const res = await api.put(`/calendar/schedules/${scheduleId}`, data);
  return res.data;
};

// Delete schedule
export const deleteSchedule = async (scheduleId) => {
  const res = await api.delete(`/calendar/schedules/${scheduleId}`);
  return res.data;
};

// Get schedules by group (raw schedules)
export const getSchedulesByGroup = async (groupId) => {
  const res = await api.get(`/calendar/groups/${groupId}/schedules`);
  return res.data;
};

// Toggle active
export const toggleScheduleActive = async (scheduleId, value) => {
  const res = await api.patch(
    `/calendar/schedules/${scheduleId}/active`,
    null,
    { params: { value } }
  );
  return res.data;
};

/** ---------- Expanded events ---------- **/

// Expanded events for a group between dates (if you use this endpoint)
export const getExpandedEventsByGroup = async (groupId, start, end, tzOffsetMinutes) => {
  const res = await api.get(`/calendar/groups/${groupId}`, {
    params: { start, end, tzOffsetMinutes },
  });
  return res.data;
};

// Week view for all groups (used by the calendar)
export const getWeekSchedules = async (weekStart, tzOffsetMinutes = 60) => {
  const res = await api.get(`/calendar/week`, {
    params: { weekStart, tzOffsetMinutes },
  });
  return res.data;
};

/** ---------- Server-anchored date ---------- **/

// Returns { today: 'YYYY-MM-DD' } from the server
export const getServerDate = async () => {
  const res = await api.get(`/calendar/server-date`);
  return res.data;
};
