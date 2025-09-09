    // src/api/sectionsApi.js
    import api from "./client";

    // List/search sections (with server paging)
    export const searchSections = async ({ page = 0, size = 10 }) => {
    const { data } = await api.get("/sections", { params: { page, size, sort: "name,asc" } });
    return data; // { content, totalElements, ... }
    };

    // Get single section by ID
    export const getSection = async (id) => {
    const { data } = await api.get(`/sections/${id}`);
    return data; // { id, name }
    };

    // Create new section
    export const createSection = async (payload) => {
    const { data } = await api.post("/sections", payload);
    return data;
    };

    // Update existing section
    export const updateSection = async (id, payload) => {
    const { data } = await api.put(`/sections/${id}`, payload);
    return data;
    };

    // Delete section
    export const deleteSection = async (id) => {
    const { data } = await api.delete(`/sections/${id}`);
    return data;
    };

    // NEW: List sections filtered by levelId
    export const listSections = async (levelId) => {
    const { data } = await api.get("/sections", { params: { levelId, size: 1000 } });
    return data.content ? data.content : data; // always array
    };

