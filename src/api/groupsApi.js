
        import api from "./client";

        // 🔎 List/search groups (server paging)
        export const searchGroups = async ({ search = "", page = 0, size = 10, sort = "id,asc" }) => {
        const { data } = await api.get("/groups", {
            params: { search, page, size, sort },
        });
        return data; // { content, totalElements, ... }
        };

        // 📌 Get single group by ID
        export const getGroup = async (id) => {
        const { data } = await api.get(`/groups/${id}`);
        return data;
        };

        // ➕ Create new group
        export const createGroup = async (payload) => {
        const { data } = await api.post("/groups", payload);
        return data;
        };

        // ✏️ Update existing group
        export const updateGroup = async (id, payload) => {
        const { data } = await api.put(`/groups/${id}`, payload);
        return data;
        };

        //  Delete group
        export const deleteGroup = async (id) => {
        const { data } = await api.delete(`/groups/${id}`);
        return data;
        };

        // 📋 List all groups (for dropdowns, no paging)
        export const listGroups = async () => {
        const { data } = await api.get("/groups", { params: { size: 1000, sort: "id,asc" } });
        return data.content ? data.content : data; // support pageable & array
        };
                
        // 📋 Lookup groups (id + name only)
        export const lookupGroups = async () => {
        const { data } = await api.get("/groups/lookup");
        return data; // [{ id, name }, ...]
        };
