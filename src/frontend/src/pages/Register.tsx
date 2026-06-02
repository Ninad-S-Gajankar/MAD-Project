import { Link, useNavigate } from "@tanstack/react-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/CampusButton";
import { Card } from "../components/ui/CampusCard";
import { auth, db } from "../lib/firebase";

type RegisterMode = "student" | "vendor";
type VendorType = "food_court" | "book_mart" | "events_manager";

export default function Register() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<RegisterMode>("student");
  const [vendorType, setVendorType] = useState<VendorType>("food_court");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // 2. Save the user's details to the appropriate Firestore collection
      if (mode === "vendor") {
        await setDoc(doc(db, "vendors", user.uid), {
          name,
          email,
          role: "vendor",
          vendorType: vendorType,
          createdAt: new Date().toISOString(),
        });
        if (vendorType === "food_court") navigate({ to: "/vendor-dashboard" });
        else if (vendorType === "book_mart")
          navigate({ to: "/bookmart-dashboard" });
        else if (vendorType === "events_manager")
          navigate({ to: "/events-manager" });
      } else {
        await setDoc(doc(db, "users", user.uid), {
          name,
          email,
          role: "student",
          createdAt: new Date().toISOString(),
        });
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      // Clean up Firebase error messages
      let errorMsg = "Failed to register. Please try again.";
      if (err.code === "auth/email-already-in-use")
        errorMsg = "This email is already registered.";
      if (err.code === "auth/weak-password")
        errorMsg = "Password should be at least 6 characters.";
      if (err.code === "auth/invalid-email")
        errorMsg = "Please enter a valid email address.";
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
          Create Account
        </h1>
        <p className="text-white/70 text-sm">Join Campus Connect today</p>
      </div>

      {/* Form card */}
      <div className="flex-1 -mt-6 px-4 pb-8">
        <Card padding="lg" className="animate-slide-up">
          {/* Toggle */}
          <div className="flex rounded-xl bg-muted p-1 mb-6">
            {(["student", "vendor"] as RegisterMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-smooth ${mode === m
                    ? "bg-primary text-primary-foreground shadow-card"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl">
                {error}
              </div>
            )}

            {mode === "vendor" && (
              <div className="flex flex-col gap-1.5 mb-1">
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

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="name"
                className="text-sm font-semibold text-foreground"
              >
                {mode === "vendor" ? "Vendor/Shop Name" : "Full Name"}
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  id="name"
                  type="text"
                  placeholder={
                    mode === "vendor" ? "Vidhyarthi Khana" : "Alex Doe"
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-input border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-smooth"
                  required
                />
              </div>
            </div>

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

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
              className="mt-2"
            >
              {loading ? "Creating account…" : "Sign Up"}
            </Button>

            <div className="text-center mt-2">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-primary font-semibold hover:underline"
                >
                  Log in
                </Link>
              </p>
            </div>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          BMSCE Campus Services © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
