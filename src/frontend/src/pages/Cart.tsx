import { useNavigate } from "@tanstack/react-router";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/CampusButton";
import { Card } from "../components/ui/CampusCard";
import { PageHeader } from "../components/ui/PageHeader";
import { useCart } from "../hooks/useCart";
import { auth, db } from "../lib/firebase";
import { generate10DigitId } from "../lib/utils";
import { triggerRazorpayPayment } from "../lib/paymentUtils";

export default function Cart() {
  const navigate = useNavigate();
  const { items, totalItems, totalPrice, updateQuantity, clearCart } =
    useCart();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  useEffect(() => {
    if (orderPlaced) {
      navigate({ to: "/order-confirmation" });
    }
  }, [orderPlaced, navigate]);

  const hasFood = items.some((i) => !i.foodItem.isStationery);
  const hasStationery = items.some((i) => i.foodItem.isStationery);
  const backTo = hasStationery && !hasFood ? "/book-mart" : "/food-court";
  const description =
    hasFood && hasStationery
      ? "Campus Connect Mixed Order"
      : hasStationery
        ? "Book Mart Stationery Order"
        : "Food Court Order";

  const handlePlaceOrder = async () => {
    if (!auth.currentUser) {
      alert("Please login to place an order");
      return;
    }

    setIsPlacingOrder(true);
    try {
      // Fetch dynamic user profile name from Firestore users collection
      let userName = "Alex Kumar";
      try {
        const docSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (docSnap.exists() && docSnap.data().name) {
          userName = docSnap.data().name;
        }
      } catch (err) {
        console.error("Error fetching user name for order:", err);
      }

      const foodItems = items.filter((i) => !i.foodItem.isStationery);
      const stationeryItems = items.filter((i) => i.foodItem.isStationery);

      let foodOrderNumber = "";
      let stationeryOrderNumber = "";

      if (foodItems.length > 0) {
        foodOrderNumber = generate10DigitId();
        const orderData = {
          userId: auth.currentUser.uid,
          customerName: userName,
          date: new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          items: foodItems.map((i) => ({
            name: i.foodItem.name,
            quantity: i.quantity,
            price: i.foodItem.price,
          })),
          total: foodItems.reduce((sum, i) => sum + i.foodItem.price * i.quantity, 0),
          status: "pending",
          orderType: "food_court",
          orderNumber: foodOrderNumber,
          createdAt: new Date().toISOString(),
        };
        await addDoc(collection(db, "orders"), orderData);
      }

      if (stationeryItems.length > 0) {
        stationeryOrderNumber = generate10DigitId();
        const orderData = {
          userId: auth.currentUser.uid,
          customerName: userName,
          date: new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          items: stationeryItems.map((i) => ({
            name: i.foodItem.name,
            quantity: i.quantity,
            price: i.foodItem.price,
          })),
          total: stationeryItems.reduce((sum, i) => sum + i.foodItem.price * i.quantity, 0),
          status: "pending",
          orderType: "book_mart",
          orderNumber: stationeryOrderNumber,
          createdAt: new Date().toISOString(),
        };
        await addDoc(collection(db, "orders"), orderData);
      }

      // Store order details in localStorage for OrderConfirmation page
      localStorage.setItem(
        "last_placed_order",
        JSON.stringify({
          orderId: foodOrderNumber || stationeryOrderNumber,
          items: items.map((i) => ({
            name: i.foodItem.name,
            quantity: i.quantity,
          })),
          orderType: foodItems.length > 0 ? "food_court" : "book_mart",
        }),
      );

      clearCart();
      setOrderPlaced(true);
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Failed to place order. Please try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="My Cart" back backTo={backTo} />
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
          <p className="text-6xl">🛒</p>
          <p className="text-lg font-bold text-foreground font-display">
            Your cart is empty
          </p>
          <p className="text-sm text-muted-foreground">
            {hasStationery && !hasFood
              ? "Add items from the book mart to get started"
              : "Add items from the food court or book mart to get started"}
          </p>
          <Button
            onClick={() =>
              navigate({ to: backTo === "/book-mart" ? "/book-mart" : "/food-court" })
            }
            data-ocid="empty-cart-cta"
          >
            {backTo === "/book-mart" ? "Browse Book Mart" : "Browse Food Court"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title={`Cart (${totalItems} item${totalItems > 1 ? "s" : ""})`}
        back
        backTo={backTo}
        rightAction={
          <button
            type="button"
            onClick={clearCart}
            className="text-xs text-destructive font-semibold hover:underline"
            data-ocid="clear-cart-btn"
          >
            Clear all
          </button>
        }
      />

      <div className="px-4 py-4 flex flex-col gap-3 pb-32">
        {items.map(({ foodItem, quantity }) => (
          <Card
            key={foodItem.id}
            padding="sm"
            className="flex items-center gap-3"
          >
            <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center text-2xl shrink-0">
              {foodItem.isStationery ? "📚" : "🍽️"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">
                {foodItem.name}
              </p>
              <p className="text-xs text-primary font-semibold mt-0.5">
                ₹{foodItem.price} each
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => updateQuantity(foodItem.id, quantity - 1)}
                className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-smooth"
                aria-label="Decrease quantity"
                data-ocid={`cart-decrease-${foodItem.id}`}
              >
                {quantity === 1 ? (
                  <Trash2 size={13} className="text-destructive" />
                ) : (
                  <Minus size={13} />
                )}
              </button>
              <span className="w-5 text-center text-sm font-bold text-foreground">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => updateQuantity(foodItem.id, quantity + 1)}
                className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-smooth"
                aria-label="Increase quantity"
                data-ocid={`cart-increase-${foodItem.id}`}
              >
                <Plus size={13} />
              </button>
            </div>
            <p className="text-sm font-bold text-foreground w-14 text-right shrink-0">
              ₹{foodItem.price * quantity}
            </p>
          </Card>
        ))}
      </div>

      {/* Bottom summary */}
      <div className="fixed bottom-[72px] left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card border-t border-border px-4 pt-3 pb-4 z-20">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-semibold">₹{totalPrice}</span>
        </div>
        <div className="flex justify-between text-sm mb-3">
          <span className="text-muted-foreground">Platform fee</span>
          <span className="font-semibold text-accent">Free</span>
        </div>
        <div className="flex justify-between text-base font-bold mb-4">
          <span>Total</span>
          <span className="text-primary">₹{totalPrice}</span>
        </div>
        <Button
          fullWidth
          size="lg"
          onClick={() => {
            if (!auth.currentUser) {
              alert("Please login to place an order");
              return;
            }
            triggerRazorpayPayment({
              amount: totalPrice,
              description,
              prefillName: auth.currentUser.displayName || undefined,
              prefillEmail: auth.currentUser.email || undefined,
              prefillPhone: auth.currentUser.phoneNumber || undefined,
              onSuccess: async () => {
                await handlePlaceOrder();
              },
            });
          }}
          disabled={isPlacingOrder}
          data-ocid="checkout-btn"
        >
          {isPlacingOrder ? "Placing Order..." : `Place Order · ₹${totalPrice}`}
        </Button>
      </div>
    </div>
  );
}
