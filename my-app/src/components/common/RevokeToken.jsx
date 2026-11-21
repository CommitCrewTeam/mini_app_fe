import { usePermissions } from "../../context/PermissionContext";

export default function RevokeToken({ token, busy, onRevoke }) {
  const { can } = usePermissions();
  if (!can("tokens:write")) return null;
  return <button
    className="action-button disabled:opacity-50"
    aria-label={`Thu hồi token #${token.id}`}
    disabled={token.revoked || busy !== null}
    onClick={() => onRevoke(token)}
  >
    {busy === token.id ? "Đang thu hồi…" : "Thu hồi"}
  </button>;
}
