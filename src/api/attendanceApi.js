    // src/api/attendanceApi.js
    import api from "./client";

    /**
     * 1) Teacher Start session
     * @param {number} scheduleId 
     * @param {string} date - format "YYYY-MM-DD"
     */
    export const startAttendanceSession = async (scheduleId, date) => {
    const res = await api.post(
        `/attendance/teacher/start?scheduleId=${scheduleId}&date=${date}`
    );
    return res.data;
    };

    /**
     * 2) Teacher Close session
     * @param {number} sessionId
     */
    export const closeAttendanceSession = async (sessionId) => {
    const res = await api.post(`/attendance/teacher/close?sessionId=${sessionId}`);
    return res.data;
    };

    /**
     * 3) Teacher Mark student presence
     * @param {number} sessionId
     * @param {number} studentId
     * @param {boolean} present
     */
    export const markStudentAttendance = async (sessionId, studentId, present) => {
    const res = await api.post(
        `/attendance/teacher/mark?sessionId=${sessionId}&studentId=${studentId}&present=${present}`
    );
    return res.data;
    };

    /**
     * 4) Session Summary
     *    → usually same response as start/close/mark
     *    (just re-fetch by sessionId to hydrate UI checkboxes)
     */

            export const getSessionSummary = async (sessionId) => {
        const res = await api.get(`/attendance/session/${sessionId}/summary`);
        return res.data;
        };


    /**
     * 5) Attendance Matrix (historical view for group)
     * @param {number} groupId
     * @param {string} start - inclusive (YYYY-MM-DD)
     * @param {string} endExclusive - exclusive (YYYY-MM-DD)
     */
    export const getAttendanceMatrix = async (groupId, start, endExclusive) => {
    const res = await api.get(
        `/attendance/matrix?groupId=${groupId}&start=${start}&endExclusive=${endExclusive}`
    );
    return res.data;
    };

    
