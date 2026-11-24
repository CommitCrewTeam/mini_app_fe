import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PermissionProvider } from "./context/PermissionContext";
import PrivateRoute from "./routes/PrivateRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import { TokenRefreshNotifications } from "./components/common/TokenSessionStatus";
import Products from "./pages/Products";
import ImportScreen from "./pages/ImportScreen";
import Authorization from "./pages/Authorization";
import NotFound from "./pages/NotFound";
import Account from "./pages/Account";
import ChangePassword from "./pages/ChangePassword";
import TokenPage from "./pages/TokenPage";
import RoleRoute from "./routes/RoleRoute";
import PermissionRoute from "./routes/PermissionRoute";
import Unauthorized from "./pages/Unauthorized";

export default function App() {
  return <AuthProvider><TokenRefreshNotifications /><PermissionProvider><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route element={<PrivateRoute />}><Route element={<DashboardLayout />}>
      <Route path="/account" element={<Account />} />
      <Route path="/" element={<ImportScreen />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route element={<PermissionRoute permission="tokens:read" />}>
        <Route path="/tokens" element={<TokenPage />} />
      </Route>
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route element={<PermissionRoute permission="product:read" />}>
        <Route path="/products" element={<Products />} />
      </Route>
      <Route element={<RoleRoute allowedRoles={["admin"]} />}>
        <Route path="/authorization" element={<Authorization />} />
      </Route>
    </Route></Route>
    <Route path="/dashboard" element={<Navigate to="/" replace />} />
    <Route path="*" element={<NotFound />} />
  </Routes></PermissionProvider></AuthProvider>;
}
