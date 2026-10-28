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
import { BrandLogo } from "../components/BrandLogo";

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
    <>
      {/* Global top strip */}
      <div className="top-strip">
        VM INTELLECT&nbsp;&nbsp;·&nbsp;&nbsp;Local-First · works offline
      </div>


      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <Field
          label="Username"
          autoComplete="username"
          error={errors.username?.message}
          {...register("username")}
        />
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

      <main style={{ minHeight: "calc(100vh - 33px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
        <div className="card" style={{ width: "100%", maxWidth: "420px" }}>
          <div style={{ background: "linear-gradient(90deg, #0B2A5C, #6FA8E6)", height: "3px", borderRadius: "2px 2px 0 0", margin: "-1.5rem -1.5rem 1.5rem" }} />

          {/* Logo */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
            <BrandLogo variant="lockup" size={140} />
          </div>

          <h1 className="text-2xl font-semibold" style={{ color: "#0B2A5C", marginBottom: "0.25rem", textAlign: "center" }}>
            Sign in
          </h1>
          <p className="text-sm" style={{ color: "#64748b", textAlign: "center", marginBottom: "1.5rem" }}>
            Local account on this computer.

          </p>

          <form onSubmit={onSubmit} noValidate className="space-y-4">
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

          <p className="mt-6 text-sm" style={{ color: "#64748b", textAlign: "center" }}>
            New here?{" "}
            <Link to="/signup" style={{ color: "#0B2A5C", fontWeight: 600 }} className="hover:underline">
              Create an account
            </Link>
            <span className="mx-2">·</span>
            <span title="Coming in a later task">Forgot password?</span>
          </p>
        </div>
        <p className="mt-4 text-xs" style={{ color: "#94A3B8" }}>
          INTELLIGENCE THAT EMPOWERS
        </p>
      </main>
    </>
  );
}
