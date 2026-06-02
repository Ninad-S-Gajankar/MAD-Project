import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  back?: boolean;
  backTo?: string;
  rightAction?: ReactNode;
  className?: string;
  transparent?: boolean;
}

export function PageHeader({
  title,
  back = false,
  backTo,
  rightAction,
  className = "",
  transparent = false,
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate({ to: backTo });
    } else {
      window.history.back();
    }
  };

  return (
    <header
      className={`
        sticky top-0 z-40 flex items-center justify-between px-4 py-3 min-h-[56px]
        ${transparent ? "bg-transparent" : "bg-card border-b border-border shadow-xs"}
        ${className}
      `}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {back && (
          <button
            type="button"
            onClick={handleBack}
            className="p-1.5 rounded-xl text-foreground hover:bg-muted transition-smooth shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Go back"
            data-ocid="page-back-btn"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="text-base font-bold font-display text-foreground truncate">
          {title}
        </h1>
      </div>
      {rightAction && <div className="shrink-0 ml-3">{rightAction}</div>}
    </header>
  );
}
