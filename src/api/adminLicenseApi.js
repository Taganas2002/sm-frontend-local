import api from "./client";

export const searchLicenseTarget = async ({ phone = "", email = "" }) => {
  const params = {};
  if (phone?.trim()) params.phone = phone.trim();
  if (email?.trim()) params.email = email.trim();
  const { data } = await api.get("/admin/licenses/search", { params });
  return data;
};

export const activateLicensePlan = async ({ phone, email, planDays }) => {
  const payload = { planDays };
  if (phone?.trim()) payload.phone = phone.trim();
  if (email?.trim()) payload.email = email.trim();
  const { data } = await api.post("/admin/licenses/activate", payload);
  return data;
};

export const deactivateLicensePlan = async ({ phone, email }) => {
  const payload = { deactivate: true };
  if (phone?.trim()) payload.phone = phone.trim();
  if (email?.trim()) payload.email = email.trim();
  const { data } = await api.post("/admin/licenses/activate", payload);
  return data;
};

export const listSchoolLicenses = async (search = "") => {
  const params = {};
  if (search?.trim()) params.search = search.trim();
  const { data } = await api.get("/admin/licenses", { params });
  return data;
};
