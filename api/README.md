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
