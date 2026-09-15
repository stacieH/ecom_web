# Cinder & Salt — Restaurant Site and Ordering Portal

Marketing site and guest ordering portal for **Cinder & Salt**, a fictional live-flame restaurant in Poblacion, Makati. Built with Next.js 16 (App Router), React 19, and TypeScript.

> **Demo project.** The restaurant, address, and map pin are invented. Online ordering and customer accounts run on demo data stored in your browser: no real payments are taken, no emails are sent, and passwords are not production-grade.

## Features

### One-page site (`/`)

- Hero, statement, and a pinned horizontal scroll of signature dishes
- Full menu: 19 dishes in 5 courses, with sticky course navigation (a swipeable strip on narrow screens)
- Gallery with a lightbox
- About section with the restaurant's story and a timeline
- Visit us: opening hours, address, a Google Maps embed with a venue pin, and an enquiry form
- Scroll-driven motion with GSAP and Lenis smooth scrolling; reduced motion is honored and content is never left hidden
- Responsive layout with a phone menu and fluid type and spacing
- Old `/menu`, `/gallery`, `/about`, and `/contact` URLs redirect to their sections

### Guest ordering (`/order`)

- Pickup or delivery, with delivery areas and minimum-order hints
- Dish dialog with option groups, quantity, and a line note
- Cart with live price quotes
- Checkout: as soon as possible or a scheduled time slot, delivery address, contact details, payment method, and privacy consent
- Every field has its own validation message; each server refusal (price changed, item unavailable, slot full, and more) has a specific message
- Demo online payment page standing in for a hosted checkout (PayMongo)
- Order tracking with a status timeline, guest cancellation, and resumed payment

### Customer accounts (`/account`)

- Register, verify email, sign in, forgot and reset password
- Profile, change password, and delete account
- Saved address book
- Order history and order detail

### Demo console (`/order/demo`)

- Outbox showing the emails the portal would send, with working links (for example, email verification)
- Scenario switches: next slot full, an item sold out, prices up 10%, online payments failing, a network error on the next request
- Order list with "Advance status", and "Reset demo data"

## Tech stack

| Area | Tools |
|---|---|
| Framework | Next.js 16, React 19, TypeScript |
| Data fetching | TanStack Query 5 |
| Motion | GSAP 3 (`@gsap/react`), Lenis |
| Styling | CSS Modules with design tokens (`src/styles/tokens.css`) |
| Unit and component tests | Jest 29, Testing Library, jsdom |
| End-to-end tests | Playwright, driving the installed Microsoft Edge |
| Code quality | ESLint, Prettier |

## Requirements

- Node.js 24.14.0 (see `.nvmrc`)
- npm
- Microsoft Edge, only for end-to-end tests

## Getting started

```bash
nvm use                       # or install Node 24.14.0 another way
npm install
cp .env.example .env.local
npm run dev                   # http://localhost:3000
```

## Environment variables

| Variable | Purpose | Example |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the Cinder & Salt API (`cinder-salt-api`), including the version prefix | `http://localhost:4000/v1` |
| `NEXT_PUBLIC_ORDERING_DATA_SOURCE` | Where the ordering portal gets its data. Only `mock` exists until the ordering API is live. | `mock` |

`NEXT_PUBLIC_` values are inlined at build time, so set them before `npm run build`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Jest unit and component tests |
| `npm run test:e2e` | Run the Playwright end-to-end tests |

## Testing

- **Unit and component tests:** `npm test`. Test helpers live in `tests/helpers/`.
- **End-to-end tests:** `npm run test:e2e`. Playwright builds the app, serves it on port 3100, and runs `e2e/ordering.spec.ts` and `e2e/account.spec.ts` in Microsoft Edge at desktop (1280 × 800) and phone (390 × 844) sizes. API requests go to a host that never resolves, so every response comes from the demo data.
  - Stop `npm run dev` before running them: building next to a running dev server has broken Turbopack before.

## Trying the demo

1. Open `/order`, choose pickup or delivery, and add dishes.
2. Check out. Choose "Pay online" to see the demo payment page, or pay at pickup or on delivery.
3. Follow the order on its tracking page.
4. Open `/order/demo` to read the emails the portal would have sent, move the order through its statuses, or turn on a failure scenario.
5. Create an account at `/account/register` and verify it with the link in the demo outbox.

Demo data lives in your browser's `localStorage`, so each browser has its own orders and accounts. Use "Reset demo data" in the demo console to start over.

## Project structure

```
src/
  app/
    page.tsx              one-page site
    (guest)/order/        ordering, checkout, demo payment, tracking, demo console
    (guest)/account/      registration, sign-in, password reset, profile, addresses, orders
  components/             page sections, layout, motion, ordering, account, forms
  content/                dishes, gallery, about, venue details
  lib/
    api/                  API client, errors, idempotency keys
    ordering/             ordering client, demo (mock) client, cart, queries, validation
    ...                   maps, money, time, phone, and form helpers
  styles/                 global styles and design tokens
  types/
tests/helpers/            Jest test utilities
e2e/                      Playwright specs
```

## Editing content

| File | Content |
|---|---|
| `src/content/dishes.ts` | Menu dishes and courses |
| `src/content/gallery.ts` | Gallery images (Unsplash; allowed in `next.config.js`) |
| `src/content/about.ts` | Story and timeline |
| `src/content/venue.ts` | Name, address, phone, hours, map area, and pin coordinates |

The address and coordinates in `venue.ts` are invented. Replace both together when there is a real location.

## Roadmap

- Ordering API (NestJS, `cinder-salt-api`): once it is live, add an HTTP ordering client and switch `NEXT_PUBLIC_ORDERING_DATA_SOURCE`. Pages, forms, and validation stay the same.
- Table reservations for guests, and an admin console for hosts
- Kitchen order board and menu management

## Credits

Photography from [Unsplash](https://unsplash.com).
