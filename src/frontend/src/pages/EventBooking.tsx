import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { Calendar, Check, ChevronRight, MapPin, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "../components/ui/CampusBadge";
import { Button } from "../components/ui/CampusButton";
import { Card } from "../components/ui/CampusCard";
import { PageHeader } from "../components/ui/PageHeader";
import { useUI } from "../context/UIContext";
import { auth, db } from "../lib/firebase";
import type { Event } from "../types";
import { triggerRazorpayPayment } from "../lib/paymentUtils";

// ─── Registration Form Types ──────────────────────────────────────────────────

interface RegistrationForm {
  name: string;
  gmail: string;
  whatsapp: string;
  usn: string;
  section: string;
}

interface FormErrors {
  name?: string;
  gmail?: string;
  whatsapp?: string;
  usn?: string;
  section?: string;
}

const emptyForm: RegistrationForm = {
  name: "",
  gmail: "",
  whatsapp: "",
  usn: "",
  section: "",
};

// ─── Validation ───────────────────────────────────────────────────────────────

function validateForm(form: RegistrationForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Name is required";
  if (!form.gmail.trim()) {
    errors.gmail = "Gmail is required";
  } else if (!form.gmail.toLowerCase().endsWith("@gmail.com")) {
    errors.gmail = "Must be a valid @gmail.com address";
  }
  if (!form.whatsapp.trim()) {
    errors.whatsapp = "WhatsApp number is required";
  } else if (!/^\d{10}$/.test(form.whatsapp.replace(/\s/g, ""))) {
    errors.whatsapp = "Enter a valid 10-digit number";
  }
  if (!form.usn.trim()) {
    errors.usn = "USN is required";
  } else if (
    !/^[0-9][A-Z]{2}\d{2}[A-Z]{2}\d{3}$/.test(form.usn.toUpperCase())
  ) {
    errors.usn = "Enter valid USN (e.g. 1BM22CS001)";
  }
  if (!form.section.trim()) {
    errors.section = "Section is required";
  } else if (!/^[A-Za-z]$/.test(form.section.trim())) {
    errors.section = "Enter a single section letter (A, B, C…)";
  }
  return errors;
}

// ─── Registration Modal ───────────────────────────────────────────────────────

function RegistrationModal({
  event,
  onClose,
  onSuccess,
}: {
  event: Event;
  onClose: () => void;
  onSuccess: (eventTitle: string) => void;
}) {
  const [form, setForm] = useState<RegistrationForm>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState<
    Partial<Record<keyof RegistrationForm, boolean>>
  >({});

  const set =
    (field: keyof RegistrationForm) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        if (touched[field]) {
          setErrors((prev) => ({
            ...prev,
            [field]: validateForm({ ...form, [field]: e.target.value })[field],
          }));
        }
      };

  const blur = (field: keyof RegistrationForm) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validateForm(form)[field] }));
  };

  const executeRegistration = async () => {
    setSubmitting(true);
    try {
      await addDoc(collection(db, "event_registrations"), {
        eventId: event.id,
        eventTitle: event.title,
        userId: auth.currentUser?.uid || "anonymous",
        ...form,
        registeredAt: new Date().toISOString(),
      });

      if (event.availableSeats > 0) {
        await updateDoc(doc(db, "events", event.id), {
          availableSeats: increment(-1),
        });
      }

      onSuccess(event.title);
    } catch (err) {
      console.error("Error registering for event:", err);
      alert("Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched = Object.fromEntries(
      (Object.keys(emptyForm) as (keyof RegistrationForm)[]).map((k) => [
        k,
        true,
      ]),
    );
    setTouched(allTouched);
    const newErrors = validateForm(form);
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (event.price > 0) {
      triggerRazorpayPayment({
        amount: event.price,
        description: `Registration: ${event.title}`,
        prefillName: form.name || undefined,
        prefillEmail: form.gmail || undefined,
        prefillPhone: form.whatsapp || undefined,
        onSuccess: async () => {
          await executeRegistration();
        },
      });
    } else {
      await executeRegistration();
    }
  };

  const inputClass = (field: keyof RegistrationForm) =>
    `w-full px-3 py-2.5 bg-input border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-smooth ${errors[field] && touched[field]
      ? "border-destructive focus:ring-destructive/40"
      : "border-border"
    }`;

  return (
    <div
      className="fixed inset-0 bg-foreground/40 z-50 flex items-end justify-center"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
    >
      <dialog
        open
        className="bg-card w-full max-w-[430px] rounded-t-3xl p-5 animate-slide-up m-0 border-0 bottom-0 fixed inset-x-0 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        aria-label="Event Registration"
        data-ocid="event-registration.dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold text-foreground font-display">
            Register for Event
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-muted transition-smooth"
            aria-label="Close"
            data-ocid="event-registration.close_button"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4 line-clamp-1">
          {event.title}
        </p>

        {/* Gradient divider */}
        <div className="w-full h-1 gradient-primary rounded-full mb-5" />

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="reg-name"
              className="text-xs font-semibold text-foreground"
            >
              Full Name <span className="text-destructive">*</span>
            </label>
            <input
              id="reg-name"
              type="text"
              placeholder="e.g. Nischal Kumar"
              value={form.name}
              onChange={set("name")}
              onBlur={blur("name")}
              className={inputClass("name")}
              data-ocid="event-registration.name"
              autoComplete="name"
            />
            {errors.name && touched.name && (
              <p
                className="text-[11px] text-destructive"
                data-ocid="event-registration.name.field_error"
              >
                {errors.name}
              </p>
            )}
          </div>

          {/* Gmail */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="reg-gmail"
              className="text-xs font-semibold text-foreground"
            >
              Gmail Address <span className="text-destructive">*</span>
            </label>
            <input
              id="reg-gmail"
              type="email"
              placeholder="e.g. nischal@gmail.com"
              value={form.gmail}
              onChange={set("gmail")}
              onBlur={blur("gmail")}
              className={inputClass("gmail")}
              data-ocid="event-registration.gmail"
              autoComplete="email"
            />
            {errors.gmail && touched.gmail && (
              <p
                className="text-[11px] text-destructive"
                data-ocid="event-registration.gmail.field_error"
              >
                {errors.gmail}
              </p>
            )}
          </div>

          {/* WhatsApp */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="reg-whatsapp"
              className="text-xs font-semibold text-foreground"
            >
              WhatsApp Number <span className="text-destructive">*</span>
            </label>
            <input
              id="reg-whatsapp"
              type="tel"
              placeholder="10-digit number (e.g. 9876543210)"
              value={form.whatsapp}
              onChange={set("whatsapp")}
              onBlur={blur("whatsapp")}
              className={inputClass("whatsapp")}
              data-ocid="event-registration.whatsapp"
              maxLength={10}
              autoComplete="tel"
            />
            {errors.whatsapp && touched.whatsapp && (
              <p
                className="text-[11px] text-destructive"
                data-ocid="event-registration.whatsapp.field_error"
              >
                {errors.whatsapp}
              </p>
            )}
          </div>

          {/* USN + Section row */}
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <label
                htmlFor="reg-usn"
                className="text-xs font-semibold text-foreground"
              >
                USN <span className="text-destructive">*</span>
              </label>
              <input
                id="reg-usn"
                type="text"
                placeholder="1BM22CS001"
                value={form.usn}
                onChange={(e) =>
                  set("usn")({
                    ...e,
                    target: {
                      ...e.target,
                      value: e.target.value.toUpperCase(),
                    },
                  } as React.ChangeEvent<HTMLInputElement>)
                }
                onBlur={blur("usn")}
                className={`${inputClass("usn")} font-mono tracking-wide uppercase`}
                data-ocid="event-registration.usn"
                maxLength={10}
              />
              {errors.usn && touched.usn && (
                <p
                  className="text-[11px] text-destructive"
                  data-ocid="event-registration.usn.field_error"
                >
                  {errors.usn}
                </p>
              )}
            </div>
            <div className="w-24 flex flex-col gap-1">
              <label
                htmlFor="reg-section"
                className="text-xs font-semibold text-foreground"
              >
                Section <span className="text-destructive">*</span>
              </label>
              <input
                id="reg-section"
                type="text"
                placeholder="A / B"
                value={form.section}
                onChange={(e) =>
                  set("section")({
                    ...e,
                    target: {
                      ...e.target,
                      value: e.target.value.toUpperCase(),
                    },
                  } as React.ChangeEvent<HTMLInputElement>)
                }
                onBlur={blur("section")}
                className={`${inputClass("section")} text-center uppercase`}
                data-ocid="event-registration.section"
                maxLength={1}
              />
              {errors.section && touched.section && (
                <p
                  className="text-[11px] text-destructive"
                  data-ocid="event-registration.section.field_error"
                >
                  {errors.section}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              fullWidth
              data-ocid="event-registration.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              fullWidth
              loading={submitting}
              data-ocid="event-registration.submit_button"
            >
              {submitting ? "Registering…" : "Register Now"}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({
  event,
  onBook,
  hideBookButton,
  onGenerateCertificate,
  highlighted,
}: {
  event: Event;
  onBook: (event: Event) => void;
  hideBookButton?: boolean;
  onGenerateCertificate?: (event: Event) => void;
  highlighted?: boolean;
}) {
  const spotsLow = event.availableSeats < 30;
  const emojis: Record<string, string> = {
    Technical: "💻",
    Cultural: "🎭",
    Workshop: "🛠️",
    Sports: "⚽",
  };

  return (
    <Card
      id={`product-card-${event.id}`}
      padding="none"
      hoverable
      className={`overflow-hidden transition-all duration-500
        ${highlighted ? "ring-4 ring-primary bg-primary/5 scale-[1.02] shadow-md" : ""}`}
      onClick={() => onBook(event)}
      data-ocid={`event-card-${event.id}`}
    >
      <div className="flex gap-0">
        <div className="w-20 bg-primary/10 flex flex-col items-center justify-center gap-1 shrink-0 p-3">
          <span className="text-2xl">{emojis[event.category] ?? "🎪"}</span>
          <Badge
            variant={spotsLow ? "warning" : "success"}
            className="text-[10px] px-1.5"
          >
            {spotsLow ? "Few left" : "Open"}
          </Badge>
        </div>
        <div className="flex-1 p-3 min-w-0">
          <p className="text-sm font-bold text-foreground line-clamp-1 mb-1">
            {event.title}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5">
            <Calendar size={11} />
            <span>
              {event.date} · {event.time}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5">
            <MapPin size={11} />
            <span>{event.venue}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users size={11} />
              <span>{event.availableSeats} seats left</span>
            </div>
            {hideBookButton ? (
              <div className="flex items-center gap-2">
                <Badge variant="success" className="text-[10px]">
                  Registered
                </Badge>
                {onGenerateCertificate &&
                  (event.releaseCertificates ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onGenerateCertificate(event);
                      }}
                      className="text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-0.5 rounded-lg shadow-sm transition-all flex items-center gap-1 animate-pulse-soft"
                      data-ocid={`event-cert-btn-${event.id}`}
                    >
                      🎓 Cert
                    </button>
                  ) : (
                    <span
                      className="text-[10px] text-amber-700 font-semibold px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-100 italic"
                      title="Awaiting coordinator permission to release certificates"
                    >
                      Cert pending release
                    </span>
                  ))}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                {event.price === 0 ? "Free" : `₹${event.price}`}
                <ChevronRight size={13} />
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

// ─── Certificate Modal Component ─────────────────────────────────────────────
function CertificateModal({
  event,
  onClose,
}: { event: Event; onClose: () => void }) {
  const [studentName, setStudentName] = useState("Student User");

  useEffect(() => {
    if (auth.currentUser) {
      getDoc(doc(db, "users", auth.currentUser.uid)).then((docSnap) => {
        if (docSnap.exists() && docSnap.data().name) {
          setStudentName(docSnap.data().name);
        }
      });
    }
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
    >
      <div
        className="bg-[#fcf8f2] border-[12px] border-amber-800 rounded-3xl shadow-2xl p-6 max-w-xl w-full text-center relative overflow-hidden animate-scale-up border-double"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        aria-label="Certificate Modal"
        style={{ fontFamily: "serif" }}
      >
        <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
          <svg
            width="220"
            height="220"
            viewBox="0 0 100 100"
            fill="currentColor"
            className="text-amber-800"
          >
            <path d="M50 0 C22.4 0 0 22.4 0 50 C0 77.6 22.4 100 50 100 C77.6 100 100 77.6 100 50 C100 22.4 77.6 0 50 0 Z" />
          </svg>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-amber-900 hover:text-amber-950 p-1 rounded-full hover:bg-amber-100 transition-colors z-10 print:hidden"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <p className="text-[10px] text-amber-700 font-bold uppercase tracking-[0.35em] mb-1">
          BMSCE Campus Connect
        </p>
        <h2 className="text-xl font-extrabold text-amber-900 mb-5 tracking-wide border-b border-amber-200 pb-2">
          Certificate of Participation
        </h2>

        <p className="text-xs text-amber-800 italic font-body mb-3">
          This is proudly presented to
        </p>
        <p className="text-xl font-bold text-amber-950 underline decoration-amber-600 decoration-wavy underline-offset-8 my-4 italic">
          {studentName}
        </p>
        <p className="text-xs text-amber-800 font-body leading-relaxed max-w-md mx-auto my-3">
          for actively participating and successfully completing the university
          event
        </p>
        <p className="text-sm font-bold text-amber-950 my-2 font-serif">
          {event.title}
        </p>
        <p className="text-xs text-amber-700 font-body mt-2">
          held at the <span className="font-semibold">{event.venue}</span> on{" "}
          <span className="font-semibold">{event.date}</span>.
        </p>

        <div className="flex justify-between items-end mt-10 px-6">
          <div className="flex flex-col items-center">
            <span className="font-serif italic text-amber-800 text-[12px] border-b border-amber-400 px-6 pb-1">
              BMSCE Coordinator
            </span>
            <span className="text-[8px] text-amber-600 uppercase tracking-widest mt-1">
              Authorized Sign
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-serif italic text-amber-800 text-[12px] border-b border-amber-400 px-6 pb-1">
              Campus Services
            </span>
            <span className="text-[8px] text-amber-600 uppercase tracking-widest mt-1">
              Verified Partner
            </span>
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-3 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5"
          >
            🖨️ Print Certificate
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-amber-800 text-amber-800 font-bold text-xs hover:bg-amber-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EventBooking() {
  const { setHideBottomNav } = useUI();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedCertEvent, setSelectedCertEvent] = useState<Event | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Top tabs state
  const [activeTab, setActiveTab] = useState<"all" | "history" | "discussion">(
    "all",
  );
  const [myRegistrations, setMyRegistrations] = useState<any[]>([]);

  // Discussions State
  const [selectedDiscussionEventId, setSelectedDiscussionEventId] =
    useState<string>("");
  const [discussionMessages, setDiscussionMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const q = collection(db, "event_registrations");
        const unsubRegs = onSnapshot(q, (snapshot) => {
          const regs = snapshot.docs
            .map((doc) => doc.data())
            .filter((d) => d.userId === user.uid);
          setMyRegistrations(regs);
        });
        return () => unsubRegs();
      }
    });

    const eventsRef = collection(db, "events");
    const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
      const fetchedEvents: Event[] = [];
      snapshot.forEach((docSnap) => {
        fetchedEvents.push({ id: docSnap.id, ...docSnap.data() } as Event);
      });
      setEvents(fetchedEvents);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchVal = params.get("search");
    if (searchVal && events.length > 0) {
      const match = events.find(
        (e) => e.title.toLowerCase() === searchVal.toLowerCase()
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
  }, [events]);

  // Listen to discussion comments in real-time
  useEffect(() => {
    if (!selectedDiscussionEventId) {
      setDiscussionMessages([]);
      return;
    }
    const q = query(
      collection(db, "event_discussions"),
      where("eventId", "==", selectedDiscussionEventId),
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: any[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      // Sort ascending by createdAt
      msgs.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      setDiscussionMessages(msgs);
    });
    return () => unsub();
  }, [selectedDiscussionEventId]);

  // Sync bottom nav visibility with modal open state
  useEffect(() => {
    setHideBottomNav(selectedEvent !== null || selectedCertEvent !== null);
  }, [selectedEvent, selectedCertEvent, setHideBottomNav]);

  // Reset on unmount
  useEffect(() => {
    return () => setHideBottomNav(false);
  }, [setHideBottomNav]);

  const handleSuccess = (eventTitle: string) => {
    setSelectedEvent(null);
    setSuccessMessage(
      `Registration successful! You have registered for "${eventTitle}"`,
    );
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedDiscussionEventId || !auth.currentUser)
      return;

    setSendingMsg(true);
    try {
      let userName = "Student User";
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists() && userDoc.data().name) {
        userName = userDoc.data().name;
      }

      await addDoc(collection(db, "event_discussions"), {
        eventId: selectedDiscussionEventId,
        userId: auth.currentUser.uid,
        userName,
        message: newMessage.trim(),
        createdAt: new Date().toISOString(),
      });
      setNewMessage("");
    } catch (err) {
      console.error("Error posting discussion message:", err);
    } finally {
      setSendingMsg(false);
    }
  };

  const registeredEventIds = new Set(myRegistrations.map((r) => r.eventId));
  const displayedEvents =
    activeTab === "all"
      ? events
      : events.filter((e) => registeredEventIds.has(e.id));

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <PageHeader title="Event Booking" back backTo="/dashboard" />

      <div className="px-4 pt-4">
        <div className="flex p-1 bg-gray-200/50 rounded-xl mb-4">
          <button
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === "all"
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500"
              }`}
            onClick={() => setActiveTab("all")}
          >
            All Events
          </button>
          <button
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === "history"
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500"
              }`}
            onClick={() => setActiveTab("history")}
          >
            My Bookings
          </button>
          <button
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === "discussion"
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500"
              }`}
            onClick={() => setActiveTab("discussion")}
          >
            Discussions
          </button>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-3 pb-8 flex-1">
        {activeTab !== "discussion" ? (
          <>
            {successMessage && (
              <div
                className="flex items-start gap-2 p-4 bg-accent/10 rounded-2xl border border-accent/20 animate-slide-up"
                data-ocid="event-booking.success_state"
              >
                <Check size={18} className="text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Registration Confirmed!
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {successMessage}
                  </p>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Loading events...
              </div>
            ) : displayedEvents.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground bg-white rounded-2xl border border-dashed border-gray-200">
                {activeTab === "all"
                  ? "No events found."
                  : "You haven't booked any events yet."}
              </div>
            ) : (
              displayedEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onBook={
                    activeTab === "all" && !registeredEventIds.has(event.id)
                      ? setSelectedEvent
                      : () => { }
                  }
                  hideBookButton={
                    activeTab === "history" || registeredEventIds.has(event.id)
                  }
                  onGenerateCertificate={setSelectedCertEvent}
                  highlighted={highlightedId === event.id}
                />
              ))
            )}
          </>
        ) : (
          <div className="flex flex-col flex-1 animate-slide-up pb-6">
            {/* Event Dropdown Selector */}
            <div className="flex flex-col gap-1 mb-4">
              <label
                htmlFor="discussion-event-select"
                className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5"
              >
                Select Event Discussion
              </label>
              <select
                id="discussion-event-select"
                value={selectedDiscussionEventId}
                onChange={(e) => setSelectedDiscussionEventId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-smooth"
              >
                <option value="">-- Choose an Event --</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedDiscussionEventId ? (
              <div className="flex flex-col flex-1 gap-3">
                {/* Message Log */}
                <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-4 flex flex-col gap-3 h-[45vh] overflow-y-auto">
                  {discussionMessages.length === 0 ? (
                    <div className="my-auto text-center flex flex-col items-center gap-2">
                      <p className="text-4xl">💬</p>
                      <p className="text-sm font-bold text-gray-800">
                        Start the conversation!
                      </p>
                      <p className="text-xs text-gray-400">
                        Be the first to post a message in this discussion.
                      </p>
                    </div>
                  ) : (
                    discussionMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[80%] ${msg.userId === auth.currentUser?.uid ? "ml-auto items-end" : "mr-auto items-start"}`}
                      >
                        <span className="text-[9px] text-gray-400 font-bold mb-0.5 px-1">
                          {msg.userName}
                        </span>
                        <div
                          className={`px-3.5 py-2 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${msg.userId === auth.currentUser?.uid
                              ? "bg-primary text-white rounded-tr-none"
                              : "bg-gray-100 text-gray-800 rounded-tl-none"
                            }`}
                        >
                          {msg.message}
                        </div>
                        <span className="text-[8px] text-gray-400 mt-0.5 px-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Input box */}
                <form onSubmit={handlePostMessage} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask a question or discuss event…"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white font-medium"
                    required
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="px-4 py-2.5 h-auto text-xs"
                    loading={sendingMsg}
                  >
                    Send
                  </Button>
                </form>
              </div>
            ) : (
              <div className="text-center py-10 bg-white rounded-2xl border border-dashed flex flex-col items-center gap-2 my-auto">
                <p className="text-4xl">🏛️</p>
                <p className="text-sm font-semibold text-gray-500">
                  No event selected
                </p>
                <p className="text-xs text-gray-400">
                  Choose an event from the list above to view its discussions
                  board.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedEvent && (
        <RegistrationModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSuccess={handleSuccess}
        />
      )}

      {selectedCertEvent && (
        <CertificateModal
          event={selectedCertEvent}
          onClose={() => setSelectedCertEvent(null)}
        />
      )}
    </div>
  );
}
