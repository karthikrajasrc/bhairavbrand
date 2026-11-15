import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useCatalog } from './CatalogContext.jsx';
import { getProductVariants, startingVariant } from '../data/productVariants.js';

const CartContext = createContext(null);
const KEY = 'bb-cart';
const MAX_QUANTITY = 99;

const load = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY)) || {};
    return Object.entries(stored).reduce((cart, [key, value]) => {
      if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
        cart[`${key}::default`] = { productId: key, variantId: 'default', qty: Math.min(value, MAX_QUANTITY) };
      } else if (
        value
        && typeof value.productId === 'string'
        && Number.isInteger(value.qty)
        && value.qty > 0
      ) {
        cart[key] = {
          ...value,
          variantId: typeof value.variantId === 'string' ? value.variantId : 'default',
          qty: Math.min(value.qty, MAX_QUANTITY),
        };
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
    if (!Number.isInteger(qty) || qty < 1) {
      notify('Choose a valid quantity', 'error');
      return;
    }
    if ((items[key]?.qty || 0) + qty > MAX_QUANTITY) {
      notify(`You can add up to ${MAX_QUANTITY} of this item`, 'error');
      return;
    }
    setItems((current) => {
      const currentQty = current[key]?.qty || 0;
      if (currentQty + qty > MAX_QUANTITY) return current;
      return {
        ...current,
        [key]: {
          productId,
          variantId: variant.id,
          qty: currentQty + qty,
        },
      };
    });
    notify(`${product.name} added to cart`);
  }, [getProduct, items, notify]);

  const setQty = useCallback((key, qty) => {
    if (!Number.isInteger(qty) || qty < 0 || qty > MAX_QUANTITY) {
      notify(`Quantity must be between 0 and ${MAX_QUANTITY}`, 'error');
      return;
    }
    setItems((current) => {
      const next = { ...current };
      if (qty < 1) delete next[key];
      else if (next[key]) next[key] = { ...next[key], qty };
      return next;
    });
  }, [notify]);
  const clear = useCallback(() => setItems({}), []);
  const getItemQty = useCallback((productId, variantId) => (
    items[`${productId}::${variantId}`]?.qty || 0
  ), [items]);

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

  const value = { lines, count, subtotal, add, setQty, getItemQty, clear, toast, notify };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
