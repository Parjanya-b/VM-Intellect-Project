import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { getPersona } from "../lib/persona";

export default function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-8 text-muted">Loading…</p>;
  if (!user) return <Navigate to="/signin" replace />;
  if (!getPersona()) return <Navigate to="/welcome" replace />; // persona is chosen per session
  return <Outlet />;
}
