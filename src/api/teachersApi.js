    import api from "./client";

    // List/search teachers (with server paging)
    export const searchTeachers = async ({ search = "", page = 0, size = 10 }) => {
    const { data } = await api.get("/teachers", { params: { search, page, size } });
    return data; // { content, page, size, total }
    };

    // Get single teacher by ID
    export const getTeacher = async (id) => {
    const { data } = await api.get(`/teachers/${id}`);
    return data; // { id, fullName, gender, phone, email, ... }
    };

    // Create new teacher
    export const createTeacher = async (payload) => {
    const { data } = await api.post("/teachers", payload);
    return data; // newly created teacher object
    };

    // Update existing teacher
    export const updateTeacher = async (id, payload) => {
    const { data } = await api.put(`/teachers/${id}`, payload);
    return data; // updated teacher object
    };

    // Delete teacher
    export const deleteTeacher = async (id) => {
    const { data } = await api.delete(`/teachers/${id}`);
    return data; // usually returns { success: true } or {}
    };


        export const listTeachers = async () => {
    const { data } = await api.get("/teachers", { params: { size: 1000, active: true } });
    return data.content ? data.content : data; // always array
    };


