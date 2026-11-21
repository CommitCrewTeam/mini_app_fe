import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RoleRoute({ allowedRoles }) {
  const { user } = useAuth();

  // This component is always used nested inside PrivateRoute, so by the
  // time we get here we already know the user is authenticated.
  // We only need to check whether their role is permitted.
  const isAllowed = user && allowedRoles.includes(user.role);

  if (!isAllowed) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}