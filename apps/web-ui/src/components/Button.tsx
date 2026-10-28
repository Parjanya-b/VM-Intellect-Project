import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" };

export function Button({ variant = "primary", className = "", ...props }: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:cursor-not-allowed disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-brand-900 text-white hover:bg-brand-700 active:bg-accent-dark"
      : "border border-line bg-white text-brand-900 hover:bg-brand-50 active:bg-brand-100";
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
