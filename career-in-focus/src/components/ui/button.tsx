"use client";
import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-teal focus-visible:outline-offset-2";

    const variants = {
      primary:
        "bg-teal text-white hover:bg-teal-dark hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] shadow-sm",
      secondary:
        "bg-cream-dark text-navy hover:bg-gray-200 hover:-translate-y-0.5 active:scale-[0.97]",
      ghost: "text-navy hover:bg-cream-dark active:scale-[0.97]",
      danger:
        "bg-red-500 text-white hover:bg-red-600 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97]",
      outline:
        "border-2 border-teal text-teal hover:bg-teal-pale hover:-translate-y-0.5 active:scale-[0.97]",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-5 py-2.5 text-sm",
      lg: "px-7 py-3.5 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
