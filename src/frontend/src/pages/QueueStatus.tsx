import { ChefHat, Clock, Hash } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "../components/ui/CampusBadge";
import { Card } from "../components/ui/CampusCard";
import { PageHeader } from "../components/ui/PageHeader";
import { ProgressBar } from "../components/ui/ProgressBar";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "../components/ui/carousel";
import { useOrders } from "../context/OrdersContext";
import { queueStatus } from "../data";
import { auth } from "../lib/firebase";

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

  // Filter orders for the logged-in student that are not completed
  const userActiveOrders = orders.filter(
    (o) => o.userId === auth.currentUser?.uid && o.status !== "completed",
  );

  if (userActiveOrders.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="Queue Status" back backTo="/dashboard" />
        <div className="p-4 text-center mt-20 text-muted-foreground font-semibold">
          No active orders in queue.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-10">
      <PageHeader title="Queue Status" back backTo="/dashboard" />

      <Carousel className="flex-1 w-full overflow-hidden">
        <CarouselContent className="h-full">
          {userActiveOrders.map((userOrder) => {
            const mappedStatus =
              userOrder.status === "pending" ? "queued" : userOrder.status;

            // Compute positions and estimated wait times relative to the order type's active queue
            const serviceActiveOrders = orders.filter(
              (o) =>
                o.orderType === userOrder.orderType && o.status !== "completed",
            );
            let rawPosition =
              serviceActiveOrders.findIndex((o) => o.id === userOrder.id) + 1;
            if (rawPosition === 1 && serviceActiveOrders.length > 1) {
              rawPosition = serviceActiveOrders.length;
            }

            // Position scaled to 1-10
            const position = Math.max(
              1,
              Math.min(
                10,
                rawPosition > 10 ? rawPosition % 10 || 10 : rawPosition,
              ),
            );

            // Estimated wait time mapped between 5 and 15 minutes
            const estimatedMinutes = 5 + Math.round((position - 1) * (10 / 9));

            // Total queue size scaled to be consistent with position
            const totalInQueue = Math.max(
              position,
              Math.min(
                10,
                serviceActiveOrders.length > 10
                  ? (serviceActiveOrders.length % 5) + 10
                  : serviceActiveOrders.length,
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
              ((status.totalInQueue - status.position + 1) /
                status.totalInQueue) *
              100;

            return (
              <CarouselItem
                key={userOrder.id}
                className="h-full overflow-y-auto px-4 py-5 flex flex-col gap-4 pb-8"
              >
                {/* Hero status card */}
                <Card
                  padding="lg"
                  className="gradient-hero text-primary-foreground shadow-md"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-white/70 text-[10px] font-body mb-1">
                        Order ID
                      </p>
                      <p className="text-sm font-bold font-mono">
                        {status.orderId}
                      </p>
                    </div>
                    <div className="text-4xl animate-pulse-soft">
                      {config.emoji}
                    </div>
                  </div>
                  <p className="text-sm text-white/95 font-semibold line-clamp-1 mb-4">
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

                {/* Queue position & wait times */}
                {status.status !== "ready" && (
                  <div className="grid grid-cols-2 gap-3">
                    <Card
                      padding="md"
                      className="flex flex-col items-center gap-1 text-center shadow-xs"
                    >
                      <p className="text-3xl font-bold font-display text-primary">
                        #{status.position}
                      </p>
                      <p className="text-xs text-muted-foreground font-semibold">
                        Your position
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {status.totalInQueue} total in queue
                      </p>
                    </Card>
                    <Card
                      padding="md"
                      className="flex flex-col items-center gap-1 text-center shadow-xs"
                    >
                      <p className="text-3xl font-bold font-display text-accent">
                        {status.estimatedMinutes} min
                      </p>
                      <p className="text-xs text-muted-foreground font-semibold">
                        Minutes est.
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Approximate wait
                      </p>
                    </Card>
                  </div>
                )}

                {/* Progress bar card */}
                <Card padding="md" className="shadow-xs">
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

                {/* Journey tracker */}
                <Card padding="md" className="shadow-xs">
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

                {/* Ready Status notice */}
                {status.status === "ready" && (
                  <div className="flex flex-col items-center gap-3 p-6 bg-accent/10 rounded-2xl border border-accent/20 text-center animate-slide-up">
                    <p className="text-4xl">🎉</p>
                    <p className="text-base font-bold text-foreground font-display">
                      Your order is ready!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Please collect at{" "}
                      <span className="font-semibold text-foreground">
                        {userOrder.orderType === "book_mart"
                          ? "Campus Book Mart · Block D"
                          : "Counter 3 · Vidhyarthi Khana"}
                      </span>
                    </p>
                  </div>
                )}
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
