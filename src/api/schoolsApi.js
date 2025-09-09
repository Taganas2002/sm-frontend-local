    // src/api/schoolsApi.js
    import api from "./client";

    // List/search schools (paged)
    export const searchSchools = async ({ search = "", page = 0, size = 10 }) => {
    const { data } = await api.get("/schools", {
        params: { search, page, size, sort: "name,asc" },
    });
    return data; // always a page object with .content
    };

    // Get school by ID
    export const getSchool = async (id) => {
    const { data } = await api.get(`/schools/${id}`);
    return data;
    };

    // Create school
    export const createSchool = async (payload) => {
    const { data } = await api.post("/schools", payload);
    return data;
    };

    // Update school
    export const updateSchool = async (id, payload) => {
    const { data } = await api.put(`/schools/${id}`, payload);
    return data;
    };

    // Delete school
    export const deleteSchool = async (id) => {
    const { data } = await api.delete(`/schools/${id}`);
    return data;
    };
