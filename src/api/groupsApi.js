import api from "./client";

// 🔎 List/search groups (server paging) with filters
export const searchGroups = async ({
  q,
  academicYear,
  active,          // true | false | undefined
  teacherId,
  subjectId,
  levelId,
  sectionId,
  privateGroup,
  revisionGroup,
  page = 0,
  size = 50,
  sort = "name,asc",
} = {}) => {
  const params = {
    q,
    academicYear,
    active,
    teacherId,
    subjectId,
    levelId,
    sectionId,
    privateGroup,
    revisionGroup,
    page,
    size,
    sort,
  };

  // remove undefined / empty string params
  Object.keys(params).forEach((k) => {
    if (params[k] === undefined || params[k] === "") delete params[k];
  });

  const { data } = await api.get("/groups", { params });
  return data; // { content, totalElements, ... }
};

export const getGroup = async (id) => {
  const { data } = await api.get(`/groups/${id}`);
  return data;
};

export const createGroup = async (payload) => {
  const { data } = await api.post("/groups", payload);
  return data;
};

export const updateGroup = async (id, payload) => {
  const { data } = await api.put(`/groups/${id}`, payload);
  return data;
};

export const deleteGroup = async (id) => {
  const { data } = await api.delete(`/groups/${id}`);
  return data;
};

export const listGroups = async () => {
  const { data } = await api.get("/groups", { params: { size: 1000, sort: "id,asc" } });
  return data.content ? data.content : data;
};

export const lookupGroups = async ({ q, academicYear, active, limit = 50 } = {}) => {
  const params = { q, academicYear, active, limit };
  Object.keys(params).forEach((k) => {
    if (params[k] === undefined || params[k] === "") delete params[k];
  });
  const { data } = await api.get("/groups/lookup", { params });
  return data; // [{ id, name }]
};
