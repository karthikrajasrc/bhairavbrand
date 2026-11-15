# API

The API uses an MVC-style layout:

- `src/config/` — database connection and runtime configuration.
- `src/models/` — Mongoose models, one model per file.
- `src/controllers/` — request handling and application logic.
- `src/routes/` — endpoint definitions and middleware wiring.
- `src/middleware/` — authentication, upload, origin, and error handling.
- `src/services/` — integrations such as Razorpay.
- `src/validation/` — request schemas.
- `src/app.js` — Express composition root; `createApp(dependencies)` supports isolated tests.
- `src/server.js` — production startup and shutdown.

Run the API from this directory with `npm run dev`, or run its tests with `npm test`.

Public storefront endpoints:

- `GET /api/storefront/reviews` returns reviews entered by an administrator.

Public support endpoints:

- `POST /api/contact` validates and stores customer inquiries.
- `POST /api/orders/track` looks up an order using its order number and checkout email, returning status and item details without customer or payment identifiers.

Checkout endpoints:

- `POST /api/checkout/quote` calculates product prices and delivery charges from the database for the current cart.
- `POST /api/checkout/orders` creates a Razorpay order using the same server-calculated prices and delivery settings.

Admin review endpoints (require an administrator session):

- `GET /api/admin/reviews` lists reviews.
- `POST /api/admin/reviews` creates a review with `name`, `stars` (1–5), and `comments`.
- `DELETE /api/admin/reviews/:id` removes a review.
