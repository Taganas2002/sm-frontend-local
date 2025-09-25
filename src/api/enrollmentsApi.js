    import api from "./client";

    /**
     * 1) Create Enrollment
     *    Do NOT send enrollmentDate; backend will set it.
     */
    export const createEnrollment = async (payload) => {
    const { data } = await api.post("/enrollments", payload);
    return data;
    };

    /** 2) Get by ID */
    export const getEnrollment = async (id) => {
    const { data } = await api.get(`/enrollments/${id}`);
    return data;
    };

    /**
     * 3) Update Status (PATCH ?status=...&notes=...)
     */
    export const updateEnrollmentStatus = async (id, status, notes = "") => {
    const { data } = await api.patch(`/enrollments/${id}/status`, null, {
        params: { status, notes },
    });
    return data;
    };

    /** 4) Delete */
    export const deleteEnrollment = async (id) => {
    const { data } = await api.delete(`/enrollments/${id}`);
    return data;
    };

    /**
     * 5) List (single status filter compatible)
     *    Returns Page<EnrollmentResponse> when backend is pageable.
     */
    export const listEnrollments = async ({
    page = 0,
    size = 20,
    sort = "enrollmentDate,desc",
    groupId,
    studentId,
    status,
    } = {}) => {
    const { data } = await api.get("/enrollments", {
        params: { page, size, sort, groupId, studentId, status },
    });
    return data;
    };

    /**
     * 6) Filter by multiple statuses (?status=ACTIVE&status=SUSPENDED)
     */
    export const filterEnrollments = async ({ groupId, studentId, statuses = [], page = 0, size = 100, sort = "enrollmentDate,desc" }) => {
    const params = new URLSearchParams();
    if (groupId) params.append("groupId", groupId);
    if (studentId) params.append("studentId", studentId);
    if (sort) params.append("sort", sort);
    params.append("page", page);
    params.append("size", size);
    statuses.forEach((s) => params.append("status", s));
    const { data } = await api.get("/enrollments/filter", { params });
    return data;
    };

    /**
     * 7) Filter by CSV statuses (?statuses=ACTIVE,SUSPENDED)
     *    (Convenience; same endpoint as #6)
     */
    export const filterEnrollmentsCSV = async ({ groupId, studentId, statuses = [], page = 0, size = 100, sort = "enrollmentDate,desc" }) => {
    const { data } = await api.get("/enrollments/filter", {
        params: {
        groupId,
        studentId,
        statuses: statuses.join(","),
        page,
        size,
        sort,
        },
    });
    return data;
    };

    /** 8) Group Status Summary */
    export const getGroupStatusSummary = async (groupId) => {
    const { data } = await api.get(`/enrollments/groups/${groupId}/status-summary`);
    return data;
    };
