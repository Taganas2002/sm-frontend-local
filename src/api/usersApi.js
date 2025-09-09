import api from "./client";

// List/search staff accounts (server paging)
export const searchAccounts = async ({ search = "", page = 0, size = 10 }) => {
  const { data } = await api.get("/admin/accounts", { params: { search, page, size } });
  return data; // { content, page, size, total }
};

export const getAccount = async (id) => {
  const { data } = await api.get(`/admin/accounts/${id}`);
  return data;
};

export const createAccount = async (payload) => {
  const { data } = await api.post("/admin/accounts", payload);
  return data;
};

export const updateAccount = async (id, payload) => {
  const { data } = await api.put(`/admin/accounts/${id}`, payload);
  return data;
};

// Roles & permissions
export const listRoles = async () => {
  const { data } = await api.get("/roles");
  return data; // [{id,name}]
};

export const listPermissionCodes = async (type = "MENU") => {
  const { data } = await api.get("/permissions", { params: { type } });
  return data; // ["MENU:HOME_VIEW", ...]
};

export const getPermissionsSnapshot = async (userId, includeBaseline = true) => {
  const { data } = await api.get(`/admin/accounts/${userId}/permissions`, {
    params: { includeBaseline },
  });
  return data; // { userId, roleId, baseline, overrides, effective }
};

export const savePermissions = async (userId, body) => {
  const { data } = await api.post(`/admin/accounts/${userId}/permissions`, body);
  return data; // { userId, authorities: [...] }
};
