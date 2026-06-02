import { useNavigate } from "@tanstack/react-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  Eye,
  LogOut,
  Mail,
  Pencil,
  Phone,
  Settings,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useOrders } from "../context/OrdersContext";
import { vendorCrowdIndicator, vendorStats, vendorTodaySummary } from "../data";
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
  name: "Campus Vendor",
  phone: "+91 87654 32109",
  email: "vendor@campusstore.com",
  storeName: "Campus Store — Block D",
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
const statusBorderColor: Record<VendorOrderStatus, string> = {
  pending: "border-l-amber-400",
  preparing: "border-l-red-500",
  ready: "border-l-emerald-500",
  completed: "border-l-slate-400",
};

const statusBadgeStyle: Record<VendorOrderStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  preparing: "bg-red-100 text-red-700",
  ready: "bg-emerald-100 text-emerald-700",
  completed: "bg-slate-100 text-slate-700",
};

const statusLabel: Record<VendorOrderStatus, string> = {
  pending: "Pending",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
};

interface OrderCardProps {
  order: VendorOrder;
  onAction: (id: string, action: "start" | "ready" | "complete") => void;
}

function OrderCard({ order, onAction }: OrderCardProps) {
  const itemsSummary = order.items
    .map((i) => `${i.quantity}x ${i.name}`)
    .join(", ");

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border-l-4 ${statusBorderColor[order.status]} p-4`}
      data-ocid={`order-card-${order.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-800 text-sm">
              {order.orderNumber}
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeStyle[order.status]}`}
            >
              {statusLabel[order.status]}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{order.customerName}</p>
        </div>
        <button
          type="button"
          aria-label={`View order ${order.orderNumber}`}
          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-400 transition-colors flex-shrink-0"
          data-ocid={`order-view-${order.id}`}
        >
          <Eye size={14} />
        </button>
      </div>

      <p className="text-sm text-slate-700 font-medium truncate mb-1">
        {itemsSummary}
      </p>

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
            className="px-4 py-1.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
            data-ocid={`order-start-${order.id}`}
          >
            Start
          </button>
        )}
        {order.status === "preparing" && (
          <button
            type="button"
            onClick={() => onAction(order.id, "ready")}
            className="px-4 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors"
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

// ─── Crowd Indicator ────────────────────────────────────────────────────────
function CrowdCard({ orders }: { orders: VendorOrder[] }) {
  const activeCount = orders.filter((o) => o.status !== "completed").length;
  let level: "low" | "medium" | "high" = "low";
  if (activeCount >= 5) level = "high";
  else if (activeCount >= 3) level = "medium";

  const crowd = {
    level,
    activeOrders: activeCount,
    avgWaitMinutes: activeCount > 0 ? activeCount * 4 : 0,
    percentage: Math.min((activeCount / 10) * 100, 100),
  };
  const crowdColors = {
    low: {
      dot: "bg-emerald-500",
      badge: "bg-emerald-100 text-emerald-700",
      bar: "bg-emerald-500",
      label: "Low Crowd",
    },
    medium: {
      dot: "bg-amber-400",
      badge: "bg-amber-100 text-amber-700",
      bar: "bg-amber-400",
      label: "Medium Crowd",
    },
    high: {
      dot: "bg-red-500",
      badge: "bg-red-100 text-red-700",
      bar: "bg-red-500",
      label: "High Crowd",
    },
  }[crowd.level];

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${crowdColors.dot} animate-pulse`}
          />
          <span className="text-sm font-bold text-slate-800">
            Crowd Indicator
          </span>
        </div>
        <span
          className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${crowdColors.badge}`}
        >
          {crowdColors.label}
        </span>
      </div>

      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-700 ${crowdColors.bar}`}
          style={{ width: `${crowd.percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Users size={12} />
          <span>
            Active Orders:{" "}
            <strong className="text-slate-700">{crowd.activeOrders}</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <Clock size={12} />
          <span>
            Avg Wait:{" "}
            <strong className="text-slate-700">
              {crowd.avgWaitMinutes} min
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Today's Summary ─────────────────────────────────────────────────────────
function TodaySummaryCard({ orders }: { orders: VendorOrder[] }) {
  const s = {
    pending: orders.filter((o) => o.status === "pending").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    ready: orders.filter((o) => o.status === "ready").length,
    completed: orders.filter((o) => o.status === "completed").length,
    totalRevenue: orders
      .filter((o) => o.status === "completed")
      .reduce((sum, o) => sum + o.price, 0),
  };
  const rows: { label: string; value: number; color: string }[] = [
    { label: "Pending", value: s.pending, color: "text-amber-600" },
    { label: "Preparing", value: s.preparing, color: "text-red-500" },
    { label: "Ready", value: s.ready, color: "text-blue-500" },
    { label: "Completed", value: s.completed, color: "text-emerald-600" },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <h3 className="text-sm font-bold text-slate-800 mb-3">Today's Summary</h3>
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{row.label}</span>
            <span className={`text-sm font-bold ${row.color}`}>
              {row.value}
            </span>
          </div>
        ))}
        <div className="border-t border-slate-100 mt-1 pt-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">
            Total Revenue
          </span>
          <span className="text-base font-extrabold text-orange-600">
            ₹{s.totalRevenue}
          </span>
        </div>
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
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
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

  // Derive initials from name
  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="presentation"
        data-ocid="vendor-profile.backdrop"
      />

      {/* Panel */}
      <dialog
        open
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white rounded-3xl shadow-2xl z-50 overflow-hidden p-0 border-0 m-0"
        data-ocid="vendor-profile.dialog"
        aria-label="Vendor Profile"
      >
        {/* Gradient top banner */}
        <div
          className="h-24 w-full relative"
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #2563eb 100%)",
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

        {/* Scrollable body */}
        <div className="overflow-y-auto max-h-[70vh]">
          <div className="flex flex-col items-center -mt-10 px-5 pb-5">
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-extrabold text-white shadow-lg border-4 border-white"
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #2563eb 100%)",
              }}
            >
              {initials}
            </div>

            {/* Name + store */}
            <h2 className="mt-3 text-lg font-extrabold text-slate-800">
              {profile.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{profile.storeName}</p>

            {/* Edit toggle header */}
            <div className="mt-4 w-full flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Profile Info
              </span>
              {!editing ? (
                <button
                  type="button"
                  onClick={startEdit}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors"
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
                    className="flex items-center gap-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 rounded-xl transition-colors"
                    data-ocid="vendor-profile.save_button"
                  >
                    <Check size={11} />
                    Save
                  </button>
                </div>
              )}
            </div>

            {/* View mode */}
            {!editing && (
              <div className="w-full rounded-2xl bg-gray-50 overflow-hidden">
                <div className="flex items-center gap-3 py-3 px-4 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Phone size={15} className="text-emerald-600" />
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
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Building2 size={15} className="text-emerald-600" />
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
                <div className="flex items-center gap-3 py-3 px-4">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <CalendarDays size={15} className="text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 font-medium leading-none mb-0.5">
                      Member Since
                    </p>
                    <p className="text-sm font-semibold text-gray-700">
                      January 2025
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Edit mode */}
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

                {/* Action row inside edit form */}
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
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                    style={{
                      background:
                        "linear-gradient(135deg, #10b981 0%, #2563eb 100%)",
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
                    "linear-gradient(135deg, #10b981 0%, #2563eb 100%)",
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

// ─── Main VendorDashboard ────────────────────────────────────────────────────
export default function VendorDashboard() {
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
              name: data.name || "Campus Vendor",
              phone: data.phone || "+91 87654 32109",
              email: data.email || user.email || "vendor@campusstore.com",
              storeName: data.storeName || "Campus Store — Block D",
            });
          }
        } catch (err) {
          console.error("Error loading vendor profile:", err);
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
        console.error("Error saving vendor profile:", err);
        alert("Failed to save profile to database");
      }
    }
  };

  const handleAction = (id: string, action: "start" | "ready" | "complete") => {
    if (action === "start") updateOrderStatus(id, "preparing");
    if (action === "ready") updateOrderStatus(id, "ready");
    if (action === "complete") updateOrderStatus(id, "completed");
  };

  // Filter only food court orders
  const foodCourtOrders = orders.filter((o) => o.orderType === "food_court");
  const activeOrders = foodCourtOrders.filter((o) => o.status !== "completed");
  const activeCount = activeOrders.length;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#f1f5f9" }}
    >
      {/* ── Dark Navy Header ─────────────────────────────────────────── */}
      <div
        className="px-5 pt-12 pb-6"
        style={{
          background: "linear-gradient(135deg, #0f1f3d 0%, #1a3260 100%)",
        }}
        data-ocid="vendor-header"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-orange-400/20 flex items-center justify-center">
                <ChefHat size={18} className="text-orange-400" />
              </div>
              <span className="text-[10px] font-semibold text-blue-300 uppercase tracking-widest">
                Vendor Portal
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white leading-tight">
              Vendor Dashboard
            </h1>
            <p className="text-blue-300 text-xs mt-1 leading-relaxed">
              Manage orders &amp; track your kitchen in real time
            </p>
          </div>

          {/* Right side: Profile avatar + Menu */}
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
                background: "linear-gradient(135deg, #10b981 0%, #2563eb 100%)",
              }}
              aria-label="Open vendor profile"
              data-ocid="vendor-profile-avatar-btn"
            >
              <User size={18} />
            </button>

            <button
              type="button"
              onClick={() => setShowMenu((v) => !v)}
              className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg hover:bg-orange-600 transition-colors"
              aria-label="Open vendor menu"
              data-ocid="vendor-menu-btn"
            >
              <Settings size={18} />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-12 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50">
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                  onClick={() => {
                    setShowMenu(false);
                    setShowProfile(true);
                  }}
                  data-ocid="vendor-menu-profile"
                >
                  <User size={14} />
                  My Profile
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                  onClick={() => {
                    setShowMenu(false);
                    navigate({ to: "/vendor-menu" });
                  }}
                  data-ocid="vendor-menu-manage"
                >
                  <Settings size={14} />
                  Manage Menu
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  onClick={() => {
                    setShowMenu(false);
                    navigate({ to: "/login" });
                  }}
                  data-ocid="vendor-logout"
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
          <span className="text-xs text-blue-300">
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
      <div className="px-4 -mt-2 pb-2" data-ocid="vendor-stats">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Pending Orders"
            value={foodCourtOrders.filter((o) => o.status === "pending").length}
            iconBg="bg-amber-100"
            icon={<Clock size={20} className="text-amber-500" />}
          />
          <StatCard
            label="Preparing"
            value={
              foodCourtOrders.filter((o) => o.status === "preparing").length
            }
            iconBg="bg-purple-100"
            icon={<ChefHat size={20} className="text-purple-600" />}
          />
          <StatCard
            label="Completed"
            value={
              foodCourtOrders.filter((o) => o.status === "completed").length
            }
            iconBg="bg-emerald-100"
            icon={<CheckCircle2 size={20} className="text-emerald-600" />}
          />
          <StatCard
            label="Revenue"
            value={`₹${foodCourtOrders.filter((o) => o.status === "completed").reduce((sum, o) => sum + o.price, 0)}`}
            iconBg="bg-blue-100"
            icon={<TrendingUp size={20} className="text-blue-600" />}
          />
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex-1 px-4 pt-2 pb-6 flex flex-col gap-4">
        {/* Active Orders */}
        <div data-ocid="vendor-active-orders">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-extrabold text-slate-800">
              Active Orders
            </h2>
            <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {activeCount}
            </span>
          </div>

          {activeOrders.length === 0 ? (
            <div
              className="bg-white rounded-2xl p-8 flex flex-col items-center gap-2 shadow-sm"
              data-ocid="vendor-empty-orders"
            >
              <CheckCircle2 size={36} className="text-emerald-400" />
              <p className="text-sm font-semibold text-slate-600">
                All caught up!
              </p>
              <p className="text-xs text-slate-400 text-center">
                No active orders right now.
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

        {/* Sidebar cards (stacked below on mobile) */}
        <div className="flex flex-col gap-3" data-ocid="vendor-sidebar">
          <CrowdCard orders={foodCourtOrders} />
          <TodaySummaryCard orders={foodCourtOrders} />
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
