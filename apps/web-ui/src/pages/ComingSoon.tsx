import { Link, useLocation } from "react-router-dom";

export default function ComingSoon() {
  const { pathname } = useLocation();
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Coming soon</h1>
      <p className="mt-2 text-muted">
        The screen <span className="font-mono">{pathname}</span> is planned but not built yet.
      </p>
      <Link to="/dashboard" className="mt-4 inline-block text-accent hover:underline">
        Back to dashboard
      </Link>
    </main>
  );
}
