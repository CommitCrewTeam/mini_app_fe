// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PhoneImportList from "../pages/PhoneImportList";
import { phoneImportApi } from "../api/phoneImports";

vi.mock("../api/phoneImports", () => ({ phoneImportApi: { list: vi.fn(), approve: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

const pageData = (items, totalElements) => ({
  content: items, page: 0, size: 20, totalElements, totalPages: Math.ceil(totalElements / 20) || 0,
});
const importItem = { id: 7, mode: "RESTOCK", status: "APPROVE_SUCCEEDED", version: 3, error: null, createdAt: "2026-11-20T10:15:00Z" };
const renderPage = () => render(<MemoryRouter><PhoneImportList /></MemoryRouter>);

test("approves a validated import and refreshes its status", async () => {
  phoneImportApi.list.mockResolvedValueOnce(pageData([{ ...importItem, status: "VALIDATE_SUCCEEDED" }], 1))
    .mockResolvedValue(pageData([importItem], 1));
  phoneImportApi.approve.mockResolvedValue(7);
  renderPage();
  fireEvent.click(await screen.findByRole("button", { name: "Approve import #7" }));
  await waitFor(() => expect(phoneImportApi.approve).toHaveBeenCalledWith(7, false));
  await screen.findByRole("cell", { name: "APPROVE_SUCCEEDED" });
  expect(screen.getByRole("button", { name: "Approve import #7" }).disabled).toBe(true);
});

test("requires explicit warning acceptance and displays approval errors", async () => {
  phoneImportApi.list.mockResolvedValue(pageData([{ ...importItem, status: "VALIDATE_SUCCEEDED" }], 1));
  phoneImportApi.approve.mockRejectedValue(new Error("Import cannot be approved"));
  renderPage();
  const button = await screen.findByRole("button", { name: "Approve import #7" });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(button);
  await waitFor(() => expect(phoneImportApi.approve).toHaveBeenCalledWith(7, true));
  expect((await screen.findByRole("alert")).textContent).toContain("Import cannot be approved");
});

test("lists imports with id, mode, status, version and created date", async () => {
  phoneImportApi.list.mockResolvedValue(pageData([importItem], 1));
  renderPage();
  expect(await screen.findByRole("cell", { name: "7" })).toBeTruthy();
  expect(screen.getByRole("cell", { name: "RESTOCK" })).toBeTruthy();
  expect(screen.getByRole("cell", { name: "APPROVE_SUCCEEDED" })).toBeTruthy();
  expect(phoneImportApi.list).toHaveBeenCalledWith(0, 20, [], expect.anything());
});

test("sends status and mode query filters when they change", async () => {
  phoneImportApi.list.mockResolvedValue(pageData([importItem], 1));
  renderPage();
  await screen.findByRole("cell", { name: "7" });

  fireEvent.change(screen.getByLabelText("Trạng thái"), { target: { value: "APPROVE_SUCCEEDED" } });
  fireEvent.change(screen.getByLabelText("Chế độ"), { target: { value: "RESTOCK" } });

  await waitFor(() => expect(phoneImportApi.list).toHaveBeenCalledWith(0, 20, [
    { field: "status", operator: "EQ", value: "APPROVE_SUCCEEDED" },
    { field: "mode", operator: "EQ", value: "RESTOCK" },
  ], expect.anything()));
});

test("shows an error when the list request fails", async () => {
  phoneImportApi.list.mockRejectedValue(new Error("Không thể tải danh sách import."));
  renderPage();
  await screen.findByRole("alert");
  expect(screen.getByRole("alert").textContent).toContain("Không thể tải danh sách import.");
});
