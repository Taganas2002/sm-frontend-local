    // src/api/classroomsApi.js
    import api from "./client";

    // List/search classrooms (with pagination if backend supports it)
    export const searchClassrooms = async ({ search = "", page = 0, size = 10 }) => {
    const { data } = await api.get("/classrooms", { params: { search, page, size } });
    return data;
    };
        
        export const listClassrooms = async () => {
    const res = await api.get("/classrooms", {
        params: { page: 0, size: 100, sort: "name,asc" }, // adjust if pagination differs
    });
    // if backend returns { content: [...] }
    return res.data.content || res.data;
    };

    export const getClassroom = async (id) => {
    const { data } = await api.get(`/classrooms/${id}`);
    return data;
    };

    export const createClassroom = async (payload) => {
    const { data } = await api.post("/classrooms", payload);
    return data;
    };

    export const updateClassroom = async (id, payload) => {
    const { data } = await api.put(`/classrooms/${id}`, payload);
    return data;
    };

    export const deleteClassroom = async (id) => {
    const { data } = await api.delete(`/classrooms/${id}`);
    return data;
    };
