import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Register from "../pages/auth/Register";

function LoginDestination() {
  const { state } = useLocation();
  return <p>{state?.message}</p>;
}

function openRegistration() {
  render(<MemoryRouter initialEntries={["/register"]}><Routes>
    <Route path="/register" element={<Register />} />
    <Route path="/login" element={<LoginDestination />} />
  </Routes></MemoryRouter>);
}

function fillForm(confirmPassword = "Password123") {
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "demoUser" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Password123" } });
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: confirmPassword } });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
}

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => vi.unstubAllGlobals());

test.each(["USER", "SUPERVISOR"])("registers with role %s and returns to login with success message", async (role) => {
  fetch.mockResolvedValue(new Response(JSON.stringify({ username: "demoUser" }), { status: 201 }));
  openRegistration();
  expect(screen.getByRole("combobox", { name: "Role" })).toHaveValue("USER");
  fireEvent.change(screen.getByRole("combobox", { name: "Role" }), { target: { value: role } });
  fillForm();
  expect(await screen.findByText("Account created. Sign in with your new account.")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith("/auth_service/api/v1/auth/register", expect.objectContaining({
    method: "POST", body: JSON.stringify({ username: "demoUser", password: "Password123", role }),
  }));
  expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
});

test("mismatched passwords do not call the API", () => {
  openRegistration();
  fillForm("Different123");
  expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match.");
  expect(fetch).not.toHaveBeenCalled();
});

test("shows API errors and lets the user retry", async () => {
  fetch.mockResolvedValue(new Response(JSON.stringify({ message: "Username already exists" }), { status: 409 }));
  openRegistration();
  fillForm();
  expect(await screen.findByRole("alert")).toHaveTextContent("Username already exists");
  expect(screen.getByRole("button", { name: "Create account" })).toBeEnabled();
});
