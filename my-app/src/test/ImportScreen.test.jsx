// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ImportScreen from "../pages/ImportScreen";
import { phoneImportApi } from "../api/phoneImports";

vi.mock("../api/phoneImports", () => ({
  phoneImportApi: { list: vi.fn(), upload: vi.fn(), stat: vi.fn(), validate: vi.fn(), approve: vi.fn() },
}));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

test("screen switches between the Danh sách import tab and the import form tab", async () => {
  phoneImportApi.list.mockResolvedValue({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  render(<MemoryRouter><ImportScreen /></MemoryRouter>);

  expect(screen.getByRole("button", { name: "Danh sách import" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByRole("button", { name: "New import" }).getAttribute("aria-pressed")).toBe("false");
  await screen.findByText(/Không có import/);
  expect(phoneImportApi.list).toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "New import" }));
  expect(screen.getByLabelText("File CSV")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Tải lên và import" })).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Danh sách import" }));
  expect(screen.getByRole("button", { name: "Danh sách import" }).getAttribute("aria-pressed")).toBe("true");
  await screen.findByText(/Không có import/);
});
