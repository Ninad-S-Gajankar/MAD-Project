import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/login" }), 2000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="gradient-hero min-h-screen flex flex-col items-center justify-center gap-8 px-8">
      {/* Logo mark */}
      <div className="animate-slide-up">
        <div className="w-24 h-24 rounded-full border-2 border-white/20 flex items-center justify-center shadow-elevated overflow-hidden">
          <img
            src="/logo.jpg"
            alt="Campus Connect Logo"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div
        className="animate-slide-up text-center"
        style={{ animationDelay: "0.15s" }}
      >
        <h1 className="text-4xl font-bold font-display text-white mb-2 tracking-tight">
          Campus Connect
        </h1>
        <p className="text-white/70 text-sm font-body">
          Your campus, all in one place
        </p>
      </div>

      <div className="animate-fade-in" style={{ animationDelay: "0.8s" }}>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-white/60"
              style={{
                animation: `pulse-soft 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
