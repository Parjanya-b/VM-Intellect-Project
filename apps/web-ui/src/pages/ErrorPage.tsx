import { Link } from "react-router-dom";

export default function ErrorPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted">That screen doesn't exist.</p>
      <Link to="/" className="mt-4 inline-block text-accent hover:underline">
        Go to start
      </Link>
    </main>
  );
}
