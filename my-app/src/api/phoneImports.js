import { request } from "./client";

const baseUrl = "/inventory_service/api/v1/phones/imports";

async function call(path, options) {
  const response = await request(`${baseUrl}${path}`, options);
  if (!response?.success) throw new Error(response?.message || "Không thể xử lý yêu cầu import.");
  return response.data;
}

// Filters follow the backend contract: [{ field, operator, value | values }].
// POST body is { filters: JSON.stringify(filters) } with page/size as query params.
async function list(page = 0, size = 20, filters = [], signal) {
  return call(`?page=${page}&size=${size}`, { method: "POST", body: { filters: JSON.stringify(filters) }, signal });
}

export const phoneImportApi = {
  upload(file, mode) {
    const body = new FormData();
    body.append("file", file);
    body.append("mode", mode);
    return call("", { method: "POST", body });
  },
  stat: (id, signal) => call(`/${encodeURIComponent(id)}/stat`, { signal }),
  detail: (id, page = 0, size = 20, signal) => call(`/${encodeURIComponent(id)}?page=${page}&size=${size}`, { signal }),
  validate: id => call(`/${encodeURIComponent(id)}/validate`, { method: "POST" }),
  approve: (id, warningSkip = false) => call(`/${encodeURIComponent(id)}/approve`, { method: "POST", body: { warningSkip } }),
  list,
};
