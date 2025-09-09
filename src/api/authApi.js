import api from "./client";

// LOGIN stays the same
export const loginApi = async (phone, password) => {
  const { data } = await api.post("/auth/signin", { phone, password });
  return data;
};

// SIGNUP: always send admin role (normalized to ROLE_ADMIN)
export const signupApi = async (form) => {
  const payload = {
    username: form.username,
    email: form.email,
    phone: form.phone,
    password: form.password,
    role: ["admin"],
  };

  const { data } = await api.post("/auth/signup", payload);
  return data;
};
