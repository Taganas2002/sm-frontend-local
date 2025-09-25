    // src/api/teachers.js
    import api from "./client";

    /**
     * List teachers (Spring Page)
     * GET /api/teachers?page=&size=&sort=
     *
     * @param {Object} p
     * @param {number} p.page  zero-based page
     * @param {number} p.size  page size
     * @param {string} p.sort  e.g. "fullName,asc"
     */
    export async function listTeachers({ page = 0, size = 10, sort = "fullName,asc" }) {
    const { data } = await api.get("/teachers", {
        params: { page, size, sort },
    });
    return data; // { content, totalElements, totalPages, number, size, ... }
    }
