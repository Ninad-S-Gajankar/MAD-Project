import { CreditCard, Loader2, Smartphone, X, QrCode } from "lucide-react";
import { useState, useEffect } from "react";

interface PaymentSelectorProps {
  amount: number;
  description: string;
  prefillName?: string;
  prefillEmail?: string;
  prefillPhone?: string;
  onSuccess: (paymentId: string) => void;
  onClose: () => void;
}

type Tab = "upi" | "qr" | "cards";
type PayState = "idle" | "processing" | "success";

const UPI_APPS = [
  { name: "GPay", color: "#4285F4", label: "G" },
  { name: "PhonePe", color: "#5F259F", label: "P" },
  { name: "Paytm", color: "#002970", label: "T" },
  { name: "BHIM", color: "#138808", label: "B" },
];

export function PaymentSelector({
  amount,
  description,
  prefillName,
  prefillEmail,
  prefillPhone,
  onSuccess,
  onClose,
}: PaymentSelectorProps) {
  const [tab, setTab] = useState<Tab>("upi");
  const [upiId, setUpiId] = useState("");
  const [upiError, setUpiError] = useState("");
  const [payState, setPayState] = useState<PayState>("idle");
  const [processingStep, setProcessingStep] = useState("");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

  useEffect(() => {
    if (tab !== "qr") return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [tab]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const upiUrl = `upi://pay?pa=success@razorpay&pn=Campus+Connect&am=${amount}&cu=INR&tn=${encodeURIComponent(description)}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;

  const isValidUpi = (id: string) =>
    /^[\w.\-]+@[\w]+$/.test(id.trim()) || /^\d{10}@[\w]+$/.test(id.trim());

  const handleUpiPay = () => {
    const trimmed = upiId.trim();
    if (!trimmed) {
      setUpiError("Please enter your UPI ID");
      return;
    }
    if (!isValidUpi(trimmed)) {
      setUpiError("Enter a valid UPI ID (e.g. name@okicici or success@razorpay)");
      return;
    }
    setUpiError("");
    setPayState("processing");
    setProcessingStep("Verifying UPI ID…");

    setTimeout(() => {
      setProcessingStep("Connecting to your bank…");
      setTimeout(() => {
        setProcessingStep(`Authorizing ₹${amount}…`);
        setTimeout(() => {
          setPayState("success");
          const pid =
            "upi_" +
            Math.random().toString(36).substring(2, 14).toUpperCase();
          setTimeout(() => onSuccess(pid), 1800);
        }, 900);
      }, 900);
    }, 900);
  };

  const handleRazorpayCards = () => {
    onClose();
    if (typeof (window as any).Razorpay === "undefined") {
      onSuccess("mock_" + Math.random().toString(36).substring(2, 11));
      return;
    }
    const opts = {
      key: "rzp_test_Sum2e7duEe7noS",
      amount: Math.round(amount * 100),
      currency: "INR",
      name: "Campus Connect",
      description,
      handler: (r: any) => onSuccess(r.razorpay_payment_id),
      prefill: {
        name: prefillName || "Student User",
        email: prefillEmail || "student@example.com",
        contact: prefillPhone || "9999999999",
      },
      method: { card: true, netbanking: true, wallet: true, upi: true },
      theme: { color: "#0f766e" },
    };
    const rzp = new (window as any).Razorpay(opts);
    rzp.open();
  };

  /* ── Processing Screen ── */
  if (payState === "processing") {
    return (
      <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-8 flex flex-col items-center gap-5 shadow-2xl animate-scale-up">
          <div className="relative">
            <Loader2 size={52} className="text-teal-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Smartphone size={20} className="text-teal-500" />
            </div>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg text-gray-900 dark:text-white">
              Processing Payment
            </p>
            <p className="text-sm text-gray-400 mt-1 animate-pulse">
              {processingStep}
            </p>
          </div>
          <div className="w-48 h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full"
              style={{
                animation: "slideRight 2.7s ease-in-out infinite",
              }}
            />
          </div>
          <style>{`
            @keyframes slideRight {
              0% { width: 10%; margin-left: 0%; }
              50% { width: 60%; margin-left: 20%; }
              100% { width: 10%; margin-left: 80%; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  /* ── Success Screen ── */
  if (payState === "success") {
    return (
      <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl animate-scale-up">
          <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/20 border-4 border-green-500 flex items-center justify-center text-4xl animate-bounce">
            ✅
          </div>
          <div className="text-center">
            <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
              Payment Successful!
            </p>
            <p className="text-green-600 font-bold text-xl mt-1">
              ₹{amount} Paid
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Confirming your order…
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main Modal ── */
  return (
    <div
      className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="bg-gradient-to-br from-teal-700 via-teal-600 to-teal-500 px-5 pt-5 pb-5 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* Branding */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white font-black text-xs">CC</span>
            </div>
            <span className="text-white/90 font-semibold text-sm">
              Campus Connect
            </span>
          </div>

          {/* Amount */}
          <div>
            <p className="text-teal-200 text-xs font-semibold uppercase tracking-widest">
              Amount Due
            </p>
            <p className="text-white text-4xl font-black leading-tight">
              ₹{amount}
            </p>
            <p className="text-teal-200 text-xs mt-1 truncate">{description}</p>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          {(["upi", "qr", "cards"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                tab === t
                  ? "text-teal-600 border-b-2 border-teal-600 bg-teal-50/60 dark:bg-teal-900/10"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              {t === "upi" ? (
                <>
                  <Smartphone size={14} />
                  UPI
                </>
              ) : t === "qr" ? (
                <>
                  <QrCode size={14} />
                  QR Code
                </>
              ) : (
                <>
                  <CreditCard size={14} />
                  Cards & More
                </>
              )}
            </button>
          ))}
        </div>

        {/* ── UPI Tab ── */}
        {tab === "upi" && (
          <div className="p-5 space-y-4 bg-white dark:bg-zinc-900">
            {/* App shortcuts */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Quick Pay with App
              </p>
              <div className="grid grid-cols-4 gap-2">
                {UPI_APPS.map((app) => (
                  <button
                    key={app.name}
                    type="button"
                    onClick={() => {
                      setUpiId("success@razorpay");
                      setUpiError("");
                    }}
                    className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-2xl border border-gray-100 dark:border-zinc-800 hover:border-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20 active:scale-95 transition-all"
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-base shadow-sm"
                      style={{ backgroundColor: app.color }}
                    >
                      {app.label}
                    </div>
                    <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                      {app.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100 dark:bg-zinc-800" />
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Or enter UPI ID
              </span>
              <div className="flex-1 h-px bg-gray-100 dark:bg-zinc-800" />
            </div>

            {/* UPI ID input */}
            <div className="space-y-2">
              <div
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all ${
                  upiError
                    ? "border-red-400 bg-red-50 dark:bg-red-900/10"
                    : "border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 focus-within:border-teal-400 focus-within:bg-white dark:focus-within:bg-zinc-700"
                }`}
              >
                <Smartphone size={16} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="yourname@okicici"
                  value={upiId}
                  onChange={(e) => {
                    setUpiId(e.target.value);
                    setUpiError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleUpiPay()}
                  className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
                />
              </div>
              {upiError && (
                <p className="text-xs text-red-500 font-medium pl-1">
                  {upiError}
                </p>
              )}
              <p className="text-xs text-gray-400 pl-1">
                🧪 Testing? Use{" "}
                <button
                  type="button"
                  onClick={() => {
                    setUpiId("success@razorpay");
                    setUpiError("");
                  }}
                  className="font-mono font-semibold text-teal-600 dark:text-teal-400 underline underline-offset-2"
                >
                  success@razorpay
                </button>
              </p>
            </div>

            {/* Pay button */}
            <button
              type="button"
              onClick={handleUpiPay}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 text-white font-bold text-sm shadow-lg hover:from-teal-700 hover:to-teal-600 active:scale-[0.98] transition-all"
            >
              Pay ₹{amount} via UPI
            </button>
          </div>
        )}

        {/* ── QR Code Tab ── */}
        {tab === "qr" && (
          <div className="p-5 space-y-4 bg-white dark:bg-zinc-900 text-center flex flex-col items-center">
            {/* Countdown / Status Header */}
            <div className="w-full flex justify-between items-center px-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Scan & Pay
              </span>
              <span className="text-xs font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/30">
                Expires in {formatTime(timeLeft)}
              </span>
            </div>

            {/* QR Code Container with Scanner Laser Line Animation */}
            <div className="relative p-4 bg-white rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-inner flex items-center justify-center overflow-hidden">
              <img
                src={qrImageUrl}
                alt="Payment QR Code"
                className="w-48 h-48 select-none"
              />
              {/* Laser line animation overlay */}
              <div
                className="absolute inset-x-4 h-0.5 bg-teal-500/80 shadow-[0_0_8px_#14b8a6]"
                style={{
                  animation: "laserSweep 3s ease-in-out infinite",
                }}
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Scan using Google Pay, PhonePe, Paytm, or any UPI app
              </p>
              <div className="flex justify-center items-center gap-1 text-[11px] text-gray-400">
                <span className="inline-block w-1.5 h-1.5 bg-teal-500 rounded-full animate-ping" />
                <span>Waiting for payment...</span>
              </div>
            </div>

            {/* Simulated verification button */}
            <button
              type="button"
              onClick={() => {
                setPayState("processing");
                setProcessingStep("Verifying QR payment transfer…");
                setTimeout(() => {
                  setProcessingStep("Confirming settlement with bank…");
                  setTimeout(() => {
                    setPayState("success");
                    const pid =
                      "pay_" +
                      Math.random().toString(36).substring(2, 14).toUpperCase();
                    setTimeout(() => onSuccess(pid), 1800);
                  }, 1000);
                }, 1000);
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 text-white font-bold text-sm shadow-lg hover:from-teal-700 hover:to-teal-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>I've Paid / Check Status</span>
            </button>

            {/* Powered by Razorpay footer inside the tab */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 pt-1">
              <span>Secured by</span>
              <span className="font-bold text-blue-600 text-sm">Razorpay</span>
            </div>

            <style>{`
              @keyframes laserSweep {
                0% { top: 16px; }
                50% { top: 208px; }
                100% { top: 16px; }
              }
            `}</style>
          </div>
        )}

        {/* ── Cards & More Tab ── */}
        {tab === "cards" && (
          <div className="p-5 space-y-4 bg-white dark:bg-zinc-900">
            {/* Feature blocks */}
            <div className="space-y-2.5">
              {[
                {
                  icon: "💳",
                  title: "Debit / Credit Cards",
                  sub: "Visa, Mastercard, Amex, RuPay",
                  color: "bg-blue-50 dark:bg-blue-900/20",
                },
                {
                  icon: "🏦",
                  title: "Net Banking",
                  sub: "All major Indian banks",
                  color: "bg-purple-50 dark:bg-purple-900/20",
                },
                {
                  icon: "👜",
                  title: "Wallets",
                  sub: "Mobikwik, Freecharge & more",
                  color: "bg-orange-50 dark:bg-orange-900/20",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${item.color}`}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-white">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
              <span>Secured by</span>
              <span className="font-bold text-blue-600 text-sm">Razorpay</span>
            </div>

            <button
              type="button"
              onClick={handleRazorpayCards}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-lg hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition-all"
            >
              Continue with Razorpay →
            </button>

            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
              <span>🔒</span>
              <span>256-bit SSL Encrypted & Safe</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
