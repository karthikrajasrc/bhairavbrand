import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from './AuthContext.jsx';
import { CatalogContext, isCategoryRecord, normalizeCategories } from './catalogContext.js';

export function CatalogProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const hasLoaded = useRef(false);

  const refresh = useCallback(async () => {
    if (!hasLoaded.current) setLoading(true);
    try {
      const [productResult, categoryResult] = await Promise.all([
        apiRequest('/api/products'),
        apiRequest('/api/storefront/categories'),
      ]);
      setProducts(productResult.products);
      setCategories(normalizeCategories(categoryResult.categories));
      setError('');
      hasLoaded.current = true;
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    } finally {
      setLoading(false);
    }
  }, []);

  const addCategory = useCallback((category) => {
    if (!isCategoryRecord(category)) {
      throw new Error('The API did not return valid category data.');
    }
    setCategories((current) => {
      const validCategories = normalizeCategories(current);
      return validCategories.some((item) => item._id === category._id)
        ? validCategories.map((item) => item._id === category._id ? category : item)
        : [...validCategories, category];
    });
  }, []);

  const removeCategory = useCallback((categoryId) => {
    setCategories((current) => normalizeCategories(current).filter((category) => category._id !== categoryId));
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const value = useMemo(() => {
    const categoryBySlug = Object.fromEntries(categories.map((category) => [category.slug, category]));
    const roots = categories.filter((category) => !category.parentId);
    const childrenOf = (parent) => categories.filter((category) => category.parentId === parent._id);
    const getProduct = (id) => products.find((product) => product._id === String(id));
    const byCategory = (slug, subcategory = '') => products.filter((product) => (
      (slug === 'all' || product.category === slug)
      && (!subcategory || product.subcategory === subcategory)
    ));
    return {
      products,
      categories,
      roots,
      loading,
      error,
      refresh,
      addCategory,
      removeCategory,
      categoryBySlug,
      childrenOf,
      getProduct,
      byCategory,
    };
  }, [addCategory, categories, error, loading, products, refresh, removeCategory]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('useCatalog must be used within CatalogProvider');
  return value;
}
