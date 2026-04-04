import api from "./client";

// GET /api/license/status  (your api client already prefixes /api)
export const getLicenseStatus = async () => {
  const { data } = await api.get("/license/status");
  return data; // { state: 'OK' | 'TRIAL' | 'EXPIRED' | 'INVALID', daysLeft?, trialTotal?, message? }
};
