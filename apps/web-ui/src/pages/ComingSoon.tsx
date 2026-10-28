import { Link, useLocation } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";

export default function ComingSoon() {
  const { pathname } = useLocation();
  return (
    <main
      style={{
        minHeight: "calc(100vh - 160px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: "440px", textAlign: "center" }}>
        <div
          style={{
            background: "linear-gradient(90deg, #0B2A5C, #6FA8E6)",
            height: "3px",
            borderRadius: "2px 2px 0 0",
            margin: "-1.5rem -1.5rem 1.5rem",
          }}
        />
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
          <BrandLogo variant="mark" size={56} />
        </div>
        <h1 className="text-2xl font-semibold" style={{ color: "#0B2A5C", marginBottom: "0.5rem" }}>
          Coming soon
        </h1>
        <p style={{ color: "#64748b", marginBottom: "1.25rem" }}>
          The screen{" "}
          <span
            className="font-mono"
            style={{
              background: "#EEF5FC",
              padding: "1px 6px",
              borderRadius: "4px",
              color: "#0B2A5C",
            }}
          >
            {pathname}
          </span>{" "}
          is planned but not built yet.
        </p>
        <Link
          to="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "#0B2A5C",
            color: "#ffffff",
            padding: "8px 20px",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 500,
            textDecoration: "none",
            transition: "background 0.15s",
          }}
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
