import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Clock, Hash } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/CampusButton";
import { Card } from "../components/ui/CampusCard";
import { generate10DigitId } from "../lib/utils";

const PICKUP_TIME = "15–20 min";

export default function OrderConfirmation() {
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState("");
  const [items, setItems] = useState<{ name: string; quantity: number }[]>([]);
  const [orderType, setOrderType] = useState("food_court");

  useEffect(() => {
    const saved = localStorage.getItem("last_placed_order");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.orderId) {
          setOrderId(parsed.orderId);
          setItems(parsed.items || []);
          setOrderType(parsed.orderType || "food_court");
        } else {
          setOrderId(generate10DigitId());
        }
      } catch (err) {
        console.error("Failed to parse last placed order:", err);
        setOrderId(generate10DigitId());
      }
    } else {
      setOrderId(generate10DigitId());
    }

    // Clean up last_placed_order on unmount to keep storage clean
    return () => {
      localStorage.removeItem("last_placed_order");
    };
  }, []);

  const qrData =
    `Order ID: ${orderId || "Pending"}\nItems:\n` +
    (items.length > 0
      ? items.map((item) => `- ${item.quantity}x ${item.name}`).join("\n")
      : "- 1x Delicious Food");

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Success header */}
      <div className="gradient-hero px-6 pt-16 pb-10 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center animate-slide-up">
          <CheckCircle2 size={36} className="text-white" />
        </div>
        <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <h1 className="text-2xl font-bold font-display text-white mb-1">
            Order Placed!
          </h1>
          <p className="text-white/70 text-sm">
            {orderType === "book_mart"
              ? "Your stationery order is being prepared 📚"
              : "Your food is being prepared 🍳"}
          </p>
        </div>
      </div>

      <div className="flex-1 px-4 -mt-6 pb-8 flex flex-col gap-4">
        {/* Order details card */}
        <Card
          padding="lg"
          className="animate-slide-up"
          style={{ animationDelay: "0.15s" } as React.CSSProperties}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Hash size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Order ID</p>
              <p className="text-base font-bold font-mono text-foreground">
                {orderId || "Generating..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Clock size={18} className="text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estimated Pickup</p>
              <p className="text-base font-bold text-foreground">
                {PICKUP_TIME}
              </p>
            </div>
          </div>
        </Card>

        {/* QR Code placeholder */}
        <Card
          padding="lg"
          className="flex flex-col items-center gap-4 animate-slide-up"
          style={{ animationDelay: "0.2s" } as React.CSSProperties}
        >
          <p className="text-sm font-bold text-foreground">
            Show this at the counter
          </p>
          <div className="w-44 h-44 bg-white border border-border rounded-2xl p-3 flex items-center justify-center shadow-inner relative group overflow-hidden">
            {orderId ? (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`}
                alt="Order QR Code"
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-3 mt-auto">
          <Button
            fullWidth
            size="lg"
            onClick={() => navigate({ to: "/queue-status" })}
            data-ocid="view-queue-btn"
          >
            Track Queue Status
          </Button>
          <Button
            fullWidth
            variant="outline"
            size="lg"
            onClick={() => navigate({ to: "/dashboard" })}
            data-ocid="back-home-btn"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
