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
  if (schoolId != null) params.schoolId = schoolId;
  if (levelId != null) params.levelId = levelId;
  if (sectionId != null) params.sectionId = sectionId;
  if (gender) params.gender = gender;

  const { data } = await api.get("/students", { params });
  return data; // Spring Page
};

export const getStudent = async (id) => {
  const { data } = await api.get(`/students/${id}`);
  return data;
};

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
