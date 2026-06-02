import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface ChatBotContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const ChatBotContext = createContext<ChatBotContextType>({
  open: false,
  setOpen: () => {},
  toggle: () => {},
});

export function ChatBotProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((v) => !v);

  return (
    <ChatBotContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </ChatBotContext.Provider>
  );
}

export function useChatBot() {
  return useContext(ChatBotContext);
}
