# Bhairav Brand – React storefront

Vite + React 18 + React Router, with an Express/MongoDB API for account registration and sign-in.

## Run
Start the backend and frontend independently in separate terminals:

Backend:
```bash
cd api
npm install
npm run dev      # API at http://localhost:4000
```

Frontend, in a second terminal:
```bash
cd ui
npm install
npm run dev      # frontend at http://localhost:5173
npm run build    # production build in dist/
npm run preview
```

The frontend talks directly to the separately hosted API using `VITE_API_URL`; the local value is `http://localhost:4000`. Set it to the public API URL in the frontend host's build environment before building. The API CORS allowlist uses `UI_ORIGIN`; set that to the exact public frontend origin in the API host. These services do not proxy or start each other.

Set `MONGODB_URI` in `api/.env` to your MongoDB connection string (the example uses a local MongoDB server at `mongodb://127.0.0.1:27017/banyan_basket`). MongoDB must be running before starting the API. For MongoDB Atlas, use its connection string and keep credentials private. For Google sign-in, set the same Google OAuth Web client ID in `api/.env` as `VITE_GOOGLE_CLIENT_ID` in `ui/.env.local`, then restart/rebuild the relevant service. Add the public frontend origin as an authorized JavaScript origin in Google Cloud Console. Without a configured client ID, email/password accounts work and Google sign-in is shown as unavailable.

Admin product and category-icon image uploads use Cloudinary. Create a Cloudinary account, then set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `api/.env` (the same placeholders are in `api/.env.example`) and restart the API. Keep the API secret private and never add it to the frontend. Uploads are limited to 8 MB; Sharp validates the image contents, converts JPEG/PNG/AVIF/TIFF to WebP, and passes existing WebP bytes through unchanged. The resulting HTTPS Cloudinary URL is stored in MongoDB with the product or category icon. Image upload returns a configuration error until all three Cloudinary values are set.

Checkout uses Razorpay. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in the API environment and restart the API; use Razorpay test credentials until you are ready to accept live payments. The key secret must remain server-side. `POST /api/checkout/orders` creates a gateway order from server-side MongoDB prices, and `POST /api/checkout/orders/:id/verify` verifies and captures payment before the order is visible through admin-only `GET /api/admin/orders`.

Users and hashed sessions are stored in MongoDB through Mongoose. Unique indexes protect email and Google identity; MongoDB TTL automatically removes expired sessions. Passwords are bcrypt-hashed, sessions use random opaque tokens stored only as SHA-256 hashes, and the browser cookie is HTTP-only. In production, serve both services over HTTPS: the API sets a Secure, SameSite=None cookie so browsers can send sessions between separate frontend/API hosts. Prefer custom subdomains on the same site (for example, `shop.example.com` and `api.example.com`) because browsers may block cookies when the API is hosted on an unrelated third-party domain. Set `NODE_ENV=production` and `UI_ORIGIN` to the exact frontend origin. Set `TRUST_PROXY_HOPS` only when deployed behind a known, trusted reverse proxy; leave it at `0` for direct access. The rate limiter is in-memory and intended for a single API instance.

## Admin dashboard
Open `/admin` after signing in with Google as the verified `ADMIN_EMAIL` address (defaults to `admin@bb.com`). Google sign-in creates or links that user in MongoDB and grants the admin role; it does not use a separate Bhairav Brand password. Do not register an admin password or share Google credentials. Set `ADMIN_EMAIL` in the API environment to choose the one authorized admin identity. Admin-only APIs require both that email and the stored admin role on every request. The admin area has Products, Add product, Categories, Delivery, and Orders pages, with its own navigation and a link back to the storefront. `/admin` redirects to Products.

Create flat categories with optional shortcut icons in Categories before adding products. Products belong to one category; product images are required and uploaded to Cloudinary. Set the optional Offers and Shop All shortcut icons in Categories; Offers appears first when configured, followed by Shop All and then the categories. Deleting a category is blocked while products use it. The Delivery page sets the delivery charge and free-delivery threshold. Orders appear in the admin Orders page after Razorpay confirms payment. Homepage banners are hardcoded in the UI and are not stored in MongoDB. Admin APIs are under `/api/admin`; public read APIs include `/api/products`, `/api/storefront/categories`, `/api/storefront/category-shortcut-icons`, and `/api/storefront/delivery-charges`.

## Structure
```
public/assets/logo.png        supplied brand logo
src/
  main.jsx, App.jsx           entry + routes
  styles/global.css           design tokens, layout, dark mode, responsive rules
  data/                       product formatting helpers and content copy
  context/                     AuthContext, CatalogContext, CartContext
  pages/                      AuthPage, Account, storefront pages
  hooks/useScrolled.js
  components/
    layout/                   AnnouncementBar, Header, DesktopNav, SearchBox, MobileDrawer, CartDrawer, Footer, Layout
    ui/                       ProductCard, ProductRail, Reveal, Icon, Toast, BackToTop, PageHeader
    home/                     Hero, TopPicks, Combos, Process, KitchenHotspots, TrustStrip, CtaBanner, Testimonials
  pages/                      Home, Collection (/collections/:slug), Product (/products/:id), About, NotFound
```

## Replace before launch
- `src/data/content.js`: testimonials and about copy.
- Footer: confirm the FSSAI badge, add the licence number, and wire policy/FAQ/contact pages.
- A customer-facing order-tracking lookup page is not implemented yet.
- BrowserRouter needs an SPA fallback on your host (serve `index.html` for unknown paths).
- Run API tests from `api/` with `npm test`.
