import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";

interface UIContextValue {
  hideBottomNav: boolean;
  setHideBottomNav: (hide: boolean) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [hideBottomNav, setHideBottomNavState] = useState(false);

  const setHideBottomNav = useCallback((hide: boolean) => {
    setHideBottomNavState(hide);
  }, []);

  return (
    <UIContext.Provider value={{ hideBottomNav, setHideBottomNav }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
