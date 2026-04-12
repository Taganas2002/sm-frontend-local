    // src/api/sectionsApi.js
    import api from "./client";

    // List/search sections (with server paging)
    export const searchSections = async ({ page = 0, size = 10, sort = "name,asc" } = {}) => {
    const { data } = await api.get("/sections", { params: { page, size, sort } });
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

    /**
     * Sections for the current school. Optional levelId is passed for API compatibility;
     * backend may return all sections for the tenant (filter client-side if needed).
     * Always returns a plain array so callers never break on Page objects.
     */
    export const listSections = async (levelId) => {
    const params = { page: 0, size: 2000, sort: "name,asc" };
    if (levelId != null && levelId !== "") {
      params.levelId = levelId;
    }
    const { data } = await api.get("/sections", { params });
    const raw = data?.content ?? data;
    return Array.isArray(raw) ? raw : [];
    };

