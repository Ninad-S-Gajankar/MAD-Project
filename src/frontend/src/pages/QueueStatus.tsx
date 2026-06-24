import { ChefHat, Clock, Hash } from "lucide-react";
import { Badge } from "../components/ui/CampusBadge";
import { Card } from "../components/ui/CampusCard";
import { PageHeader } from "../components/ui/PageHeader";
import { ProgressBar } from "../components/ui/ProgressBar";
import { queueStatus } from "../data";

import { useOrders } from "../context/OrdersContext";

const statusConfig = {
  queued: {
    label: "Queued",
    variant: "info" as const,
    emoji: "⏳",
    progress: 20,
  },
  preparing: {
    label: "Preparing",
    variant: "warning" as const,
    emoji: "🍳",
    progress: 60,
  },
  ready: {
    label: "Ready!",
    variant: "success" as const,
    emoji: "✅",
    progress: 100,
  },
};

const steps = [
  { id: "queued", label: "Order Placed", icon: Hash },
  { id: "preparing", label: "Being Prepared", icon: ChefHat },
  { id: "ready", label: "Ready for Pickup", icon: Clock },
];

const statusOrder = ["queued", "preparing", "ready"];

export default function QueueStatus() {
  const { orders } = useOrders();

  // Assume the user's latest order is the first one in the list that is active
  // In a real app we'd filter by userId.
  // We use the first active order as the user's order to demonstrate "real" queue updates
  const activeOrders = orders.filter((o) => o.status !== "completed");
  const userOrder = activeOrders[0];

  if (!userOrder) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="Queue Status" back backTo="/dashboard" />
        <div className="p-4 text-center mt-20 text-muted-foreground">
          No active orders in queue.
        </div>
      </div>
    );
  }

  const mappedStatus =
    userOrder.status === "pending" ? "queued" : userOrder.status;

  let rawPosition = activeOrders.findIndex((o) => o.id === userOrder.id) + 1;
  if (rawPosition === 1 && activeOrders.length > 1) {
    rawPosition = activeOrders.length;
  }

  // Scale position to range 1-10
  const position = Math.max(
    1,
    Math.min(10, rawPosition > 10 ? rawPosition % 10 || 10 : rawPosition),
  );

  // Map position 1-10 to 5-15 minutes estimated wait time
  const estimatedMinutes = 5 + Math.round((position - 1) * (10 / 9));

  // Scale total in queue consistently with position (up to 10)
  const totalInQueue = Math.max(
    position,
    Math.min(
      10,
      activeOrders.length > 10
        ? (activeOrders.length % 5) + 10
        : activeOrders.length,
    ),
  );

  const status = {
    orderId: userOrder.orderNumber,
    position,
    totalInQueue,
    estimatedMinutes,
    status: mappedStatus as "queued" | "preparing" | "ready",
    itemName: userOrder.items.map((i) => i.name).join(", "),
  };

  const config = statusConfig[status.status];
  const currentStepIndex = statusOrder.indexOf(status.status);
  const progressPct =
    ((status.totalInQueue - status.position + 1) / status.totalInQueue) * 100;

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Queue Status" back backTo="/dashboard" />

      <div className="px-4 py-5 flex flex-col gap-4 pb-8">
        {/* Status hero card */}
        <Card padding="lg" className="gradient-hero text-primary-foreground">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/70 text-xs font-body mb-1">Order ID</p>
              <p className="text-base font-bold font-mono">{status.orderId}</p>
            </div>
            <div className="text-4xl animate-pulse-soft">{config.emoji}</div>
          </div>
          <p className="text-sm text-white/80 line-clamp-1 mb-4">
            {status.itemName}
          </p>
          <Badge variant={config.variant} className="mb-3">
            {config.label}
          </Badge>
          <ProgressBar
            value={config.progress}
            variant={status.status === "ready" ? "success" : "primary"}
            size="md"
            animated={status.status !== "ready"}
            className="[&_.bg-muted]:bg-white/20"
          />
        </Card>

        {/* Queue position */}
        {status.status !== "ready" && (
          <div className="grid grid-cols-2 gap-3">
            <Card
              padding="md"
              className="flex flex-col items-center gap-1 text-center"
            >
              <p className="text-3xl font-bold font-display text-primary">
                #{status.position}
              </p>
              <p className="text-xs text-muted-foreground">Your position</p>
              <p className="text-[11px] text-muted-foreground">
                {status.totalInQueue} total in queue
              </p>
            </Card>
            <Card
              padding="md"
              className="flex flex-col items-center gap-1 text-center"
            >
              <p className="text-3xl font-bold font-display text-accent">
                {status.estimatedMinutes}
              </p>
              <p className="text-xs text-muted-foreground">Minutes est.</p>
              <p className="text-[11px] text-muted-foreground">
                Approximate wait
              </p>
            </Card>
          </div>
        )}

        {/* Queue progress bar */}
        <Card padding="md">
          <p className="text-xs font-bold text-foreground mb-2">
            Queue Progress
          </p>
          <ProgressBar
            value={progressPct}
            label={`${status.position} of ${status.totalInQueue} ahead`}
            showValue
            variant="primary"
            size="md"
          />
        </Card>

        {/* Step tracker */}
        <Card padding="md">
          <p className="text-xs font-bold text-foreground mb-4">
            Order Journey
          </p>
          <div className="flex items-center gap-0">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isDone = i < currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <div
                  key={step.id}
                  className="flex-1 flex flex-col items-center"
                >
                  <div className="flex items-center w-full">
                    <div
                      className={`flex-1 h-0.5 ${i === 0 ? "invisible" : isDone || isCurrent ? "bg-primary" : "bg-border"}`}
                    />
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-smooth ${
                        isDone
                          ? "bg-primary text-primary-foreground"
                          : isCurrent
                            ? "bg-primary/20 text-primary ring-2 ring-primary"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon size={15} />
                    </div>
                    <div
                      className={`flex-1 h-0.5 ${i === steps.length - 1 ? "invisible" : isDone ? "bg-primary" : "bg-border"}`}
                    />
                  </div>
                  <p
                    className={`text-[10px] font-semibold mt-1.5 text-center leading-tight ${isCurrent ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        {status.status === "ready" && (
          <div className="flex flex-col items-center gap-3 p-6 bg-accent/10 rounded-2xl border border-accent/20 text-center animate-slide-up">
            <p className="text-4xl">🎉</p>
            <p className="text-base font-bold text-foreground font-display">
              Your order is ready!
            </p>
            <p className="text-sm text-muted-foreground">
              Please collect at Counter 3 · Vidhyarthi Khana
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
