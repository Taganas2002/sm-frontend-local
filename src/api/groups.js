// src/api/groups.js
import api from "./client";

/** Dropdown lookup for groups */
export async function lookupGroups({ q = "", active = true, limit = 50 }) {
  const { data } = await api.get("/groups/lookup", {
    params: { q, active, limit },
  });
  return data; // [{ id, name }]
}
