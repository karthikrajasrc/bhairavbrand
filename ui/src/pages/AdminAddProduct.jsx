import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../context/AuthContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import AdminImageField from '../components/admin/AdminImageField.jsx';
import { uploadImage } from '../lib/uploadImage.js';
import { SIZE_UNITS } from '../data/productVariants.js';

const initialProduct = {
  name: '', category: '', description: '',
};
const newSize = () => ({ amount: '', unit: 'kg', price: '', mrp: '' });

export default function AdminAddProduct() {
  const { categories, refresh } = useCatalog();
  const { notify } = useCart();
  const { id } = useParams();
  const editing = Boolean(id);
  const [product, setProduct] = useState(initialProduct);
  const [saving, setSaving] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(editing);
  const [imageFiles, setImageFiles] = useState([null, null, null]);
  const [savedImages, setSavedImages] = useState([null, null, null]);
  const [sizes, setSizes] = useState([newSize()]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoadingProduct(true);
    apiRequest(`/api/admin/products/${id}`).then(({ product: existing }) => {
      if (!active) return;
      if (!existing) throw new Error('The API did not return this product.');
      setProduct({
        ...initialProduct,
        ...existing,
      });
      setSizes(existing.variants?.length
        ? existing.variants.map(({ amount, unit, price, mrp }) => ({ amount: String(amount), unit, price: String(price), mrp: String(mrp) }))
        : [{ amount: '', unit: 'kg', price: String(existing.price), mrp: String(existing.mrp) }]);
      setSavedImages((existing.images?.length ? existing.images : [existing.imageUrl])
        .slice(0, 3).concat([null, null, null]).slice(0, 3));
    }).catch((requestError) => {
      if (active) notify(requestError.message, 'error');
    }).finally(() => {
      if (active) setLoadingProduct(false);
    });
    return () => { active = false; };
  }, [id, notify]);

  const setField = (field, value) => setProduct((current) => ({ ...current, [field]: value }));
  const setSizeField = (index, field, value) => {
    setSizes((current) => current.map((size, itemIndex) => (
      itemIndex === index ? { ...size, [field]: value } : size
    )));
  };
  const setImageFile = (index, file) => {
    setImageFiles((current) => current.map((image, imageIndex) => (
      imageIndex === index ? file : image
    )));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (!imageFiles[0] && !savedImages[0]) throw new Error('Choose a main product image before saving');
      const enteredSizes = sizes.filter((size) => size.amount !== '');
      if (enteredSizes.length !== sizes.length && (enteredSizes.length || !editing)) {
        throw new Error('Complete every product size before saving.');
      }
      const sizeKeys = enteredSizes.map((size) => `${Number(size.amount)}:${size.unit}`);
      if (new Set(sizeKeys).size !== sizeKeys.length) {
        throw new Error('Each product size must be unique.');
      }
      if (enteredSizes.some((size) => Number(size.amount) <= 0 || Number(size.mrp) < Number(size.price))) {
        throw new Error('Enter a size greater than zero and an MRP equal to or above its selling price.');
      }
      if (sizes.some((size) => Number(size.mrp) < Number(size.price))) {
        throw new Error('MRP must be equal to or greater than the selling price.');
      }
      const images = (await Promise.all(imageFiles.map((file, index) => (
        file ? uploadImage(file) : Promise.resolve(savedImages[index])
      )))).filter(Boolean);
      const variants = enteredSizes.map((size) => ({
        amount: Number(size.amount),
        unit: size.unit,
        price: Number(size.price),
        mrp: Number(size.mrp),
      }));
      const payload = {
        name: product.name,
        category: product.category,
        description: product.description,
        imageUrl: images[0],
        images,
        price: variants[0]?.price ?? Number(sizes[0].price),
        mrp: variants[0]?.mrp ?? Number(sizes[0].mrp),
        ...(variants.length ? { variants } : {}),
      };
      if (!variants.length) delete payload.variants;
      await apiRequest(editing ? `/api/admin/products/${id}` : '/api/admin/products', {
        method: editing ? 'PUT' : 'POST',
        body: payload,
      });
      await refresh();
      navigate('/admin/products', { state: { notice: editing ? 'Product updated.' : 'Product added.' } });
    } catch (requestError) {
      notify(requestError.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="admin-page-title">
        <div><p className="admin-eyebrow">Catalogue</p><h2>{editing ? 'Edit product' : 'Add product'}</h2></div>
        <Link className="admin-back-link" to="/admin/products">← All products</Link>
      </div>
      {loadingProduct && <p className="admin-message" role="status">Loading product…</p>}
      {categories.length === 0 && (
        <p className="admin-message">Create a category before adding products. <Link to="/admin/categories">Manage categories</Link></p>
      )}
      {!loadingProduct && <form className="admin-panel admin-form admin-product-form" onSubmit={submit}>
        <label className="admin-wide">Product name
          <input maxLength="120" minLength="2" required value={product.name}
            onChange={(event) => setField('name', event.target.value)} />
        </label>
        <label>Category
          <select required value={product.category} onChange={(event) => setField('category', event.target.value)}>
            <option value="">Select category</option>
            {categories.map((category) => <option key={category._id} value={category.slug}>{category.name}</option>)}
          </select>
        </label>
        <fieldset className="admin-product-sizes admin-wide">
          <legend>Product sizes and prices</legend>
          <p className="admin-form-intro">Add every available pack size with its selling price and MRP.</p>
          {sizes.map((size, index) => (
            <div className="admin-product-size-row" key={`size-${index}`}>
              <label>Quantity (Size)
                <input min="0.01" required={!editing || Boolean(size.amount) || sizes.length > 1}
                  step="any" type="number" value={size.amount}
                  onChange={(event) => setSizeField(index, 'amount', event.target.value)} />
              </label>
              <label>Unit
                <select value={size.unit} onChange={(event) => setSizeField(index, 'unit', event.target.value)}>
                  {SIZE_UNITS.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                </select>
              </label>
              <label>Selling price (₹)
                <input min="0" required step="0.01" type="number" value={size.price}
                  onChange={(event) => setSizeField(index, 'price', event.target.value)} />
              </label>
              <label>MRP (₹)
                <input min="0" required step="0.01" type="number" value={size.mrp}
                  onChange={(event) => setSizeField(index, 'mrp', event.target.value)} />
              </label>
              <button className="admin-remove admin-size-remove" disabled={sizes.length === 1}
                onClick={() => setSizes((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                type="button" aria-label={`Remove size ${index + 1}`}>Remove</button>
            </div>
          ))}
          <button className="btn o" disabled={sizes.length >= 20}
            onClick={() => setSizes((current) => [...current, newSize()])}
            type="button">Add another size</button>
        </fieldset>
        <fieldset className="admin-product-images admin-wide">
          <legend>Product images</legend>
          <p className="admin-form-intro">The main image is required. Add up to two additional gallery images.</p>
          {imageFiles.map((file, index) => (
            <AdminImageField key={`product-image-${index}`} file={file}
              label={index === 0 ? 'Main product image' : `Additional image ${index} (optional)`}
              onChange={(nextFile) => setImageFile(index, nextFile)}
              existingUrl={savedImages[index] || ''}
              onRemoveImage={() => {
                if (imageFiles[index]) {
                  setImageFile(index, null);
                } else {
                  setSavedImages((current) => current.map((image, imageIndex) => (
                    imageIndex === index ? null : image
                  )));
                }
              }}
              required={!editing && index === 0} />
          ))}
        </fieldset>
        <fieldset className="admin-product-details admin-wide">
          <legend>Product details for the product page</legend>
          <label className="admin-wide">Description
            <textarea maxLength="5000" rows="6" value={product.description}
              onChange={(event) => setField('description', event.target.value)}
              placeholder="Explain how the product is made and what makes it distinctive." />
          </label>
        </fieldset>
        <div className="admin-form-actions admin-wide">
          <button className="btn" disabled={saving || categories.length === 0} type="submit">
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add product'}
          </button>
          <Link className="btn o" to="/admin/products">Cancel</Link>
        </div>
      </form>}
    </>
  );
}
