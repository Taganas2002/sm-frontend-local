    // src/api/calendarApi.js
    import api from "./client";

    // ✅ 1. Check classroom availability
    export const checkClassroomAvailability = async ({
    classroomId,
    dayOfWeek,
    startTime,
    endTime,
    }) => {
    const res = await api.get(
        `/calendar/availability/classrooms/${classroomId}`,
        { params: { dayOfWeek, startTime, endTime } }
    );
    return res.data;
    };

    // ✅ 2. Create schedule (group + classroom)
    export const createSchedule = async (groupId, data) => {
    const res = await api.post(`/calendar/groups/${groupId}/schedules`, data);
    return res.data;
    };

    // ✅ 3. Update schedule (change time/room)
    export const updateSchedule = async (scheduleId, data) => {
    const res = await api.put(`/calendar/schedules/${scheduleId}`, data);
    return res.data;
    };

    // ✅ 4. Get schedules by group
    export const getSchedulesByGroup = async (groupId) => {
    const res = await api.get(`/calendar/groups/${groupId}/schedules`);
    return res.data;
    };

    // ✅ 5. Toggle active (with value param)
    export const toggleScheduleActive = async (scheduleId, value) => {
    const res = await api.patch(
        `/calendar/schedules/${scheduleId}/active`,
        null,
        { params: { value } }
    );
    return res.data;
    };

    // ✅ 6. Delete schedule
    export const deleteSchedule = async (scheduleId) => {
    const res = await api.delete(`/calendar/schedules/${scheduleId}`);
    return res.data;
    };


    export const getExpandedEventsByGroup = async (groupId, start, end, tzOffsetMinutes) => {
    const res = await api.get(`/calendar/groups/${groupId}`, {
        params: { start, end, tzOffsetMinutes },
    });
    return res.data;
    };

    // ✅ 7. Expanded events for group
    // export const getExpandedEventsByGroup = async (
    // groupId,
    // start,
    // end,
    // tzOffsetMinutes
    // ) => {
    // const res = await api.get(`/calendar/groups/${groupId}`, {
    //     params: { start, end, tzOffsetMinutes },
    // });
    // return res.data;
    // };

    // ✅ 8. All group week view
    
        export const getWeekSchedules = async (weekStart, tzOffsetMinutes = 60) => {
        const res = await api.get(`/calendar/week`, {
            params: { weekStart, tzOffsetMinutes },
        });
        return res.data;
        };


   // import api from "./client";

    // /** Week view: all groups */
    // export const getWeekSchedules = async (weekStart, tzOffsetMinutes = 60) => {
    // const { data } = await api.get(`/calendar/week`, {
    //     params: { weekStart, tzOffsetMinutes },
    // });
    // return data;
    // };

    // /** Create schedule */
    // export const createSchedule = async (payload) => {
    // // payload = { dayOfWeek, startTime, endTime, classroomId, active, groupId }
    // const { data } = await api.post(`/calendar/schedules`, payload);
    // return data;
    // };

    // /** Update schedule */
    // export const updateSchedule = async (id, payload) => {
    // const { data } = await api.put(`/calendar/schedules/${id}`, payload);
    // return data;
    // };

    // /** Delete schedule */
    // export const deleteSchedule = async (id) => {
    // const { data } = await api.delete(`/calendar/schedules/${id}`);
    // return data;
    // };


    // /** 5) (Optional) Toggle active */
    // export const toggleScheduleActive = async (scheduleId, value) => {
    // const res = await api.patch(`/calendar/schedules/${scheduleId}/active`, null, {
    //     params: { value },
    // });
    // return res.data;
    // };

        
            
    //         // // src/api/calendarApi.js
    //         // import api from "./client";

    //         /** 1) Availability: classroom */
    //         export const checkClassroomAvailability = async ({
    //         classroomId,
    //         dayOfWeek,
    //         startTime,
    //         endTime,
    //         }) => {
    //         const { data } = await api.get(
    //             `/calendar/availability/classrooms/${classroomId}`,
    //             { params: { dayOfWeek, startTime, endTime } }
    //         );
    //         return data;
    //         };

            // /** 2) Schedules - Create (group + classroom) */
            // export const createSchedule = async (payload) => {
            // // payload: { dayOfWeek, startTime, endTime, classroomId, active, groupId }
            // const { data } = await api.post("/calendar/schedules", payload);
            // return data;
            // };

            // /** 3) Schedules - Update (change time/room) */
            // export const updateSchedule = async (id, payload) => {
            // const { data } = await api.put(`/calendar/schedules/${id}`, payload);
            // return data;
            // };

            // /** 4) Schedules - Delete */
            // export const deleteSchedule = async (id) => {
            // const { data } = await api.delete(`/calendar/schedules/${id}`);
            // return data;
            // };

            // /** 5) Schedules - Toggle active */
            // export const toggleScheduleActive = async (id, value) => {
            // const { data } = await api.patch(`/calendar/schedules/${id}/active`, null, {
            //     params: { value },
            // });
            // return data;
            // };

            // /** 6) Schedules - List by group */
            // export const listSchedulesByGroup = async (groupId) => {
            // const { data } = await api.get(`/calendar/groups/${groupId}/schedules`);
            // return data;
            // };

            // /** 7) Calendar: expanded events for a group (range) */
            // export const getExpandedEventsForGroup = async (groupId, params) => {
            // const { data } = await api.get(`/calendar/groups/${groupId}`, { params });
            // return data;
            // };

            // /** 8) All groups week view */
            // export const getWeeklyEvents = async ({ weekStart, tzOffsetMinutes }) => {
            // const { data } = await api.get("/calendar/week", {
            //     params: { weekStart, tzOffsetMinutes },
            // });
            // return data; // array of events
            // };
