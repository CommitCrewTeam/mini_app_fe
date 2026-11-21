import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { clearSession } from "../api/client";
import Login from "../pages/auth/Login";

async function renderLogin() {
  render(<MemoryRouter><AuthProvider><Login /></AuthProvider></MemoryRouter>);
  await screen.findByRole("heading", { name: "Sign in" });
}
beforeEach(() => {
  clearSession();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
});
afterEach(() => vi.unstubAllGlobals());

test("renders username, password and remember me after checking the cookie session", async () => {
  await renderLogin();
  expect(screen.getByLabelText("Username")).toBeInTheDocument();
  expect(screen.getByLabelText("Password")).toBeInTheDocument();
  expect(screen.getByLabelText("Remember me")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
});

test("links to registration", async () => {
  await renderLogin();
  expect(screen.getByRole("link", { name: /create account/i })).toHaveAttribute("href", "/register");
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});
