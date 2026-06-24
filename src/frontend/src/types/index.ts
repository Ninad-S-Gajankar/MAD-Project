export interface FoodItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  available: boolean;
  description: string;
  prepTime: number; // minutes
  isStationery?: boolean;
}

export interface CartItem {
  foodItem: FoodItem;
  quantity: number;
}

export type SeatStatus = "available" | "selected" | "unavailable" | "booked";

export interface Seat {
  id: string;
  row: number;
  col: number;
  status: SeatStatus;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  totalSeats: number;
  availableSeats: number;
  category: string;
  image: string;
  price: number;
  releaseCertificates?: boolean;
}

export interface Notification {
  id: string;
  type: "order" | "event" | "system" | "promo";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  createdAt?: string;
}

export interface QueueStatus {
  orderId: string;
  position: number;
  totalInQueue: number;
  estimatedMinutes: number;
  status: "queued" | "preparing" | "ready";
  itemName: string;
}

export interface OrderHistory {
  id: string;
  date: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  status: "delivered" | "cancelled" | "pending";
  orderNumber?: string;
}

export interface UserProfile {
  name: string;
  usn: string;
  email: string;
  branch: string;
  year: number;
  avatar: string;
  phone: string;
  gmail?: string;
  semester?: number;
}

export interface PrintOrder {
  copies: number;
  colorMode: "color" | "bw";
  binding: "none" | "spiral" | "staple";
  pages: number;
  fileName: string;
}

// Vendor types
export type VendorOrderStatus = "pending" | "preparing" | "ready" | "completed";

export interface VendorOrderItem {
  name: string;
  quantity: number;
}

export interface VendorOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  items: VendorOrderItem[];
  price: number;
  timeAgo: string;
  status: VendorOrderStatus;
  userId?: string;
  orderType?: string;
  createdAt?: string;
  fileData?: string;
  fileName?: string;
  fileType?: string;
}

export interface VendorStats {
  pendingCount: number;
  preparingCount: number;
  completedToday: number;
  revenueToday: number;
}

export type VendorCrowdLevel = "low" | "medium" | "high";

export interface VendorCrowdIndicator {
  level: VendorCrowdLevel;
  activeOrders: number;
  avgWaitMinutes: number;
  percentage: number;
}

export interface VendorTodaySummary {
  pending: number;
  preparing: number;
  ready: number;
  completed: number;
  totalRevenue: number;
}

// Stationery types
export type StationeryCategory =
  | "Notebooks"
  | "Pens"
  | "Folders"
  | "Files"
  | "Staplers"
  | "Correction"
  | "Erasers"
  | "Other";

export interface StationeryItem {
  id: string;
  name: string;
  category: StationeryCategory;
  description: string;
  price: number;
  stock: number;
  inStock: boolean;
}
