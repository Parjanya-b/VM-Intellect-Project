import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" };

export function Button({ variant = "primary", className = "", ...props }: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-accent text-white hover:bg-accent-dark"
      : "border border-line bg-white text-ink hover:bg-paper-dark";
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
