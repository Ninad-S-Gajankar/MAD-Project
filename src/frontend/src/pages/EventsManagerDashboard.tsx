import { useNavigate } from "@tanstack/react-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { Edit2, Plus, Trash2, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/CampusButton";
import { Card } from "../components/ui/CampusCard";
import { PageHeader } from "../components/ui/PageHeader";
import { auth, db } from "../lib/firebase";

export default function EventsManagerDashboard() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [totalSeats, setTotalSeats] = useState("");
  const [category, setCategory] = useState("Technical");
  const [price, setPrice] = useState("");

  // Registrations State
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate({ to: "/login" });
        return;
      }

      const eventsRef = collection(db, "events");
      const unsubscribeSnap = onSnapshot(eventsRef, (snapshot) => {
        const fetchedEvents: any[] = [];
        snapshot.forEach((docSnap) => {
          fetchedEvents.push({ id: docSnap.id, ...docSnap.data() });
        });
        setEvents(fetchedEvents);
        setLoading(false);
      });

      return () => unsubscribeSnap();
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate({ to: "/login" });
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDate("");
    setTime("");
    setVenue("");
    setTotalSeats("");
    setPrice("");
    setCategory("Technical");
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleEditClick = (event: any) => {
    setTitle(event.title);
    setDescription(event.description);
    setDate(event.date);
    setTime(event.time);
    setVenue(event.venue);
    setTotalSeats(event.totalSeats.toString());
    setPrice(event.price.toString());
    setCategory(event.category);
    setEditingId(event.id);
    setShowAddForm(true);
  };

  const handleAddOrUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title,
        description,
        date,
        time,
        venue,
        totalSeats: Number.parseInt(totalSeats) || 0,
        availableSeats: Number.parseInt(totalSeats) || 0, // This resets availableSeats if editing
        category,
        price: Number.parseInt(price) || 0,
        image: "/assets/images/event-placeholder.jpg",
      };

      if (editingId) {
        await updateDoc(doc(db, "events", editingId), payload);
      } else {
        await addDoc(collection(db, "events"), {
          ...payload,
          createdAt: new Date().toISOString(),
        });
      }
      resetForm();
    } catch (err) {
      console.error("Error saving event:", err);
      alert("Failed to save event");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      try {
        await deleteDoc(doc(db, "events", id));
      } catch (err) {
        console.error("Error deleting event:", err);
        alert("Failed to delete event");
      }
    }
  };

  const handleToggleCertificates = async (
    eventId: string,
    release: boolean,
  ) => {
    try {
      await updateDoc(doc(db, "events", eventId), {
        releaseCertificates: release,
      });

      if (release) {
        const eventObj = events.find((e) => e.id === eventId);
        const q = query(
          collection(db, "event_registrations"),
          where("eventId", "==", eventId),
        );
        const regsSnap = await getDocs(q);
        regsSnap.forEach(async (regDoc) => {
          const regData = regDoc.data();
          if (regData.userId) {
            await addDoc(collection(db, "notifications"), {
              userId: regData.userId,
              type: "event",
              title: "Certificate Released! 🎓",
              message: `Your participation certificate for "${eventObj?.title || "the event"}" is now available to download.`,
              timestamp: new Date().toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              }),
              read: false,
              createdAt: new Date().toISOString(),
            });
          }
        });
        alert(
          "Certificates released and notifications sent to students successfully!",
        );
      } else {
        alert("Certificates revoked successfully!");
      }
    } catch (err) {
      console.error("Error updating certificate status:", err);
      alert("Failed to update certificate status");
    }
  };

  const handleViewRegistrations = async (eventId: string) => {
    setSelectedEventId(eventId);
    setLoadingRegs(true);
    try {
      const q = query(
        collection(db, "event_registrations"),
        where("eventId", "==", eventId),
      );
      const snapshot = await getDocs(q);
      const regs: any[] = [];
      snapshot.forEach((docSnap) =>
        regs.push({ id: docSnap.id, ...docSnap.data() }),
      );
      setRegistrations(regs);
    } catch (err) {
      console.error("Error fetching registrations:", err);
      alert("Failed to fetch registrations");
    } finally {
      setLoadingRegs(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20">
      <PageHeader
        title="Events Manager"
        rightAction={
          <button
            onClick={handleLogout}
            className="text-xs font-semibold text-red-500 hover:underline"
          >
            Logout
          </button>
        }
      />

      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Upcoming Events</h2>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
          >
            <Plus size={16} className="mr-1" />
            Add Event
          </Button>
        </div>

        {showAddForm && (
          <Card padding="md" className="mb-6 animate-slide-down">
            <h3 className="text-sm font-bold mb-3">
              {editingId ? "Edit Event" : "Add New Event"}
            </h3>
            <form
              onSubmit={handleAddOrUpdateEvent}
              className="flex flex-col gap-3"
            >
              <input
                type="text"
                placeholder="Event Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                rows={2}
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="flex-1 px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="flex-1 px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <input
                type="text"
                placeholder="Venue"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Total Seats"
                  value={totalSeats}
                  onChange={(e) => setTotalSeats(e.target.value)}
                  required
                  className="flex-1 px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="number"
                  placeholder="Price (₹)"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  className="flex-1 px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Technical">Technical</option>
                <option value="Cultural">Cultural</option>
                <option value="Workshop">Workshop</option>
                <option value="Sports">Sports</option>
              </select>
              <div className="flex justify-end gap-2 mt-2">
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingId ? "Update Event" : "Save Event"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        <div className="flex flex-col gap-3">
          {events.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No events found. Add one above.
            </p>
          ) : (
            events.map((event) => (
              <Card key={event.id} padding="md">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-foreground">{event.title}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditClick(event)}
                      className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-md transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {event.description}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-foreground font-medium mb-3">
                  <span>📅 {event.date}</span>
                  <span>⏰ {event.time}</span>
                  <span>📍 {event.venue}</span>
                  <span>🎫 ₹{event.price}</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="text-xs">
                    <span className="font-bold text-primary">
                      {event.totalSeats - event.availableSeats}
                    </span>{" "}
                    booked / {event.totalSeats} total
                  </div>
                  <div className="flex gap-2">
                    {event.releaseCertificates ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs py-1 h-auto text-red-600 border-red-200 bg-red-50 hover:bg-red-100"
                        onClick={() =>
                          handleToggleCertificates(event.id, false)
                        }
                      >
                        🔒 Revoke Certs
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs py-1 h-auto text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                        onClick={() => handleToggleCertificates(event.id, true)}
                      >
                        🎓 Release Certs
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs py-1 h-auto"
                      onClick={() => handleViewRegistrations(event.id)}
                    >
                      <Users size={12} className="mr-1" /> View Regs
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Registrations Modal */}
      {selectedEventId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col animate-slide-up overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold">Registered Students</h3>
              <button
                onClick={() => setSelectedEventId(null)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {loadingRegs ? (
                <div className="text-center py-4 text-sm text-gray-500">
                  Loading...
                </div>
              ) : registrations.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500 bg-gray-50 rounded-xl">
                  No students registered yet.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {registrations.map((reg) => (
                    <div key={reg.id} className="p-3 border rounded-xl text-sm">
                      <div className="font-bold mb-1">
                        {reg.name}{" "}
                        <span className="text-gray-500 font-normal text-xs ml-1">
                          ({reg.usn} - Sec {reg.section})
                        </span>
                      </div>
                      <div className="text-gray-600 text-xs flex flex-col gap-0.5">
                        <span>📧 {reg.gmail}</span>
                        <span>📱 {reg.whatsapp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
