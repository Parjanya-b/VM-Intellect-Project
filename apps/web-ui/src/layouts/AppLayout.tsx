import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getPersona, PERSONA_INFO } from "../lib/persona";
import { Button } from "../components/Button";
import { BrandLogo } from "../components/BrandLogo";

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const persona = getPersona();

  return (
    <div className="min-h-screen">
      {/* Global top strip */}
      <div className="top-strip">
        VM INTELLECT&nbsp;&nbsp;·&nbsp;&nbsp;Local-First · works offline
      </div>

      {/* Main header */}
      <header className="border-b border-line bg-white relative">
        {/* Thin gradient accent line */}
        <div
          style={{
            background: "linear-gradient(90deg, #0B2A5C, #6FA8E6)",
            height: "2px",
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
          }}
        />
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          {/* Logo area */}
          <Link
            to="/dashboard"
            className="flex items-center gap-3 no-underline"
            aria-label="VM Intellect home"
          >
            <BrandLogo variant="mark" size={36} />
            <span className="flex flex-col leading-none">
              <span
                style={{
                  color: "#0B2A5C",
                  fontWeight: 700,
                  fontSize: "16px",
                  letterSpacing: "-0.01em",
                }}
              >
                VM <span style={{ color: "#6FA8E6" }}>Intellect</span>
              </span>
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-4 text-sm">
            {persona && (
              <Link
                to="/welcome"
                className="text-muted hover:text-brand-900 transition-colors"
                title="Change persona"
              >
                {PERSONA_INFO[persona].label} view
              </Link>
            )}
            <span className="text-ink">
              {user?.fullName}{" "}
              <span
                className="font-mono text-xs uppercase"
                style={{
                  color: "#6FA8E6",
                  background: "#EEF5FC",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                ({user?.role})
              </span>
            </span>
            <Button
              variant="secondary"
              onClick={async () => {
                navigate("/welcome", { replace: true });
                await signOut();
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
