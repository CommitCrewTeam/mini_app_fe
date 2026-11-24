// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PhoneImportDetail from "../components/PhoneImportDetail";
import { phoneImportApi } from "../api/phoneImports";

vi.mock("../api/phoneImports", () => ({ phoneImportApi: { detail: vi.fn(), validate: vi.fn() } }));
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(() => { cleanup(); delete HTMLDialogElement.prototype.showModal; delete HTMLDialogElement.prototype.close; vi.resetAllMocks(); });

const data = {
  header: { id: 42, mode: "CREATE", status: "VALIDATE_SUCCEEDED", version: 1 },
  content: [{ id: 5, rowNumber: 2, key: "phone-a", detail: { name: "Phone A" }, quantity: 0,
    status: "WARNING", errorMessage: "Phone changed", version: 2, matchedVersion: 0 }],
  totalElements: 21, totalPages: 2,
};

test("shows all draft fields, loads another page and closes the dialog", async () => {
  phoneImportApi.detail.mockResolvedValueOnce(data).mockResolvedValueOnce({ ...data, content: [] });
  const onClose = vi.fn();
  render(<PhoneImportDetail importId={42} onClose={onClose} />);
  await screen.findByText("phone-a");
  expect(screen.getByText(/"name": "Phone A"/)).toBeTruthy();
  expect(screen.getByText("Phone changed")).toBeTruthy();
  expect(screen.getByText("WARNING").style.color).toContain("warning");
  expect(screen.getAllByRole("cell", { name: "0" })).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
  await waitFor(() => expect(phoneImportApi.detail).toHaveBeenLastCalledWith(42, 1, 20, expect.anything()));
  await screen.findByText("Chưa có dòng dữ liệu ở trang này.");
  fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
  expect(onClose).toHaveBeenCalledOnce();
});

test("allows retry after failing to load details", async () => {
  phoneImportApi.detail.mockRejectedValueOnce(new Error("Cannot load import")).mockResolvedValueOnce(data);
  render(<PhoneImportDetail importId={42} onClose={() => {}} />);
  expect((await screen.findByRole("alert")).textContent).toBe("Cannot load import");
  fireEvent.click(screen.getByRole("button", { name: "Tải lại chi tiết" }));
  await screen.findByText("phone-a");
  expect(screen.queryByRole("alert")).toBeNull();
});

