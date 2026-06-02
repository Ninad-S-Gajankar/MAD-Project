import type { ReactNode } from "react";

type BadgeVariant = "success" | "warning" | "error" | "info" | "default";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-accent/15 text-accent border-accent/20",
  warning: "bg-secondary/15 text-secondary border-secondary/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-primary/10 text-primary border-primary/20",
  default: "bg-muted text-muted-foreground border-border",
};

const dotColors: Record<BadgeVariant, string> = {
  success: "bg-accent",
  warning: "bg-secondary",
  error: "bg-destructive",
  info: "bg-primary",
  default: "bg-muted-foreground",
};

export function Badge({
  children,
  variant = "default",
  className = "",
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${variantClasses[variant]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
