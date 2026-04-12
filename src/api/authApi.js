import api from "./client";

// LOGIN stays the same
export const loginApi = async (phone, password) => {
  const { data } = await api.post("/auth/signin", { phone, password });
  return data;
};

// SIGNUP: always send admin role (normalized to ROLE_ADMIN)
export const signupApi = async (form) => {
  const phone = String(form.phone ?? "").replace(/\s+/g, "").trim();
  const payload = {
    username: String(form.username ?? "").trim(),
    email: String(form.email ?? "").trim(),
    phone,
    password: form.password,
    role: ["admin"],
  };

  const { data } = await api.post("/auth/signup", payload);
  return data;
};
