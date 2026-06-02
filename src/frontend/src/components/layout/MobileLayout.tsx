import type { ReactNode } from "react";
import { useUI } from "../../context/UIContext";
import { ChatBot } from "../ChatBot";
import { BottomNav } from "./BottomNav";

interface MobileLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
}

export function MobileLayout({
  children,
  showBottomNav = true,
}: MobileLayoutProps) {
  const { hideBottomNav } = useUI();
  const navVisible = showBottomNav && !hideBottomNav;

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen relative flex flex-col bg-background overflow-x-hidden">
        <main className={`flex-1 ${navVisible ? "pb-[72px]" : ""}`}>
          {children}
        </main>
        {navVisible && <BottomNav />}
        {/* Chatbot only appears on authenticated pages (when bottom nav is visible) */}
        {navVisible && <ChatBot />}
      </div>
    </div>
  );
}
