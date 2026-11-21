import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";

function openAs(role, path = "/products") {
  localStorage.setItem("auth_dashboard_session", JSON.stringify({ id: "test", email: `${role}@example.com`, role }));
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

test("edits name and quantity, validates input, and persists after remount", () => {
  const view = openAs("admin");
  const row = screen.getByText("P001").closest("tr");
  fireEvent.click(within(row).getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByLabelText("Name P001"), { target: { value: "Updated notebook" } });
  fireEvent.change(screen.getByLabelText("Quantity P001"), { target: { value: "-1" } });
  fireEvent.click(within(row).getByRole("button", { name: "Save" }));
  expect(screen.getByRole("alert")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Quantity P001"), { target: { value: "0" } });
  fireEvent.click(within(row).getByRole("button", { name: "Save" }));
  expect(within(row).getByRole("button", { name: "Edit" })).toBeEnabled();
  expect(screen.queryByLabelText("Name P001")).not.toBeInTheDocument();
  view.unmount();
  openAs("admin");
  expect(screen.getByText("Updated notebook")).toBeInTheDocument();
  expect(within(screen.getByText("P001").closest("tr")).getByText("0")).toBeInTheDocument();
});

test("delete respects confirmation and persists removal", () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const view = openAs("admin");
  const button = within(screen.getByText("P001").closest("tr")).getByRole("button", { name: "Delete" });
  fireEvent.click(button);
  expect(screen.getByText("P001")).toBeInTheDocument();
  confirm.mockReturnValue(true);
  fireEvent.click(button);
  expect(screen.queryByText("P001")).not.toBeInTheDocument();
  view.unmount();
  openAs("admin");
  expect(screen.queryByText("P001")).not.toBeInTheDocument();
});

test("ADMIN grants USER edit without delete and USER cannot change permissions", () => {
  const admin = openAs("admin", "/authorization");
  fireEvent.click(screen.getByLabelText("USER edit"));
  admin.unmount();
  openAs("user");
  expect(screen.getAllByRole("button", { name: "Edit" })[0]).toBeEnabled();
  expect(screen.getAllByRole("button", { name: "Delete" })[0]).toBeDisabled();
  fireEvent.click(screen.getByRole("link", { name: "Authorization" }));
  expect(screen.getByLabelText("USER edit")).toBeChecked();
  for (const checkbox of screen.getAllByRole("checkbox")) expect(checkbox).toBeDisabled();
});

test("revoked ADMIN product permissions take effect while authorization remains available", () => {
  openAs("admin", "/authorization");
  fireEvent.click(screen.getByLabelText("ADMIN edit"));
  fireEvent.click(screen.getByLabelText("ADMIN delete"));
  fireEvent.click(screen.getByRole("link", { name: "Product" }));
  for (const button of screen.getAllByRole("button", { name: /^(Edit|Delete)$/ })) expect(button).toBeDisabled();
  expect(screen.getAllByRole("link")).toHaveLength(2);
  expect(screen.queryByRole("button", { name: /notification|add/i })).not.toBeInTheDocument();
});
