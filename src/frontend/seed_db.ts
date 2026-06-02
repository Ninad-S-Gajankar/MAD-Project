import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { foodItems, stationeryItems, events } from "./src/data/index.ts";
import dotenv from "dotenv";

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const seed = async () => {
  console.log("Starting database seeding directly to Firestore...");
  
  // Seed food items
  for (const item of foodItems) {
    await setDoc(doc(db, "foodItems", item.id), item);
    console.log(`Seeded food item: ${item.name}`);
  }

  // Seed stationery items
  for (const item of stationeryItems) {
    await setDoc(doc(db, "stationeryItems", item.id), item);
    console.log(`Seeded stationery item: ${item.name}`);
  }

  // Seed events
  for (const item of events) {
    await setDoc(doc(db, "events", item.id), item);
    console.log(`Seeded event: ${item.title}`);
  }

  console.log("Direct database seeding completed successfully!");
  process.exit(0);
};

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
