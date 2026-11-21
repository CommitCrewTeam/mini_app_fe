// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { phoneImportApi } from "../api/phoneImports";
import { accountApi, clearSession } from "../api/client";

afterEach(() => { clearSession(); vi.unstubAllGlobals(); });
const response = (status, data) => new Response(JSON.stringify(data), { status });

test("multipart upload survives token refresh without a JSON content type", async () => {
  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce(response(200, { accessToken: "old", refreshToken: "refresh" }))
    .mockResolvedValueOnce(response(401, {}))
    .mockResolvedValueOnce(response(200, { accessToken: "new", refreshToken: "refresh2" }))
    .mockResolvedValueOnce(response(202, { success: true, data: { importId: 5, jobExecutionId: 6 } })));
  await accountApi.login("demo", "password");
  const file = new File(["key,detail,quantity"], "phones.csv");
  await expect(phoneImportApi.upload(file, "CREATE")).resolves.toEqual({ importId: 5, jobExecutionId: 6 });
  const first = fetch.mock.calls[1];
  const retry = fetch.mock.calls[3];
  expect(first[0]).toBe("/api/phones/imports");
  expect(first[1].body.get("file")).toBe(file);
  expect(first[1].body.get("mode")).toBe("CREATE");
  expect(first[1].headers["Content-Type"]).toBeUndefined();
  expect(retry[1].body).toBe(first[1].body);
  expect(retry[1].headers.Authorization).toBe("Bearer new");
});

test("surfaces API envelope errors", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(200, { success: false, message: "Import not found" })));
  await expect(phoneImportApi.stat("9")).rejects.toThrow("Import not found");
});
