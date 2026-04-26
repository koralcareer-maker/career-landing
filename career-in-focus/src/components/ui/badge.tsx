import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "teal" | "green" | "yellow" | "red" | "gray" | "navy" | "purple";
  size?: "sm" | "md";
}

export function Badge({ className, variant = "teal", size = "md", children, ...props }: BadgeProps) {
  const variants = {
    teal:   "bg-teal-pale text-teal-dark border border-teal/20",
    green:  "bg-green-50 text-green-700 border border-green-200",
    yellow: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    red:    "bg-red-50 text-red-600 border border-red-200",
    gray:   "bg-gray-100 text-gray-600 border border-gray-200",
    navy:   "bg-navy text-white",
    purple: "bg-purple-50 text-purple-700 border border-purple-200",
  };
  const sizes = { sm: "text-xs px-2 py-0.5", md: "text-xs px-2.5 py-1" };
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full font-medium", variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </span>
  );
}
