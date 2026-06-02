import { Link, useNavigate } from "@tanstack/react-router";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { Eye, EyeOff, Hash, Lock, Mail, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/CampusButton";
import { Card } from "../components/ui/CampusCard";
import { auth } from "../lib/firebase";

type LoginMode = "student" | "vendor";
type VendorType = "food_court" | "book_mart" | "events_manager";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<LoginMode>("student");
  const [vendorType, setVendorType] = useState<VendorType>("food_court");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password / Password Recovery states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetSuccess(null);
    setResetError(null);

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess(
        "Recovery email sent successfully! Please check your inbox for the reset link.",
      );
      setResetEmail("");
    } catch (err: any) {
      console.error("Reset password error:", err);
      let errMsg = "Failed to send reset link. Please check the email address.";
      if (err.code === "auth/invalid-email") {
        errMsg = "Please enter a valid email address.";
      } else if (err.code === "auth/user-not-found") {
        errMsg = "No account found with this email address.";
      }
      setResetError(errMsg);
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);

      if (mode === "vendor") {
        if (vendorType === "food_court") navigate({ to: "/vendor-dashboard" });
        else if (vendorType === "book_mart")
          navigate({ to: "/bookmart-dashboard" });
        else if (vendorType === "events_manager")
          navigate({ to: "/events-manager" });
      } else {
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      console.error("Login error:", err);
      let errorMsg = "Failed to log in. Please check your credentials.";
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password"
      ) {
        errorMsg = "Invalid email or password.";
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header gradient */}
      <div className="gradient-hero px-6 pt-14 pb-10 flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center overflow-hidden">
          <img
            src="/logo.jpg"
            alt="Campus Connect Logo"
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="text-2xl font-bold font-display text-white">
          Campus Connect
        </h1>
        <p className="text-white/70 text-sm">Sign in to your account</p>
      </div>

      {/* Form card */}
      <div className="flex-1 -mt-6 px-4 pb-8">
        <Card padding="lg" className="animate-slide-up">
          {/* Toggle */}
          <div
            className="flex rounded-xl bg-muted p-1 mb-6"
            data-ocid="login-toggle"
          >
            {(["student", "vendor"] as LoginMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-smooth ${mode === m
                    ? "bg-primary text-primary-foreground shadow-card"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
                data-ocid={`login-mode-${m}`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {mode === "vendor" && (
            <div className="flex flex-col gap-1.5 mb-4">
              <label
                htmlFor="vendorType"
                className="text-sm font-semibold text-foreground"
              >
                Vendor Type
              </label>
              <select
                id="vendorType"
                value={vendorType}
                onChange={(e) => setVendorType(e.target.value as VendorType)}
                className="w-full px-3 py-2.5 bg-input border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
              >
                <option value="food_court">Food Court</option>
                <option value="book_mart">Book Mart</option>
                <option value="events_manager">Events Manager</option>
              </select>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm font-semibold text-foreground"
              >
                {mode === "vendor" ? "Vendor Email" : "Campus Email"}
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  id="email"
                  type="email"
                  placeholder={
                    mode === "vendor"
                      ? "vendor@bmsce.ac.in"
                      : "alex@bmsce.ac.in"
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-input border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                  data-ocid="login-email"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-semibold text-foreground"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-input border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                  data-ocid="login-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setResetEmail(email); // Autofill from standard login email field
                setShowResetModal(true);
              }}
              className="text-right text-xs text-primary font-semibold hover:underline"
              data-ocid="forgot-password"
            >
              Forgot Password?
            </button>

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
              data-ocid="login-submit"
            >
              {loading ? "Signing in…" : "Log In"}
            </Button>

            <div className="text-center mt-2">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="text-primary font-semibold hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        </Card>

        {showResetModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <Card
              padding="lg"
              className="w-full max-w-sm relative animate-scale-up border border-border shadow-2xl"
            >
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetSuccess(null);
                  setResetError(null);
                }}
                className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-smooth"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
              <h3 className="text-base font-bold text-foreground font-display mb-2">
                Reset Password
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Enter your registered campus email and we will send you a secure
                recovery link.
              </p>
              {resetSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl mb-4 leading-normal">
                  {resetSuccess}
                </div>
              )}
              {resetError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold rounded-xl mb-4 leading-normal">
                  {resetError}
                </div>
              )}
              <form
                onSubmit={handleResetPassword}
                className="flex flex-col gap-3"
              >
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="reset-email"
                    className="text-xs font-bold text-foreground mb-1"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      id="reset-email"
                      type="email"
                      placeholder="e.g. alex@bmsce.ac.in"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-input border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-smooth font-medium text-foreground"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  loading={resetLoading}
                  fullWidth
                  className="mt-2"
                >
                  Send Recovery Link
                </Button>
              </form>
            </Card>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          BMSCE Campus Services © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
