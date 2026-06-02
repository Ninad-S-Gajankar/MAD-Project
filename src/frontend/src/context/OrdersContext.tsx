import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { db } from "../lib/firebase";
import type { VendorOrder, VendorOrderStatus } from "../types";

interface OrdersContextValue {
  orders: VendorOrder[];
  addOrder: (order: VendorOrder) => void;
  updateOrderStatus: (id: string, status: VendorOrderStatus) => void;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<VendorOrder[]>([]);

  // Listen to Firestore orders collection in real-time
  useEffect(() => {
    const ordersRef = collection(db, "orders");
    const unsubscribe = onSnapshot(
      ordersRef,
      (snapshot) => {
        const fetched: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();

          // Calculate a nice human-readable timeAgo from createdAt
          let timeAgo = "Just now";
          if (data.createdAt) {
            const diffMs = Date.now() - new Date(data.createdAt).getTime();
            const diffMin = Math.round(diffMs / 60000);
            if (diffMin < 1) timeAgo = "Just now";
            else if (diffMin < 60) timeAgo = `${diffMin} min ago`;
            else {
              const diffHours = Math.round(diffMin / 60);
              if (diffHours < 24)
                timeAgo = `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
              else timeAgo = new Date(data.createdAt).toLocaleDateString();
            }
          }

          fetched.push({
            id: docSnap.id,
            orderNumber:
              data.orderNumber || `#${docSnap.id.slice(-4).toUpperCase()}`,
            customerName: data.customerName || "Student",
            items: data.items || [],
            price: data.total || 0,
            timeAgo,
            status: data.status || "pending",
            userId: data.userId,
            orderType: data.orderType || "food_court",
            createdAt: data.createdAt || "",
            fileData: data.fileData,
            fileName: data.fileName,
            fileType: data.fileType,
          });
        });

        // Sort by newest first
        fetched.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setOrders(fetched);
      },
      (error) => {
        console.error("Error listening to orders in OrdersContext:", error);
      },
    );

    return () => unsubscribe();
  }, []);

  const addOrder = useCallback((order: VendorOrder) => {
    // Left as no-op since Firestore real-time snapshot automatically handles additions
  }, []);

  const updateOrderStatus = useCallback(
    async (id: string, status: VendorOrderStatus) => {
      try {
        const orderRef = doc(db, "orders", id);
        await updateDoc(orderRef, { status });

        // Find the order details to send a real notification
        const order = orders.find((o) => o.id === id);
        if (order && order.userId) {
          let title = "";
          let message = "";
          const serviceName =
            order.orderType === "book_mart" ? "Book Mart" : "Vidhyarthi Khana";
          const itemsList = order.items
            .map((i) => `${i.quantity}x ${i.name}`)
            .join(", ");

          if (status === "preparing") {
            title = "Order Preparing 🍳";
            message = `Your order ${order.orderNumber} is now being prepared at ${serviceName}.`;
          } else if (status === "ready") {
            title = "Order Ready! 🎉";
            message = `Your ${itemsList} is ready for pickup at ${serviceName}.`;
          } else if (status === "completed") {
            title = "Order Completed! ✅";
            message = `Your order ${order.orderNumber} at ${serviceName} is completed. Thank you!`;
          }

          if (title && message) {
            await addDoc(collection(db, "notifications"), {
              userId: order.userId,
              type: "order",
              title,
              message,
              timestamp: new Date().toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              }),
              read: false,
              createdAt: new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        console.error("Error updating order status in Firestore:", err);
      }
    },
    [orders],
  );

  return (
    <OrdersContext.Provider value={{ orders, addOrder, updateOrderStatus }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders(): OrdersContextValue {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used within OrdersProvider");
  return ctx;
}
