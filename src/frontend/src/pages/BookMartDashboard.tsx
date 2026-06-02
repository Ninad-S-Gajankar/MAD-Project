import { useNavigate } from "@tanstack/react-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  LogOut,
  Mail,
  Pencil,
  Phone,
  Printer,
  Settings,
  Store,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useOrders } from "../context/OrdersContext";
import { auth, db } from "../lib/firebase";
import type { VendorOrder, VendorOrderStatus } from "../types";

// ─── Vendor Profile State ────────────────────────────────────────────────────
interface VendorProfile {
  name: string;
  phone: string;
  email: string;
  storeName: string;
}

const defaultVendorProfile: VendorProfile = {
  name: "Book Mart Vendor",
  phone: "+91 98765 43210",
  email: "bookmart@bmsce.ac.in",
  storeName: "Campus Book Mart — Block D",
};

// ─── Stat Card ──────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
}

function StatCard({ label, value, icon, iconBg }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 min-w-0">
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-500 leading-tight truncate">
          {label}
        </p>
        <p className="text-xl font-bold text-slate-800 leading-tight">
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Order Card ─────────────────────────────────────────────────────────────
const statusBorderColor = {
  pending: "border-l-amber-400",
  preparing: "border-l-teal-500",
  ready: "border-l-emerald-500",
};

const statusBadgeStyle = {
  pending: "bg-amber-100 text-amber-700",
  preparing: "bg-teal-100 text-teal-700",
  ready: "bg-emerald-100 text-emerald-700",
};

const statusLabel = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready",
};

interface OrderCardProps {
  order: VendorOrder;
  onAction: (id: string, action: "start" | "ready" | "complete") => void;
}

function OrderCard({ order, onAction }: OrderCardProps) {
  const itemsSummary = order.items
    .map((i) => `${i.quantity}x ${i.name}`)
    .join(", ");

  const isPrint = order.items.some((i) =>
    i.name.toLowerCase().includes("print:"),
  );

  const handleDownloadFile = () => {
    if (!order.fileData) return;
    const link = document.createElement("a");
    link.href = order.fileData;
    link.download = order.fileName || "document.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border-l-4 ${statusBorderColor[order.status as keyof typeof statusBorderColor] || "border-l-gray-300"} p-4`}
      data-ocid={`order-card-${order.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-800 text-sm">
              {order.orderNumber}
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeStyle[order.status as keyof typeof statusBadgeStyle] || "bg-gray-100 text-gray-700"}`}
            >
              {statusLabel[order.status as keyof typeof statusLabel] ||
                order.status}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {isPrint ? "🖨️ Printing" : "🛍️ Stationery"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{order.customerName}</p>
        </div>
      </div>

      <p className="text-sm text-slate-700 font-medium truncate mb-1">
        {itemsSummary}
      </p>

      {order.fileData && (
        <div className="mt-2.5 mb-1 flex items-center">
          <button
            type="button"
            onClick={handleDownloadFile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50 text-teal-700 text-xs font-bold hover:bg-teal-100 transition-colors animate-pulse-soft"
          >
            <FileText size={12} className="text-teal-600 animate-bounce" />
            Download:{" "}
            <span className="font-semibold underline max-w-[150px] truncate">
              {order.fileName}
            </span>
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="font-bold text-slate-700 text-sm">
            ₹{order.price}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {order.timeAgo}
          </span>
        </div>

        {order.status === "pending" && (
          <button
            type="button"
            onClick={() => onAction(order.id, "start")}
            className="px-4 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors"
            data-ocid={`order-start-${order.id}`}
          >
            Start
          </button>
        )}
        {order.status === "preparing" && (
          <button
            type="button"
            onClick={() => onAction(order.id, "ready")}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
            data-ocid={`order-ready-${order.id}`}
          >
            Mark Ready
          </button>
        )}
        {order.status === "ready" && (
          <button
            type="button"
            onClick={() => onAction(order.id, "complete")}
            className="px-4 py-1.5 rounded-xl bg-slate-700 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            data-ocid={`order-complete-${order.id}`}
          >
            Complete
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Vendor Edit Field ───────────────────────────────────────────────────────
interface VendorEditFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}

function VendorEditField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: VendorEditFieldProps) {
  const fieldId = `vendor-edit-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={fieldId}
        className="text-[10px] font-bold text-gray-400 uppercase tracking-wider"
      >
        {label}
      </label>
      <input
        id={fieldId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
      />
    </div>
  );
}

// ─── Vendor Profile Panel ────────────────────────────────────────────────────
interface VendorProfilePanelProps {
  onClose: () => void;
  profile: VendorProfile;
  onSave: (p: VendorProfile) => void;
}

function VendorProfilePanel({
  onClose,
  profile,
  onSave,
}: VendorProfilePanelProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<VendorProfile>({ ...profile });

  function startEdit() {
    setDraft({ ...profile });
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  function saveEdit() {
    onSave({ ...draft });
    setEditing(false);
  }

  function updateDraft(key: keyof VendorProfile, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="presentation"
        data-ocid="vendor-profile.backdrop"
      />

      <dialog
        open
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white rounded-3xl shadow-2xl z-50 overflow-hidden p-0 border-0 m-0"
        data-ocid="vendor-profile.dialog"
        aria-label="Vendor Profile"
      >
        <div
          className="h-24 w-full relative"
          style={{
            background: "linear-gradient(135deg, #0f766e 0%, #064e3b 100%)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            aria-label="Close vendor profile"
            data-ocid="vendor-profile.close_button"
          >
            <X size={16} />
          </button>
          <span className="absolute top-3 left-4 bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/30">
            Vendor
          </span>
        </div>

        <div className="overflow-y-auto max-h-[70vh]">
          <div className="flex flex-col items-center -mt-10 px-5 pb-5">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-extrabold text-white shadow-lg border-4 border-white"
              style={{
                background: "linear-gradient(135deg, #0f766e 0%, #064e3b 100%)",
              }}
            >
              {initials}
            </div>

            <h2 className="mt-3 text-lg font-extrabold text-slate-800">
              {profile.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{profile.storeName}</p>

            <div className="mt-4 w-full flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Profile Info
              </span>
              {!editing ? (
                <button
                  type="button"
                  onClick={startEdit}
                  className="flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl transition-colors"
                  data-ocid="vendor-profile.edit_button"
                >
                  <Pencil size={11} />
                  Edit
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-xl transition-colors"
                    data-ocid="vendor-profile.cancel_button"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="flex items-center gap-1 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 px-2.5 py-1.5 rounded-xl transition-colors"
                    data-ocid="vendor-profile.save_button"
                  >
                    <Check size={11} />
                    Save
                  </button>
                </div>
              )}
            </div>

            {!editing && (
              <div className="w-full rounded-2xl bg-gray-50 overflow-hidden">
                <div className="flex items-center gap-3 py-3 px-4 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                    <Phone size={15} className="text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 font-medium leading-none mb-0.5">
                      Phone
                    </p>
                    <p className="text-sm font-semibold text-gray-700">
                      {profile.phone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-3 px-4 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Mail size={15} className="text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 font-medium leading-none mb-0.5">
                      Email
                    </p>
                    <p className="text-sm font-semibold text-gray-700 truncate">
                      {profile.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-3 px-4 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                    <Building2 size={15} className="text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 font-medium leading-none mb-0.5">
                      Store
                    </p>
                    <p className="text-sm font-semibold text-gray-700">
                      {profile.storeName}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {editing && (
              <div
                className="w-full flex flex-col gap-3.5 bg-gray-50 rounded-2xl px-4 py-4"
                data-ocid="vendor-profile.edit_form"
              >
                <VendorEditField
                  label="Full Name"
                  value={draft.name}
                  onChange={(v) => updateDraft("name", v)}
                  placeholder="Vendor name"
                />
                <VendorEditField
                  label="Phone Number"
                  value={draft.phone}
                  onChange={(v) => updateDraft("phone", v)}
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                />
                <VendorEditField
                  label="Email"
                  value={draft.email}
                  onChange={(v) => updateDraft("email", v)}
                  type="email"
                  placeholder="vendor@store.com"
                />
                <VendorEditField
                  label="Store Name"
                  value={draft.storeName}
                  onChange={(v) => updateDraft("storeName", v)}
                  placeholder="e.g. Campus Store — Block D"
                />

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    data-ocid="vendor-profile.cancel_button"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 animate-pulse-soft"
                    style={{
                      background:
                        "linear-gradient(135deg, #0f766e 0%, #064e3b 100%)",
                    }}
                    data-ocid="vendor-profile.save_button"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {!editing && (
              <button
                type="button"
                onClick={onClose}
                className="mt-4 w-full py-2.5 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{
                  background:
                    "linear-gradient(135deg, #0f766e 0%, #064e3b 100%)",
                }}
                data-ocid="vendor-profile.confirm_button"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}

// ─── Main BookMartDashboard ──────────────────────────────────────────────────
export default function BookMartDashboard() {
  const navigate = useNavigate();
  const { orders, updateOrderStatus } = useOrders();
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [vendorProfile, setVendorProfile] =
    useState<VendorProfile>(defaultVendorProfile);

  // Load vendor profile dynamically from Firestore
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docSnap = await getDoc(doc(db, "vendors", user.uid));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setVendorProfile({
              name: data.name || "Book Mart Vendor",
              phone: data.phone || "+91 98765 43210",
              email: data.email || user.email || "bookmart@bmsce.ac.in",
              storeName: data.storeName || "Campus Book Mart — Block D",
            });
          }
        } catch (err) {
          console.error("Error loading bookmart vendor profile:", err);
        }
      }
    });
    return () => unsub();
  }, []);

  const handleSaveProfile = async (updated: VendorProfile) => {
    setVendorProfile(updated);
    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, "vendors", auth.currentUser.uid), {
          name: updated.name,
          phone: updated.phone,
          email: updated.email,
          storeName: updated.storeName,
        });
      } catch (err) {
        console.error("Error saving bookmart vendor profile:", err);
        alert("Failed to save profile to database");
      }
    }
  };

  const handleAction = (id: string, action: "start" | "ready" | "complete") => {
    if (action === "start") updateOrderStatus(id, "preparing");
    if (action === "ready") updateOrderStatus(id, "ready");
    if (action === "complete") updateOrderStatus(id, "completed");
  };

  // Filter Book Mart specific orders
  const bookMartOrders = orders.filter((o) => o.orderType === "book_mart");
  const activeOrders = bookMartOrders.filter((o) => o.status !== "completed");
  const activeCount = activeOrders.length;

  // Derive granular active counts for stats
  const pendingPrintCount = activeOrders.filter(
    (o) =>
      o.status === "pending" &&
      o.items.some((i) => i.name.toLowerCase().includes("print:")),
  ).length;

  const pendingStationeryCount = activeOrders.filter(
    (o) =>
      o.status === "pending" &&
      !o.items.some((i) => i.name.toLowerCase().includes("print:")),
  ).length;

  const completedTodayCount = bookMartOrders.filter(
    (o) => o.status === "completed",
  ).length;

  const revenueToday = bookMartOrders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + o.price, 0);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#f1f5f9" }}
    >
      {/* ── Dark Navy Header ─────────────────────────────────────────── */}
      <div
        className="px-5 pt-12 pb-6"
        style={{
          background: "linear-gradient(135deg, #064e3b 0%, #0f766e 100%)",
        }}
        data-ocid="bookmart-vendor-header"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-green-400/20 flex items-center justify-center">
                <Store size={18} className="text-green-300" />
              </div>
              <span className="text-[10px] font-semibold text-green-200 uppercase tracking-widest">
                Book Mart Portal
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white leading-tight">
              Book Mart Dashboard
            </h1>
            <p className="text-green-200 text-xs mt-1 leading-relaxed">
              Manage printing &amp; stationery store in real time
            </p>
          </div>

          {/* Right side: Menu */}
          <div className="relative flex-shrink-0 mt-1 flex items-center gap-2">
            {/* Profile Avatar Button */}
            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                setShowProfile(true);
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg border-2 border-white/20 hover:border-white/50 transition-colors"
              style={{
                background: "linear-gradient(135deg, #0f766e 0%, #064e3b 100%)",
              }}
              aria-label="Open vendor profile"
              data-ocid="bookmart-vendor-profile-avatar-btn"
            >
              <User size={18} />
            </button>

            <button
              type="button"
              onClick={() => setShowMenu((v) => !v)}
              className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-white shadow-lg hover:bg-teal-600 transition-colors"
              aria-label="Open vendor menu"
              data-ocid="bookmart-vendor-menu-btn"
            >
              <Settings size={18} />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50">
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                  onClick={() => {
                    setShowMenu(false);
                    setShowProfile(true);
                  }}
                  data-ocid="bookmart-menu-profile"
                >
                  <User size={14} />
                  My Profile
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                  onClick={() => {
                    setShowMenu(false);
                    navigate({ to: "/stationery-menu" });
                  }}
                  data-ocid="bookmart-menu-manage"
                >
                  <BookOpen size={14} />
                  Manage Stationery
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  onClick={async () => {
                    setShowMenu(false);
                    await auth.signOut();
                    navigate({ to: "/login" });
                  }}
                  data-ocid="bookmart-logout"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Date row */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-green-200">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-semibold">Live</span>
        </div>
      </div>

      {/* ── Stats Row ────────────────────────────────────────────────── */}
      <div className="px-4 -mt-2 pb-2" data-ocid="bookmart-stats">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Print Orders Pending"
            value={pendingPrintCount}
            iconBg="bg-amber-100"
            icon={<Printer size={20} className="text-amber-500" />}
          />
          <StatCard
            label="Stationery Pending"
            value={pendingStationeryCount}
            iconBg="bg-blue-100"
            icon={<BookOpen size={20} className="text-blue-500" />}
          />
          <StatCard
            label="Completed"
            value={completedTodayCount}
            iconBg="bg-emerald-100"
            icon={<CheckCircle2 size={20} className="text-emerald-600" />}
          />
          <StatCard
            label="Revenue"
            value={`₹${revenueToday}`}
            iconBg="bg-teal-100"
            icon={<TrendingUp size={20} className="text-teal-600" />}
          />
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex-1 px-4 pt-2 pb-6 flex flex-col gap-4">
        {/* Active Orders */}
        <div data-ocid="bookmart-active-orders">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-extrabold text-slate-800">
              Active Orders
            </h2>
            <span className="bg-teal-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {activeCount}
            </span>
          </div>

          {activeOrders.length === 0 ? (
            <div
              className="bg-white rounded-2xl p-8 flex flex-col items-center gap-2 shadow-sm text-center"
              data-ocid="bookmart-empty-orders"
            >
              <CheckCircle2
                size={36}
                className="text-emerald-400 animate-bounce"
              />
              <p className="text-sm font-semibold text-slate-600">
                All caught up!
              </p>
              <p className="text-xs text-slate-400">
                No active Book Mart orders right now.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {activeOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAction={handleAction}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Vendor Profile Modal ─────────────────────────────────────── */}
      {showProfile && (
        <VendorProfilePanel
          onClose={() => setShowProfile(false)}
          profile={vendorProfile}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
}
