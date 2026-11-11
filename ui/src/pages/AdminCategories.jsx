import { useEffect, useState } from 'react';
import { apiRequest } from '../context/AuthContext.jsx';
import { useCatalog } from '../context/CatalogContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { isCategoryRecord, normalizeCategories } from '../context/catalogContext.js';
import AdminImageField from '../components/admin/AdminImageField.jsx';
import { uploadImage } from '../lib/uploadImage.js';

const makeSlug = (value) => value.trim().toLowerCase()
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function AdminCategories() {
  const { addCategory, removeCategory: removeCatalogCategory } = useCatalog();
  const { notify } = useCart();
  const [categories, setCategories] = useState([]);
  const [categoryView, setCategoryView] = useState('add');
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [iconFile, setIconFile] = useState(null);
  const [shortcutIcons, setShortcutIcons] = useState({ offersIconUrl: '', shopAllIconUrl: '' });
  const [offersIconFile, setOffersIconFile] = useState(null);
  const [shopAllIconFile, setShopAllIconFile] = useState(null);
  const [savingShortcutIcons, setSavingShortcutIcons] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStage, setSaveStage] = useState('');
  const [busyId, setBusyId] = useState('');
  const [editing, setEditing] = useState(null);

  const loadCategories = async () => {
    try {
      const [categoryResult, iconResult] = await Promise.all([
        apiRequest('/api/admin/categories'),
        apiRequest('/api/storefront/category-shortcut-icons'),
      ]);
      setCategories(normalizeCategories(categoryResult.categories));
      setShortcutIcons({
        offersIconUrl: iconResult.offersIconUrl || '',
        shopAllIconUrl: iconResult.shopAllIconUrl || '',
      });
    } catch (requestError) {
      notify(requestError.message, 'error');
    }
  };
  useEffect(() => { loadCategories(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSaveStage(imageFile || iconFile ? 'Uploading and optimizing images…' : 'Saving category…');
    try {
      if (!parentId && !imageFile && !editing?.imageUrl) {
        throw new Error('Choose an image for a top-level category');
      }
      const imageUrl = imageFile ? await uploadImage(imageFile) : editing?.imageUrl || '';
      const iconUrl = iconFile ? await uploadImage(iconFile) : editing?.iconUrl || '';
      setSaveStage(editing ? 'Updating category…' : 'Saving category…');
      const slug = makeSlug(name);
      const { category } = await apiRequest(
        editing ? `/api/admin/categories/${editing._id}` : '/api/admin/categories',
        {
        method: editing ? 'PUT' : 'POST',
        body: { name, slug, imageUrl, iconUrl, parentId: parentId || null },
        },
      );
      let savedCategory = category;
      if (!isCategoryRecord(savedCategory)) {
        const result = await apiRequest('/api/admin/categories');
        const latestCategories = normalizeCategories(result.categories);
        setCategories(latestCategories);
        savedCategory = latestCategories.find((item) => item.slug === slug);
      }
      if (!savedCategory) {
        throw new Error('The category may have been saved, but the API could not confirm it. Refresh the page to check.');
      }
      setCategories((current) => [
        ...normalizeCategories(current).filter((item) => item._id !== savedCategory._id),
        savedCategory,
      ]
        .sort((a, b) => a.name.localeCompare(b.name)));
      addCategory(savedCategory);
      setName('');
      setParentId('');
      setImageFile(null);
      setIconFile(null);
      setEditing(null);
      notify(editing ? 'Category updated.' : 'Category saved.');
    } catch (requestError) {
      notify(requestError.message, 'error');
    } finally {
      setSaving(false);
      setSaveStage('');
    }
  };

  const editCategory = (category) => {
    setCategoryView('add');
    setEditing(category);
    setName(category.name);
    setParentId(category.parentId || '');
    setImageFile(null);
    setIconFile(null);
  };
  const cancelEdit = () => {
    setEditing(null);
    setName('');
    setParentId('');
    setImageFile(null);
    setIconFile(null);
  };

  const removeCategory = async (category) => {
    setBusyId(category._id);
    try {
      await apiRequest(`/api/admin/categories/${category._id}`, { method: 'DELETE' });
      setCategories((current) => normalizeCategories(current).filter((item) => item._id !== category._id));
      removeCatalogCategory(category._id);
      if (editing?._id === category._id) cancelEdit();
      notify('Category removed.');
    } catch (requestError) {
      notify(requestError.message, 'error');
    } finally {
      setBusyId('');
    }
  };

  const saveShortcutIcons = async (event) => {
    event.preventDefault();
    setSavingShortcutIcons(true);
    try {
      const offersIconUrl = offersIconFile
        ? await uploadImage(offersIconFile)
        : shortcutIcons.offersIconUrl;
      const shopAllIconUrl = shopAllIconFile
        ? await uploadImage(shopAllIconFile)
        : shortcutIcons.shopAllIconUrl;
      const result = await apiRequest('/api/admin/category-shortcut-icons', {
        method: 'PUT',
        body: { offersIconUrl, shopAllIconUrl },
      });
      setShortcutIcons(result);
      setOffersIconFile(null);
      setShopAllIconFile(null);
      notify('Shortcut icons saved.');
    } catch (requestError) {
      notify(requestError.message, 'error');
    } finally {
      setSavingShortcutIcons(false);
    }
  };

  const validCategories = normalizeCategories(categories);
  const roots = validCategories.filter((category) => !category.parentId);
  const categoryName = (category) => validCategories.find((item) => item._id === category.parentId)?.name;
  const childrenOf = (categoryId) => validCategories
    .filter((category) => category.parentId === categoryId)
    .sort((a, b) => a.name.localeCompare(b.name));
  const renderCategoryRow = (category, isChild = false) => (
    <article className={`admin-product-row${isChild ? ' admin-category-child' : ' admin-category-root'}`}
      key={category._id}>
      {isChild && <span className="admin-category-connector" aria-hidden="true" />}
      <span className="admin-product-art">
        {category.imageUrl && <img src={category.imageUrl} alt="" />}
      </span>
      <span className="admin-category-icon-column" aria-label="Shortcut icon">
        {category.iconUrl
          ? <img src={category.iconUrl} alt={`${category.name} shortcut icon`} />
          : <span aria-label="No shortcut icon">—</span>}
      </span>
      <div className="admin-record-copy">
        <b>{category.name}</b>
        <small>{isChild ? `${categoryName(category) || 'Unknown parent'} · ` : ''}/{category.slug}</small>
      </div>
      <button className="admin-edit" disabled={busyId === category._id}
        onClick={() => editCategory(category)} type="button">
        Edit
      </button>
      <button className="admin-remove" disabled={busyId === category._id}
        onClick={() => removeCategory(category)} type="button">
        {busyId === category._id ? 'Removing…' : 'Remove'}
      </button>
    </article>
  );
  const groupedIds = new Set(roots.flatMap((category) => [
    category._id,
    ...childrenOf(category._id).map((child) => child._id),
  ]));
  const ungroupedCategories = validCategories
    .filter((category) => !groupedIds.has(category._id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const normalizedSearch = search.trim().toLowerCase();
  const categoryMatches = (category) => {
    const parentName = categoryName(category) || '';
    return `${category.name} ${category.slug} ${parentName}`
      .toLowerCase()
      .includes(normalizedSearch);
  };
  const displayedRoots = roots
    .filter((category) => categoryMatches(category) || childrenOf(category._id).some(categoryMatches))
    .sort((a, b) => a.name.localeCompare(b.name));
  const displayedUngrouped = ungroupedCategories.filter(categoryMatches);

  return (
    <>
      <div className="admin-page-title">
        <div><p className="admin-eyebrow">Catalogue</p><h2>Categories</h2></div>
      </div>
      {saving && <p className="admin-message" role="status" aria-live="polite">{saveStage}</p>}
      <div className="admin-nav admin-category-tabs" role="tablist" aria-label="Category management">
        <button
          aria-selected={categoryView === 'add'}
          className={`admin-nav-link${categoryView === 'add' ? ' active' : ''}`}
          onClick={() => setCategoryView('add')}
          role="tab"
          type="button"
        >
          Add category
        </button>
        <button
          aria-selected={categoryView === 'list'}
          className={`admin-nav-link${categoryView === 'list' ? ' active' : ''}`}
          onClick={() => setCategoryView('list')}
          role="tab"
          type="button"
        >
          List categories
        </button>
      </div>
      {categoryView === 'add' && <form className="admin-panel admin-form" onSubmit={submit}>
        <h3 className="admin-wide">{editing ? `Edit ${editing.name}` : 'Add category or subcategory'}</h3>
        <label>Name
          <input required minLength="2" maxLength="80" value={name}
            onChange={(event) => setName(event.target.value)} />
        </label>
        <label>Parent category
          <select disabled={Boolean(editing && !editing.parentId)} value={parentId} onChange={(event) => {
            setParentId(event.target.value);
            if (event.target.value) setImageFile(null);
          }}>
            <option value="">Top-level category</option>
            {roots.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
          </select>
        </label>
        {!parentId && (
          <>
            <AdminImageField file={imageFile} label="Category image" onChange={setImageFile}
              onRemoveImage={() => setImageFile(null)}
              existingUrl={editing?.imageUrl || ''} onRemoveExisting={() => setEditing((current) => (
                current ? { ...current, imageUrl: '' } : current
              ))} required />
            <AdminImageField file={iconFile} label="Category shortcut icon (optional)" onChange={setIconFile}
              onRemoveImage={() => setIconFile(null)}
              existingUrl={editing?.iconUrl || ''} onRemoveExisting={() => setEditing((current) => (
                current ? { ...current, iconUrl: '' } : current
              ))} />
          </>
        )}
        <div className="admin-form-actions admin-wide">
          <button className="btn" disabled={saving} type="submit">
            {saving ? 'Please wait…' : editing ? 'Save changes' : 'Add category'}
          </button>
          {editing && <button className="btn o" disabled={saving} onClick={cancelEdit} type="button">Cancel edit</button>}
        </div>
      </form>}
      {categoryView === 'add' && (
        <form className="admin-panel admin-form admin-category-shortcut-settings" onSubmit={saveShortcutIcons}>
        <h3 className="admin-wide">Shop All and Offers icons</h3>
        <p className="admin-form-intro admin-wide">
          Offers appears first when its icon is set, followed by Shop All and then the categories above.
        </p>
        <AdminImageField file={offersIconFile} label="Offers icon (optional)" onChange={setOffersIconFile}
          onRemoveImage={() => setOffersIconFile(null)}
          existingUrl={shortcutIcons.offersIconUrl} onRemoveExisting={() => setShortcutIcons((current) => ({
            ...current,
            offersIconUrl: '',
          }))} />
        <AdminImageField file={shopAllIconFile} label="Shop All icon (optional)" onChange={setShopAllIconFile}
          onRemoveImage={() => setShopAllIconFile(null)}
          existingUrl={shortcutIcons.shopAllIconUrl} onRemoveExisting={() => setShortcutIcons((current) => ({
            ...current,
            shopAllIconUrl: '',
          }))} />
        <div className="admin-form-actions admin-wide">
          <button className="btn" disabled={savingShortcutIcons} type="submit">
            {savingShortcutIcons ? 'Saving…' : 'Save shortcut icons'}
          </button>
        </div>
        </form>
      )}
      {categoryView === 'list' && <section className="admin-panel admin-record-list">
        <div className="admin-category-list-header">
          <h3>Categories</h3>
          <input
            aria-label="Search categories"
            className="admin-title-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search categories"
            type="search"
            value={search}
          />
        </div>
        {validCategories.length === 0 ? <p>No categories yet. Add one to start building your catalogue.</p>
          : displayedRoots.length === 0 && displayedUngrouped.length === 0
            ? <p role="status">No categories match “{search}”.</p> : (
          <>
            {displayedRoots.map((category) => {
                const matchingRoot = categoryMatches(category);
                const children = childrenOf(category._id)
                  .filter((child) => matchingRoot || categoryMatches(child));
                return (
                  <section className="admin-category-group" key={category._id} aria-label={`${category.name} category`}>
                    {renderCategoryRow(category)}
                    {children.length > 0 && (
                      <div className="admin-category-children">
                        {children.map((child) => renderCategoryRow(child, true))}
                      </div>
                    )}
                  </section>
                );
              })}
            {displayedUngrouped.length > 0 && (
              <section className="admin-category-group admin-category-ungrouped" aria-label="Unassigned categories">
                <h3>Unassigned categories</h3>
                {displayedUngrouped.map((category) => renderCategoryRow(category))}
              </section>
            )}
          </>
        )}
      </section>}
    </>
  );
}
