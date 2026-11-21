import { request } from "./client";

const baseUrl = "/inventory_service/api/v1/phones/imports";

async function call(path, options) {
  const response = await request(`${baseUrl}${path}`, options);
  if (!response?.success) throw new Error(response?.message || "Không thể xử lý yêu cầu import.");
  return response.data;
}

export const phoneImportApi = {
  upload(file, mode) {
    const body = new FormData();
    body.append("file", file);
    body.append("mode", mode);
    return call("", { method: "POST", body });
  },
  stat: (id, signal) => call(`/${encodeURIComponent(id)}/stat`, { signal }),
  validate: id => call(`/${encodeURIComponent(id)}/validate`, { method: "POST" }),
  approve: id => call(`/${encodeURIComponent(id)}/approve`, { method: "POST" }),
};
