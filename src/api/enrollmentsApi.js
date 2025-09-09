    import api from "./client";

    const getAuthHeaders = () => {
    const token = localStorage.getItem("token"); // or wherever you store it
    return token ? { Authorization: `Bearer ${token}` } : {};
    };

    export const listEnrollments = async (filters = {}) => {
    const res = await api.get("/enrollments", { 
        params: filters,
        headers: getAuthHeaders(),
    });
    return res.data;
    };

    export const createEnrollment = async (data) => {
    const res = await api.post("/enrollments", data, {
        headers: getAuthHeaders(),
    });
    return res.data;
    };

        export const updateEnrollmentStatus = async (id, status, notes = "") => {
    const res = await api.patch(`/enrollments/${id}/status`, null, {
    params: { status, notes },   // ✅ only two query params
    });
    return res.data;
    };

    export const deleteEnrollment = async (id) => {
    const res = await api.delete(`/enrollments/${id}`, {
        headers: getAuthHeaders(),
    });
    return res.data;
    };
