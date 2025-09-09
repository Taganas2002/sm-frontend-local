    // src/api/levelsApi.js
    import api from "./client";

    // List/search levels (with server paging)
    export const searchLevels = async ({ page = 0, size = 10 }) => {
    const { data } = await api.get("/levels", { params: { page, size } });
    return data; // { content, page, size, total }
    };

    // Get single level by ID
    export const getLevel = async (id) => {
    const { data } = await api.get(`/levels/${id}`);
    return data; // { id, name }
    };

    // Create new level
    export const createLevel = async (payload) => {
    const { data } = await api.post("/levels", payload);
    return data; // newly created level object
    };

    // Update existing level
    export const updateLevel = async (id, payload) => {
    const { data } = await api.put(`/levels/${id}`, payload);
    return data; // updated level object
    };

    // Delete level
    export const deleteLevel = async (id) => {
    const { data } = await api.delete(`/levels/${id}`);
    return data; // usually {}
    };

    // NEW: Get all levels without paging
  export const listLevels = async () => {
    const { data } = await api.get("/levels", { params: { size: 1000 } });
    return data.content ? data.content : data; // always array
  };

