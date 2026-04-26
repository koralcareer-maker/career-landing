import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-semibold text-navy">
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={cn(
            "w-full px-4 py-2.5 rounded-xl border bg-white text-navy text-sm placeholder:text-gray-400",
            "border-gray-200 focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none",
            "transition-colors duration-200",
            error && "border-red-400 focus:border-red-400 focus:ring-red-200",
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-semibold text-navy">
            {label}
          </label>
        )}
        <textarea
          id={id}
          ref={ref}
          className={cn(
            "w-full px-4 py-2.5 rounded-xl border bg-white text-navy text-sm placeholder:text-gray-400 resize-none",
            "border-gray-200 focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none",
            "transition-colors duration-200",
            error && "border-red-400",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-semibold text-navy">
            {label}
          </label>
        )}
        <select
          id={id}
          ref={ref}
          className={cn(
            "w-full px-4 py-2.5 rounded-xl border bg-white text-navy text-sm",
            "border-gray-200 focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none",
            "transition-colors duration-200",
            error && "border-red-400",
            className
          )}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
