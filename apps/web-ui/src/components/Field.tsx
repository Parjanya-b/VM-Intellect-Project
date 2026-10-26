import { forwardRef, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string };

export const Field = forwardRef<HTMLInputElement, Props>(({ label, error, id, ...props }, ref) => {
  const inputId = id ?? props.name;
  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
        ref={ref}
        aria-invalid={!!error}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40 ${
          error ? "border-danger" : "border-line"
        }`}
        {...props}
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
});
Field.displayName = "Field";
