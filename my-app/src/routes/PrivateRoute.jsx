import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Temporary bypass while working on the import screen. Set to false to restore the guard.
const SKIP_AUTH_CHECK = true;

export default function PrivateRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (SKIP_AUTH_CHECK) return <Outlet />;

  // Still checking Local Storage for a saved session.
  // Render nothing rather than redirecting or showing content early —
  // this is what prevents both a wrong redirect and a flash of
  // protected content.
  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    // Remember where the user was trying to go, so a login flow
    // could optionally send them back (kept simple here, but the
    // state is passed in case we want to use it later).
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
