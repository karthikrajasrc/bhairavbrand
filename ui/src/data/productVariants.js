export const SIZE_UNITS = [
  { value: 'g', label: 'Gram (g)' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'ml', label: 'Millilitre (ml)' },
  { value: 'l', label: 'Litre (L)' },
  { value: 'cm', label: 'Centimetre (cm)' },
  { value: 'mtr', label: 'Metre (mtr)' },
];

export function getProductVariants(product) {
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    return product.variants.map((variant, index) => ({
      ...variant,
      id: variant._id || `${variant.amount}-${variant.unit}-${index}`,
      label: `${Number(variant.amount).toLocaleString('en-IN')} ${variant.unit === 'l' ? 'L' : variant.unit}`,
    }));
  }
  return [{
    id: 'default',
    label: '',
    price: product.price,
    mrp: product.mrp,
  }];
}

export const startingVariant = (product) => (
  getProductVariants(product).reduce((lowest, variant) => (
    variant.price < lowest.price ? variant : lowest
  ))
);
