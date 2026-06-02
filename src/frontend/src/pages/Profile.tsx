import { useNavigate } from "@tanstack/react-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  BookOpen,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  IdCard,
  LogOut,
  Mail,
  Pencil,
  Phone,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "../components/ui/CampusBadge";
import { Button } from "../components/ui/CampusButton";
import { Card } from "../components/ui/CampusCard";
import { userProfile as defaultProfile } from "../data";
import { auth, db } from "../lib/firebase";
import type { OrderHistory, UserProfile } from "../types";

const statusBadge = {
  delivered: { variant: "success" as const, label: "Delivered" },
  cancelled: { variant: "error" as const, label: "Cancelled" },
  pending: { variant: "warning" as const, label: "Pending" },
};

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}

function InfoRow({ icon, label, value, last }: InfoRowProps) {
  return (
    <div
      className={`flex items-center gap-3 py-3 px-4 ${!last ? "border-b border-gray-100" : ""}`}
    >
      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-gray-400 font-medium leading-none mb-0.5">
          {label}
        </p>
        <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
      </div>
    </div>
  );
}

interface EditFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
}

function EditField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  readOnly,
}: EditFieldProps) {
  const fieldId = `edit-field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={fieldId}
        className="text-[11px] font-bold text-gray-500 uppercase tracking-wider"
      >
        {label}
      </label>
      <input
        id={fieldId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none
          ${
            readOnly
              ? "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-white border-gray-200 text-gray-800 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          }`}
      />
      {readOnly && (
        <p className="text-[10px] text-gray-400 -mt-0.5">Cannot be changed</p>
      )}
    </div>
  );
}

const BRANCH_OPTIONS = [
  "Computer Science & Engineering",
  "Electronics & Communication Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Information Science & Engineering",
  "Electrical & Electronics Engineering",
  "Biotechnology",
  "Chemical Engineering",
];

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile>({ ...defaultProfile });
  const [orders, setOrders] = useState<OrderHistory[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UserProfile>({ ...defaultProfile });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const fetchedProfile: UserProfile = {
              ...defaultProfile,
              ...data,
              email: data.email || user.email || defaultProfile.email,
              name: data.name || defaultProfile.name,
              semester: data.semester || data.year * 2 - 1 || defaultProfile.semester || defaultProfile.year * 2 - 1,
            };
            setProfile(fetchedProfile);
            setDraft(fetchedProfile);
          }

          // Fetch order history
          const ordersRef = collection(db, "orders");
          const q = query(ordersRef, where("userId", "==", user.uid));
          const ordersSnap = await getDocs(q);
          const fetchedOrders: OrderHistory[] = [];
          ordersSnap.forEach((docSnap) => {
            fetchedOrders.push({
              id: docSnap.id,
              ...docSnap.data(),
            } as OrderHistory);
          });
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
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function startEdit() {
    setDraft({ ...profile });
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveEdit() {
    if (!auth.currentUser) return;

    // Validate name
    if (!draft.name.trim()) {
      alert("Name cannot be empty.");
      return;
    }
    if (draft.name.trim().length < 3) {
      alert("Name must be at least 3 characters long.");
      return;
    }

    // Validate phone number
    const phoneDigits = draft.phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10 && !(phoneDigits.length === 12 && phoneDigits.startsWith("91"))) {
      alert("Please enter a valid 10-digit phone number.");
      return;
    }

    // Format phone number nicely
    let formattedPhone = draft.phone;
    if (phoneDigits.length === 10) {
      formattedPhone = `+91 ${phoneDigits.slice(0, 5)} ${phoneDigits.slice(5)}`;
    } else if (phoneDigits.length === 12 && phoneDigits.startsWith("91")) {
      formattedPhone = `+91 ${phoneDigits.slice(2, 7)} ${phoneDigits.slice(7)}`;
    }

    // Validate Gmail
    if (draft.gmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(draft.gmail)) {
        alert("Please enter a valid Gmail address.");
        return;
      }
      if (!draft.gmail.endsWith("@gmail.com")) {
        alert("Please enter a valid email address ending with @gmail.com.");
        return;
      }
    }

    const updatedProfile = {
      ...draft,
      phone: formattedPhone,
      semester: draft.semester || (draft.year * 2 - 1),
    };

    setSaving(true);
    try {
      const docRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(docRef, {
        name: updatedProfile.name,
        phone: updatedProfile.phone || "",
        gmail: updatedProfile.gmail || "",
        branch: updatedProfile.branch,
        year: updatedProfile.year,
        semester: updatedProfile.semester,
        avatar: updatedProfile.avatar || "",
      });
      setProfile(updatedProfile);
      setEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleYearChange(yr: number) {
    setDraft((prev) => ({
      ...prev,
      year: yr,
      semester: yr * 2 - 1,
    }));
  }

  function handleSemesterChange(sem: number) {
    setDraft((prev) => ({
      ...prev,
      semester: sem,
      year: Math.ceil(sem / 2),
    }));
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setProfile((prev) => ({ ...prev, avatar: base64String }));
      setDraft((prev) => ({ ...prev, avatar: base64String }));

      if (auth.currentUser) {
        try {
          const docRef = doc(db, "users", auth.currentUser.uid);
          await updateDoc(docRef, {
            avatar: base64String,
          });
        } catch (error) {
          console.error("Error saving avatar:", error);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  function updateDraft(key: keyof UserProfile, value: string | number) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      navigate({ to: "/login" });
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* ── Hero Banner ───────────────────────────────────────────────── */}
      <div
        className="relative h-36 w-full"
        style={{
          background: "linear-gradient(135deg, #2563eb 0%, #10b981 100%)",
        }}
        data-ocid="profile.hero_banner"
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/dashboard" })}
          className="absolute top-5 left-4 w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          aria-label="Go back"
          data-ocid="profile.back_button"
        >
          <ChevronRight size={18} className="rotate-180" />
        </button>
        <h1 className="absolute top-5 left-1/2 -translate-x-1/2 text-white font-bold text-base tracking-wide">
          My Profile
        </h1>
        <span className="absolute top-5 right-4 bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/30">
          Student
        </span>
      </div>

      {/* ── Avatar (overlapping banner) ───────────────────────────────── */}
      <div
        className="flex flex-col items-center -mt-12 mb-4 px-4"
        data-ocid="profile.avatar_section"
      >
        <div 
          className="relative cursor-pointer group animate-fade-in"
          onClick={() => document.getElementById("avatar-upload-input")?.click()}
        >
          <input
            id="avatar-upload-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          {profile.avatar && profile.avatar.startsWith("data:") ? (
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-24 h-24 rounded-full object-cover shadow-lg border-4 border-white"
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-extrabold text-white shadow-lg border-4 border-white"
              style={{
                background: "linear-gradient(135deg, #2563eb 0%, #10b981 100%)",
              }}
            >
              {initials}
            </div>
          )}
          <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center border border-gray-100 group-hover:scale-110 transition-transform">
            <Camera size={13} className="text-blue-500" />
          </div>
        </div>
        <h2 className="mt-3 text-xl font-extrabold text-gray-800 leading-tight text-center">
          {profile.name}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5 text-center px-4">
          {profile.branch}
        </p>
      </div>

      <div className="px-4 flex flex-col gap-4 pb-8">
        {/* ── Profile Info Card ─────────────────────────────────────────── */}
        <div
          className="bg-white rounded-2xl shadow-sm overflow-hidden"
          data-ocid="profile.info_card"
        >
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Personal Info
            </h3>
            {!editing ? (
              <button
                type="button"
                onClick={startEdit}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors"
                data-ocid="profile.edit_button"
              >
                <Pencil size={12} />
                Edit Profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors"
                  data-ocid="profile.cancel_button"
                >
                  <X size={12} />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex items-center gap-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                  data-ocid="profile.save_button"
                >
                  <Check size={12} />
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </div>

          {/* View mode */}
          {!editing && (
            <>
              <InfoRow
                icon={<Phone size={16} className="text-blue-500" />}
                label="Phone Number"
                value={profile.phone}
              />
              <InfoRow
                icon={<Mail size={16} className="text-blue-500" />}
                label="Gmail"
                value={profile.gmail ?? profile.email}
              />
              <InfoRow
                icon={<BookOpen size={16} className="text-emerald-500" />}
                label="Branch"
                value={profile.branch}
              />
              <InfoRow
                icon={<CalendarDays size={16} className="text-blue-500" />}
                label="Year / Semester"
                value={`Year ${profile.year} · Semester ${profile.semester || (profile.year * 2 - 1)}`}
                last
              />
            </>
          )}

          {/* Edit mode */}
          {editing && (
            <div
              className="px-4 pt-2 pb-5 flex flex-col gap-4"
              data-ocid="profile.edit_form"
            >
              {/* Divider */}
              <div className="h-px bg-gray-100" />

              <EditField
                label="Full Name"
                value={draft.name}
                onChange={(v) => updateDraft("name", v)}
                placeholder="e.g. Alex Kumar"
              />
              <EditField
                label="Phone Number"
                value={draft.phone}
                onChange={(v) => updateDraft("phone", v)}
                type="tel"
                placeholder="+91 XXXXX XXXXX"
              />
              <EditField
                label="Gmail"
                value={draft.gmail ?? ""}
                onChange={(v) => updateDraft("gmail", v)}
                type="email"
                placeholder="yourname@gmail.com"
              />

              {/* Branch selector */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="edit-branch"
                  className="text-[11px] font-bold text-gray-500 uppercase tracking-wider"
                >
                  Branch
                </label>
                <select
                  id="edit-branch"
                  value={draft.branch}
                  onChange={(e) => updateDraft("branch", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all appearance-none"
                  data-ocid="profile.branch_select"
                >
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year selector */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Year
                </span>
                <fieldset
                  className="flex gap-2 border-0 p-0 m-0"
                  data-ocid="profile.year_select"
                >
                  <legend className="sr-only">Select year</legend>
                  {[1, 2, 3, 4].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => handleYearChange(yr)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                        draft.year === yr
                          ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                          : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </fieldset>
              </div>

              {/* Semester selector */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Semester
                </span>
                <fieldset
                  className="grid grid-cols-4 gap-2 border-0 p-0 m-0"
                  data-ocid="profile.semester_select"
                >
                  <legend className="sr-only">Select semester</legend>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <button
                      key={sem}
                      type="button"
                      onClick={() => handleSemesterChange(sem)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        (draft.semester || (draft.year * 2 - 1)) === sem
                          ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                          : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
                      }`}
                    >
                      Sem {sem}
                    </button>
                  ))}
                </fieldset>
              </div>



              {/* Save / Cancel footer */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  data-ocid="profile.cancel_button"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    background:
                      "linear-gradient(135deg, #2563eb 0%, #10b981 100%)",
                  }}
                  data-ocid="profile.save_button"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>



        {/* ── Logout ────────────────────────────────────────────────────── */}
        <Button
          variant="ghost"
          fullWidth
          size="lg"
          leftIcon={<LogOut size={16} />}
          onClick={handleLogout}
          className="text-red-500 hover:bg-red-50 mt-2 border border-red-100"
          data-ocid="profile.logout_button"
        >
          Log Out
        </Button>

        <p className="text-center text-xs text-gray-400 pb-2">
          © 2026 Campus Connect. All Rights Reserved.
        </p>
      </div>
    </div>
  );
}
