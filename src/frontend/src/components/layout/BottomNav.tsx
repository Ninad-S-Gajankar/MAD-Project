import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Clock, LayoutDashboard, User } from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/queue-status", label: "Queue Status", icon: Clock },
  { to: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const { location } = useRouterState();
  const pathname = location.pathname;

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card border-t border-border z-50"
      data-ocid="bottom-nav"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around px-1 py-2">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive =
            pathname === to || (to !== "/" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-smooth group min-w-0 flex-1"
              data-ocid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
              aria-label={label}
            >
              <div
                className={`p-1.5 rounded-xl transition-smooth ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span
                className={`text-[10px] font-medium leading-none transition-smooth truncate max-w-full ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
