/**
 * Authenticated API calls using the same token + api base as the SPA (after login).
 */

export async function getApiAuth(page) {
  return page.evaluate(() => {
    let token = null;
    try {
      const raw = localStorage.getItem("auth");
      if (raw) {
        const a = JSON.parse(raw);
        token = a?.accessToken || a?.token || a?.jwt || a?.access_token || null;
      }
    } catch {
      token = null;
    }
    const apiBase = (localStorage.getItem("apiBase") || "http://127.0.0.1:8080").replace(/\/+$/, "");
    return { token, apiBase };
  });
}

export async function apiGetJson(page, path, params = {}) {
  const { token, apiBase } = await getApiAuth(page);
  if (!token) throw new Error("No auth token — login first.");
  const res = await page.request.get(`${apiBase}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    params,
  });
  if (!res.ok()) {
    throw new Error(`GET ${path} → ${res.status()}: ${(await res.text()).slice(0, 500)}`);
  }
  return res.json();
}

export async function apiPostJson(page, path, { json = null, params = {} } = {}) {
  const { token, apiBase } = await getApiAuth(page);
  if (!token) throw new Error("No auth token — login first.");
  const res = await page.request.post(`${apiBase}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
    params,
    data: json !== null ? json : undefined,
  });
  if (!res.ok()) {
    throw new Error(`POST ${path} → ${res.status()}: ${(await res.text()).slice(0, 500)}`);
  }
  return res.status() === 204 ? null : res.json();
}

/** POST with query params only (no JSON body) — Spring @RequestParam endpoints. */
export async function apiPostParams(page, path, params = {}) {
  const { token, apiBase } = await getApiAuth(page);
  if (!token) throw new Error("No auth token — login first.");
  const res = await page.request.post(`${apiBase}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    params,
  });
  if (!res.ok()) {
    throw new Error(`POST ${path} → ${res.status()}: ${(await res.text()).slice(0, 500)}`);
  }
  return res.json();
}

/** Local YYYY-MM-DD, `days` from today (local midnight). */
export function addDaysYmd(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function findGroupId(page, nameSubstring) {
  const data = await apiGetJson(page, "/api/groups", { q: nameSubstring, size: 100, page: 0 });
  const hit = (data.content || []).find((g) => String(g.name || "").includes(nameSubstring));
  if (!hit?.id) throw new Error(`Group not found for: ${nameSubstring}`);
  return hit.id;
}

export async function findStudentId(page, nameSubstring) {
  const data = await apiGetJson(page, "/api/students", { search: nameSubstring, size: 50, page: 0 });
  const hit = (data.content || []).find((s) => String(s.fullName || "").includes(nameSubstring));
  if (!hit?.id) throw new Error(`Student not found for: ${nameSubstring}`);
  return hit.id;
}

export async function findClassroomIdByRoomName(page, roomSubstring) {
  const data = await apiGetJson(page, "/api/classrooms", { size: 200, page: 0, sort: "id,desc" });
  const hit = (data.content || []).find((c) => String(c.roomName || "").includes(roomSubstring));
  if (!hit?.id) throw new Error(`Classroom not found for room: ${roomSubstring}`);
  return hit.id;
}

export async function createOneTimeSchedule(page, { groupId, classroomId, date, startTime = "09:00", endTime = "10:00" }) {
  return apiPostJson(page, `/api/calendar/groups/${groupId}/schedules`, {
    json: { date, startTime, endTime, classroomId, active: true },
  });
}

export async function startAttendanceForSchedule(page, { scheduleId, date }) {
  return apiPostParams(page, "/api/attendance/teacher/start", {
    scheduleId: String(scheduleId),
    date,
  });
}

export async function markAttendance(page, { sessionId, studentId, present = true }) {
  return apiPostParams(page, "/api/attendance/teacher/mark", {
    sessionId: String(sessionId),
    studentId: String(studentId),
    present: String(present),
  });
}

/**
 * Ensure one calendar session exists and the student is PRESENT (billing rows appear for unpaid cycles).
 */
export async function seedPresentSessionForGroup(page, { groupNameSubstring, studentNameSubstring, roomNameSubstring, sessionDate }) {
  const groupId = await findGroupId(page, groupNameSubstring);
  const studentId = await findStudentId(page, studentNameSubstring);
  const classroomId = await findClassroomIdByRoomName(page, roomNameSubstring);
  const sched = await createOneTimeSchedule(page, { groupId, classroomId, date: sessionDate });
  const scheduleId = sched?.id;
  if (!scheduleId) throw new Error("Schedule create did not return id");
  const started = await startAttendanceForSchedule(page, { scheduleId, date: sessionDate });
  const sessionId = started?.sessionId;
  if (!sessionId) throw new Error("Attendance start did not return sessionId");
  await markAttendance(page, { sessionId, studentId, present: true });
  return { groupId, studentId, scheduleId, sessionId };
}
