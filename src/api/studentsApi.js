    import api from "./client";

    // List/search students (Spring Page)
    export const searchStudents = async ({ search = "", page = 0, size = 10, sort = "fullName,asc" }) => {
    const { data } = await api.get("/students", { params: { search, page, size, sort } });
    return data; // { content, totalElements, totalPages, ... }
    };

    // Get student by ID
    export const getStudent = async (id) => {
    const { data } = await api.get(`/students/${id}`);
    return data;
    };

        export const listStudents = async () => {
    try {
        const res = await searchStudents({ page: 0, size: 100 });
        const studentsArray = Array.isArray(res?.content) ? res.content : [];
        const studentsMap = {};
        studentsArray.forEach((s) => {
        studentsMap[s.id] = s;
        });
        return studentsMap;
    } catch (err) {
        console.error("Failed to fetch students", err);
        return {};
    }
    };
    // Find by card UID (scan)
    export const findStudentByCard = async (cardUid) => {
    const { data } = await api.get(`/students/by-card/${cardUid}`);
    return data;
    };

    // Create student
    export const createStudent = async (payload) => {
    const { data } = await api.post("/students", payload);
    return data;
    };

    // Update student
    export const updateStudent = async (id, payload) => {
    const { data } = await api.put(`/students/${id}`, payload);
    return data;
    };

    // Delete student
    export const deleteStudent = async (id) => {
    const { data } = await api.delete(`/students/${id}`);
    return data;
    };
