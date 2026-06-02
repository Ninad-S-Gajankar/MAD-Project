interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  label?: string;
  showValue?: boolean;
  variant?: "primary" | "success" | "warning";
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  className?: string;
}

const trackSizes = { sm: "h-1.5", md: "h-2.5", lg: "h-4" };
const fillVariants = {
  primary: "bg-primary",
  success: "bg-accent",
  warning: "bg-secondary",
};

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  variant = "primary",
  size = "md",
  animated = false,
  className = "",
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`w-full ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between mb-1.5 text-xs font-medium text-muted-foreground">
          {label && <span>{label}</span>}
          {showValue && <span>{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        className={`w-full bg-muted rounded-full overflow-hidden ${trackSizes[size]}`}
        role="progressbar"
        tabIndex={-1}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ?? "Progress"}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${fillVariants[variant]} ${
            animated ? "animate-pulse-soft" : ""
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
