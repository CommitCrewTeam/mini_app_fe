import { request } from "./client";
const baseUrl = "/backend_service/api/v1/products";
export const productApi = {
  list: signal => request(baseUrl, { signal }),
  create: body => request(baseUrl, { method: "POST", body }),
  update: (id, body) => request(`${baseUrl}/${encodeURIComponent(id)}`, { method: "PUT", body }),
  remove: id => request(`${baseUrl}/${encodeURIComponent(id)}`, { method: "DELETE" }),
  reset: () => request(`${baseUrl}/reset`, { method: "POST" }),
};
