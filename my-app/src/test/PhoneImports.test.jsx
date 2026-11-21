// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PhoneImports from "../pages/PhoneImports";
import { phoneImportApi } from "../api/phoneImports";

vi.mock("../api/phoneImports", () => ({ phoneImportApi: { upload: vi.fn(), stat: vi.fn(), validate: vi.fn(), approve: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.useRealTimers(); });
const ready = { total_count: 12, valid_count: 10, fail_count: 2, mode: "RESTOCK", status: "READY" };

test("uploads selected CSV and mode, displays stat payload and validation job ID", async () => {
  phoneImportApi.upload.mockResolvedValue({ importId: 42, jobExecutionId: 99 });
  phoneImportApi.stat.mockResolvedValue(ready);
  phoneImportApi.validate.mockResolvedValue(101);
  render(<PhoneImports />);
  const file = new File(["key,detail,quantity\na,phone,3"], "phones.csv", { type: "text/csv" });
  fireEvent.change(screen.getByLabelText("File CSV"), { target: { files: [file] } });
  fireEvent.change(screen.getByLabelText("Chế độ import"), { target: { value: "RESTOCK" } });
  fireEvent.submit(screen.getByRole("button", { name: "Tải lên và import" }).closest("form"));
  await screen.findByText("READY");
  expect(phoneImportApi.upload).toHaveBeenCalledWith(file, "RESTOCK");
  for (const value of ["12", "10", "2", "RESTOCK"]) expect(screen.getByRole("cell", { name: value })).toBeTruthy();
  phoneImportApi.stat.mockResolvedValue({ ...ready, status: "VALIDATED" });
  fireEvent.click(screen.getByRole("button", { name: "Validate" }));
  await screen.findByText("VALIDATED");
  expect(phoneImportApi.validate).toHaveBeenCalledWith("42");
  expect(screen.getByText(/Job execution #101/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Validate" }).disabled).toBe(true);
  expect(screen.getByRole("button", { name: "Approve" }).disabled).toBe(false);
  phoneImportApi.approve.mockResolvedValue({ importId: 42, jobExecutionId: 102 });
  phoneImportApi.stat.mockResolvedValue({ ...ready, status: "DONE" });
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  await screen.findByText("DONE");
  expect(phoneImportApi.approve).toHaveBeenCalledWith("42");
  expect(screen.getByRole("button", { name: "Approve" }).disabled).toBe(true);
});

test("looks up existing imports and preserves action errors after refreshing stats", async () => {
  phoneImportApi.stat.mockResolvedValue(ready);
  phoneImportApi.approve.mockRejectedValue(new Error("Import is not ready"));
  render(<PhoneImports />);
  fireEvent.change(screen.getByLabelText("Import ID"), { target: { value: "88" } });
  fireEvent.click(screen.getByRole("button", { name: "Tra cứu" }));
  await screen.findByText("READY");
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  await screen.findByRole("alert");
  await waitFor(() => expect(phoneImportApi.stat).toHaveBeenCalledTimes(2));
  expect(screen.getByRole("alert").textContent).toContain("Import is not ready");
});

test("polls running imports and stops at a terminal status", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  phoneImportApi.stat.mockResolvedValueOnce({ ...ready, status: "PENDING" }).mockResolvedValue({ ...ready, status: "FAILED" });
  render(<PhoneImports />);
  fireEvent.change(screen.getByLabelText("Import ID"), { target: { value: "7" } });
  fireEvent.click(screen.getByRole("button", { name: "Tra cứu" }));
  const { act } = await import("@testing-library/react");
  await act(async () => { await Promise.resolve(); });
  expect(screen.getByText("PENDING")).toBeTruthy();
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  expect(screen.getByText("FAILED")).toBeTruthy();
  await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
  expect(phoneImportApi.stat).toHaveBeenCalledTimes(2);
});
