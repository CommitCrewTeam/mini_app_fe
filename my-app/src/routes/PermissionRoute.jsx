import { Navigate, Outlet } from "react-router-dom";
import { usePermissions } from "../context/PermissionContext";

export default function PermissionRoute({ permission }) {
  const { can } = usePermissions();
  return can(permission) ? <Outlet /> : <Navigate to="/unauthorized" replace />;
}
