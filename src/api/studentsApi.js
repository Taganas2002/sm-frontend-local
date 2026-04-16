import api from "./client";

// Server search + filters + paging
export const searchStudents = async ({
  search = "",
  page = 0,
  size = 10,
  sort = "fullName,asc",
  schoolId = null,
  levelId = null,
  sectionId = null,
  gender = null,
}) => {
  const params = { page, size, sort };
  if (search && search.trim()) params.search = search.trim();
  if (schoolId != null && schoolId !== "") params.schoolId = schoolId;
  if (levelId != null && levelId !== "") params.levelId = Number(levelId);
  if (sectionId != null && sectionId !== "") params.sectionId = Number(sectionId);
  if (gender) params.gender = gender;

  const { data } = await api.get("/students", { params });
  return data; // Spring Page
};

export const getStudent = async (id) => {
  const { data } = await api.get(`/students/${id}`);
  return data;
};

/**
 * Resolve many student ids to fullName (parallel GET /students/{id}).
 * Used when list/search APIs do not support bulk id lookup (e.g. attendance roster).
 * @param {Array<number|string>} ids
 * @returns {Promise<Record<number, string>>}
 */
export async function fetchStudentNamesByIds(ids) {
  const uniq = [...new Set((ids || []).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))];
  const out = {};
  const concurrency = 10;
  for (let i = 0; i < uniq.length; i += concurrency) {
    const slice = uniq.slice(i, i + concurrency);
    await Promise.all(
      slice.map(async (id) => {
        try {
          const s = await getStudent(id);
          if (s?.fullName) out[id] = s.fullName;
        } catch {
          /* missing or forbidden */
        }
      })
    );
  }
  return out;
}

export const listStudents = async () => {
  try {
    const res = await searchStudents({ page: 0, size: 100 });
    const studentsArray = Array.isArray(res?.content) ? res.content : [];
    const studentsMap = {};
    studentsArray.forEach((s) => { studentsMap[s.id] = s; });
    return studentsMap;
  } catch (err) {
    console.error("Failed to fetch students", err);
    return {};
  }
};

export const findStudentByCard = async (cardUid) => {
  const { data } = await api.get(`/students/by-card/${cardUid}`);
  return data;
};

export const createStudent = async (payload) => {
  const { data } = await api.post("/students", payload);
  return data;
};

export const updateStudent = async (id, payload) => {
  const { data } = await api.put(`/students/${id}`, payload);
  return data;
};

export const deleteStudent = async (id) => {
  const { data } = await api.delete(`/students/${id}`);
  return data;
};

export const downloadStudentCardPdf = async (id) => {
  const res = await api.get(`/students/${id}/card`, { responseType: "blob" });
  return res.data; // Blob (application/pdf)
};
