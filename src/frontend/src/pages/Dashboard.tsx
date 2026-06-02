import { useNavigate } from "@tanstack/react-router";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import {
  Bell,
  BookOpen,
  CalendarDays,
  MapPin,
  Search,
  UserCircle2,
  UtensilsCrossed,
  ClipboardList,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "../components/ui/CampusBadge";
import { Card } from "../components/ui/CampusCard";
import { useOrders } from "../context/OrdersContext";
import { useCart } from "../hooks/useCart";
import { foodItems, stationeryItems, events } from "../data";
import { auth, db } from "../lib/firebase";
import type { Notification } from "../types";

const services = [
  {
    id: "food-court",
    label: "Food Court",
    sublabel: "Vidhyarthi Khana",
    icon: UtensilsCrossed,
    route: "/food-court",
    color: "bg-primary/10 text-primary",
  },
  {
    id: "book-mart",
    label: "Book Mart",
    sublabel: "Campus print & bind",
    icon: BookOpen,
    route: "/book-mart",
    color: "bg-secondary/10 text-secondary",
  },
  {
    id: "event-booking",
    label: "Event Booking",
    sublabel: "Register for events",
    icon: CalendarDays,
    route: "/event-booking",
    color: "bg-accent/10 text-accent",
  },
  {
    id: "order-history",
    label: "Order History",
    sublabel: "View past orders",
    icon: ClipboardList,
    route: "/order-history",
    color: "bg-primary/10 text-primary",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const { orders } = useOrders();

  const [userName, setUserName] = useState<string>("Student");
  const [realNotifs, setRealNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const searchResults: any[] = [];
  if (searchQuery.trim().length > 0) {
    const q = searchQuery.toLowerCase();
    
    foodItems.forEach(item => {
      if (item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)) {
        searchResults.push({
          id: item.id,
          name: item.name,
          type: "food",
          route: `/food-court?search=${encodeURIComponent(item.name)}`,
          subtitle: `Food Court • ₹${item.price}`
        });
      }
    });

    stationeryItems.forEach(item => {
      if (item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)) {
        searchResults.push({
          id: item.id,
          name: item.name,
          type: "stationery",
          route: `/book-mart?search=${encodeURIComponent(item.name)}`,
          subtitle: `Book Mart • ₹${item.price}`
        });
      }
    });

    events.forEach(item => {
      if (item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)) {
        searchResults.push({
          id: item.id,
          name: item.title,
          type: "event",
          route: `/event-booking?search=${encodeURIComponent(item.title)}`,
          subtitle: `Event Booking • ${item.date}`
        });
      }
    });
  }

  // Fetch dynamic user profile from Firestore users collection
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Auto-seed missing default mock data items to Firestore if they do not exist
        const seedMissingDefaultItems = async () => {
          try {
            // Seed food items
            for (const item of foodItems) {
              const docRef = doc(db, "foodItems", item.id);
              const docSnap = await getDoc(docRef);
              if (!docSnap.exists()) {
                await setDoc(docRef, item);
                console.log(`Auto-seeded missing food item: ${item.name}`);
              }
            }

            // Seed stationery items
            for (const item of stationeryItems) {
              const docRef = doc(db, "stationeryItems", item.id);
              const docSnap = await getDoc(docRef);
              if (!docSnap.exists()) {
                await setDoc(docRef, item);
                console.log(`Auto-seeded missing stationery item: ${item.name}`);
              }
            }

            // Seed events
            for (const item of events) {
              const docRef = doc(db, "events", item.id);
              const docSnap = await getDoc(docRef);
              if (!docSnap.exists()) {
                await setDoc(docRef, item);
                console.log(`Auto-seeded missing event: ${item.title}`);
              }
            }
          } catch (err) {
            console.error("Auto-seeding default items failed:", err);
          }
        };
        seedMissingDefaultItems();

        // Get user profile details
        const docRef = doc(db, "users", user.uid);
        getDoc(docRef)
          .then((docSnap: any) => {
            if (docSnap.exists() && docSnap.data().name) {
              setUserName(docSnap.data().name);
            }
          })
          .catch((err: any) => console.error("Error fetching user name:", err));

        // Listen to notifications in real-time
        const notifsRef = collection(db, "notifications");
        const q = query(notifsRef, where("userId", "==", user.uid));
        const unsubscribeSnap = onSnapshot(
          q,
          (snapshot) => {
            const fetched: Notification[] = [];
            snapshot.forEach((docSnap) => {
              fetched.push({
                id: docSnap.id,
                ...docSnap.data(),
              } as Notification);
            });
            // Sort newest first
            fetched.sort(
              (a, b) =>
                new Date(b.createdAt || 0).getTime() -
                new Date(a.createdAt || 0).getTime(),
            );
            setRealNotifs(fetched);
            setLoading(false);
          },
          (error) => {
            console.error("Error fetching notifications on dashboard:", error);
            setLoading(false);
          },
        );

        return () => unsubscribeSnap();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const unreadCount = realNotifs.filter((n) => !n.read).length;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="gradient-hero px-5 pt-12 pb-8">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-white/70 text-sm font-body mb-0.5">
              Welcome back,
            </p>
            <h1 className="text-2xl font-bold font-display text-white leading-tight">
              {userName.split(" ")[0]}! 👋
            </h1>
            {unreadCount > 0 && (
              <p className="text-white/60 text-xs mt-1">
                You have {unreadCount} new notification
                {unreadCount > 1 ? "s" : ""} 🔔
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/notifications" })}
            className="relative p-2 rounded-xl bg-white/20 text-white transition-smooth hover:bg-white/30"
            aria-label="Notifications"
            data-ocid="dashboard-notifications-btn"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center pulse-soft">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Search bar */}
        <div className="relative z-30">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            placeholder="Search food, stationery, events…"
            className="w-full pl-10 pr-4 py-2.5 bg-card rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-smooth shadow-md"
            data-ocid="dashboard-search"
          />

          {showResults && searchQuery.trim().length > 0 && (
            <>
              {/* Overlay dismiss */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowResults(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-elevated z-20 max-h-60 overflow-y-auto divide-y divide-border">
                {searchResults.length > 0 ? (
                  searchResults.map((res) => (
                    <button
                      key={`${res.type}-${res.id}`}
                      type="button"
                      onClick={() => {
                        setShowResults(false);
                        setSearchQuery("");
                        navigate({ to: res.route });
                      }}
                      className="w-full px-4 py-3 flex flex-col items-start hover:bg-muted/50 transition-smooth text-left"
                    >
                      <p className="text-sm font-bold text-foreground">{res.name}</p>
                      <p className="text-[11px] text-muted-foreground">{res.subtitle}</p>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-4 text-center text-sm text-muted-foreground font-semibold">
                    🔍 No items found
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Services grid */}
      <div className="px-4 py-5 -mt-4">
        <Card padding="none" className="overflow-hidden animate-slide-up">
          <div className="grid grid-cols-2 divide-x divide-y divide-border">
            {services.map(
              ({ id, label, sublabel, icon: Icon, route, color }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => navigate({ to: route })}
                  className="flex flex-col items-center gap-3 p-5 hover:bg-muted/50 transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-ocid={`service-${id}`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color}`}
                  >
                    <Icon size={26} strokeWidth={1.8} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-foreground">{label}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {sublabel}
                    </p>
                  </div>
                </button>
              ),
            )}
          </div>
        </Card>

        {/* Quick access */}
        <div className="mt-5">
          <h2 className="text-sm font-bold text-foreground mb-3">
            Quick Access
          </h2>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate({ to: "/queue-status" })}
              className="flex-1 flex items-center gap-3 p-3 bg-card rounded-2xl border border-border shadow-card hover:shadow-elevated transition-smooth"
              data-ocid="quick-queue-status"
            >
              <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <MapPin size={18} className="text-accent" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold text-foreground">
                  Queue Status
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {(() => {
                    const userActiveOrders = orders.filter(
                      (o) =>
                        o.userId === auth.currentUser?.uid &&
                        o.status !== "completed",
                    );
                    const latestActiveOrder = userActiveOrders[0];
                    if (latestActiveOrder) {
                      const serviceActiveOrders = orders.filter(
                        (o) =>
                          o.orderType === latestActiveOrder.orderType &&
                          o.status !== "completed",
                      );
                      const idx = serviceActiveOrders.findIndex(
                        (o) => o.id === latestActiveOrder.id,
                      );
                      const pos =
                        idx !== -1
                          ? serviceActiveOrders.length - idx
                          : serviceActiveOrders.length;

                      if (latestActiveOrder.status === "ready") {
                        return "Ready for pickup! 🎉";
                      }
                      if (latestActiveOrder.status === "preparing") {
                        return `🍳 Preparing (#${pos})`;
                      }
                      return `⏳ Queued (#${pos})`;
                    }
                    return "No active orders";
                  })()}
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/cart" })}
              className="flex-1 flex items-center gap-3 p-3 bg-card rounded-2xl border border-border shadow-card hover:shadow-elevated transition-smooth"
              data-ocid="quick-cart"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 relative">
                <UtensilsCrossed size={18} className="text-primary" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center float-animation">
                    {totalItems}
                  </span>
                )}
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-bold text-foreground">My Cart</p>
                <p className="text-[11px] text-muted-foreground">
                  {totalItems > 0
                    ? `${totalItems} item${totalItems > 1 ? "s" : ""} added`
                    : "Cart is empty"}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Recent notification preview */}
        <div className="mt-5">
          <h2 className="text-sm font-bold text-foreground mb-3">
            Latest Update
          </h2>
          {realNotifs.length === 0 ? (
            <div className="w-full flex gap-3 items-start p-4 bg-card rounded-2xl border border-border shadow-card text-left">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-base">
                📭
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground mb-0.5">
                  No updates yet
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Notifications for event deadlines and order ready states
                  appear here.
                </p>
              </div>
            </div>
          ) : (
            realNotifs.slice(0, 1).map((notif) => (
              <button
                key={notif.id}
                type="button"
                onClick={() => navigate({ to: "/notifications" })}
                className="w-full flex gap-3 items-start p-4 bg-card rounded-2xl border border-border shadow-card hover:shadow-elevated transition-smooth text-left"
                data-ocid="dashboard-latest-notif"
              >
                <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 text-base">
                  {notif.type === "order"
                    ? "📦"
                    : notif.type === "event"
                      ? "📅"
                      : "🎉"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-bold text-foreground truncate">
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <Badge variant="info" className="shrink-0">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                    {notif.message}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
