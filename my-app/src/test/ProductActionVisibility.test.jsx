import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Products from "../pages/Products";

const products = [{ productId: 1, name: "Notebook", quantity: 3 }];
const forbiddenBody = {
  success: false,
  code: "403",
  message: "You do not have permission to perform this action",
  data: null,
};

function json(status, data) {
  return new Response(JSON.stringify(data), { status });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function renderProducts() {
  fetch.mockResolvedValueOnce(json(200, products));
  render(<Products />);
  await waitFor(() => expect(screen.getByText("Notebook")).toBeInTheDocument());
}

test("action buttons are visible to any signed-in user", async () => {
  await renderProducts();
  expect(screen.getByRole("button", { name: "Create product" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Reset products" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Edit" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
});

test("an unauthorized delete still calls the API and shows its 403 message", async () => {
  await renderProducts();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fetch.mockResolvedValueOnce(json(403, forbiddenBody));

  fireEvent.click(screen.getByRole("button", { name: "Delete" }));

  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(forbiddenBody.message));
  expect(fetch.mock.calls[1][0]).toBe("/product_service/api/v1/products/1");
  expect(fetch.mock.calls[1][1].method).toBe("DELETE");
  expect(screen.getByText("Notebook")).toBeInTheDocument();
});

test("an unauthorized create still calls the API and shows its 403 message", async () => {
  await renderProducts();
  fireEvent.click(screen.getByRole("button", { name: "Create product" }));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New product" } });
  fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "1" } });
  fetch.mockResolvedValueOnce(json(403, forbiddenBody));

  fireEvent.click(screen.getByRole("button", { name: "Create", exact: true }));

  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(forbiddenBody.message));
  expect(fetch.mock.calls[1][0]).toBe("/product_service/api/v1/products");
  expect(fetch.mock.calls[1][1].method).toBe("POST");
});
