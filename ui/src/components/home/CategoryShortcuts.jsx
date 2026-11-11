import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { useCatalog } from '../../context/CatalogContext.jsx';
import Reveal from '../ui/Reveal.jsx';

const categoryPath = (category, categories) => {
  if (!category) return '/collections/all';
  const parent = categories.find((item) => item._id === category.parentId);
  return parent
    ? `/collections/${parent.slug}/${category.slug}`
    : `/collections/${category.slug}`;
};

export default function CategoryShortcuts() {
  const { categories, error } = useCatalog();
  const { notify } = useCart();
  const [shortcutIcons, setShortcutIcons] = useState({ offersIconUrl: '', shopAllIconUrl: '' });

  useEffect(() => {
    let active = true;
    apiRequest('/api/storefront/category-shortcut-icons')
      .then((result) => {
        if (active) {
          setShortcutIcons({
            offersIconUrl: result.offersIconUrl || '',
            shopAllIconUrl: result.shopAllIconUrl || '',
          });
        }
      })
      .catch((requestError) => {
        if (active) notify(requestError.message, 'error');
      });
    return () => { active = false; };
  }, [notify]);

  useEffect(() => {
    if (error) notify(error, 'error');
  }, [error, notify]);

  const roots = categories
    .filter((category) => !category.parentId)
    .sort((a, b) => a.name.localeCompare(b.name));
  const offersTarget = roots.find((category) => category.slug === 'combos');
  const shortcuts = [
    ...(shortcutIcons.offersIconUrl
      ? [{
        label: 'Offers',
        imageUrl: shortcutIcons.offersIconUrl,
        to: offersTarget ? categoryPath(offersTarget, categories) : '/collections/all',
      }]
      : []),
    {
      label: 'Shop All',
      imageUrl: shortcutIcons.shopAllIconUrl,
      to: '/collections/all',
    },
    ...roots.map((category) => ({
      label: category.name,
      imageUrl: category.iconUrl,
      to: categoryPath(category, categories),
    })),
  ];

  return (
    <Reveal as="nav" className="category-shortcuts rev-stagger" aria-label="Shop categories">
      {shortcuts.map((shortcut) => (
        <Link className="category-shortcut" key={shortcut.label} to={shortcut.to}>
          <span className="category-icon">
            {shortcut.imageUrl && (
              <img src={shortcut.imageUrl} alt="" width="64" height="64" loading="lazy" />
            )}
          </span>
          <span>{shortcut.label}</span>
        </Link>
      ))}
    </Reveal>
  );
}
