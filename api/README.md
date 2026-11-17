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
- `POST /api/orders/track` looks up an order using its order number and checkout email or phone, or lists orders using the checkout phone; responses include status and shipment tracking details without customer or payment identifiers.

Checkout endpoints:

- `POST /api/checkout/quote` calculates product prices and delivery charges from the database for the current cart.
- `POST /api/checkout/orders` creates a Razorpay order using server-calculated prices and returns a signed checkout snapshot without persisting an unpaid order.
- `POST /api/checkout/orders/:razorpayOrderId/verify` verifies and captures payment, then creates the paid order record.

Admin review endpoints (require an administrator session):

- `GET /api/admin/reviews` lists reviews.
- `POST /api/admin/reviews` creates a review with `name`, `stars` (1–5), and `comments`.
- `DELETE /api/admin/reviews/:id` removes a review.

Administrators can update paid orders through `PUT /api/admin/orders/:id/status`: orders move from `new` to `accepted`, then to `dispatched`. Dispatch requires an HTTPS tracking URL and tracking ID.
