import { createBrowserRouter, Navigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";
import AppLayout from "./layouts/AppLayout";
import Welcome from "./pages/Welcome";
import Signup from "./pages/Signup";
import Signin from "./pages/Signin";
import Dashboard from "./pages/Dashboard";
import ComingSoon from "./pages/ComingSoon";
import ErrorPage from "./pages/ErrorPage";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? "/dashboard" : "/welcome"} replace />;
}

export const router = createBrowserRouter([
  { path: "/", element: <RootRedirect /> },
  { path: "/welcome", element: <Welcome /> },
  { path: "/signup", element: <Signup /> },
  { path: "/signin", element: <Signin /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/dashboard", element: <Dashboard /> },
          // Placeholders so the dashboard buttons don't 404 yet:
          { path: "/ask", element: <ComingSoon /> },
          { path: "/jobs/new", element: <ComingSoon /> },
          { path: "/knowledge", element: <ComingSoon /> },
        ],
      },
    ],
  },
  { path: "/error", element: <ErrorPage /> },
  { path: "*", element: <ErrorPage /> },
]);
