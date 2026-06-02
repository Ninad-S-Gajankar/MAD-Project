import { useNavigate } from "@tanstack/react-router";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { ChevronLeft, Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "../components/ui/CampusBadge";
import { Card } from "../components/ui/CampusCard";
import { PageHeader } from "../components/ui/PageHeader";
import { foodItems as mockFoodItems } from "../data";
import { db } from "../lib/firebase";
import type { FoodItem } from "../types";

export default function VendorMenu() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("All");
  const [description, setDescription] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [image, setImage] = useState("");

  const categories = [
    "Burgers",
    "South Indian",
    "North Indian",
    "Rice",
    "Beverages",
    "Snacks",
    "Street Food",
    "Continental",
  ];

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "foodItems"), (snapshot) => {
      const fetchedItems: FoodItem[] = [];
      snapshot.forEach((doc) => {
        fetchedItems.push({ id: doc.id, ...doc.data() } as FoodItem);
      });
      setItems(fetchedItems);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !category) return;

    const newItemRef = doc(collection(db, "foodItems"));
    const newItem: FoodItem = {
      id: newItemRef.id,
      name,
      price: Number(price),
      category,
      description,
      prepTime: Number(prepTime) || 5,
      image: image || "/assets/images/food-placeholder.jpg",
      available: true,
    };

    try {
      await setDoc(newItemRef, newItem);
      // reset form
      setName("");
      setPrice("");
      setCategory("Burgers");
      setDescription("");
      setPrepTime("");
      setImage("");
      setShowAddForm(false);
    } catch (error) {
      console.error("Error adding item:", error);
      alert("Failed to add item.");
    }
  };

  const toggleAvailability = async (item: FoodItem) => {
    try {
      await updateDoc(doc(db, "foodItems", item.id), {
        available: !item.available,
      });
    } catch (error) {
      console.error("Error toggling availability:", error);
    }
  };

  const deleteItem = async (id: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      try {
        await deleteDoc(doc(db, "foodItems", id));
      } catch (error) {
        console.error("Error deleting item:", error);
      }
    }
  };

  const seedDatabase = async () => {
    if (
      confirm(
        "This will add all default mock items to your database. Continue?",
      )
    ) {
      try {
        for (const item of mockFoodItems) {
          await setDoc(doc(db, "foodItems", item.id), item);
        }
        alert("Mock data seeded successfully!");
      } catch (error) {
        console.error("Error seeding database:", error);
        alert("Failed to seed database.");
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-8">
      <PageHeader
        title="Manage Menu"
        back
        backTo="/vendor-dashboard"
        rightAction={
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center hover:bg-emerald-200 transition"
            data-ocid="vendor-add-item-btn"
          >
            <Plus size={18} />
          </button>
        }
      />

      <div className="px-4 py-4 flex flex-col gap-4">
        {items.length === 0 && !loading && (
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex flex-col items-start gap-2">
            <p className="text-sm text-orange-800">
              Your menu is currently empty.
            </p>
            <button
              onClick={seedDatabase}
              className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
            >
              Seed Default Menu
            </button>
          </div>
        )}

        {showAddForm && (
          <Card
            padding="md"
            className="border border-emerald-200 shadow-sm animate-slide-up"
          >
            <h3 className="font-bold text-slate-800 mb-3 text-sm">
              Add New Food Item
            </h3>
            <form onSubmit={handleAddItem} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Item Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Price (₹)"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  className="w-1/2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-1/2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              />
              <input
                type="number"
                placeholder="Prep Time in minutes (e.g. 5)"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              />
              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  Save Item
                </button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <Card key={item.id} padding="md" className="flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">
                      {item.name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {item.category} • ₹{item.price}
                    </p>
                  </div>
                  <Badge variant={item.available ? "success" : "warning"}>
                    {item.available ? "Available" : "Sold Out"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2">
                  {item.description}
                </p>
                <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => toggleAvailability(item)}
                    className="flex-1 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Mark {item.available ? "Sold Out" : "Available"}
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="w-10 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
