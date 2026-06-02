import { addDoc, collection, onSnapshot } from "firebase/firestore";
import { ChevronLeft, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useUI } from "../context/UIContext";
import { useCart } from "../hooks/useCart";
import { auth, db } from "../lib/firebase";
import { generate10DigitId } from "../lib/utils";
import { triggerRazorpayPayment } from "../lib/paymentUtils";
import type { StationeryCategory, StationeryItem } from "../types";


const FILTER_CHIPS: (StationeryCategory | "All Items")[] = [
  "All Items",
  "Notebooks",
  "Pens",
  "Folders",
  "Files",
  "Staplers",
  "Correction",
  "Erasers",
  "Other",
];

interface Props {
  onBack: () => void;
}

function ProductCard({
  item,
  quantity,
  onAdd,
  onIncrease,
  onDecrease,
  index,
  highlighted,
}: {
  item: StationeryItem;
  quantity: number;
  onAdd: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
  index: number;
  highlighted?: boolean;
}) {
  return (
    <div
      id={`product-card-${item.id}`}
      className={`bg-card rounded-2xl border overflow-hidden flex flex-col border-t-4 border-t-green-500 shadow-sm transition-all duration-500
        ${highlighted ? "ring-4 ring-green-400 bg-green-50/50 scale-[1.02] shadow-md" : "border-border"}`}
      data-ocid={`stationery.item.${index}`}
    >
      <div className="p-3 flex flex-col flex-1 gap-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wide">
            {item.category}
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
            In Stock
          </span>
        </div>
        <h3 className="text-sm font-bold text-foreground leading-tight">
          {item.name}
        </h3>
        <p className="text-[11px] text-muted-foreground leading-snug">
          {item.description}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {item.stock} in stock
        </p>
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-base font-bold text-green-600">
            ₹{item.price}
          </span>
          {quantity === 0 ? (
            <button
              type="button"
              onClick={onAdd}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 active:scale-95 transition-smooth"
              data-ocid={`stationery.add_button.${index}`}
            >
              Add
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onDecrease}
                className="w-6 h-6 rounded-md bg-muted flex items-center justify-center hover:bg-border transition-smooth"
                data-ocid={`stationery.decrease_button.${index}`}
              >
                <Minus size={12} />
              </button>
              <span className="text-sm font-bold text-foreground w-5 text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={onIncrease}
                className="w-6 h-6 rounded-md bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition-smooth"
                data-ocid={`stationery.increase_button.${index}`}
              >
                <Plus size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Stationery({ onBack }: Props) {
  const { setHideBottomNav } = useUI();
  const { items, addItem, removeItem, updateQuantity } = useCart();
  const [activeFilter, setActiveFilter] = useState<
    StationeryCategory | "All Items"
  >("All Items");
  const [cartOpen, setCartOpen] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [liveItems, setLiveItems] = useState<StationeryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "stationeryItems"), (snapshot) => {
      const fetchedItems: StationeryItem[] = [];
      snapshot.forEach((doc) => {
        fetchedItems.push({ id: doc.id, ...doc.data() } as StationeryItem);
      });
      setLiveItems(fetchedItems);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchVal = params.get("search");
    if (searchVal && liveItems.length > 0) {
      const match = liveItems.find(
        (item) => item.name.toLowerCase() === searchVal.toLowerCase()
      );
      if (match) {
        setHighlightedId(match.id);
        
        // Scroll into view
        setTimeout(() => {
          const el = document.getElementById(`product-card-${match.id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 300);

        // Remove highlight after 3 seconds
        const timer = setTimeout(() => {
          setHighlightedId(null);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [liveItems]);

  // Sync bottom nav visibility with cart panel open state
  useEffect(() => {
    setHideBottomNav(cartOpen);
  }, [cartOpen, setHideBottomNav]);

  // Reset on unmount
  useEffect(() => {
    return () => setHideBottomNav(false);
  }, [setHideBottomNav]);

  const filtered =
    activeFilter === "All Items"
      ? liveItems
      : liveItems.filter((i) => i.category === activeFilter);

  // Filter global cart items to only show stationery items in the local Book Mart stationery panel
  const stationeryCartItems = items.filter((i) => i.foodItem.isStationery);
  const totalItems = stationeryCartItems.reduce((sum, i) => sum + i.quantity, 0);

  const cartEntries = stationeryCartItems.map((i) => ({
    item: {
      id: i.foodItem.id,
      name: i.foodItem.name,
      price: i.foodItem.price,
      category: i.foodItem.category as StationeryCategory,
      description: i.foodItem.description,
      stock: 99,
      inStock: true,
    },
    qty: i.quantity,
  }));

  const grandTotal = stationeryCartItems.reduce(
    (sum, i) => sum + i.foodItem.price * i.quantity,
    0,
  );

  const foodItemFromStationery = (item: StationeryItem) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    category: item.category,
    image: "",
    available: item.inStock,
    description: item.description,
    prepTime: 0,
    isStationery: true,
  });

  const addToCart = (item: StationeryItem) => {
    addItem(foodItemFromStationery(item));
  };

  const increase = (id: string) => {
    const found = items.find((i) => i.foodItem.id === id);
    if (found) {
      updateQuantity(id, found.quantity + 1);
    }
  };

  const decrease = (id: string) => {
    const found = items.find((i) => i.foodItem.id === id);
    if (found) {
      updateQuantity(id, found.quantity - 1);
    }
  };

  const handlePlaceOrder = async () => {
    if (!auth.currentUser) {
      alert("Please login to place a stationery order");
      return;
    }
    try {
      let userName = "Alex Kumar";
      try {
        const { getDoc, doc } = await import("firebase/firestore");
        const docSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (docSnap.exists() && docSnap.data().name) {
          userName = docSnap.data().name;
        }
      } catch (err) {
        console.error("Error fetching user name for stationery order:", err);
      }

      const orderNumber = generate10DigitId();
      const orderData = {
        userId: auth.currentUser.uid,
        customerName: userName,
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        items: cartEntries.map((e) => ({
          name: e.item.name,
          quantity: e.qty,
          price: e.item.price,
        })),
        total: grandTotal,
        status: "pending",
        orderType: "book_mart",
        orderNumber: orderNumber,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "orders"), orderData);

      // Remove all stationery items from global cart
      stationeryCartItems.forEach((ci) => {
        updateQuantity(ci.foodItem.id, 0);
      });

      setCartOpen(false);
      setOrderPlaced(true);
      setTimeout(() => setOrderPlaced(false), 4000);
    } catch (error) {
      console.error("Error placing stationery order:", error);
      alert("Failed to place order. Please try again.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Sub-header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
        <button
          type="button"
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-smooth"
          aria-label="Back to Book Mart"
          data-ocid="stationery.back_button"
        >
          <ChevronLeft size={20} className="text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground leading-tight">
            Campus Book Mart
          </h1>
          <p className="text-xs text-muted-foreground truncate">
            Notebooks, pens, stationery — pick up at the counter
          </p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="px-4 py-3 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 w-max">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setActiveFilter(chip)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border whitespace-nowrap transition-smooth ${
                activeFilter === chip
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-card text-muted-foreground border-border hover:border-green-400"
              }`}
              data-ocid={`stationery.filter_${chip.toLowerCase().replace(/\s+/g, "_")}`}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div className="px-4 pb-28 grid grid-cols-2 gap-3">
        {loading ? (
          <div className="col-span-2 py-10 flex justify-center">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-2 py-10 text-center text-sm text-slate-500">
            No items found.
          </div>
        ) : (
          filtered.map((item, idx) => {
            const found = items.find((i) => i.foodItem.id === item.id);
            return (
              <ProductCard
                key={item.id}
                item={item}
                quantity={found ? found.quantity : 0}
                onAdd={() => addToCart(item)}
                onIncrease={() => increase(item.id)}
                onDecrease={() => decrease(item.id)}
                index={idx + 1}
                highlighted={highlightedId === item.id}
              />
            );
          })
        )}
      </div>

      {/* Success toast */}
      {orderPlaced && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 max-w-[360px] w-[90%] animate-slide-up"
          data-ocid="stationery.success_state"
        >
          <span className="text-lg">✅</span>
          <div>
            <p className="text-sm font-bold">Order placed!</p>
            <p className="text-xs opacity-90">
              Pickup at the campus book mart
            </p>
          </div>
        </div>
      )}

      {/* Floating cart button */}
      {totalItems > 0 && !cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed z-40 w-14 h-14 rounded-full bg-green-600 text-white shadow-lg flex items-center justify-center hover:bg-green-700 active:scale-95 transition-smooth"
          style={{
            bottom: "84px",
            left: "max(12px, calc(50vw - 215px + 12px))",
          }}
          data-ocid="stationery.cart_open_button"
          aria-label={`Open cart — ${totalItems} items`}
        >
          <ShoppingBag size={22} />
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {totalItems}
          </span>
        </button>
      )}

      {/* Cart bottom sheet */}
      {cartOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/40 z-40 cursor-default"
            onClick={() => setCartOpen(false)}
            aria-label="Close cart"
            tabIndex={-1}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl shadow-xl max-w-[430px] mx-auto"
            data-ocid="stationery.cart_sheet"
          >
            {/* Sheet header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
              <h2 className="text-base font-bold text-foreground">
                Your Cart ({totalItems} item{totalItems !== 1 ? "s" : ""})
              </h2>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-smooth"
                aria-label="Close cart"
                data-ocid="stationery.cart_close_button"
              >
                <X size={18} />
              </button>
            </div>

            {/* Items list */}
            <div className="px-4 py-3 flex flex-col gap-3 max-h-[40vh] overflow-y-auto">
              {cartEntries.map(({ item, qty }, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3"
                  data-ocid={`stationery.cart_item.${idx + 1}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ₹{item.price} each
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => decrease(item.id)}
                      className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-border transition-smooth"
                      data-ocid={`stationery.cart_decrease.${idx + 1}`}
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-bold text-foreground w-5 text-center">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => increase(item.id)}
                      className="w-7 h-7 rounded-lg bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition-smooth"
                      data-ocid={`stationery.cart_increase.${idx + 1}`}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-green-600 w-14 text-right">
                    ₹{item.price * qty}
                  </span>
                </div>
              ))}
            </div>

            {/* Grand total + CTA */}
            <div className="px-4 pb-6 pt-3 border-t border-border">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-bold text-foreground">
                  Grand Total
                </span>
                <span className="text-lg font-bold text-green-600">
                  ₹{grandTotal}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!auth.currentUser) {
                    alert("Please login to place a stationery order");
                    return;
                  }
                  triggerRazorpayPayment({
                    amount: grandTotal,
                    description: "Stationery Order",
                    prefillName: auth.currentUser.displayName || undefined,
                    prefillEmail: auth.currentUser.email || undefined,
                    prefillPhone: auth.currentUser.phoneNumber || undefined,
                    onSuccess: async () => {
                      await handlePlaceOrder();
                    },
                  });
                }}
                className="w-full py-3.5 rounded-2xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 active:scale-[0.98] transition-smooth"
                data-ocid="stationery.place_order_button"
              >
                Place Order · ₹{grandTotal}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
