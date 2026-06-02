import { addDoc, collection } from "firebase/firestore";
import { BookOpen, ChevronLeft, FileText, Printer, Upload, X } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { Badge } from "../components/ui/CampusBadge";
import { Button } from "../components/ui/CampusButton";
import { Card } from "../components/ui/CampusCard";
import { PageHeader } from "../components/ui/PageHeader";
import { auth, db } from "../lib/firebase";
import { generate10DigitId } from "../lib/utils";
import { triggerRazorpayPayment } from "../lib/paymentUtils";
import Stationery from "./Stationery";

type BookMartView = "landing" | "xerox" | "stationery";
type ColorMode = "color" | "bw";
type BindingMode = "none" | "spiral" | "staple";

const COLOR_PRICE = 5;
const BW_PRICE = 1;
const BINDING_PRICES: Record<BindingMode, number> = {
  none: 0,
  spiral: 30,
  staple: 10,
};

function XeroxView({ onBack }: { onBack: () => void }) {
  const [fileName, setFileName] = useState("");
  const [pages, setPages] = useState(1);
  const [copies, setCopies] = useState(1);
  const [colorMode, setColorMode] = useState<ColorMode>("bw");
  const [binding, setBinding] = useState<BindingMode>("none");
  const [ordered, setOrdered] = useState(false);

  // File Upload states
  const [fileData, setFileData] = useState<string>("");
  const [fileType, setFileType] = useState<string>("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCancelFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileName("");
    setFileData("");
    setFileType("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert(
        "File size must be under 4 MB.",
      );
      return;
    }

    setUploadingFile(true);
    setFileName(file.name);
    setFileType(file.type);

    const reader = new FileReader();
    reader.onload = () => {
      setFileData(reader.result as string);
      setUploadingFile(false);
    };
    reader.onerror = () => {
      alert("Failed to read file.");
      setUploadingFile(false);
    };
    reader.readAsDataURL(file);
  };

  const pricePerPage = colorMode === "color" ? COLOR_PRICE : BW_PRICE;
  const printCost = pages * copies * pricePerPage;
  const bindingCost = BINDING_PRICES[binding] * copies;
  const total = printCost + bindingCost;

  const handleOrder = async () => {
    if (!auth.currentUser) {
      alert("Please login to place a print order");
      return;
    }

    if (!fileName || !fileData) {
      alert("Please select a document to print first.");
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
        console.error("Error fetching user name for print order:", err);
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
        items: [
          {
            name: `Print: ${fileName} (${pages} pages, ${colorMode === "color" ? "Color" : "B&W"}, binding: ${binding})`,
            quantity: copies,
            price: total / copies,
          },
        ],
        total: total,
        status: "pending",
        orderType: "book_mart",
        orderNumber: orderNumber,
        createdAt: new Date().toISOString(),
        fileData: fileData,
        fileName: fileName,
        fileType: fileType,
      };

      await addDoc(collection(db, "orders"), orderData);
      setOrdered(true);
      setFileName("");
      setFileData("");
      setFileType("");
      setTimeout(() => setOrdered(false), 4000);
    } catch (error) {
      console.error("Error placing print order:", error);
      alert("Failed to place print order. Please try again.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sub-header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
        <button
          type="button"
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-smooth"
          aria-label="Back to Book Mart"
          data-ocid="xerox.back_button"
        >
          <ChevronLeft size={20} className="text-foreground" />
        </button>
        <div>
          <h1 className="text-base font-bold text-foreground leading-tight">
            Xerox & Printing
          </h1>
          <p className="text-xs text-muted-foreground">
            Upload, configure & order prints
          </p>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4 pb-8">
        {/* File upload */}
        <Card padding="lg">
          <h2 className="text-sm font-bold text-foreground mb-3">
            Upload Document
          </h2>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.docx,.jpg,.jpeg,.png,.doc"
            className="hidden"
          />
          {uploadingFile ? (
            <div className="w-full border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : fileName ? (
            <div className="w-full border-2 border-dashed border-primary bg-primary/5 rounded-xl p-6 flex flex-col items-center justify-center gap-2 relative">
              <button
                type="button"
                onClick={handleCancelFile}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-smooth text-muted-foreground hover:text-foreground"
                aria-label="Remove uploaded document"
                data-ocid="xerox.remove_file_button"
              >
                <X size={14} />
              </button>
              <FileText size={28} className="text-primary animate-pulse" />
              <p className="text-sm font-semibold text-foreground text-center break-all px-6">
                {fileName}
              </p>
              <Badge variant="success">Ready to print</Badge>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 hover:border-primary hover:bg-primary/5 transition-smooth"
              data-ocid="xerox.file_upload_button"
            >
              <Upload size={28} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Tap to select file from device
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, DOCX, Images · Under 4 MB
              </p>
            </button>
          )}
        </Card>

        {/* Print options */}
        <Card padding="lg">
          <h2 className="text-sm font-bold text-foreground mb-4">
            Print Options
          </h2>

          <div className="flex gap-3 mb-4">
            {(
              [
                { label: "Copies", value: copies, set: setCopies },
                { label: "Pages", value: pages, set: setPages },
              ] as { label: string; value: number; set: (v: number) => void }[]
            ).map(({ label, value, set }) => (
              <div key={label} className="flex-1">
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                  {label}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => set(Math.max(1, value - 1))}
                    className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold hover:bg-border transition-smooth"
                    data-ocid={`xerox.${label.toLowerCase()}_decrease`}
                  >
                    −
                  </button>
                  <span className="text-sm font-bold text-foreground w-6 text-center">
                    {value}
                  </span>
                  <button
                    type="button"
                    onClick={() => set(value + 1)}
                    className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold hover:bg-primary/90 transition-smooth"
                    data-ocid={`xerox.${label.toLowerCase()}_increase`}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Print Mode
            </p>
            <div className="flex gap-2">
              {(["bw", "color"] as ColorMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setColorMode(m)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-smooth ${
                    colorMode === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/50"
                  }`}
                  data-ocid={`xerox.color_mode_${m}`}
                >
                  {m === "bw" ? "B&W · ₹1/pg" : "Color · ₹5/pg"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Binding
            </p>
            <div className="flex gap-2">
              {(
                [
                  ["none", "None"],
                  ["staple", "soft bind+₹10"],
                  ["spiral", "spiral bind+₹30"],
                ] as [BindingMode, string][]
              ).map(([b, label]) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBinding(b)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-smooth ${
                    binding === b
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/50"
                  }`}
                  data-ocid={`xerox.binding_${b}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Price summary */}
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Printer size={16} className="text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              Price Estimate
            </h2>
          </div>
          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {pages} pages × {copies} copies × ₹{pricePerPage}
              </span>
              <span className="font-semibold">₹{printCost}</span>
            </div>
            {binding !== "none" && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Binding ({binding})
                </span>
                <span className="font-semibold">₹{bindingCost}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-border font-bold text-base mt-1">
              <span>Total</span>
              <span className="text-primary">₹{total}</span>
            </div>
          </div>
        </Card>

        {ordered ? (
          <div className="flex items-center gap-2 p-4 bg-accent/10 rounded-2xl border border-accent/20 animate-slide-up">
            <span className="text-xl">✅</span>
            <div>
              <p className="text-sm font-bold text-foreground">Order placed!</p>
              <p className="text-xs text-muted-foreground">
                Collect from Counter 1 in ~20 min
              </p>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => {
              if (!auth.currentUser) {
                alert("Please login to place a print order");
                return;
              }
              if (!fileName || !fileData) {
                alert("Please select a document to print first.");
                return;
              }
              triggerRazorpayPayment({
                amount: total,
                description: "Print Order",
                prefillName: auth.currentUser.displayName || undefined,
                prefillEmail: auth.currentUser.email || undefined,
                prefillPhone: auth.currentUser.phoneNumber || undefined,
                onSuccess: async () => {
                  await handleOrder();
                },
              });
            }}
            fullWidth
            size="lg"
            data-ocid="xerox.place_order_button"
          >
            Place Print Order · ₹{total}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Landing Screen ──────────────────────────────────────────────────────────

export default function BookMart() {
  const [view, setView] = useState<BookMartView>("landing");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchVal = params.get("search");
    if (searchVal) {
      setView("stationery");
    }
  }, []);

  if (view === "xerox") return <XeroxView onBack={() => setView("landing")} />;
  if (view === "stationery")
    return <Stationery onBack={() => setView("landing")} />;

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Campus Book Mart" back backTo="/dashboard" />

      <div className="px-4 pt-3 pb-2">
        <p className="text-sm text-muted-foreground">
          Printing, xerox, and stationery — all in one place
        </p>
      </div>

      {/* Option cards */}
      <div className="px-4 pt-2 pb-4 flex flex-col gap-3">
        {/* Xerox & Printing card */}
        <button
          type="button"
          onClick={() => setView("xerox")}
          className="w-full text-left rounded-2xl border-2 border-green-200 bg-green-50 p-4 hover:border-green-400 hover:shadow-md transition-smooth active:scale-[0.98]"
          data-ocid="bookmart.xerox_card"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Printer size={24} className="text-green-600" />
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-600 text-white">
              B&W from ₹1.5/page
            </span>
          </div>
          <h2 className="text-base font-bold text-foreground mb-1">
            Xerox & Printing
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Upload documents and get them printed at the campus store
          </p>
          <div className="flex flex-wrap gap-1.5">
            {["B&W ₹1.5/page", "Color ₹5/page", "Spiral & Tape Binding"].map(
              (tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium border border-green-200"
                >
                  {tag}
                </span>
              ),
            )}
          </div>
        </button>

        {/* Stationery Items card */}
        <button
          type="button"
          onClick={() => setView("stationery")}
          className="w-full text-left rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 hover:border-blue-400 hover:shadow-md transition-smooth active:scale-[0.98]"
          data-ocid="bookmart.stationery_card"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <BookOpen size={24} className="text-blue-600" />
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-600 text-white">
              14+ products
            </span>
          </div>
          <h2 className="text-base font-bold text-foreground mb-1">
            Stationery Items
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Notebooks, pens, folders, and more — ready for quick pickup
          </p>
          <div className="flex flex-wrap gap-1.5">
            {["Notebooks & Pens", "Folders & Files", "Quick Pickup"].map(
              (tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium border border-blue-200"
                >
                  {tag}
                </span>
              ),
            )}
          </div>
        </button>
      </div>

      {/* Tagline */}
      <div className="mx-4 px-4 py-3 rounded-xl bg-muted/60 border border-border flex items-center gap-2">
        <span className="text-base">🕐</span>
        <p className="text-xs text-muted-foreground leading-snug">
          Orders ready within{" "}
          <span className="font-semibold text-foreground">15–30 minutes</span> ·
          Pickup at{" "}
          <span className="font-semibold text-foreground">the campus book mart</span>
        </p>
      </div>
    </div>
  );
}
