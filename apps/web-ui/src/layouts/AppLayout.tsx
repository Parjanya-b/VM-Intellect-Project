import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getPersona, PERSONA_INFO } from "../lib/persona";
import { Button } from "../components/Button";

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const persona = getPersona();

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/dashboard" className="font-semibold tracking-tight">
            VM Intellect
          </Link>
          <div className="flex items-center gap-4 text-sm">
            {persona && (
              <Link to="/welcome" className="text-muted hover:text-ink" title="Change persona">
                {PERSONA_INFO[persona].label} view
              </Link>
            )}
            <span>
              {user?.fullName} <span className="font-mono text-xs uppercase text-muted">({user?.role})</span>
            </span>
            <Button
              variant="secondary"
              onClick={async () => {
                await signOut();
                navigate("/welcome", { replace: true });
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
