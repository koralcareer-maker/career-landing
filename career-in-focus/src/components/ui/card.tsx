import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({ className, hover, padding = "md", children, ...props }: CardProps) {
  const paddings = { none: "", sm: "p-4", md: "p-5", lg: "p-7" };
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-black/5 shadow-[0_2px_20px_rgba(0,0,0,0.07)]",
        hover && "transition-all duration-200 hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 cursor-pointer",
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-base font-bold text-navy", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  );
}
