import type { ReactNode, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  accentTop?: boolean;
  padding?: string;
}

export function Card({ children, accentTop = false, className = "", style, ...props }: CardProps) {
  return (
    <div
      className={`card ${className}`}
      style={style}
      {...props}
    >
      {accentTop && <div className="card-accent-top" />}
      {children}
    </div>
  );
}
