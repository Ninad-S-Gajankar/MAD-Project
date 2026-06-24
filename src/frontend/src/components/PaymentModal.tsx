import { CreditCard, Landmark, Loader2, QrCode, Smartphone, X } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/CampusButton";
import { auth } from "../lib/firebase";

interface PaymentModalProps {
  amount: number;
  onClose: () => void;
  onPaymentSuccess: () => void;
  title?: string;
}

type PaymentMethod = "upi" | "card" | "netbanking";

const TOP_BANKS = [
  { id: "sbi", name: "State Bank of India", logo: "🏦" },
  { id: "hdfc", name: "HDFC Bank", logo: "🏦" },
  { id: "icici", name: "ICICI Bank", logo: "🏦" },
  { id: "axis", name: "Axis Bank", logo: "🏦" },
];

export function PaymentModal({
  amount,
  onClose,
  onPaymentSuccess,
  title = "Select Payment Method",
}: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [upiId, setUpiId] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [selectedBank, setSelectedBank] = useState("");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Payment execution state
  // "idle" | "processing" | "success"
  const [paymentState, setPaymentState] = useState<"idle" | "processing" | "success">("idle");
  const [processingStep, setProcessingStep] = useState("");

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts: string[] = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(" ");
    }
    return v;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
    }
    return v;
  };

  const validateInputs = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (method === "upi") {
      if (!upiId.trim()) {
        newErrors.upiId = "UPI ID is required";
      } else if (!upiId.includes("@") || upiId.split("@")[0].length < 2 || upiId.split("@")[1].length < 2) {
        newErrors.upiId = "Enter a valid UPI ID (e.g. name@upi)";
      }
    } else if (method === "card") {
      const cleanCard = cardNumber.replace(/\s/g, "");
      if (cleanCard.length !== 16 || !/^\d+$/.test(cleanCard)) {
        newErrors.cardNumber = "Enter a valid 16-digit card number";
      }

      if (!cardExpiry.includes("/")) {
        newErrors.cardExpiry = "Expiry date is required (MM/YY)";
      } else {
        const [month, year] = cardExpiry.split("/");
        const m = parseInt(month, 10);
        if (isNaN(m) || m < 1 || m > 12) {
          newErrors.cardExpiry = "Invalid expiry month";
        }
      }

      if (cardCvv.length !== 3 || !/^\d+$/.test(cardCvv)) {
        newErrors.cardCvv = "CVV must be 3 digits";
      }
    } else if (method === "netbanking") {
      if (!selectedBank) {
        newErrors.bank = "Please select a bank";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePay = () => {
    if (!validateInputs()) return;

    if (typeof (window as any).Razorpay === "undefined") {
      // Fallback to simulated payment if Razorpay script is not loaded
      setPaymentState("processing");
      setProcessingStep("Securely initiating simulated transaction...");
      setTimeout(() => {
        setProcessingStep("Authorizing simulated amount...");
        setTimeout(() => {
          setPaymentState("success");
          setProcessingStep("Simulated Payment Successful! ✅");
          setTimeout(() => {
            onPaymentSuccess();
          }, 1500);
        }, 1200);
      }, 1200);
      return;
    }

    setPaymentState("processing");
    setProcessingStep("Opening secure Razorpay portal...");

    const options = {
      key: "rzp_test_SwpeFo3M2LnrNY",
      amount: amount * 100, // Amount in paise (1 INR = 100 paise)
      currency: "INR",
      name: "Campus Connect",
      description: title || "Payment for order",
      handler: function (response: any) {
        setPaymentState("success");
        setProcessingStep(`Payment Confirmed! ID: ${response.razorpay_payment_id}`);
        setTimeout(() => {
          onPaymentSuccess();
        }, 1500);
      },
      prefill: {
        name: auth.currentUser?.displayName || "Student User",
        email: auth.currentUser?.email || "student@example.com",
        contact: auth.currentUser?.phoneNumber || "9999999999"
      },
      method: {
        upi: true,
        card: true,
        netbanking: true,
        wallet: true,
      },
      theme: {
        color: "#16a34a"
      },
      modal: {
        ondismiss: function () {
          setPaymentState("idle");
        }
      }
    };

    try {
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Razorpay widget load error:", err);
      alert("Failed to initialize Razorpay checkout widget.");
      setPaymentState("idle");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-card w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative border border-border animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border bg-muted/20">
          <div>
            <h2 className="text-base font-bold text-foreground font-display">
              {title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Secure payments powered by connect Pay
            </p>
          </div>
          {paymentState === "idle" && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-muted transition-smooth text-muted-foreground hover:text-foreground"
              aria-label="Close Payment Modal"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {paymentState === "idle" ? (
          <div className="p-6 flex flex-col gap-5">
            {/* Amount Banner */}
            <div className="flex justify-between items-center bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
              <span className="text-sm font-semibold text-foreground">Amount to Pay</span>
              <span className="text-xl font-extrabold text-green-600 font-display">₹{amount}</span>
            </div>

            {/* Payment Method Selector Grid */}
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "upi", label: "UPI", icon: Smartphone },
                  { id: "card", label: "Card", icon: CreditCard },
                  { id: "netbanking", label: "Net Banking", icon: Landmark },
                ] as const
              ).map((m) => {
                const IconComp = m.icon;
                const isSelected = method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMethod(m.id);
                      setErrors({});
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all duration-200 ${isSelected
                      ? "bg-green-600/10 border-green-600 text-green-600 font-semibold"
                      : "bg-muted/30 border-border text-muted-foreground hover:border-muted-foreground/30 hover:bg-muted/50"
                      }`}
                  >
                    <IconComp size={20} />
                    <span className="text-xs">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Configurable Form based on Method */}
            <div className="min-h-[140px] flex flex-col justify-center">
              {method === "upi" && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="pay-upi" className="text-xs font-semibold text-foreground">
                      Enter UPI ID
                    </label>
                    <div className="relative">
                      <input
                        id="pay-upi"
                        type="text"
                        placeholder="username@upi"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className={`w-full px-3 py-2.5 bg-input border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-smooth pr-10 ${errors.upiId ? "border-destructive focus:ring-destructive/40" : "border-border"
                          }`}
                      />
                      <QrCode size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    </div>
                    {errors.upiId && (
                      <p className="text-[11px] text-destructive">{errors.upiId}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {["GPay", "PhonePe", "Paytm", "BHIM"].map((provider) => (
                      <button
                        key={provider}
                        type="button"
                        onClick={() => {
                          setUpiId(provider.toLowerCase() === "gpay" ? "user@okaxis" : `user@${provider.toLowerCase()}`);
                          setErrors({});
                        }}
                        className="text-[10px] font-semibold border border-border rounded-lg px-2.5 py-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-smooth"
                      >
                        {provider}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {method === "card" && (
                <div className="flex flex-col gap-3.5">
                  {/* Card Number */}
                  <div className="flex flex-col gap-1">
                    <label htmlFor="pay-card-num" className="text-xs font-semibold text-foreground">
                      Card Number
                    </label>
                    <input
                      id="pay-card-num"
                      type="text"
                      maxLength={19}
                      placeholder="1234 5678 9101 1121"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      className={`w-full px-3 py-2.5 bg-input border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-smooth font-mono tracking-wide ${errors.cardNumber ? "border-destructive focus:ring-destructive/40" : "border-border"
                        }`}
                    />
                    {errors.cardNumber && (
                      <p className="text-[11px] text-destructive">{errors.cardNumber}</p>
                    )}
                  </div>

                  {/* Expiry + CVV row */}
                  <div className="flex gap-3">
                    <div className="flex-1 flex flex-col gap-1">
                      <label htmlFor="pay-card-exp" className="text-xs font-semibold text-foreground">
                        Expiry Date
                      </label>
                      <input
                        id="pay-card-exp"
                        type="text"
                        maxLength={5}
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        className={`w-full px-3 py-2.5 bg-input border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-smooth text-center font-mono ${errors.cardExpiry ? "border-destructive focus:ring-destructive/40" : "border-border"
                          }`}
                      />
                      {errors.cardExpiry && (
                        <p className="text-[11px] text-destructive">{errors.cardExpiry}</p>
                      )}
                    </div>
                    <div className="w-28 flex flex-col gap-1">
                      <label htmlFor="pay-card-cvv" className="text-xs font-semibold text-foreground">
                        CVV
                      </label>
                      <input
                        id="pay-card-cvv"
                        type="password"
                        maxLength={3}
                        placeholder="***"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ""))}
                        className={`w-full px-3 py-2.5 bg-input border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-smooth text-center font-mono ${errors.cardCvv ? "border-destructive focus:ring-destructive/40" : "border-border"
                          }`}
                      />
                      {errors.cardCvv && (
                        <p className="text-[11px] text-destructive">{errors.cardCvv}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {method === "netbanking" && (
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-semibold text-foreground mb-1">Select Bank</span>
                  <div className="grid grid-cols-2 gap-2">
                    {TOP_BANKS.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setSelectedBank(b.id);
                          setErrors({});
                        }}
                        className={`flex items-center gap-2 p-2.5 border rounded-xl text-xs font-medium transition-smooth ${selectedBank === b.id
                          ? "bg-green-600/10 border-green-600 text-green-600 font-bold"
                          : "bg-muted/10 border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <span className="text-base">{b.logo}</span>
                        <span>{b.name}</span>
                      </button>
                    ))}
                  </div>
                  {errors.bank && (
                    <p className="text-[11px] text-destructive mt-1">{errors.bank}</p>
                  )}

                  <select
                    value={selectedBank}
                    onChange={(e) => {
                      setSelectedBank(e.target.value);
                      setErrors({});
                    }}
                    className="w-full mt-1.5 px-3 py-2.5 bg-input border border-border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">-- Other Banks --</option>
                    <option value="icici">ICICI Bank</option>
                    <option value="hdfc">HDFC Bank</option>
                    <option value="sbi">State Bank of India</option>
                    <option value="axis">Axis Bank</option>
                    <option value="kotak">Kotak Mahindra Bank</option>
                    <option value="pnb">Punjab National Bank</option>
                    <option value="bob">Bank of Baroda</option>
                  </select>
                </div>
              )}
            </div>

            {/* Pay Button */}
            <Button
              type="button"
              onClick={handlePay}
              fullWidth
              className="py-3 font-bold mt-2"
              variant="primary"
            >
              Pay ₹{amount}
            </Button>
          </div>
        ) : (
          /* Processing / Success State Screens */
          <div className="p-8 flex flex-col items-center justify-center min-h-[300px] text-center gap-4">
            {paymentState === "processing" ? (
              <>
                <Loader2 size={48} className="text-green-600 animate-spin" />
                <h3 className="text-lg font-bold text-foreground mt-2 font-display">
                  Processing Payment...
                </h3>
                <p className="text-xs text-muted-foreground animate-pulse max-w-xs mx-auto">
                  {processingStep}
                </p>
                <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden mt-4">
                  <div className="h-full bg-green-600 animate-infinite-loading rounded-full" />
                </div>
              </>
            ) : (
              <div className="animate-scale-up flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center text-3xl animate-bounce">
                  ✅
                </div>
                <h3 className="text-lg font-extrabold text-foreground font-display">
                  Payment Confirmed!
                </h3>
                <p className="text-sm text-green-600 font-bold">
                  ₹{amount} Received Successfully
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Finalizing order registration...
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
