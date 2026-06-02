import { type ReactNode, createContext, useCallback, useState } from "react";
import type { CartItem, FoodItem } from "../types";

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (foodItem: FoodItem) => void;
  removeItem: (foodItemId: string) => void;
  updateQuantity: (foodItemId: string, quantity: number) => void;
  clearCart: () => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((foodItem: FoodItem) => {
    setItems((prev) => {
      const existing = prev.find((ci) => ci.foodItem.id === foodItem.id);
      if (existing) {
        return prev.map((ci) =>
          ci.foodItem.id === foodItem.id
            ? { ...ci, quantity: ci.quantity + 1 }
            : ci,
        );
      }
      return [...prev, { foodItem, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((foodItemId: string) => {
    setItems((prev) => prev.filter((ci) => ci.foodItem.id !== foodItemId));
  }, []);

  const updateQuantity = useCallback((foodItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((ci) => ci.foodItem.id !== foodItemId));
      return;
    }
    setItems((prev) =>
      prev.map((ci) =>
        ci.foodItem.id === foodItemId ? { ...ci, quantity } : ci,
      ),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, ci) => sum + ci.quantity, 0);
  const totalPrice = items.reduce(
    (sum, ci) => sum + ci.foodItem.price * ci.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        totalPrice,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
