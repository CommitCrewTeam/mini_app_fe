import { createContext, useContext } from "react";
import { useAuth } from "./AuthContext";
const PermissionContext = createContext(null);
export function PermissionProvider({ children }) {
  const { user } = useAuth();
  const can = permission => !!user && (user.role === "admin" || (user.permissions ?? []).includes(permission));
  return <PermissionContext.Provider value={{ can }}>{children}</PermissionContext.Provider>;
}
export const usePermissions = () => useContext(PermissionContext);
