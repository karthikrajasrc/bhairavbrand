import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useCatalog } from './CatalogContext.jsx';
import { getProductVariants, startingVariant } from '../data/productVariants.js';

const CartContext = createContext(null);
const KEY = 'bb-cart';

const load = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY)) || {};
    return Object.entries(stored).reduce((cart, [key, value]) => {
      if (typeof value === 'number') {
        cart[`${key}::default`] = { productId: key, variantId: 'default', qty: value };
      } else if (value && typeof value.productId === 'string' && Number.isFinite(value.qty)) {
        cart[key] = value;
      }
      return cart;
    }, {});
  } catch {
    return {};
  }
};

export function CartProvider({ children }) {
  const { getProduct } = useCatalog();
  const [items, setItems] = useState(load);
  const [toast, setToast] = useState(null);
  const timer = useRef();

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable */ }
  }, [items]);

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const add = useCallback((productId, qty = 1, requestedVariant) => {
    const product = getProduct(productId);
    if (!product) {
      notify('This product is no longer available');
      return;
    }
    const variants = getProductVariants(product);
    const variant = variants.find((item) => item.id === requestedVariant?.id) || startingVariant(product);
    const key = `${productId}::${variant.id}`;
    setItems((current) => ({
      ...current,
      [key]: {
        productId,
        variantId: variant.id,
        qty: (current[key]?.qty || 0) + qty,
      },
    }));
    notify(`${product.name} added to cart`);
  }, [getProduct, notify]);

  const setQty = useCallback((key, qty) => {
    setItems((current) => {
      const next = { ...current };
      if (qty < 1) delete next[key];
      else if (next[key]) next[key] = { ...next[key], qty };
      return next;
    });
  }, []);

  const lines = useMemo(
    () => Object.entries(items).map(([key, item]) => {
      const product = getProduct(item.productId);
      if (!product) return null;
      const variant = getProductVariants(product).find((candidate) => candidate.id === item.variantId)
        || startingVariant(product);
      return { key, product, variant, qty: item.qty };
    }).filter(Boolean),
    [getProduct, items]
  );
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const subtotal = lines.reduce((total, line) => total + line.qty * line.variant.price, 0);

  const value = { lines, count, subtotal, add, setQty, toast, notify };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
