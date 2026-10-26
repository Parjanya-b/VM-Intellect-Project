import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SigninRequestSchema, type AuthResponse, type SigninRequest } from "@vmi/contracts";
import { api, ApiError } from "../lib/api";
import { getPersona } from "../lib/persona";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { Field } from "../components/Field";

export default function Signin() {
  const navigate = useNavigate();
  const { user, completeSignIn } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SigninRequest>({ resolver: zodResolver(SigninRequestSchema) });

  if (user) return <Navigate to="/dashboard" replace />;
  if (!getPersona()) return <Navigate to="/welcome" replace />;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const res = await api<AuthResponse>("/auth/signin", { method: "POST", body: values });
      completeSignIn(res);
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Unexpected error.");
    }
  });

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-muted">Local account on this computer.</p>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <Field label="Username" autoComplete="username" error={errors.username?.message} {...register("username")} />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        {serverError && (
          <p role="alert" className="text-sm text-danger">
            {serverError}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        New here?{" "}
        <Link to="/signup" className="text-accent hover:underline">
          Create an account
        </Link>
        <span className="mx-2">·</span>
        <span title="Coming in a later task">Forgot password?</span>
      </p>
    </main>
  );
}
