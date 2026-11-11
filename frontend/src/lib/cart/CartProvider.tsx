"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  addCartItem,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
  type Cart,
  type CartMutationResult,
} from "@/lib/api/cart";

type CartStatus = "loading" | "ready" | "error";

type CartContextValue = {
  cart: Cart | null;
  count: number | null;
  status: CartStatus;
  pendingAction: string | null;
  refresh: () => Promise<void>;
  addItem: (productId: number, quantity?: number) => Promise<CartMutationResult>;
  updateItem: (productId: number, quantity: number) => Promise<CartMutationResult>;
  removeItem: (productId: number) => Promise<CartMutationResult>;
  clearCartItems: () => Promise<CartMutationResult>;
};

const CartContext = createContext<CartContextValue | null>(null);

const MUTATION_BLOCKED_MESSAGE = "Please wait — the previous change is still being saved.";

function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [status, setStatus] = useState<CartStatus>("loading");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const mutatingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (loadingRef.current || mutatingRef.current) return;
    loadingRef.current = true;
    setStatus("loading");

    try {
      const next = await getCart();
      setCart(next);
      setStatus("ready");
    } catch {
      setStatus("error");
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runMutation = useCallback(
    async (key: string, action: () => Promise<Cart>): Promise<CartMutationResult> => {
      if (mutatingRef.current) {
        return { ok: false, message: MUTATION_BLOCKED_MESSAGE };
      }

      mutatingRef.current = true;
      setPendingAction(key);

      try {
        const next = await action();
        setCart(next);
        setStatus("ready");
        return { ok: true, message: null };
      } catch (error) {
        return { ok: false, message: readErrorMessage(error) };
      } finally {
        mutatingRef.current = false;
        setPendingAction(null);
      }
    },
    [],
  );

  const addItem = useCallback(
    (productId: number, quantity = 1) => {
      if (!Number.isInteger(quantity) || quantity < 1) {
        return Promise.resolve({ ok: false, message: "Quantity must be a whole number of at least 1." });
      }

      return runMutation(`add:${productId}`, () => addCartItem(productId, quantity));
    },
    [runMutation],
  );

  const updateItem = useCallback(
    (productId: number, quantity: number) => {
      if (!Number.isInteger(quantity) || quantity < 1) {
        return Promise.resolve({ ok: false, message: "Quantity must be a whole number of at least 1." });
      }

      return runMutation(`update:${productId}`, () => updateCartItem(productId, quantity));
    },
    [runMutation],
  );

  const removeItem = useCallback(
    (productId: number) => runMutation(`remove:${productId}`, () => removeCartItem(productId)),
    [runMutation],
  );

  const clearCartItems = useCallback(
    () => runMutation("clear", () => clearCart()),
    [runMutation],
  );

  const count = useMemo(
    () =>
      cart
        ? cart.items.reduce((total, item) => total + item.quantity, 0)
        : null,
    [cart],
  );

  const value = useMemo(
    () => ({
      cart,
      count,
      status,
      pendingAction,
      refresh,
      addItem,
      updateItem,
      removeItem,
      clearCartItems,
    }),
    [
      cart,
      count,
      status,
      pendingAction,
      refresh,
      addItem,
      updateItem,
      removeItem,
      clearCartItems,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}
