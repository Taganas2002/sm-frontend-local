import api from "./client";

// Auth
export const loginApi = async (phone, password) => {
  const { data } = await api.post("/auth/signin", { phone, password });
  return data;
};

// Accounts
export const searchAccounts = async ({ search = "", page = 0, size = 10 }) => {
  const { data } = await api.get("/admin/accounts", {
    params: { search, page, size }
  });
  // normalize name for grid usage (backend sends 'username')
  const content = (data.content || []).map((r) => ({
    ...r,
    name: r.username ?? r.name
  }));
  return { ...data, content };
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

// Roles & Permissions
export const listRoles = async () => {
  const { data } = await api.get("/roles"); // your backend should expose this
  return data; // [{id,name}]
};

export const listPermissionCodes = async (type = "MENU") => {
  const { data } = await api.get("/permissions", { params: { type } });
  return data; // ["MENU:HOME_VIEW", ...]
};

export const getPermissionsSnapshot = async (userId, includeBaseline = true) => {
  const { data } = await api.get(`/admin/accounts/${userId}/permissions`, {
    params: { includeBaseline }
  });
  return data; // { userId, roleId, baseline, overrides, effective }
};

export const savePermissions = async (userId, body) => {
  const { data } = await api.post(`/admin/accounts/${userId}/permissions`, body);
  return data; // { userId, authorities: [...] }
};
