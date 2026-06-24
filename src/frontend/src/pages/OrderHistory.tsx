import { useNavigate } from "@tanstack/react-router";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ChevronLeft, Hash, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "../components/ui/CampusBadge";
import { Card } from "../components/ui/CampusCard";
import { PageHeader } from "../components/ui/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { auth, db } from "../lib/firebase";
import type { OrderHistory } from "../types";

const statusBadge = {
  delivered: { variant: "success" as const, label: "Delivered" },
  cancelled: { variant: "error" as const, label: "Cancelled" },
  pending: { variant: "warning" as const, label: "Pending" },
  preparing: { variant: "info" as const, label: "Preparing" },
  ready: { variant: "success" as const, label: "Ready" },
};

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderHistory | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const ordersRef = collection(db, "orders");
          const q = query(ordersRef, where("userId", "==", user.uid));
          const ordersSnap = await getDocs(q);
          const fetchedOrders: OrderHistory[] = [];

          for (const docSnap of ordersSnap.docs) {
            fetchedOrders.push({
              id: docSnap.id,
              ...docSnap.data(),
            } as OrderHistory);
          }

          // Sort descending by createdAt or date
          fetchedOrders.sort((a: any, b: any) => {
            const timeA = a.createdAt
              ? new Date(a.createdAt).getTime()
              : new Date(a.date).getTime();
            const timeB = b.createdAt
              ? new Date(b.createdAt).getTime()
              : new Date(b.date).getTime();
            return timeB - timeA;
          });

          setOrders(fetchedOrders);
        } catch (error) {
          console.error("Error fetching user order history:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
        navigate({ to: "/login" });
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-12">
      <PageHeader title="Order History" back backTo="/dashboard" />

      <div className="px-4 py-4 flex flex-col gap-4">
        {orders.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-500 bg-white rounded-3xl border border-dashed border-gray-200 flex flex-col items-center gap-3">
            <ShoppingBag size={48} className="text-gray-300" />
            <div>
              <p className="font-bold text-base text-gray-800">
                No orders found
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Place an order at the food court or book mart to see it here.
              </p>
            </div>
          </div>
        ) : (
          orders.map((order, idx) => {
            const statusData = statusBadge[
              order.status as keyof typeof statusBadge
            ] || { variant: "default" as const, label: order.status };
            const { variant, label } = statusData;

            return (
              <Card
                key={order.id}
                padding="md"
                className="flex flex-col gap-3 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
                onClick={() => setSelectedOrder(order)}
                data-ocid={`history.order.${idx + 1}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold font-mono text-gray-800 flex items-center gap-1">
                      <Hash size={12} className="text-gray-400" />
                      {order.orderNumber || order.id}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {order.date}
                    </p>
                  </div>
                  <Badge variant={variant}>{label}</Badge>
                </div>

                <div className="flex flex-col gap-1.5 pl-1">
                  {order.items.map((item, itemIdx) => (
                    <div
                      key={`${item.name}-${itemIdx}`}
                      className="flex justify-between text-xs"
                    >
                      <span className="text-gray-500">
                        {item.quantity}× {item.name}
                      </span>
                      <span className="font-semibold text-gray-700">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-2.5 border-t border-gray-100 text-sm font-bold mt-1">
                  <span className="text-gray-600">Total Paid</span>
                  <span className="text-primary">₹{order.total}</span>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Detailed Order view Dialog */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      >
        <DialogContent className="max-w-[90%] sm:max-w-md rounded-3xl p-6 bg-white border border-gray-200">
          <DialogHeader className="items-center pb-2">
            <DialogTitle className="text-lg font-bold text-foreground">
              Order Details
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="flex flex-col gap-4 items-center">
              {/* Order ID & Date */}
              <div className="w-full text-center">
                <p className="text-xs font-mono text-gray-800 flex items-center justify-center gap-1 bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-100">
                  <Hash size={12} className="text-gray-400" />
                  {selectedOrder.orderNumber || selectedOrder.id}
                </p>
                <p className="text-[11px] text-gray-400 mt-2">
                  Placed on {selectedOrder.date}
                </p>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center gap-2 w-full py-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-gray-600">
                  Show this at the counter
                </p>
                <div className="w-40 h-40 bg-white border border-gray-200 rounded-xl p-2.5 flex items-center justify-center shadow-inner relative overflow-hidden">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                      `Order ID: ${selectedOrder.orderNumber || selectedOrder.id}\nItems:\n${selectedOrder.items
                        .map((item) => `- ${item.quantity}x ${item.name}`)
                        .join("\n")}`,
                    )}`}
                    alt="Order QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Items list */}
              <div className="w-full flex flex-col gap-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">
                  Items Ordered
                </p>
                <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pr-1">
                  {selectedOrder.items.map((item, idx) => (
                    <div
                      key={`${item.name}-${idx}`}
                      className="flex justify-between text-xs"
                    >
                      <span className="text-gray-600">
                        {item.quantity}× {item.name}
                      </span>
                      <span className="font-semibold text-gray-800">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-3 border-t border-dashed border-gray-200 text-sm font-bold mt-1">
                  <span className="text-gray-600">Total Paid</span>
                  <span className="text-primary">₹{selectedOrder.total}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
