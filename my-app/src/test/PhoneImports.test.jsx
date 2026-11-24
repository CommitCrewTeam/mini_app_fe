// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PhoneImports from "../pages/PhoneImports";
import { phoneImportApi } from "../api/phoneImports";

vi.mock("../components/PhoneImportDetail", () => ({ default: ({ importId, onClose }) => <div role="dialog">Chi tiết #{importId}<button onClick={onClose}>Đóng popup</button></div> }));
vi.mock("../api/phoneImports", () => ({ phoneImportApi: { upload: vi.fn(), stat: vi.fn(), validate: vi.fn(), approve: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.useRealTimers(); });
const ready = { total_count: 12, valid_count: 10, fail_count: 2, mode: "RESTOCK", status: "VALIDATE_SUCCEEDED" };

test("uploads selected CSV and mode, displays stats and supports validate and approve", async () => {
  phoneImportApi.upload.mockResolvedValue(42);
  phoneImportApi.stat.mockResolvedValue(ready);
  phoneImportApi.validate.mockResolvedValue(101);
  render(<PhoneImports />);
  const file = new File(["key,detail,quantity\na,phone,3"], "phones.csv", { type: "text/csv" });
  fireEvent.change(screen.getByLabelText("File CSV"), { target: { files: [file] } });
  fireEvent.change(screen.getByLabelText("Chế độ import"), { target: { value: "RESTOCK" } });
  fireEvent.submit(screen.getByRole("button", { name: "Tải lên và import" }).closest("form"));
  await screen.findByText("VALIDATE_SUCCEEDED");
  expect(phoneImportApi.upload).toHaveBeenCalledWith(file, "RESTOCK");
  for (const value of ["12", "10", "2", "RESTOCK"]) expect(screen.getByRole("cell", { name: value })).toBeTruthy();
  phoneImportApi.stat.mockResolvedValue({ ...ready, status: "VALIDATE_SUCCEEDED" });
  fireEvent.click(screen.getByRole("button", { name: "Validate" }));
  await screen.findByText("VALIDATE_SUCCEEDED");
  await waitFor(() => expect(phoneImportApi.validate).toHaveBeenCalledWith("42"));
  await waitFor(() => expect(screen.getByRole("button", { name: "Validate" }).disabled).toBe(false));
  expect(screen.getByRole("button", { name: "Approve" }).disabled).toBe(false);
  phoneImportApi.approve.mockResolvedValue(42);
  phoneImportApi.stat.mockResolvedValue({ ...ready, status: "APPROVE_SUCCEEDED" });
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  await screen.findByText("APPROVE_SUCCEEDED");
  expect(phoneImportApi.approve).toHaveBeenCalledWith("42");
  expect(screen.getByRole("button", { name: "Approve" }).disabled).toBe(true);
});

test("looks up existing imports and preserves action errors after refreshing stats", async () => {
  phoneImportApi.stat.mockResolvedValue(ready);
  phoneImportApi.approve.mockRejectedValue(new Error("Import is not ready"));
  render(<PhoneImports />);
  fireEvent.change(screen.getByLabelText("Import ID"), { target: { value: "88" } });
  fireEvent.click(screen.getByRole("button", { name: "Tra cứu" }));
  await screen.findByText("VALIDATE_SUCCEEDED");
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  await screen.findByRole("alert");
  await waitFor(() => expect(phoneImportApi.stat).toHaveBeenCalledTimes(2));
  expect(screen.getByRole("alert").textContent).toContain("Import is not ready");
});

test("polls running imports and stops at a terminal status", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  phoneImportApi.stat.mockResolvedValueOnce({ ...ready, status: "UPLOAD_IN_PROGRESS" }).mockResolvedValue({ ...ready, status: "UPLOAD_FAILED" });
  render(<PhoneImports />);
  fireEvent.change(screen.getByLabelText("Import ID"), { target: { value: "7" } });
  fireEvent.click(screen.getByRole("button", { name: "Tra cứu" }));
  const { act } = await import("@testing-library/react");
  await act(async () => { await Promise.resolve(); });
  expect(screen.getByText("UPLOAD_IN_PROGRESS")).toBeTruthy();
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  expect(screen.getByText("UPLOAD_FAILED")).toBeTruthy();
  await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
  expect(phoneImportApi.stat).toHaveBeenCalledTimes(2);
});

 test("opens details for an uploaded import and refreshes after closing", async () => {
  phoneImportApi.upload.mockResolvedValue(42);
  phoneImportApi.stat.mockResolvedValue({ ...ready, upload_file_name: "original.csv" });
  render(<PhoneImports />);
  const file = new File(["key,detail,quantity"], "original.csv", { type: "text/csv" });
  fireEvent.change(screen.getByLabelText("File CSV"), { target: { files: [file] } });
  fireEvent.submit(screen.getByRole("button", { name: "Tải lên và import" }).closest("form"));
  await screen.findByRole("cell", { name: "original.csv" });
  fireEvent.click(screen.getByRole("button", { name: "Xem chi tiết" }));
  expect(screen.getByRole("dialog").textContent).toContain("Chi tiết #42");
  fireEvent.click(screen.getByRole("button", { name: "Đóng popup" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  await waitFor(() => expect(phoneImportApi.stat).toHaveBeenCalledTimes(2));
});
