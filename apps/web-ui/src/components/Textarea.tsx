import { forwardRef, type TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string };

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ label, error, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div>
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
        <textarea
          id={inputId}
          ref={ref}
          rows={4}
          aria-invalid={!!error}
          className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition
          focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600
          ${error ? "border-danger" : "border-line"}`}
          {...props}
        />
        {error && (
          <p role="alert" className="mt-1 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
