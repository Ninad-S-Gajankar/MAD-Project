import { Bot, Send, Sparkles, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_CONTEXT = `You are Campus Connect AI — a friendly, helpful campus assistant for students at this university.
You help students with:
- Food Court (Vidhyarthi Khana): menu items, ordering food, queue status, food availability
- Book Mart: printing, binding, stationery items, buying/ordering books & supplies
- Event Booking: registering for campus events, event details, schedules
- Queue Status: checking current queue positions for food court
- Profile & Notifications: account management, staying updated
- General campus life questions: navigating campus, academic advice, student resources

Be concise, warm, and helpful. Use emojis occasionally to be friendly.
If asked about something unrelated to campus or student life, politely redirect to campus topics.
Keep responses brief (2-4 sentences max) unless a detailed explanation is needed.`;

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  "What's on the menu?",
  "Register for events?",
  "Queue status?",
  "Book Mart help?",
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
        <Bot size={14} className="text-white" />
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary/60"
              style={{
                animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`flex items-end gap-2 mb-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
          <Bot size={14} className="text-white" />
        </div>
      )}
      <div
        className={`max-w-[78%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl rounded-br-sm"
            : "bg-card border border-border text-foreground rounded-2xl rounded-bl-sm"
        }`}
      >
        {msg.text}
      </div>
    </motion.div>
  );
}

function getLocalFallbackResponse(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("menu") || q.includes("food") || q.includes("khana") || q.includes("eat") || q.includes("lunch") || q.includes("dinner") || q.includes("breakfast") || q.includes("roti") || q.includes("rice")) {
    return "Our Food Court (Vidhyarthi Khana) offers delicious meals like Masala Dosa, Veg Biryani, and Paneer Butter Masala! You can browse the full menu and place orders in the Food Court tab. 🍽️";
  }
  if (q.includes("event") || q.includes("register") || q.includes("booking") || q.includes("hackathon") || q.includes("workshop") || q.includes("fest")) {
    return "You can view upcoming workshops, fests, and hackathons in the Event Booking tab. Registrations are simple and instant! 📅";
  }
  if (q.includes("queue") || q.includes("status") || q.includes("line") || q.includes("wait") || q.includes("order")) {
    return "Check the Queue Status tab to track your pending orders and see your exact position in the food queue. ⏱️";
  }
  if (q.includes("book") || q.includes("mart") || q.includes("print") || q.includes("binding") || q.includes("stationery") || q.includes("notebook") || q.includes("pen") || q.includes("pencil")) {
    return "The Book Mart has notebooks, pens, and exam preparation guides. You can also upload PDF files for printing and binding directly through the app! 📚";
  }
  if (q.includes("profile") || q.includes("account") || q.includes("name") || q.includes("edit") || q.includes("settings")) {
    return "You can manage your name, contact details, and view your order history directly in the Profile tab. 👤";
  }
  if (q.includes("notification") || q.includes("alert") || q.includes("message")) {
    return "Check the Notifications tab to see updates about your orders, event schedules, and important campus announcements. 🔔";
  }
  if (q.includes("hi") || q.includes("hello") || q.includes("hey") || q.includes("yo")) {
    return "Hello! 👋 I am your Campus Connect assistant. Ask me anything about the Food Court, Book Mart, Event registrations, or check your queue status!";
  }
  if (q.includes("thank") || q.includes("thanks") || q.includes("awesome") || q.includes("great")) {
    return "You're welcome! Glad I could help. Let me know if you need anything else! 😊";
  }
  if (q.includes("help") || q.includes("what can you")) {
    return "I can help you browse the food court menu, order stationery/printing from the book mart, book event tickets, or view order queue positions. What do you need help with? 🤖";
  }
  return "That's a good question! I suggest looking at the respective Food Court, Book Mart, or Event Booking tabs for the most accurate details. Let me know if you have other campus-related questions! 🎓";
}

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi there! 👋 I'm your Campus Connect AI. I can help with Food Court, Book Mart, Events, and more. What do you need?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatHistory = useRef<{ role: string; parts: { text: string }[] }[]>([]);

  useEffect(() => {
    if (open) {
      setUnread(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 320);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      const last = messages[messages.length - 1];
      if (last?.role === "assistant" && messages.length > 1) {
        setUnread(true);
      }
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: text.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    chatHistory.current.push({ role: "user", parts: [{ text: text.trim() }] });

    try {
      if (!GEMINI_API_KEY) throw new Error("NO_KEY");

      const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_CONTEXT }] },
          contents: chatHistory.current,
          generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        const detail =
          (errBody as { error?: { message?: string } })?.error?.message ?? "";
        throw new Error(`HTTP_${response.status}:${detail}`);
      }

      const data = await response.json();
      const replyText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn't process that. Please try again!";

      chatHistory.current.push({ role: "model", parts: [{ text: replyText }] });

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: replyText,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      chatHistory.current.pop();
      const replyText = getLocalFallbackResponse(text);
      chatHistory.current.push({ role: "model", parts: [{ text: replyText }] });

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: replyText,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    chatHistory.current = [];
    setMessages([
      {
        id: "reset",
        role: "assistant",
        text: "Chat cleared! 🧹 How can I help you today?",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes fabPulse {
          0%, 100% { box-shadow: 0 0 0 0 oklch(0.42 0.13 198 / 0.5); }
          50% { box-shadow: 0 0 0 8px oklch(0.42 0.13 198 / 0); }
        }
      `}</style>

      {/* ── Floating Action Button ── sits just above bottom nav on the RIGHT */}
      <div
        className="fixed z-[100]"
        style={{
          bottom: "84px",
          right: "max(12px, calc(50vw - 215px + 12px))",
        }}
        data-ocid="chatbot-fab-wrapper"
      >
        <motion.button
          type="button"
          onClick={() => setOpen((v) => !v)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          className="relative w-14 h-14 rounded-2xl text-white flex items-center justify-center shadow-elevated overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.42 0.13 198), oklch(0.54 0.15 155))",
            animation: !open ? "fabPulse 2.5s ease-in-out infinite" : "none",
          }}
          aria-label="Open Campus AI Chat"
          data-ocid="chatbot-fab-btn"
        >
          {/* Gloss overlay */}
          <span className="absolute inset-0 bg-white/10 rounded-2xl pointer-events-none" />

          {/* Unread dot */}
          <AnimatePresence>
            {unread && !open && (
              <motion.span
                key="dot"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-1 right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white z-10"
              />
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {open ? (
              <motion.div
                key="x"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <X size={22} strokeWidth={2.5} />
              </motion.div>
            ) : (
              <motion.div
                key="spark"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <Sparkles size={22} strokeWidth={2} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Label tag below FAB */}
        <AnimatePresence>
          {!open && (
            <motion.p
              key="label"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-center text-[9px] font-semibold text-muted-foreground mt-1 tracking-wide"
            >
              AI Chat
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── Chat Panel ── slides up from FAB position */}
      <AnimatePresence>
        {open && (
          <>
            {/* Soft backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/15 backdrop-blur-[1px] z-[98]"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />

            {/* Panel — anchored above the FAB on the right */}
            <motion.div
              key="panel"
              initial={{
                opacity: 0,
                scale: 0.92,
                y: 20,
                originX: 1,
                originY: 1,
              }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="fixed z-[99] w-[340px]"
              style={{
                bottom: "160px",
                right: "max(12px, calc(50vw - 215px + 12px))",
              }}
              data-ocid="chatbot-panel"
            >
              <div
                className="bg-card border border-border rounded-3xl shadow-elevated overflow-hidden flex flex-col"
                style={{ height: "420px" }}
              >
                {/* Header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.42 0.13 198), oklch(0.54 0.15 155))",
                  }}
                >
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <Bot size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm leading-none">
                      Campus AI
                    </p>
                    <p className="text-white/70 text-[10px] mt-0.5">
                      {loading ? "Thinking…" : "Online · Ready to help"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearChat}
                    className="p-1.5 rounded-lg bg-white/10 text-white/80 hover:bg-white/25 transition-smooth"
                    aria-label="Clear chat"
                    data-ocid="chatbot-clear-btn"
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg bg-white/10 text-white/80 hover:bg-white/25 transition-smooth"
                    aria-label="Close chat"
                    data-ocid="chatbot-close-btn"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-3 py-3 scroll-smooth">
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} msg={msg} />
                  ))}
                  {loading && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick prompts — shown only early in convo */}
                {messages.length <= 2 && !loading && (
                  <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
                    {QUICK_PROMPTS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => sendMessage(p)}
                        className="shrink-0 text-[10px] font-medium px-2.5 py-1.5 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-smooth whitespace-nowrap"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input */}
                <div className="px-3 pb-3 pt-2 border-t border-border shrink-0">
                  <div className="flex items-end gap-2 bg-muted/50 rounded-2xl px-3 py-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask anything about campus…"
                      rows={1}
                      disabled={loading}
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[22px] max-h-[72px] leading-6 disabled:opacity-50"
                      style={{ fieldSizing: "content" } as React.CSSProperties}
                      data-ocid="chatbot-input"
                      aria-label="Chat input"
                    />
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim() || loading}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-smooth"
                      style={{
                        background:
                          "linear-gradient(135deg, oklch(0.42 0.13 198), oklch(0.54 0.15 155))",
                      }}
                      aria-label="Send message"
                      data-ocid="chatbot-send-btn"
                    >
                      <Send size={14} />
                    </motion.button>
                  </div>
                  <p className="text-[9px] text-muted-foreground text-center mt-1.5 tracking-wide">
                    Powered by Gemini AI · Enter to send
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
