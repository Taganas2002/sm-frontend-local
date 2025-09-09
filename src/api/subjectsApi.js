    import api from "./client";

    // List/search subjects (supports pagination & search if backend supports it)
    export const searchSubjects = async ({ search = "", page = 0, size = 10 }) => {
    const { data } = await api.get("/subjects", { params: { search, page, size } });
    return data; // backend: { content, page, size, total }
    };

    export const getSubject = async (id) => {
    const { data } = await api.get(`/subjects/${id}`);
    return data;
    };

    export const createSubject = async (payload) => {
    const { data } = await api.post("/subjects", payload);
    return data;
    };

    export const updateSubject = async (id, payload) => {
    const { data } = await api.put(`/subjects/${id}`, payload);
    return data;
    };

    export const deleteSubject = async (id) => {
    const { data } = await api.delete(`/subjects/${id}`);
    return data;
    };
    
    export const listSubjects = async () => {
    const { data } = await api.get("/subjects", { params: { size: 1000, active: true } });
    return data.content ? data.content : data; // always array
    };

    
