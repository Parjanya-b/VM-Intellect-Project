import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SignupRequestSchema, type AuthResponse, type HealthResponse } from "@vmi/contracts";
import { api, ApiError } from "../lib/api";
import { getPersona } from "../lib/persona";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { Field } from "../components/Field";

const schema = SignupRequestSchema.extend({ confirmPassword: z.string() }).refine(
  (d) => d.password === d.confirmPassword,
  { message: "Passwords do not match", path: ["confirmPassword"] },
);
type FormValues = z.infer<typeof schema>;

export default function Signup() {
  const navigate = useNavigate();
  const { user, completeSignIn } = useAuth();
  const health = useQuery({ queryKey: ["health"], queryFn: () => api<HealthResponse>("/system/health") });
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (user) return <Navigate to="/dashboard" replace />;
  if (!getPersona()) return <Navigate to="/welcome" replace />;

  const firstUser = health.data ? !health.data.hasUsers : false;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const body = { fullName: values.fullName, username: values.username, password: values.password };
      const res = await api<AuthResponse>("/auth/signup", { method: "POST", body });
      completeSignIn(res);
      navigate("/dashboard", { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.code === "USERNAME_TAKEN") {
        setError("username", { message: e.message });
      } else if (e instanceof ApiError) {
        setServerError(`${e.message}${e.traceId ? ` (trace ${e.traceId.slice(0, 8)})` : ""}`);
      } else {
        setServerError("Unexpected error.");
      }
    }
  });

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">{firstUser ? "Create the administrator account" : "Create your account"}</h1>
      <p className="mt-1 text-sm text-muted">
        {firstUser
          ? "This is the first account on this computer, so it becomes the Admin."
          : "Your account stays on this computer. There is no cloud login."}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <Field label="Full name" autoComplete="name" error={errors.fullName?.message} {...register("fullName")} />
        <Field label="Username" autoComplete="username" error={errors.username?.message} {...register("username")} />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <Field
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        {serverError && (
          <p role="alert" className="text-sm text-danger">
            {serverError}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link to="/signin" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
