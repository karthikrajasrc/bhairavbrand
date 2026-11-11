import { createContext } from 'react';

export const CatalogContext = createContext(null);

export const isCategoryRecord = (category) => (
  category !== null
  && typeof category === 'object'
  && typeof category._id === 'string'
  && typeof category.name === 'string'
  && typeof category.slug === 'string'
);

export const normalizeCategories = (categories) => (
  Array.isArray(categories) ? categories.filter(isCategoryRecord) : []
);
